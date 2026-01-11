# Tasks: Distributed Polling Lease System

**Input**: Design documents from `/specs/002-redis-poll-lease/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - omitted from task list.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- Backend: `api/service/lease/` (new package)
- Worker: `api/worker/session_manager.go` (modify existing)
- Existing: `api/pkg/db/key_value/client.go` (use existing)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create lease package structure and foundational types

- [ ] T001 Create lease package directory at api/service/lease/
- [ ] T002 [P] Create types and constants in api/service/lease/types.go (LeaseState, LeaseInfo, LeaseConfig, LeaseEventType, LeaseEvent)
- [ ] T003 [P] Create Lua scripts as embedded strings in api/service/lease/lua_scripts.go (renew and release scripts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core lease infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement instance ID generation in api/service/lease/instance.go (hostname-bootTimestamp-randomSuffix format)
- [ ] T005 Implement heartbeat registration and refresh in api/service/lease/instance.go (poll:node:{instanceID} key with TTL)
- [ ] T006 Implement GetLiveNodes() in api/service/lease/instance.go (SCAN poll:node:* pattern)
- [ ] T007 Define LeaseManager interface in api/service/lease/manager.go (matching contracts/lease_manager.go)
- [ ] T008 Create LeaseManager struct with constructor NewLeaseManager() in api/service/lease/manager.go
- [ ] T009 Implement Start() method for LeaseManager in api/service/lease/manager.go (starts heartbeat and renewal loops)
- [ ] T010 Implement Stop() method for LeaseManager in api/service/lease/manager.go (releases all leases, stops loops)

**Checkpoint**: Foundation ready - LeaseManager can start, heartbeat, discover nodes, and stop cleanly

---

## Phase 3: User Story 1 - Automatic Work Distribution (Priority: P1)

**Goal**: Single instance acquires all leases; multiple instances distribute leases automatically

**Independent Test**: Start 1 instance → verify it polls all sessions. Start 2nd instance → verify redistribution.

### Implementation for User Story 1

- [ ] T011 [US1] Implement TryAcquire() in api/service/lease/manager.go (SET NX PX for poll:lease:{sessionID})
- [ ] T012 [US1] Implement Release() in api/service/lease/manager.go (conditional DEL via Lua script)
- [ ] T013 [US1] Implement IsOwned() in api/service/lease/manager.go (check cached ownedLeases map)
- [ ] T014 [US1] Implement OwnedSessions() in api/service/lease/manager.go (return keys from ownedLeases map)
- [ ] T015 [US1] Implement lease renewal loop in api/service/lease/manager.go (renew every 10s via Lua script)
- [ ] T016 [US1] Add structured logging for lease acquire success/failure in api/service/lease/manager.go
- [ ] T017 [US1] Modify SessionManager to inject LeaseManager dependency in api/worker/session_manager.go
- [ ] T018 [US1] Modify syncSessions() to call TryAcquire() before spawning publisher in api/worker/session_manager.go
- [ ] T019 [US1] Modify publishLoop() to check IsOwned() before each poll cycle in api/worker/session_manager.go

**Checkpoint**: Single instance acquires leases for all sessions; multiple instances divide leases (first-come wins)

---

## Phase 4: User Story 2 - Failover and Self-Healing (Priority: P1)

**Goal**: System recovers from instance failures within 30s; no duplicates during failover

**Independent Test**: Kill instance holding leases → verify another takes over within TTL

### Implementation for User Story 2

- [ ] T020 [US2] Implement lease state uncertainty handling in api/service/lease/manager.go (mark uncertain on renewal failure)
- [ ] T021 [US2] Modify publishLoop() to pause polling when lease state is uncertain in api/worker/session_manager.go
- [ ] T022 [US2] Implement periodic lease re-acquisition attempt for uncertain leases in api/service/lease/manager.go
- [ ] T023 [US2] Add structured logging for lease renewal success/failure in api/service/lease/manager.go
- [ ] T024 [US2] Add structured logging for lease release (voluntary/TTL expiry) in api/service/lease/manager.go
- [ ] T025 [US2] Modify SessionManager.Stop() to call LeaseManager.Stop() for graceful shutdown in api/worker/session_manager.go

**Checkpoint**: Instance crash causes TTL expiry; other instances take over; restarted instance gets new ID

---

## Phase 5: User Story 3 - Single Poller Guarantee (Priority: P2)

**Goal**: Each session polled by exactly one instance at any time; no duplicates

**Independent Test**: Run 5 instances simultaneously → verify each session acquired by exactly one via logs

### Implementation for User Story 3

- [ ] T026 [US3] Implement IsOwnedStrict() in api/service/lease/manager.go (query Redis GET to verify ownership)
- [ ] T027 [US3] Add pre-poll ownership verification using IsOwnedStrict() before critical polls in api/worker/session_manager.go
- [ ] T028 [US3] Add mutex protection for ownedLeases map in api/service/lease/manager.go (concurrent access safety)
- [ ] T029 [US3] Add log entry with instance ID and session ID on each successful poll start in api/worker/session_manager.go

**Checkpoint**: Logs show each session polled by exactly one instance; no overlap during transitions

---

## Phase 6: User Story 4 - Balanced Distribution (Priority: P3)

**Goal**: Leases distributed evenly across instances using rendezvous hashing

**Independent Test**: With 3 instances and 9 sessions → each handles approximately 3

### Implementation for User Story 4

- [ ] T030 [P] [US4] Implement rendezvous hash function using FNV-1a in api/service/lease/rendezvous.go
- [ ] T031 [US4] Implement PreferredOwner() in api/service/lease/rendezvous.go (compute highest weight node for session)
- [ ] T032 [US4] Implement IsPreferredOwner() in api/service/lease/manager.go (compare PreferredOwner with self)
- [ ] T033 [US4] Modify lease acquisition to prioritize preferred owner in api/service/lease/manager.go
- [ ] T034 [US4] Implement voluntary lease release when not preferred owner in api/service/lease/manager.go
- [ ] T035 [US4] Add node discovery refresh loop (every 10s) in api/service/lease/manager.go

**Checkpoint**: Leases distributed within 20% of ideal balance; rebalancing occurs when instances join/leave

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T036 [P] Add godoc comments to all exported functions in api/service/lease/*.go
- [ ] T037 Run make prepare-for-commit (generate, format, lint)
- [ ] T038 Validate implementation against quickstart.md test scenarios
- [ ] T039 Update api/cmd/app.go to initialize LeaseManager with SessionManager

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational completion
  - US1 and US2 are both P1 priority but US2 builds on US1's lease mechanics
  - US3 builds on US1/US2's basic leasing
  - US4 can be implemented after basic leasing works
- **Polish (Phase 7)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational - core lease acquire/release
- **User Story 2 (P1)**: Depends on US1 - extends with failure handling
- **User Story 3 (P2)**: Depends on US1/US2 - adds strict ownership verification
- **User Story 4 (P3)**: Depends on US1 - adds load balancing (can run parallel to US2/US3)

### Within Each Phase

- Types before implementation
- Instance management before lease management
- Manager interface before methods
- Logging integrated with each feature

### Parallel Opportunities

- T002, T003 can run in parallel (different files)
- T030 can run in parallel with other US4 tasks (separate file)
- T036 can run in parallel with T038 (different concerns)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch in parallel:
Task: "Create types and constants in api/service/lease/types.go"
Task: "Create Lua scripts as embedded strings in api/service/lease/lua_scripts.go"
```

## Parallel Example: User Story 4

```bash
# T030 can start immediately (separate file):
Task: "Implement rendezvous hash function using FNV-1a in api/service/lease/rendezvous.go"
# Then sequential for dependent tasks in manager.go
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T019)
4. **STOP and VALIDATE**: Test with 2 instances, verify lease distribution
5. Deploy if basic coordination working

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add User Story 1 → Basic lease distribution working (MVP)
3. Add User Story 2 → Failover and self-healing
4. Add User Story 3 → Strict single-poller guarantee
5. Add User Story 4 → Balanced distribution via rendezvous hashing
6. Polish → Documentation and final validation

### Recommended Order

Since US1 and US2 are both P1 priority and US2 extends US1:
1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2)
2. Then Phase 5 (US3) and Phase 6 (US4) can proceed
3. Finally Phase 7 (Polish)

---

## Notes

- No new HTTP endpoints - purely internal coordination
- Existing key_value.Client provides SetNX, Get, Set operations
- Redis Lua scripts embedded as Go strings using redis.NewScript()
- Structured logging via existing pkg/log zap logger
- Total tasks: 39
- Tasks per story: US1=9, US2=6, US3=4, US4=6
- Setup=3, Foundational=7, Polish=4
