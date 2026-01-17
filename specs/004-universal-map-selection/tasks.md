# Tasks: Universal Map Selection

**Input**: Design documents from `/specs/004-universal-map-selection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not requested - manual testing with mock mode per spec

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `dashboard/src/` (React/TypeScript)
- No backend changes required for this feature

---

## Phase 1: Setup (Type Definitions)

**Purpose**: Define new types and prepare type system for universal selection

- [x] T001 [P] Add `SelectableEntity` union type in dashboard/src/types.ts
- [x] T002 [P] Add `Selection` interface with aggregated statistics in dashboard/src/types.ts
- [x] T003 Update `SelectedMapItem` union type to include `selection` type in dashboard/src/types.ts
- [x] T004 [P] Add `showSelection` field to `PersistedMapState` interface in dashboard/src/sections/map/view/map-view.tsx

---

## Phase 2: Foundational (Selection Infrastructure)

**Purpose**: Core selection utilities that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `useSelection` hook for selection state management in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T006 Implement `createSelection` function to build Selection from entities array in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T007 Implement `computeSelectionAggregates` function for power/items/counts in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T008 Add entity position helpers (getEntityPosition, getEntityBounds) in dashboard/src/sections/map/utils.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Multi-Select Any Map Entity (Priority: P1) 🎯 MVP

**Goal**: Enable selection of any visible entity type via selection rectangle or Ctrl+click

**Independent Test**: Drag selection rectangle over mixed entity types (factory, train, radar tower) and verify all are selected

### Implementation for User Story 1

- [x] T009 [US1] Extend SelectionRectangle to collect all visible entities within bounds in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T010 [US1] Add entity type detection helpers (isMachine, isVehicle, isInfrastructure, isSpecialEntity) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T011 [US1] Implement bounds intersection for buildings (use existing bounding box data) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T012 [US1] Implement bounds intersection for vehicles (marker positions) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T013 [US1] Implement bounds intersection for infrastructure (polyline segments) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T014 [US1] Implement bounds intersection for special entities (HUB, Space Elevator, Radar Towers) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T015 [US1] Add Ctrl+click handler for additive entity selection in dashboard/src/sections/map/view/map-view.tsx
- [x] T016 [US1] Update selection state to use new Selection type in dashboard/src/sections/map/view/map-view.tsx
- [x] T017 [US1] Filter entities by layer visibility (only select from enabled layers) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx
- [x] T018 [US1] Add empty selection handling (clear selection when rectangle contains no entities) in dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx

**Checkpoint**: Users can multi-select any visible entity type. Selection state is maintained.

---

## Phase 4: User Story 2 - Selection Tab with Aggregated Statistics (Priority: P2)

**Goal**: Display aggregated statistics in Selection tab with sub-tabs (Items, Buildings, Power, Vehicles)

**Independent Test**: Select 3+ entities of different types and verify Selection tab shows correct sub-tabs with aggregated statistics

### Implementation for User Story 2

- [x] T019 [US2] Create `renderSelection` function in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T020 [US2] Implement sub-tab state management (active sub-tab) in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T021 [US2] Implement Items sub-tab with production/consumption rates in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T022 [US2] Implement Buildings sub-tab with entity counts by type in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T023 [US2] Implement Power sub-tab with consumption/production totals in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T024 [US2] Implement Vehicles sub-tab with docked trains/drones list in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T025 [US2] Add sub-tab visibility logic (hide empty sub-tabs based on hasItems/hasPower/hasVehicles) in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T026 [US2] Add tab icon and label for Selection type in sidebar tab bar in dashboard/src/sections/map/selectionSidebar.tsx
- [x] T027 [US2] Handle edge case: infrastructure-only selection (only Buildings sub-tab visible) in dashboard/src/sections/map/selectionSidebar.tsx

**Checkpoint**: Selection tab displays correct sub-tabs with aggregated statistics based on selection content

---

## Phase 5: User Story 3 - Persistent Selection Display (Priority: P3)

**Goal**: Allow users to toggle persistent selection highlighting on the map

**Independent Test**: Enable "Show Selection" setting, make selection, verify highlights appear when Selection tab active and hide when switching tabs

### Implementation for User Story 3

- [x] T028 [US3] Create SelectionHighlight component in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T029 [US3] Implement highlight rendering for buildings (circles/rectangles at positions) in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T030 [US3] Implement highlight rendering for vehicles (circles at positions) in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T031 [US3] Implement highlight rendering for special entities in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T032 [US3] Add visibility logic (showSelection setting AND Selection tab active) in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T033 [US3] Add "Show Selection" toggle to map settings popover in dashboard/src/sections/map/view/map-view.tsx
- [x] T034 [US3] Add showSelection to localStorage persistence in dashboard/src/sections/map/view/map-view.tsx
- [x] T035 [US3] Render SelectionHighlight in Overlay component in dashboard/src/sections/map/overlay/Overlay.tsx

**Checkpoint**: Selection highlighting works correctly with setting toggle and tab-dependent visibility

---

## Phase 6: User Story 4 - Single-Click Entities Integrate with Multi-Select (Priority: P4)

**Goal**: Preserve single-click dedicated views while supporting Ctrl+click for multi-select

**Independent Test**: Single-click Radar Tower (dedicated view opens), then Ctrl+click factory (both selected, Selection tab shows aggregated stats)

### Implementation for User Story 4

- [x] T036 [US4] Update Radar Tower click handler to detect Ctrl/Cmd modifier in dashboard/src/sections/map/layers/radarTowerLayer.tsx
- [x] T037 [US4] Update HUB click handler to detect Ctrl/Cmd modifier in dashboard/src/sections/map/layers/hubLayer.tsx
- [x] T038 [US4] Update Space Elevator click handler to detect Ctrl/Cmd modifier in dashboard/src/sections/map/layers/spaceElevatorLayer.tsx
- [x] T039 [US4] Update Train Station click handler to detect Ctrl/Cmd modifier in dashboard/src/sections/map/overlay/components/VehicleLayers.tsx
- [x] T040 [US4] Update Drone Station click handler to detect Ctrl/Cmd modifier in dashboard/src/sections/map/overlay/components/VehicleLayers.tsx
- [x] T041 [US4] Implement addToSelection callback for modifier-click in dashboard/src/sections/map/view/map-view.tsx
- [x] T042 [US4] Add entity to existing Selection (merge and recalculate aggregates) in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T043 [US4] Remove entity from Selection on Ctrl+click if already selected in dashboard/src/sections/map/hooks/useSelection.ts

**Checkpoint**: Single-click opens dedicated views, Ctrl+click adds/removes from selection

---

## Phase 7: User Story 5 - Complete Removal of Machine Groups (Priority: P5)

**Goal**: Remove all machine group functionality from codebase

**Independent Test**: Search for "machineGroup", "groupDistance", "computeUnifiedGroups" returns no results; no "Machine Groups" in layers menu

### Implementation for User Story 5

- [x] T044 [US5] Delete MachineGroupMarkers.tsx file in dashboard/src/sections/map/overlay/components/
- [x] T045 [US5] Delete groupIconCreation.ts file in dashboard/src/sections/map/overlay/utils/
- [x] T046 [US5] Remove MachineGroup type from dashboard/src/types.ts
- [x] T047 [US5] Remove machineGroup, machineGroups, multiSelection from SelectedMapItem in dashboard/src/types.ts
- [x] T048 [US5] Remove MultiSelection interface from dashboard/src/types.ts
- [x] T049 [US5] Remove computeUnifiedGroups, UnionFind, zoomToGroupDistance, groupByDistance from dashboard/src/sections/map/utils.ts
- [x] T050 [US5] Remove groupDistance state from dashboard/src/sections/map/view/map-view.tsx
- [x] T051 [US5] Remove autoGroupByZoom state from dashboard/src/sections/map/view/map-view.tsx
- [x] T052 [US5] Remove Machine Groups layer toggle from layers popover in dashboard/src/sections/map/view/map-view.tsx
- [x] T053 [US5] Remove grouping slider from settings popover in dashboard/src/sections/map/view/map-view.tsx
- [x] T054 [US5] Remove auto-group checkbox from settings in dashboard/src/sections/map/view/map-view.tsx
- [x] T055 [US5] Remove MachineGroupMarkers rendering from dashboard/src/sections/map/overlay/Overlay.tsx
- [x] T056 [US5] Remove renderMachineGroup function from dashboard/src/sections/map/selectionSidebar.tsx
- [x] T057 [US5] Remove renderMachineGroups function from dashboard/src/sections/map/selectionSidebar.tsx
- [x] T058 [US5] Remove renderMultiSelection function from dashboard/src/sections/map/selectionSidebar.tsx
- [x] T059 [US5] Remove machine group category filters from layers popover in dashboard/src/sections/map/view/map-view.tsx
- [x] T060 [US5] Clean up any remaining machine group imports and references across all modified files

**Checkpoint**: All machine group code removed. Codebase search returns no matches.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, validation, and quality assurance

- [x] T061 [P] Add JSDoc comments to all new exported functions in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T062 [P] Add JSDoc comments to SelectionHighlight component in dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx
- [x] T063 Implement auto-removal of entities from selection when removed from game state in dashboard/src/sections/map/hooks/useSelection.ts
- [x] T064 Run `make lint` and fix any linting errors
- [x] T065 Run `make format` to ensure code formatting
- [x] T066 Run `make prepare-for-commit` for final validation
- [x] T067 Manual testing: Verify all acceptance scenarios from spec.md
- [x] T068 Performance testing: Select 1000+ entities and verify no UI lag

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): No dependencies on other stories - **MVP**
  - US2 (P2): Depends on US1 (needs selection state)
  - US3 (P3): Depends on US1 (needs selection state)
  - US4 (P4): Depends on US1 (needs selection infrastructure)
  - US5 (P5): Should be done LAST (removes code other stories might reference during development)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → US1 (Multi-Select) → US2 (Selection Tab)
                                                              → US3 (Persistent Display)
                                                              → US4 (Single-Click Integration)
                                                              → US5 (Remove Machine Groups) [LAST]
```

### Parallel Opportunities

- T001-T004: Setup tasks can run in parallel
- T009-T014: Entity type selection handlers can be developed in parallel
- T028-T031: Highlight rendering for different entity types can be parallel
- T036-T040: Click handler updates for different layers can be parallel
- T044-T060: Machine group removal tasks should be done in sequence to avoid conflicts
- T061-T062: Documentation tasks can run in parallel

---

## Parallel Example: User Story 1

```bash
# After T008 completes, launch entity selection handlers in parallel:
Task: "Implement bounds intersection for buildings" (T011)
Task: "Implement bounds intersection for vehicles" (T012)
Task: "Implement bounds intersection for infrastructure" (T013)
Task: "Implement bounds intersection for special entities" (T014)
```

## Parallel Example: User Story 3

```bash
# After T028 completes, launch highlight renderers in parallel:
Task: "Implement highlight rendering for buildings" (T029)
Task: "Implement highlight rendering for vehicles" (T030)
Task: "Implement highlight rendering for special entities" (T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T018)
4. **STOP and VALIDATE**: Test multi-select functionality independently
5. Users can now select any entity type - core value delivered

### Incremental Delivery

1. Setup + Foundational → Type system ready
2. Add US1 → Multi-select works → **MVP Complete**
3. Add US2 → Selection tab with statistics → Full visibility into selections
4. Add US3 → Persistent highlighting → Enhanced UX
5. Add US4 → Single-click integration → Backward compatibility confirmed
6. Add US5 → Machine groups removed → **Feature Complete**
7. Polish → Code quality and documentation

### Critical Path

```
T001 → T003 → T005-T008 → T009 → T015-T016 → T019-T027 → T044-T060 → T064-T068
       ↑                   ↑
       Types ready         Selection infrastructure ready
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **US5 (Machine Group Removal) MUST be done last** to avoid breaking references during development
- Verify with `grep -r "machineGroup" dashboard/src/` after US5 completion
- Run `make prepare-for-commit` before final commit
- All acceptance scenarios in spec.md should pass after T067
