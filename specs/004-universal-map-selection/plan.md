# Implementation Plan: Universal Map Selection

**Branch**: `004-universal-map-selection` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-universal-map-selection/spec.md`

## Summary

Replace the Machine Groups feature with a universal selection system that allows selecting any visible entity on the map (buildings, vehicles, infrastructure, special structures). Selected entities display aggregated statistics in a "Selection" tab with sub-tabs (Items, Buildings, Power, Vehicles) that dynamically show/hide based on selection content. Includes persistent selection highlighting and complete removal of machine group code.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend), React 18.3
**Primary Dependencies**: React, Leaflet, Material-UI 6, zustand (for potential state management)
**Storage**: localStorage (map settings persistence)
**Testing**: Manual testing with mock mode
**Target Platform**: Web browser (desktop + mobile)
**Project Type**: Web application (frontend-only feature)
**Performance Goals**: Selection aggregation < 100ms, handle 1000+ entities without lag
**Constraints**: Maintain existing sidebar patterns, preserve single-click dedicated views
**Scale/Scope**: ~50 selectable entity types across buildings, vehicles, infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | ✅ Pass | New types defined in types.ts, follows existing patterns |
| II. Clean Code, No Dead Weight | ✅ Pass | Machine group code will be completely removed |
| III. Function Documentation | ✅ Will comply | New exported functions will have JSDoc |
| IV. Backend as Source of Truth | ✅ Pass | Frontend-only feature, uses existing backend data |
| V. Format and Lint Always | ✅ Will comply | Run `make lint` and `make format` |
| VI. Interface-Driven Design | N/A | Frontend-only change |
| VII. Consistent API Patterns | N/A | No API changes |
| VIII. Simplicity Over Abstraction | ✅ Pass | Follows existing sidebar/selection patterns |

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/004-universal-map-selection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A - no API changes
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
dashboard/src/
├── types.ts                              # SelectableEntity, Selection types
├── sections/map/
│   ├── view/map-view.tsx                # Selection state, settings
│   ├── selectionSidebar.tsx             # Selection tab rendering
│   ├── mapSidebar.tsx                   # Sidebar container (unchanged)
│   ├── utils.ts                         # REMOVE: grouping algorithms
│   ├── overlay/
│   │   ├── Overlay.tsx                  # Layer rendering
│   │   └── components/
│   │       ├── SelectionRectangle.tsx   # Modified for universal selection
│   │       ├── MachineGroupMarkers.tsx  # REMOVE entirely
│   │       ├── SelectionHighlight.tsx   # NEW: persistent highlights
│   │       └── VehicleLayers.tsx        # Add selection support
│   └── layers/
│       ├── buildingsCanvasLayer.tsx     # Add selection support
│       ├── hubLayer.tsx                 # Already selectable
│       ├── radarTowerLayer.tsx          # Already selectable
│       └── spaceElevatorLayer.tsx       # Already selectable
```

**Structure Decision**: Frontend-only changes within existing `dashboard/src/sections/map/` structure. New `SelectionHighlight.tsx` component for persistent highlighting.

## Complexity Tracking

> No violations requiring justification.
