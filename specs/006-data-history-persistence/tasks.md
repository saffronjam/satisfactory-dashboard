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

- [ ] T001 Add MaxSampleGameDuration field to config struct in api/pkg/config/config.go
- [ ] T002 Parse SD_MAX_SAMPLE_GAME_DURATION env var in api/pkg/config/environment.go (fail if not set)

---

## Phase 2: Foundational (Core Models & Infrastructure)

**Purpose**: Core models and Redis operations that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Create GameTimeOffset struct in api/models/models/game_time.go
- [ ] T004 [P] Create DataPoint struct in api/models/models/data_point.go
- [ ] T005 [P] Create HistoryChunk struct in api/models/models/history_chunk.go
- [ ] T006 Add GameTimeID field to SatisfactoryEvent struct in api/models/models/satisfactory_event.go
- [ ] T007 Add ZSET operations to Redis client (ZAdd, ZRangeByScore, ZRemRangeByScore) in api/pkg/db/key_value/client.go
- [ ] T008 Run make generate to sync TypeScript types in dashboard/src/apiTypes.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Historical Factory Statistics (Priority: P1) 🎯 MVP

**Goal**: Store historical data with game-time identifiers and provide REST endpoint for retrieval

**Independent Test**: Create session, wait for data collection, query `/v1/sessions/{id}/history/prodStats` and verify data points with game-time IDs are returned

### Implementation for User Story 1

- [ ] T009 [US1] Create GameTimeTracker service with CurrentGameTime() method in api/service/session/game_time.go
- [ ] T010 [US1] Add history storage functions (StoreHistoryPoint, GetHistory) in api/service/session/cache.go
- [ ] T011 [US1] Track currentSaveName in session publisher context in api/worker/session_manager.go
- [ ] T012 [US1] Integrate GameTimeTracker into session publisher in api/worker/session_manager.go
- [ ] T013 [US1] Store data points to Redis ZSET for history-enabled types (circuits, generatorStats, prodStats, factoryStats, sinkStats) in api/worker/session_manager.go
- [ ] T014 [P] [US1] Create GetHistory handler in api/routers/api/v1/history.go
- [ ] T015 [P] [US1] Create ListHistorySaves handler in api/routers/api/v1/history.go
- [ ] T016 [US1] Create HistoryRoutingGroup with routes in api/routers/routes/history.go
- [ ] T017 [US1] Register HistoryRoutingGroup in api/routers/routes/routes.go
- [ ] T018 [US1] Add Swagger annotations to history handlers and run swag init

**Checkpoint**: User Story 1 complete - historical data is stored and queryable via REST

---

## Phase 4: User Story 2 - Receive Incremental Data Updates via SSE (Priority: P1)

**Goal**: SSE events include gameTimeId so clients can track position and avoid duplicates

**Independent Test**: Connect to SSE stream, receive events, verify each event for history-enabled types includes a gameTimeId field

### Implementation for User Story 2

- [ ] T019 [US2] Modify event publishing to include gameTimeId for history-enabled types in api/worker/session_manager.go
- [ ] T020 [P] [US2] Create historyService with fetchHistory function in dashboard/src/services/historyService.ts
- [ ] T021 [US2] Create useHistoryData hook for initial fetch + SSE updates in dashboard/src/hooks/useHistoryData.ts
- [ ] T022 [US2] Ensure useHistoryData filters SSE events by gameTimeId > lastKnownId

**Checkpoint**: User Story 2 complete - clients can receive incremental updates without duplicates

---

## Phase 5: User Story 3 - Configure Data Retention Limits (Priority: P2)

**Goal**: Prune old data points based on SD_MAX_SAMPLE_GAME_DURATION to bound storage

**Independent Test**: Set SD_MAX_SAMPLE_GAME_DURATION=60 (1 minute), generate data for 2 minutes, verify only last 1 minute of data exists

### Implementation for User Story 3

- [ ] T023 [US3] Add pruneOldHistory function using ZRemRangeByScore in api/service/session/cache.go
- [ ] T024 [US3] Call pruneOldHistory after each data point insertion in api/worker/session_manager.go
- [ ] T025 [US3] Pass maxDuration from config to pruning logic

**Checkpoint**: User Story 3 complete - storage is bounded by configured duration

---

## Phase 6: User Story 4 - Handle Save File Time Discontinuities (Priority: P3)

**Goal**: Detect time going backward (save rollback) and handle gracefully by overwriting future data

**Independent Test**: Store data at game-time 1000, simulate rollback to game-time 500, store new data, verify data at 500+ overwrites old data

### Implementation for User Story 4

- [ ] T026 [US4] Add time discontinuity detection in GameTimeTracker (compare new offset vs previous) in api/service/session/game_time.go
- [ ] T027 [US4] Log discontinuity events when detected in api/service/session/game_time.go
- [ ] T028 [US4] Ensure ZADD uses game-time as both score AND part of member key to enable overwrites in api/service/session/cache.go

**Checkpoint**: User Story 4 complete - save rollbacks are handled gracefully

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T029 [P] Add validation for dataType parameter (reject non-history types) in api/routers/api/v1/history.go
- [ ] T030 [P] Add logging for history operations (store, query, prune) across api/service/session/cache.go
- [ ] T031 Run make lint and make format to ensure code quality
- [ ] T032 Run make prepare-for-commit to verify all checks pass
- [ ] T033 Manual validation using quickstart.md test scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority and can proceed sequentially
  - US3 depends on US1 (needs history storage working)
  - US4 depends on US1 (needs history storage working)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Uses gameTimeId from US1 but is independently testable
- **User Story 3 (P2)**: Can start after US1 - Requires history storage to exist
- **User Story 4 (P3)**: Can start after US1 - Requires history storage to exist

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

**Phase 7 (Polish)**:
- T029, T030 can run in parallel (different files)

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
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `make generate` after model changes to keep frontend types in sync
- All handlers require Swagger annotations per constitution
