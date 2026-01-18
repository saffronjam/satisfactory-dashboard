# Implementation Plan: Data History Persistence

**Branch**: `006-data-history-persistence` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-data-history-persistence/spec.md`

## Summary

Implement historical data storage for time-series metrics (circuits, generatorStats, prodStats, factoryStats, sinkStats) using game-time identifiers derived from `TotalPlayDuration`. Data is stored per session per save name in Redis with configurable retention. Clients receive incremental updates via SSE with ID-based deduplication.

## Technical Context

**Language/Version**: Go 1.24 (backend), TypeScript 5.6 (frontend)
**Primary Dependencies**: Gin (HTTP), go-redis/v9, React 18, Material-UI 6
**Storage**: Redis (existing infrastructure)
**Testing**: Go test, mock client pattern
**Target Platform**: Linux server (Docker), web browsers
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Handle 4-second polling intervals for 5 data types per session without degradation
**Constraints**: SD_MAX_SAMPLE_GAME_DURATION env var required (no default)
**Scale/Scope**: Multiple concurrent sessions, each with independent save name histories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | Will use `make generate` after model changes |
| II. Clean Code, No Dead Weight | PASS | No deprecated code, clean implementation |
| III. Function Documentation | PASS | All exported functions will be documented |
| IV. Backend as Source of Truth | PASS | Backend stores history, frontend receives via SSE |
| V. Format and Lint Always | PASS | Will run `make lint` and `make format` |
| VI. Interface-Driven Design | PASS | Will extend client interface for game time |
| VII. Consistent API Patterns | PASS | Use RoutingGroup interface, RequestContext |
| VIII. Simplicity Over Abstraction | PASS | Direct Redis storage, no over-engineering |

## Project Structure

### Documentation (this feature)

```text
specs/006-data-history-persistence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── models/models/
│   ├── data_point.go          # NEW: DataPoint, HistoryChunk, GameTimeOffset
│   └── session.go             # MODIFY: Add SaveName tracking
├── service/
│   ├── client/client.go       # MODIFY: Add GetSessionInfo to interface
│   ├── session/
│   │   ├── cache.go           # MODIFY: Add history storage/retrieval
│   │   └── game_time.go       # NEW: GameTimeTracker for offset caching
│   └── frm_client/session.go  # EXISTS: GetSessionInfo already implemented
├── worker/
│   └── session_manager.go     # MODIFY: Integrate game time tracking, store history
├── routers/
│   ├── api/v1/
│   │   └── history.go         # NEW: History endpoint handler
│   └── routes/
│       └── history.go         # NEW: HistoryRoutingGroup
├── pkg/
│   └── config/
│       ├── config.go          # MODIFY: Add MaxSampleGameDuration field
│       └── environment.go     # MODIFY: Parse SD_MAX_SAMPLE_GAME_DURATION

dashboard/src/
├── services/
│   └── history.ts      # NEW: Fetch history, track last ID
├── hooks/
│   └── useHistoryData.ts      # NEW: Hook for history with SSE updates
└── apiTypes.ts                # AUTO-GENERATED via make generate
```

**Structure Decision**: Extends existing web application structure. Backend additions follow established patterns (models in models/, handlers in routers/api/v1/, routes in routers/routes/). Frontend additions follow existing service/hook pattern.

## Complexity Tracking

No constitution violations requiring justification.
