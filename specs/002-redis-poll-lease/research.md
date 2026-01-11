# Research: Distributed Polling Lease System

**Date**: 2026-01-11
**Branch**: `002-redis-poll-lease`

## Research Questions

### 1. Redis Lua Script Patterns for Atomic Lease Operations

**Decision**: Use embedded Lua scripts for conditional renew and release operations.

**Rationale**:
- go-redis/v9 supports `Eval()` and `EvalSha()` for Lua scripts
- Lua scripts execute atomically in Redis, preventing race conditions
- The existing codebase uses `key_value.Client` which wraps go-redis
- Scripts can be loaded once and executed by SHA for efficiency

**Implementation Pattern**:
```go
// Renew script - only extend TTL if we still own the lease
renewScript := redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`)

// Release script - only delete if we still own the lease
releaseScript := redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`)
```

**Alternatives Considered**:
- WATCH/MULTI/EXEC transactions: More complex, requires retry logic
- Single SET operations: Cannot guarantee ownership check is atomic

### 2. Instance ID Generation Strategy

**Decision**: Use format `hostname-bootTimestamp-randomSuffix`

**Rationale**:
- Hostname provides human-readable identification for debugging
- Boot timestamp prevents ID collision after container restart
- Random suffix (8 hex chars from UUID) handles edge cases
- Existing codebase uses `github.com/google/uuid` for unique IDs

**Implementation Pattern**:
```go
func GenerateInstanceID() string {
    hostname, _ := os.Hostname()
    bootTime := time.Now().UnixNano()
    randomPart := uuid.New().String()[:8]
    return fmt.Sprintf("%s-%d-%s", hostname, bootTime, randomPart)
}
```

**Alternatives Considered**:
- UUID only: Less readable in logs, harder to correlate with containers
- Hostname only: Collision risk on container restart
- Environment variable: Requires external configuration

### 3. Rendezvous Hashing for Load Balancing

**Decision**: Implement Highest Random Weight (HRW) hashing using FNV-1a hash.

**Rationale**:
- Rendezvous hashing provides consistent hashing with minimal reassignment on node changes
- FNV-1a is fast and available in Go standard library (`hash/fnv`)
- When a node leaves, only its endpoints redistribute (not all endpoints)
- When a node joins, it takes ~1/N of endpoints from each existing node

**Implementation Pattern**:
```go
func PreferredOwner(endpointID string, liveNodes []string) string {
    var bestNode string
    var bestWeight uint64

    for _, nodeID := range liveNodes {
        weight := hash(nodeID + endpointID)
        if weight > bestWeight {
            bestWeight = weight
            bestNode = nodeID
        }
    }
    return bestNode
}
```

**Alternatives Considered**:
- Consistent hashing ring: More complex, similar redistribution properties
- Random assignment: Uneven distribution, high churn on changes
- Round-robin: Requires shared state, doesn't handle failures well

### 4. Session Discovery from Redis

**Decision**: Use existing session store pattern with SCAN for session keys.

**Rationale**:
- Sessions already stored in Redis with pattern `session:{sessionID}`
- Existing `session.Store.List()` method retrieves all sessions
- Reuse existing infrastructure rather than duplicate storage
- Sessions can be added/removed at runtime; lease system adapts automatically

**Implementation Pattern**:
```go
// Existing code in service/session/store.go
func (s *Store) List() ([]models.Session, error) {
    keys, err := s.kvClient.GetAllKeys(sessionKeyPrefix)
    // ... iterate and unmarshal
}

// Lease manager calls this to discover polling targets
sessions, _ := store.List()
for _, sess := range sessions {
    if !sess.IsPaused {
        endpointID := sess.ID
        // Attempt to acquire lease for this endpoint
    }
}
```

**Alternatives Considered**:
- Separate endpoint registry in Redis: Duplication, sync complexity
- Configuration file: Static, requires restart for changes

### 5. Integration with SessionManager

**Decision**: Modify `SessionManager.publishLoop()` to check lease ownership before polling.

**Rationale**:
- Minimal changes to existing architecture
- SessionManager already manages per-session goroutines
- Add lease check at loop entry; stop loop if lease lost
- Lease renewal runs in separate goroutine to avoid blocking polls

**Integration Points**:
1. `SessionManager.Start()`: Initialize LeaseManager, start heartbeat
2. `SessionManager.syncSessions()`: Check lease ownership before spawning publishers
3. `SessionManager.publishLoop()`: Verify lease before each poll cycle
4. `SessionManager.Stop()`: Release all leases, stop heartbeat

**Alternatives Considered**:
- New worker separate from SessionManager: More code, harder coordination
- External sidecar process: Over-engineering, deployment complexity

### 6. Fail-Closed Behavior on Redis Unavailability

**Decision**: Pause polling when lease renewal fails; rely on TTL expiry for takeover.

**Rationale**:
- If instance cannot confirm ownership, it should not poll (risk of duplicates)
- Other instances will acquire lease when TTL expires
- Maximum gap is bounded by TTL (30 seconds)
- Better to miss polls than create duplicates

**Implementation Pattern**:
```go
func (m *LeaseManager) renewLoop(ctx context.Context) {
    ticker := time.NewTicker(10 * time.Second)
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            for endpointID, lease := range m.ownedLeases {
                if err := m.renewLease(ctx, endpointID); err != nil {
                    log.Warnf("Lease renewal failed for %s: %v", endpointID, err)
                    m.markLeaseUncertain(endpointID)
                    // Polling will pause for this endpoint
                }
            }
        }
    }
}
```

**Alternatives Considered**:
- Continue polling on renewal failure: Risk of duplicates
- Immediate stop all polling: Over-reaction to transient issues

### 7. Structured Logging for Lease Events

**Decision**: Use existing zap logger with consistent field structure.

**Rationale**:
- Existing codebase uses `pkg/log` with zap SugaredLogger
- Structured fields enable log aggregation and filtering
- Required fields: instanceID, endpointID, event type, timestamp

**Implementation Pattern**:
```go
log.Infof("Lease acquired: instance=%s endpoint=%s ttl=%d",
    m.instanceID, endpointID, ttlMs)

log.Infof("Lease renewed: instance=%s endpoint=%s",
    m.instanceID, endpointID)

log.Warnf("Lease renewal failed: instance=%s endpoint=%s error=%v",
    m.instanceID, endpointID, err)

log.Infof("Lease released: instance=%s endpoint=%s reason=%s",
    m.instanceID, endpointID, reason)
```

**Alternatives Considered**:
- Prometheus metrics: Out of scope per spec
- Custom event stream: Over-engineering for current needs

## Redis Key Layout

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `poll:lease:{sessionID}` | `{instanceID}` | 30s | Lease ownership |
| `poll:node:{instanceID}` | `1` | 30s | Instance heartbeat |

## Timing Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Lease TTL | 30s | Bounds worst-case failover time |
| Renewal interval | 10s | TTL/3 ensures timely renewal with margin |
| Heartbeat TTL | 30s | Same as lease TTL for consistency |
| Heartbeat interval | 10s | TTL/3, same as lease renewal |
| Node discovery interval | 10s | Aligns with heartbeat for fresh data |

## Dependencies

No new dependencies required. All functionality implemented with:
- `github.com/redis/go-redis/v9` (existing)
- `hash/fnv` (Go standard library)
- `os` (Go standard library, for hostname)
- `github.com/google/uuid` (existing)
