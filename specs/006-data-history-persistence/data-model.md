# Data Model: Data History Persistence

**Feature**: 006-data-history-persistence
**Date**: 2026-01-17

## Entity Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GameTimeOffset │────▶│    DataPoint     │◀────│   HistoryChunk  │
│  (per session)  │     │ (stored in ZSET) │     │  (API response) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   DataHistory    │
                        │ (Redis key/ZSET) │
                        └──────────────────┘
```

## Entities

### GameTimeOffset

Cached reference point for calculating game time. One per active session, stored in memory.

| Field | Type | Description |
|-------|------|-------------|
| OffsetSeconds | int64 | TotalPlayDuration from last getSessionInfo call |
| ProbedAt | time.Time | Wall-clock timestamp when offset was captured |

**Derived Calculation**:
```
CurrentGameTime = OffsetSeconds + int64(time.Since(ProbedAt).Seconds())
```

**Lifecycle**:
- Created: When session publisher starts
- Updated: On each getSessionInfo poll (~5s interval)
- Destroyed: When session publisher stops

**Validation**:
- OffsetSeconds must be >= 0
- ProbedAt must be <= time.Now()

### DataPoint

A single measurement at a point in game time.

| Field | Type | Description |
|-------|------|-------------|
| GameTimeID | int64 | Game time in seconds when data was captured |
| DataType | string | One of: circuits, generatorStats, prodStats, factoryStats, sinkStats |
| Data | interface{} | The actual data payload (type depends on DataType) |

**Storage Format** (Redis ZSET member):
```json
{"gameTimeId": 3600, "dataType": "prodStats", "data": {...}}
```

**Score**: GameTimeID (enables range queries and ordering)

**Validation**:
- GameTimeID must be > 0
- DataType must be one of the allowed time-series types
- Data must not be nil

### DataHistory

Conceptual entity representing the collection of DataPoints for a session/save/type combination. Implemented as a Redis Sorted Set.

| Attribute | Value |
|-----------|-------|
| Redis Key | `history:{sessionID}:{saveName}:{dataType}` |
| Type | Sorted Set (ZSET) |
| Score | GameTimeID (int64) |
| Member | JSON-encoded DataPoint |

**Example Keys**:
```
history:abc-123:MySaveGame:circuits
history:abc-123:MySaveGame:prodStats
history:abc-123:AnotherSave:prodStats
```

**Operations**:
- Insert: `ZADD key score member`
- Query range: `ZRANGEBYSCORE key minScore maxScore`
- Prune old: `ZREMRANGEBYSCORE key -inf maxAge`
- Get latest: `ZREVRANGE key 0 0 WITHSCORES`

### HistoryChunk

API response containing a batch of historical data points.

| Field | Type | Description |
|-------|------|-------------|
| DataType | string | The data type requested |
| SaveName | string | The save name these points belong to |
| LatestID | int64 | Highest GameTimeID in the chunk (for client tracking) |
| Points | []DataPoint | Array of data points, ordered by GameTimeID ascending |

**Example Response**:
```json
{
  "dataType": "prodStats",
  "saveName": "MySaveGame",
  "latestId": 7200,
  "points": [
    {"gameTimeId": 3600, "data": {"itemsProducedPerMinute": 150.5, ...}},
    {"gameTimeId": 3604, "data": {"itemsProducedPerMinute": 152.3, ...}},
    {"gameTimeId": 3608, "data": {"itemsProducedPerMinute": 148.9, ...}}
  ]
}
```

### SatisfactoryEvent (Modified)

Existing event structure extended with game-time ID.

| Field | Type | Description |
|-------|------|-------------|
| EventType | string | Event type identifier |
| Data | interface{} | Event payload |
| **GameTimeID** | int64 | **NEW**: Game time when event was captured (0 for non-history types) |

**Backward Compatibility**: Non-history event types will have `GameTimeID: 0`, which clients can ignore.

## Relationships

```
Session (1) ─────────────────────────────┐
    │                                    │
    │ has one (in memory)                │ identified by
    ▼                                    │
GameTimeOffset                           │
    │                                    │
    │ provides time for                  │
    ▼                                    ▼
DataPoint ─────────────────────────▶ DataHistory
    │           stored in                 │
    │                                     │ per save name
    │                                     │
    ▼                                     ▼
HistoryChunk ◀───────────── queried from Redis
```

## State Transitions

### DataPoint Lifecycle

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│  Created  │────▶│  Stored   │────▶│  Pruned   │
└───────────┘     └───────────┘     └───────────┘
     │                 │                  │
     │ FRM poll        │ ZADD to Redis    │ ZREMRANGEBYSCORE
     │ + game time     │                  │ when age > max
     │                 │                  │
     │                 ▼                  │
     │           ┌───────────┐            │
     │           │ Queried   │            │
     │           └───────────┘            │
     │                 │                  │
     │                 │ ZRANGEBYSCORE    │
     │                 │ by client        │
     │                 │                  │
     ▼                 ▼                  ▼
  Lifetime: instant  Lifetime: up to SD_MAX_SAMPLE_GAME_DURATION
```

### Save Name Change

```
Current Save: "SaveA"           Current Save: "SaveB"
         │                               │
         │ GetSessionInfo                │
         │ detects change                │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ history:...:   │              │ history:...:   │
│ SaveA:prodStats│              │ SaveB:prodStats│
└────────────────┘              └────────────────┘
         │                               │
         │ preserved                     │ new data goes here
         │ (queryable)                   │
         ▼                               ▼
```

### Time Discontinuity (Save Rollback)

```
Time: T=7200                    Time: T=3600 (rollback)
         │                               │
         │ Load older save               │
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ Data at 7196   │              │ New data at    │
│ Data at 7200   │              │ 3600 overwrites│
│ (future data)  │              │ same score     │
└────────────────┘              └────────────────┘
         │                               │
         │                               │ Progress to T=7200
         │                               │ overwrites old "future"
         ▼                               ▼
```

## Configuration Entity

### Config.MaxSampleGameDuration

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| MaxSampleGameDuration | int64 | SD_MAX_SAMPLE_GAME_DURATION env | Max retention in game-time seconds |

**Validation**:
- Required (no default)
- Must be positive integer
- Recommended minimum: 60 (1 minute)
- Typical values: 3600 (1 hour), 86400 (1 day)

## Supported Data Types

The following data types support historical storage:

| DataType | Go Type | Description |
|----------|---------|-------------|
| circuits | []models.Circuit | Power circuit data |
| generatorStats | models.GeneratorStats | Generator production |
| prodStats | models.ProdStats | Production statistics |
| factoryStats | models.FactoryStats | Factory efficiency |
| sinkStats | models.SinkStats | Awesome sink metrics |

## Index Strategy

Redis sorted sets are self-indexing by score. No additional indices needed.

**Query Patterns Supported**:
1. Get all history: `ZRANGE key 0 -1`
2. Get since ID: `ZRANGEBYSCORE key (sinceId +inf`
3. Get time range: `ZRANGEBYSCORE key minTime maxTime`
4. Get latest N: `ZREVRANGE key 0 N-1`
5. Get count: `ZCARD key`
