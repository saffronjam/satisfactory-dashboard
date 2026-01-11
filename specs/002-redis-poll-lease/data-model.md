# Data Model: Distributed Polling Lease System

**Date**: 2026-01-11
**Branch**: `002-redis-poll-lease`

## Entities

### 1. Lease

Represents exclusive ownership of a polling target by an API instance.

**Storage**: Redis string key with TTL

| Field | Type | Description |
|-------|------|-------------|
| Key | `poll:lease:{sessionID}` | Redis key pattern |
| Value | `string` | Instance ID of current owner |
| TTL | `30 seconds` | Automatic expiration for failover |

**State Transitions**:
```
[Unowned] --acquire--> [Owned by Instance A]
[Owned by Instance A] --renew--> [Owned by Instance A] (TTL reset)
[Owned by Instance A] --release--> [Unowned]
[Owned by Instance A] --TTL expiry--> [Unowned]
```

**Validation Rules**:
- Session ID must be valid UUID (matches existing session format)
- Instance ID must be non-empty string
- Only owner can renew or release (enforced by Lua scripts)

### 2. InstanceHeartbeat

Represents a live API instance in the cluster.

**Storage**: Redis string key with TTL

| Field | Type | Description |
|-------|------|-------------|
| Key | `poll:node:{instanceID}` | Redis key pattern |
| Value | `1` | Presence indicator |
| TTL | `30 seconds` | Automatic removal on failure |

**State Transitions**:
```
[Not Registered] --start--> [Registered]
[Registered] --heartbeat--> [Registered] (TTL reset)
[Registered] --shutdown--> [Not Registered]
[Registered] --TTL expiry--> [Not Registered]
```

**Validation Rules**:
- Instance ID must follow format: `{hostname}-{bootTimestamp}-{randomSuffix}`
- Heartbeat must be refreshed before TTL expires

### 3. InstanceID

Unique identifier for an API process instance.

**Storage**: In-memory (generated at startup)

| Field | Type | Description |
|-------|------|-------------|
| Hostname | `string` | Container/host hostname |
| BootTimestamp | `int64` | Unix nanoseconds at process start |
| RandomSuffix | `string` | 8-character hex from UUID |

**Format**: `{hostname}-{bootTimestamp}-{randomSuffix}`

**Example**: `api-7fd8c9-1736598400000000000-a1b2c3d4`

**Validation Rules**:
- Generated once per process lifetime
- Never reused across process restarts
- Must be globally unique across all instances

## Go Type Definitions

```go
// service/lease/types.go

// LeaseManager coordinates distributed polling leases across API instances.
type LeaseManager interface {
    // Start begins the heartbeat and lease management loops.
    Start(ctx context.Context) error

    // Stop releases all leases and stops heartbeat.
    Stop() error

    // TryAcquire attempts to acquire a lease for the given session.
    // Returns true if lease was acquired or already owned.
    TryAcquire(ctx context.Context, sessionID string) (bool, error)

    // Release voluntarily releases a lease for the given session.
    Release(ctx context.Context, sessionID string) error

    // IsOwned checks if this instance owns the lease for the given session.
    IsOwned(sessionID string) bool

    // OwnedSessions returns all sessions currently leased by this instance.
    OwnedSessions() []string

    // GetLiveNodes returns all instance IDs with active heartbeats.
    GetLiveNodes(ctx context.Context) ([]string, error)

    // PreferredOwner returns the instance ID that should own the given session
    // based on rendezvous hashing of live nodes.
    PreferredOwner(ctx context.Context, sessionID string) (string, error)

    // InstanceID returns this instance's unique identifier.
    InstanceID() string
}

// LeaseState represents the current state of a lease from this instance's view.
type LeaseState int

const (
    LeaseStateUnknown LeaseState = iota
    LeaseStateOwned              // This instance holds the lease
    LeaseStateOther              // Another instance holds the lease
    LeaseStateUncertain          // Renewal failed, ownership uncertain
)

// LeaseInfo contains metadata about a lease.
type LeaseInfo struct {
    SessionID    string
    OwnerID      string
    State        LeaseState
    AcquiredAt   time.Time
    LastRenewedAt time.Time
}
```

## Redis Key Patterns

| Pattern | Example | Purpose |
|---------|---------|---------|
| `poll:lease:{sessionID}` | `poll:lease:abc123-def456` | Session polling lease |
| `poll:node:{instanceID}` | `poll:node:api-7fd8c9-1736598400000000000-a1b2c3d4` | Instance heartbeat |

## Lua Scripts

### Conditional Renew

```lua
-- KEYS[1] = lease key
-- ARGV[1] = expected owner (instanceID)
-- ARGV[2] = TTL in milliseconds
-- Returns: 1 if renewed, 0 if not owner
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
```

### Conditional Release

```lua
-- KEYS[1] = lease key
-- ARGV[1] = expected owner (instanceID)
-- Returns: 1 if released, 0 if not owner
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         Redis                                    │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │ poll:node:*     │         │ poll:lease:{sessionID}      │   │
│  │ (heartbeats)    │         │ (lease ownership)           │   │
│  └────────┬────────┘         └──────────────┬──────────────┘   │
│           │                                  │                   │
└───────────┼──────────────────────────────────┼───────────────────┘
            │                                  │
            │ discover                         │ acquire/renew/release
            ▼                                  ▼
┌───────────────────────────────────────────────────────────────┐
│                      LeaseManager                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ instanceID: "api-xxx-123-abc"                           │  │
│  │ ownedLeases: map[sessionID]LeaseInfo                    │  │
│  │ liveNodes: []string (cached, refreshed every 10s)       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                 │
│                              │ uses                            │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ RendezvousHasher                                        │  │
│  │ - PreferredOwner(sessionID, liveNodes) → instanceID     │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
            │
            │ provides lease checks
            ▼
┌───────────────────────────────────────────────────────────────┐
│                    SessionManager                              │
│  - Before starting publisher: check TryAcquire()              │
│  - Before each poll: check IsOwned()                          │
│  - On shutdown: call Release() for all owned sessions         │
└───────────────────────────────────────────────────────────────┘
```

## Cardinality

| Entity | Expected Count | Notes |
|--------|---------------|-------|
| Sessions | 1-100 | Based on user game saves |
| API Instances | 1-10+ | Auto-scaling, no fixed limit |
| Leases per Instance | Sessions / Instances | Balanced distribution |
| Heartbeats | 1 per Instance | One heartbeat key per instance |
