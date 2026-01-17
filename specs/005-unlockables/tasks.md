# Tasks: Unlockables System

**Input**: Design documents from `/specs/005-unlockables/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated tests requested. Manual testing via mock mode and real FRM API.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/` directory
- **Frontend**: `dashboard/src/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Backend schematic model and endpoint foundation

- [x] T001 [P] Create Schematic model in api/models/models/schematic.go
- [x] T002 [P] Add FRM Schematic struct in api/service/frm_client/frm_models/models.go
- [x] T003 Add SatisfactoryEventSchematics constant in api/models/models/satisfactory_event.go
- [x] T004 Add Schematics field to State struct in api/models/models/state.go

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Complete backend schematics pipeline - MUST be complete before ANY user story

**⚠️ CRITICAL**: No frontend work can begin until this phase is complete

- [x] T005 Add ListSchematics method to Client interface in api/service/client/client.go
- [x] T006 [P] Create FRM client ListSchematics implementation in api/service/frm_client/schematics.go
- [x] T007 [P] Create mock client ListSchematics implementation in api/service/mock_client/schematics.go
- [x] T008 Add schematics to polling loop in api/service/frm_client/client.go (30s interval)
- [x] T009 Add schematics to mock polling loop in api/service/mock_client/client.go
- [x] T010 Add schematics retrieval to GetCachedState in api/service/session/cache.go
- [x] T011 [P] Create ListSchematics handler in api/routers/api/v1/schematics.go
- [x] T012 [P] Create schematics route registration in api/routers/routes/schematics.go
- [x] T013 Register schematics routes in api/routers/routes/routes.go RoutingGroups()
- [x] T014 Run swag init in api/ directory to regenerate Swagger docs
- [x] T015 Run make generate to create TypeScript types from Go models

**Checkpoint**: Backend schematics endpoint complete - frontend integration can begin

---

## Phase 3: User Story 1 - Locked Feature Visibility (Priority: P1) 🎯 MVP

**Goal**: Display locked navigation items with faded appearance and padlock icon

**Independent Test**: Navigate to dashboard before unlocking Monorail Train Technology - trains nav item should appear locked with padlock icon and faded styling

### Implementation for User Story 1

- [x] T016 [P] [US1] Add schematics to ApiData interface in dashboard/src/contexts/api/useApi.ts
- [x] T017 [P] [US1] Create unlockables config with LOCKABLE_FEATURES array in dashboard/src/config/unlockables.ts
- [x] T018 [US1] Add schematics SSE event handler case in dashboard/src/contexts/api/ApiProvider.tsx
- [x] T019 [US1] Create useUnlockables hook in dashboard/src/hooks/use-unlockables.ts
- [x] T020 [US1] Add locked property to nav item type in dashboard/src/layouts/config-nav-dashboard.tsx
- [x] T021 [US1] Integrate useUnlockables into nav data generation in dashboard/src/layouts/config-nav-dashboard.tsx
- [x] T022 [US1] Add locked state styling (opacity + padlock icon) to NavItemComponent in dashboard/src/layouts/dashboard/sidebar.tsx

**Checkpoint**: Locked navigation items visible with faded styling and padlock icons

---

## Phase 4: User Story 2 - Locked Page Access Prevention (Priority: P1)

**Goal**: Show locked state screen with large padlock and unlock requirements when navigating to locked pages

**Independent Test**: Navigate directly to /trains URL before unlocking milestone - page shows locked state with "Monorail Train Technology (Tier 6)" requirement

### Implementation for User Story 2

- [x] T023 [P] [US2] Create LockedFeature component in dashboard/src/components/locked-feature/locked-feature.tsx
- [x] T024 [US2] Update trains page to use lock check wrapper in dashboard/src/pages/trains.tsx
- [x] T025 [US2] Update drones page to use lock check wrapper in dashboard/src/pages/drones.tsx

**Checkpoint**: Locked pages show large padlock with milestone name and tier requirement

---

## Phase 5: User Story 3 - Real-time Unlock Updates (Priority: P2)

**Goal**: UI updates automatically when milestones are purchased in-game via SSE

**Independent Test**: With dashboard open, purchase "Monorail Train Technology" in-game - trains nav and page update to unlocked state automatically

### Implementation for User Story 3

- [x] T026 [US3] Verify schematics SSE event triggers re-render of nav items in dashboard/src/layouts/dashboard/sidebar.tsx
- [x] T027 [US3] Verify locked page transitions to unlocked content when schematic updates in dashboard/src/pages/trains.tsx
- [x] T028 [US3] Add fail-open behavior (treat as unlocked) when schematics unavailable in dashboard/src/hooks/use-unlockables.ts

**Checkpoint**: Real-time unlock updates work via SSE without page refresh

---

## Phase 6: User Story 4 - Configurable Feature Locks (Priority: P3)

**Goal**: New lockable features can be added via configuration only

**Independent Test**: Add a new entry to LOCKABLE_FEATURES - corresponding page respects lock state

### Implementation for User Story 4

- [x] T029 [US4] Add JSDoc documentation to LockableFeature interface in dashboard/src/config/unlockables.ts
- [x] T030 [US4] Add console.warn for milestone name mismatches in dashboard/src/hooks/use-unlockables.ts

**Checkpoint**: Adding new lockable features requires only config changes

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and code quality

- [x] T031 Run make prepare-for-commit (generate, format, lint)
- [x] T032 Test all acceptance scenarios with mock mode enabled
- [x] T033 Verify fail-open behavior when schematics endpoint unavailable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all frontend work
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority but US1 should complete first (nav before pages)
  - US3 and US4 can proceed after US1+US2
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates core hook and nav integration
- **User Story 2 (P1)**: Depends on US1 hook (useUnlockables) - Adds locked page component
- **User Story 3 (P2)**: Depends on US1+US2 - Validates SSE reactivity
- **User Story 4 (P3)**: Depends on US1 - Adds documentation and edge case handling

### Within Each Phase

- Backend models before interface methods
- Interface methods before implementations
- FRM client before mock client
- Handler before routes
- Type generation before frontend integration
- Hook before components using hook
- Nav config before sidebar rendering

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001, T002 can run in parallel (different files)

**Phase 2 (Foundational)**:
- T006, T007 can run in parallel (FRM vs mock client)
- T011, T012 can run in parallel (handler vs routes)

**Phase 3 (US1)**:
- T016, T017 can run in parallel (ApiData vs config)

**Phase 4 (US2)**:
- T023 runs alone, then T024, T025 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T005 (interface method):
# Launch FRM and mock implementations in parallel:
Task: "T006 [P] Create FRM client ListSchematics in api/service/frm_client/schematics.go"
Task: "T007 [P] Create mock client ListSchematics in api/service/mock_client/schematics.go"

# After T010 (cache):
# Launch handler and routes in parallel:
Task: "T011 [P] Create ListSchematics handler in api/routers/api/v1/schematics.go"
Task: "T012 [P] Create schematics route registration in api/routers/routes/schematics.go"
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Setup (backend models)
2. Complete Phase 2: Foundational (backend endpoint + type generation)
3. Complete Phase 3: User Story 1 (locked nav visibility)
4. Complete Phase 4: User Story 2 (locked page component)
5. **STOP and VALIDATE**: Test locked nav and page independently
6. Deploy/demo MVP

### Incremental Delivery

1. Complete Setup + Foundational → Backend ready
2. Add User Story 1 → Locked nav visible → Demo
3. Add User Story 2 → Locked pages work → Demo (MVP complete!)
4. Add User Story 3 → Real-time updates → Demo
5. Add User Story 4 → Configurable → Final release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 but have natural ordering (nav before pages)
- Backend must be complete before any frontend work
- Run `make generate` after backend changes to sync TypeScript types
- Test with `mock: true` in config for development
