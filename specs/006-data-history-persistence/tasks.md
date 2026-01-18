# Tasks: Data History Persistence

**Input**: Design documents from `/specs/006-data-history-persistence/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/` (Go)
- **Frontend**: `dashboard/src/` (TypeScript/React)

---

## Phase 1: Setup (Configuration)

**Purpose**: Add required configuration for data history feature

- [x] T001 Add MaxSampleGameDuration field to config struct in api/pkg/config/config.go
- [x] T002 Parse SD_MAX_SAMPLE_GAME_DURATION env var in api/pkg/config/environment.go (fail if not set)

---

## Phase 2: Foundational (Core Models & Infrastructure)

**Purpose**: Core models and Redis operations that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create GameTimeOffset struct in api/models/models/game_time.go
- [x] T004 [P] Create DataPoint struct in api/models/models/data_point.go
- [x] T005 [P] Create HistoryChunk struct in api/models/models/history_chunk.go
- [x] T006 Add GameTimeID field to SatisfactoryEvent struct in api/models/models/satisfactory_event.go
- [x] T007 Add ZSET operations to Redis client (ZAdd, ZRangeByScore, ZRemRangeByScore) in api/pkg/db/key_value/client.go
- [x] T008 Run make generate to sync TypeScript types in dashboard/src/apiTypes.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Historical Factory Statistics (Priority: P1) 🎯 MVP

**Goal**: Store historical data with game-time identifiers and provide REST endpoint for retrieval

**Independent Test**: Create session, wait for data collection, query `/v1/sessions/{id}/history/prodStats` and verify data points with game-time IDs are returned

### Implementation for User Story 1

- [x] T009 [US1] Create GameTimeTracker service with CurrentGameTime() method in api/service/session/game_time.go
- [x] T010 [US1] Add history storage functions (StoreHistoryPoint, GetHistory) in api/service/session/cache.go
- [x] T011 [US1] Track currentSaveName in session publisher context in api/worker/session_manager.go
- [x] T012 [US1] Integrate GameTimeTracker into session publisher in api/worker/session_manager.go
- [x] T013 [US1] Store data points to Redis ZSET for history-enabled types (circuits, generatorStats, prodStats, factoryStats, sinkStats) in api/worker/session_manager.go
- [x] T014 [P] [US1] Create GetHistory handler in api/routers/api/v1/history.go
- [x] T015 [P] [US1] Create ListHistorySaves handler in api/routers/api/v1/history.go
- [x] T016 [US1] Create HistoryRoutingGroup with routes in api/routers/routes/history.go
- [x] T017 [US1] Register HistoryRoutingGroup in api/routers/routes/routes.go
- [x] T018 [US1] Add Swagger annotations to history handlers and run swag init

**Checkpoint**: User Story 1 complete - historical data is stored and queryable via REST

---

## Phase 4: User Story 2 - Receive Incremental Data Updates via SSE (Priority: P1)

**Goal**: SSE events include gameTimeId so clients can track position and avoid duplicates

**Independent Test**: Connect to SSE stream, receive events, verify each event for history-enabled types includes a gameTimeId field

### Implementation for User Story 2

- [x] T019 [US2] Modify event publishing to include gameTimeId for history-enabled types in api/worker/session_manager.go
- [x] T020 [P] [US2] Create historyService with fetchHistory function in dashboard/src/services/historyService.ts
- [x] T021 [US2] Create useHistoryData hook for initial fetch + SSE updates in dashboard/src/hooks/useHistoryData.ts
- [x] T022 [US2] Ensure useHistoryData filters SSE events by gameTimeId > lastKnownId

**Checkpoint**: User Story 2 complete - clients can receive incremental updates without duplicates

---

## Phase 5: User Story 3 - Configure Data Retention Limits (Priority: P2)

**Goal**: Prune old data points based on SD_MAX_SAMPLE_GAME_DURATION to bound storage

**Independent Test**: Set SD_MAX_SAMPLE_GAME_DURATION=60 (1 minute), generate data for 2 minutes, verify only last 1 minute of data exists

### Implementation for User Story 3

- [x] T023 [US3] Add pruneOldHistory function using ZRemRangeByScore in api/service/session/cache.go
- [x] T024 [US3] Call pruneOldHistory after each data point insertion in api/worker/session_manager.go
- [x] T025 [US3] Pass maxDuration from config to pruning logic

**Checkpoint**: User Story 3 complete - storage is bounded by configured duration

---

## Phase 6: User Story 4 - Handle Save File Time Discontinuities (Priority: P3)

**Goal**: Detect time going backward (save rollback) and handle gracefully by overwriting future data

**Independent Test**: Store data at game-time 1000, simulate rollback to game-time 500, store new data, verify data at 500+ overwrites old data

### Implementation for User Story 4

- [x] T026 [US4] Add time discontinuity detection in GameTimeTracker (compare new offset vs previous) in api/service/session/game_time.go
- [x] T027 [US4] Log discontinuity events when detected in api/service/session/game_time.go
- [x] T028 [US4] Ensure ZADD uses game-time as both score AND part of member key to enable overwrites in api/service/session/cache.go

**Checkpoint**: User Story 4 complete - save rollbacks are handled gracefully

---

## Phase 7: User Story 5 - Configurable History Data Range in UI (Priority: P1)

**Goal**: Allow users to configure how much historical data to fetch on session load and maintain in memory via Settings UI. On session load, fetch historical data up to the configured range. When SSE events arrive, append new data and prune old data to maintain the configured range.

**Independent Test**: Open Settings, change data range to "1 min", load a session, verify only ~1 minute of historical data is fetched. Let SSE events come in, verify old data is pruned to maintain ~1 minute. Change setting to "All time", verify refetch loads all available data.

### Implementation for User Story 5

- [x] T034 [US5] Add historyDataRange field to Settings type in dashboard/src/types.ts with type HistoryDataRange (predefined values or custom seconds)
- [x] T035 [US5] Create HistoryDataRange type with predefined values (60, 120, 180, 240, 300, 600, 3600, 28800, -1 for all time, or custom number) in dashboard/src/types.ts
- [x] T036 [US5] Update defaultSettings in dashboard/src/hooks/use-settings.ts to include historyDataRange: 300 (5 minutes default)
- [x] T037 [US5] Add "Data History" Card to Settings page in dashboard/src/sections/settings/view/settings-view.tsx
- [x] T038 [US5] Implement Select component with predefined options (1 min, 2 min, 3 min, 4 min, 5 min, 10 min, 60 min, 8 hours, All time, Custom) in settings-view.tsx
- [x] T039 [US5] Add custom input field for entering seconds when "Custom" is selected in settings-view.tsx
- [x] T040 [US5] Persist historyDataRange to localStorage via saveSettings when changed in settings-view.tsx
- [x] T041 [US5] Modify useHistoryData hook to accept historyDataRange parameter in dashboard/src/hooks/useHistoryData.ts
- [x] T042 [US5] Modify historyService.fetchHistory to calculate 'since' parameter based on historyDataRange (currentGameTime - range) in dashboard/src/services/historyService.ts
- [x] T043 [US5] Implement client-side pruning logic in useHistoryData: on SSE append, remove data points older than (latestId - historyDataRange) unless range is -1 (all time) in dashboard/src/hooks/useHistoryData.ts
- [x] T044 [US5] Trigger refetch when historyDataRange setting changes by adding it to useHistoryData's dependency array or via effect in useHistoryData.ts
- [x] T045 [US5] Update components that use useHistoryData to pass historyDataRange from settings context

**Checkpoint**: User Story 5 complete - users can configure how much historical data to display, settings persist, and data is pruned client-side to match the configured range

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T029 [P] Add validation for dataType parameter (reject non-history types) in api/routers/api/v1/history.go
- [x] T030 [P] Add logging for history operations (store, query, prune) across api/service/session/cache.go
- [x] T031 Run make lint and make format to ensure code quality
- [x] T032 Run make prepare-for-commit to verify all checks pass
- [x] T033 Manual validation using quickstart.md test scenarios
- [x] T046 Run make lint and make format after User Story 5 implementation
- [x] T047 Test edge cases: custom value validation (min 1 second, max reasonable value), "All time" with large datasets
- [x] T048 Manual validation of history data range settings using quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed sequentially
  - US3 depends on US1 (needs history storage working)
  - US4 depends on US1 (needs history storage working)
- **User Story 5 (Phase 7)**: Depends on US1 and US2 completion (needs history fetch and SSE updates working)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Uses gameTimeId from US1 but is independently testable
- **User Story 3 (P2)**: Can start after US1 - Requires history storage to exist
- **User Story 4 (P3)**: Can start after US1 - Requires history storage to exist
- **User Story 5 (P1)**: Can start after US2 - Requires useHistoryData hook and historyService to exist

### Within Each User Story

- Models/structs before services
- Services before handlers
- Backend before frontend (for type generation)
- Handlers before route registration

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T003, T004, T005 can run in parallel (different model files)

**Phase 3 (US1)**:
- T014, T015 can run in parallel (different handlers in same file, but independent)

**Phase 4 (US2)**:
- T020 can run in parallel with T019 (frontend vs backend)

**Phase 7 (US5)**:
- T034, T035 can run in parallel (both in types.ts but independent type definitions)
- T037, T038, T039 must be sequential (all modifying settings-view.tsx)
- T041, T042, T043 must be sequential (building on hook and service changes)

**Phase 8 (Polish)**:
- T029, T030 can run in parallel (different files)
- T046, T047, T048 should be sequential (verify quality then test)

---

## Parallel Example: Foundational Phase

```bash
# Launch all model creation tasks together:
Task: "Create GameTimeOffset struct in api/models/models/game_time.go"
Task: "Create DataPoint struct in api/models/models/data_point.go"
Task: "Create HistoryChunk struct in api/models/models/history_chunk.go"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T008)
3. Complete Phase 3: User Story 1 (T009-T018)
4. **STOP and VALIDATE**: Test historical data storage and retrieval
5. Deploy/demo if ready - users can view history!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Historical data visible (MVP!)
3. Add User Story 2 → Test independently → Efficient SSE updates
4. Add User Story 3 → Test independently → Bounded storage
5. Add User Story 4 → Test independently → Robust save handling
6. Add User Story 5 → Test independently → User-configurable data range with UI settings
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `make generate` after model changes to keep frontend types in sync
- All handlers require Swagger annotations per constitution
