# Research: Data History Persistence

**Feature**: 006-data-history-persistence
**Date**: 2026-01-17

## 1. Game Time Offset Mechanism

### Decision: Use TotalPlayDuration from getSessionInfo API

**Rationale**: The FRM API's `getSessionInfo` endpoint returns `TotalPlayDuration` (integer, seconds) which represents cumulative game time. This provides a stable monotonic value that can serve as the basis for game-time identifiers.

**Implementation**:
```go
type GameTimeOffset struct {
    OffsetSeconds int64     // TotalPlayDuration from last probe
    ProbedAt      time.Time // Wall-clock time when probed
}

// Calculate current game time for any data point
func (g *GameTimeOffset) CurrentGameTime() int64 {
    elapsed := time.Since(g.ProbedAt).Seconds()
    return g.OffsetSeconds + int64(elapsed)
}
```

**Alternatives Considered**:
- Wall-clock timestamps: Rejected because save file rollbacks would create confusion
- Sequence numbers: Rejected because they don't correlate to game time for averaging

### Decision: Per-Session In-Memory Offset Cache

**Rationale**: Each API instance needs its own cached offset to avoid Redis round-trips on every data point. The offset is probed on session startup and refreshed periodically (already happens via `monitorSessionInfo` in session_manager.go).

**Implementation**: Add `gameTimeOffset` field to session publisher context, updated each time `GetSessionInfo` is called.

## 2. Redis Storage Pattern

### Decision: Redis Sorted Sets (ZSET) for Time-Series Data

**Rationale**: Redis sorted sets allow:
- Natural ordering by game-time score
- Efficient range queries (`ZRANGEBYSCORE`)
- Atomic pruning of old data (`ZREMRANGEBYSCORE`)
- O(log N) insertion and retrieval

**Key Pattern**:
```
history:{sessionID}:{saveName}:{dataType}
```

**Example**:
```
history:abc-123:MySave:prodStats
  Score: 3600 (game-time seconds)
  Member: "{json data payload}"
```

**Alternatives Considered**:
- Separate keys per timestamp (`history:...:1234`): Rejected due to key explosion and expensive SCAN operations
- Redis Streams: Considered but ZSET is simpler for time-based range queries and pruning
- List (LPUSH/RPOP): Rejected because no efficient range queries

### Decision: Store Full Data Snapshots (Not Diffs)

**Rationale**: Factory stats, prod stats, etc. are relatively small (<10KB each). Full snapshots:
- Simplify client-side reconstruction
- Allow any time-range query without chaining diffs
- Match current SSE behavior (full state per event)

**Trade-off**: Higher storage usage, but acceptable given:
- 5 data types × ~5KB avg × 1 point/4s = ~37KB/minute = ~53MB/day per session
- Configurable retention via `SD_MAX_SAMPLE_GAME_DURATION` bounds this

## 3. Save Name Detection and Tracking

### Decision: Extract Save Name from SessionInfo.SessionName

**Rationale**: The `SessionInfo.SessionName` field from `getSessionInfo` contains the current save name. When this changes, we know the user loaded a different save.

**Implementation**:
- Track `currentSaveName` per session publisher
- On each `GetSessionInfo` call, compare to previous
- If changed: log event, continue storing to new save name key
- Historical data for previous save remains accessible

**Edge Case**: If `SessionName` is empty or unchanged across save switches (unlikely), history would accumulate under one key. Acceptable given FRM API behavior.

## 4. Retention and Pruning

### Decision: Duration-Based Pruning with ZREMRANGEBYSCORE

**Rationale**: The spec requires `SD_MAX_SAMPLE_GAME_DURATION` to specify retention in game-time seconds. Using sorted set scores (game-time), we can atomically remove old entries:

```go
// Prune entries older than retention period
minScore := currentGameTime - maxDuration
redis.ZRemRangeByScore(key, "-inf", minScore)
```

**When to Prune**: After each data point insertion to maintain bounded storage.

**Alternatives Considered**:
- Item count limit: Rejected because spec explicitly requests duration-based
- Background pruning job: Rejected in favor of inline pruning (simpler, immediate)

## 5. SSE Integration for Incremental Updates

### Decision: Add Game-Time ID to Existing Event Payloads

**Rationale**: Extend the current `SatisfactoryEvent` structure to include game-time ID. Clients can track their last-seen ID and filter duplicates.

**Implementation**:
```go
type SatisfactoryEvent struct {
    EventType  string      `json:"type"`
    Data       interface{} `json:"data"`
    GameTimeID int64       `json:"gameTimeId"` // NEW: game-time in seconds
}
```

**Client Flow**:
1. Initial fetch via REST: `GET /v1/sessions/{id}/history/{dataType}?since=0`
2. Response includes array of data points with IDs
3. Client stores max ID received
4. SSE events include `gameTimeId`
5. Client ignores events with `gameTimeId <= lastKnownId`

**Alternatives Considered**:
- Separate SSE channel for history: Rejected to avoid complexity; reuse existing channel
- Server-side ID filtering: Rejected because clients may connect/disconnect at different points

## 6. REST API for History Retrieval

### Decision: Single Endpoint with Query Parameters

**Rationale**: One endpoint covers all history use cases:

```
GET /v1/sessions/{sessionId}/history/{dataType}
  ?saveName=MySave        (optional, defaults to current)
  ?since=3600            (game-time ID, returns data after this)
  ?limit=100             (max items to return)
```

**Response**:
```json
{
  "dataType": "prodStats",
  "saveName": "MySave",
  "latestId": 7200,
  "points": [
    {"gameTimeId": 3604, "data": {...}},
    {"gameTimeId": 3608, "data": {...}}
  ]
}
```

**Alternatives Considered**:
- Separate endpoint per data type: Rejected due to route explosion
- GraphQL: Overkill for this use case

## 7. Time Discontinuity Handling

### Decision: Overwrite Future Data on Rollback

**Rationale**: When `TotalPlayDuration` decreases (save rollback detected):
1. Log the discontinuity event
2. Continue storing at the new (earlier) game time
3. As new data arrives, it naturally overwrites "future" entries in the sorted set (same score = same member key pattern would update)

**Implementation Detail**: To ensure overwrite, the sorted set member should be keyed by game-time only, not include a unique suffix. This way `ZADD` with same score replaces existing entry.

**Alternative member format considered**:
- `{gameTimeId}:{uuid}`: Would create duplicates - rejected
- `{gameTimeId}`: Overwrites on collision - selected

## 8. Environment Variable Handling

### Decision: Require SD_MAX_SAMPLE_GAME_DURATION at Startup

**Rationale**: Per spec, no default value. Application should fail to start if not set.

**Implementation** (in environment.go):
```go
durationStr := os.Getenv("SD_MAX_SAMPLE_GAME_DURATION")
if durationStr == "" {
    return fmt.Errorf("SD_MAX_SAMPLE_GAME_DURATION environment variable is required")
}
duration, err := strconv.ParseInt(durationStr, 10, 64)
if err != nil || duration <= 0 {
    return fmt.Errorf("SD_MAX_SAMPLE_GAME_DURATION must be a positive integer (seconds)")
}
Config.MaxSampleGameDuration = duration
```

**Format**: Integer seconds of game time (e.g., `3600` for 1 hour, `86400` for 1 day)

## 9. Data Types Scope

### Decision: History for Time-Series Data Only

**Rationale**: Per clarification session, only these data types need history:
- `circuits` - Power circuit metrics
- `generatorStats` - Generator production
- `prodStats` - Production statistics
- `factoryStats` - Factory efficiency
- `sinkStats` - Awesome sink points

**Excluded**: drones, trains, players, belts, pipes, cables (static/semi-static data where history adds no analytical value)

## 10. Frontend Integration Pattern

### Decision: Custom Hook with SSE Subscription

**Rationale**: Follow existing patterns in dashboard. Create `useHistoryData` hook that:
1. Fetches initial history on mount
2. Subscribes to SSE for updates
3. Maintains sorted array of data points
4. Exposes data and loading state

**Implementation**:
```typescript
function useHistoryData(sessionId: string, dataType: string) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [lastId, setLastId] = useState(0);

  // Initial fetch
  useEffect(() => {
    fetchHistory(sessionId, dataType, 0).then(result => {
      setData(result.points);
      setLastId(result.latestId);
    });
  }, [sessionId, dataType]);

  // SSE subscription filters by lastId
  useSSE(`/v1/sessions/${sessionId}/events`, (event) => {
    if (event.type === dataType && event.gameTimeId > lastId) {
      setData(prev => [...prev, {gameTimeId: event.gameTimeId, data: event.data}]);
      setLastId(event.gameTimeId);
    }
  });

  return { data, lastId };
}
```

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Time Source | TotalPlayDuration | Monotonic game time, handles save rollbacks |
| Storage | Redis ZSET | Natural ordering, range queries, atomic pruning |
| Key Pattern | `history:{session}:{save}:{type}` | Per-session per-save isolation |
| Retention | ZREMRANGEBYSCORE | Duration-based per spec requirement |
| SSE Updates | Add gameTimeId to events | Enables client-side deduplication |
| REST API | Single parameterized endpoint | Simple, covers all use cases |
| Rollback | Overwrite future data | Timeline self-corrects as game progresses |
