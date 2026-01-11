# Implementation Plan: Distributed Polling Lease System

**Branch**: `002-redis-poll-lease` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-redis-poll-lease/spec.md`

## Summary

Implement a Redis-based distributed lease system enabling multiple API instances to coordinate polling responsibilities automatically. Each session becomes a poll target with exactly one lease holder. Instances discover each other via heartbeat keys and use rendezvous hashing for balanced distribution. The system provides auto-healing via TTL expiry and fail-closed behavior on Redis unavailability.

## Technical Context

**Language/Version**: Go 1.24.1
**Primary Dependencies**: go-redis/v9 (existing), gin-gonic (existing), zap (logging)
**Storage**: Redis (existing infrastructure, used for sessions and caching)
**Testing**: No framework currently (mock mode available via config)
**Target Platform**: Linux server (Docker container)
**Project Type**: Web application (Go backend + React frontend)
**Performance Goals**: Support 10+ API instances, <30s failover, polling intervals 4-120s
**Constraints**: Lease TTL 30s, renewal every 10s, fail-closed on Redis unavailability
**Scale/Scope**: Dynamic sessions (tens to hundreds), auto-scaling instance count

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | No new API models exposed to frontend; internal coordination only |
| II. Clean Code, No Dead Weight | PASS | New code only, no deprecated patterns |
| III. Function Documentation | REQUIRED | All exported functions will have godoc comments |
| IV. Backend as Source of Truth | PASS | Lease system is purely backend coordination |
| V. Format and Lint Always | REQUIRED | Will run `make prepare-for-commit` |
| VI. Interface-Driven Design | REQUIRED | LeaseManager interface for testability |
| VII. Consistent API Patterns | N/A | No new HTTP endpoints required |
| VIII. Simplicity Over Abstraction | PASS | Single-purpose lease coordination, no premature abstractions |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
api/
├── service/
│   └── lease/                    # NEW: Lease management package
│       ├── manager.go            # LeaseManager interface + implementation
│       ├── instance.go           # Instance ID generation + heartbeat
│       ├── rendezvous.go         # Rendezvous hashing for load balancing
│       └── lua_scripts.go        # Embedded Lua scripts for atomic ops
├── worker/
│   └── session_manager.go        # MODIFY: Integrate lease coordination
└── pkg/
    └── db/
        └── key_value/client.go   # EXISTING: Redis operations (SetNX, etc.)
```

**Structure Decision**: Backend-only change in existing `api/` structure. New `service/lease/` package follows existing service organization pattern. Worker integration modifies existing `session_manager.go`.

## Complexity Tracking

> No violations requiring justification. All constitution checks pass.

## Constitution Re-Check (Post Phase 1)

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Type Safety First | PASS | No frontend types; `LeaseManager` interface defined in contracts/ |
| II. Clean Code, No Dead Weight | PASS | All code serves specific purpose; no commented code |
| III. Function Documentation | VERIFIED | All exported functions in contracts/ have godoc comments |
| IV. Backend as Source of Truth | PASS | Lease state in Redis; no frontend involvement |
| V. Format and Lint Always | PENDING | Will verify at implementation |
| VI. Interface-Driven Design | VERIFIED | `LeaseManager` interface defined; enables mock implementation |
| VII. Consistent API Patterns | N/A | No HTTP endpoints added |
| VIII. Simplicity Over Abstraction | PASS | Single interface, 4 source files, no unnecessary patterns |

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/002-redis-poll-lease/plan.md` | Complete |
| Research Document | `specs/002-redis-poll-lease/research.md` | Complete |
| Data Model | `specs/002-redis-poll-lease/data-model.md` | Complete |
| Interface Contract | `specs/002-redis-poll-lease/contracts/lease_manager.go` | Complete |
| Quickstart Guide | `specs/002-redis-poll-lease/quickstart.md` | Complete |

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
