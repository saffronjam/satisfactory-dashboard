# Quickstart: Distributed Polling Lease System

**Branch**: `002-redis-poll-lease`

## Overview

This feature enables multiple API instances to coordinate polling responsibilities automatically via Redis-based leases. No configuration changes required - just scale instances up or down.

## How It Works

1. **Each instance registers** with a unique ID and heartbeat in Redis
2. **Sessions are polling targets** - discovered dynamically from Redis
3. **Leases ensure single ownership** - one instance polls each session
4. **Rendezvous hashing** balances load across instances
5. **Auto-healing** via TTL expiry when instances fail

## Testing Locally

### Single Instance (Existing Behavior)

```bash
# Start Redis
make deps

# Run single instance (acquires all leases)
make run
```

### Multiple Instances (New Behavior)

```bash
# Terminal 1: Start Redis
make deps

# Terminal 2: Start first API instance
cd api && go run . --publisher

# Terminal 3: Start second API instance (different port)
cd api && GIN_MODE=release go run . --publisher --port 8082

# Watch logs to see lease distribution
# Each instance logs: "Lease acquired: instance=xxx endpoint=yyy"
```

### Simulating Failover

```bash
# With two instances running, kill one (Ctrl+C in Terminal 2)
# Watch Terminal 3 logs - within 30 seconds:
# "Lease acquired: instance=xxx endpoint=yyy" (takes over sessions)
```

## Key Files

| File | Purpose |
|------|---------|
| `api/service/lease/manager.go` | LeaseManager implementation |
| `api/service/lease/instance.go` | Instance ID + heartbeat |
| `api/service/lease/rendezvous.go` | Load balancing hash |
| `api/worker/session_manager.go` | Integration point |

## Redis Keys (Debug)

```bash
# View all leases
redis-cli KEYS "poll:lease:*"

# View all live instances
redis-cli KEYS "poll:node:*"

# Check who owns a specific session
redis-cli GET "poll:lease:<sessionID>"

# Check TTL on a lease
redis-cli TTL "poll:lease:<sessionID>"
```

## Configuration

No configuration required. Hardcoded defaults:

| Parameter | Value |
|-----------|-------|
| Lease TTL | 30s |
| Renewal interval | 10s |
| Heartbeat TTL | 30s |
| Heartbeat interval | 10s |

## Logs to Watch

```
# Successful lease acquisition
Lease acquired: instance=api-xxx-123 endpoint=session-abc

# Lease renewal (every 10s)
Lease renewed: instance=api-xxx-123 endpoint=session-abc

# Taking over from failed instance
Lease acquired: instance=api-yyy-456 endpoint=session-abc

# Voluntary release (rebalancing)
Lease released: instance=api-xxx-123 endpoint=session-abc reason=rebalance
```

## Troubleshooting

### All sessions on one instance?

- Check other instances are running and registered: `redis-cli KEYS "poll:node:*"`
- Wait for rebalance (up to 30s)
- Check logs for lease acquisition attempts

### Sessions not being polled?

- Verify leases exist: `redis-cli KEYS "poll:lease:*"`
- Check session is not paused in Redis
- Verify Redis connectivity

### Duplicate polling detected?

- Check for clock skew between instances
- Verify Lua scripts are executing atomically
- Check lease TTL hasn't been modified

## Architecture Decision

This system uses **Redis-only coordination** (no etcd/Consul) because:
- Redis already in use for sessions and caching
- Acceptable failover time (30s max)
- Simple operational model
- No additional infrastructure dependencies
