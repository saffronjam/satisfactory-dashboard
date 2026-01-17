# Implementation Plan: Unlockables System

**Branch**: `005-unlockables` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-unlockables/spec.md`

## Summary

Implement a frontend unlockables system that displays locked features (Trains, Drones) with faded appearance and padlock icons until the corresponding game milestones are purchased. The system fetches schematic data from a new backend endpoint, uses a frontend mapping configuration to determine which milestones unlock which features, and updates in real-time via SSE events.

## Technical Context

**Language/Version**: Go 1.24 (backend), TypeScript 5.6 (frontend)
**Primary Dependencies**: Gin (HTTP), React 18, shadcn/ui, Tailwind CSS v4, Lucide React (icons)
**Storage**: Redis (session-scoped caching via existing infrastructure)
**Testing**: Mock client for backend, manual testing for frontend
**Target Platform**: Web application (Linux server backend, browser frontend)
**Project Type**: Web (separate frontend/backend)
**Performance Goals**: UI updates within 5 seconds of SSE event receipt (per SC-003)
**Constraints**: Fail-open behavior when schematic data unavailable
**Scale/Scope**: 2 lockable features initially (Trains, Drones), extensible mapping for future features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | PASS | New Schematic model in Go, auto-generated TypeScript types via `make generate` |
| II. Clean Code, No Dead Weight | PASS | No deprecated code, new focused feature |
| III. Function Documentation | PASS | All exported functions will have documentation |
| IV. Backend as Source of Truth | PASS | Schematic data flows FRM API → Redis → SSE → Frontend |
| V. Format and Lint Always | PASS | Will run `make prepare-for-commit` |
| VI. Interface-Driven Design | PASS | New methods added to existing Client interface |
| VII. Consistent API Patterns | PASS | New endpoint follows existing RoutingGroup pattern |
| VIII. Simplicity Over Abstraction | PASS | Simple mapping config, no complex abstractions |

## Project Structure

### Documentation (this feature)

```text
specs/005-unlockables/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
api/
├── models/models/
│   ├── schematic.go           # NEW: Schematic model
│   ├── satisfactory_event.go  # MODIFY: Add SatisfactoryEventSchematics
│   └── state.go               # MODIFY: Add Schematics field
├── routers/
│   ├── api/v1/
│   │   └── schematics.go      # NEW: Handler
│   └── routes/
│       └── schematics.go      # NEW: Route registration
├── service/
│   ├── client/client.go       # MODIFY: Add ListSchematics method
│   ├── frm_client/
│   │   ├── frm_models/models.go  # MODIFY: Add FRM schematic structs
│   │   └── schematics.go      # NEW: FRM client implementation
│   ├── mock_client/
│   │   └── schematics.go      # NEW: Mock implementation
│   └── session/cache.go       # MODIFY: Add schematics to cache

dashboard/src/
├── contexts/api/
│   ├── useApi.ts              # MODIFY: Add schematics to ApiData
│   └── ApiProvider.tsx        # MODIFY: Handle schematics SSE event
├── hooks/
│   └── use-unlockables.ts     # NEW: Hook for unlock status checking
├── components/
│   └── locked-feature/        # NEW: Locked page component
│       └── locked-feature.tsx
├── layouts/
│   ├── config-nav-dashboard.tsx  # MODIFY: Add lock status to nav items
│   └── dashboard/sidebar.tsx     # MODIFY: Render locked state
├── pages/
│   ├── trains.tsx             # MODIFY: Wrap with lock check
│   └── drones.tsx             # MODIFY: Wrap with lock check
└── config/
    └── unlockables.ts         # NEW: Feature-to-milestone mapping
```

**Structure Decision**: Web application pattern with existing api/ and dashboard/ directories. All new files follow established conventions.

## Complexity Tracking

No violations requiring justification. Design follows existing patterns.
