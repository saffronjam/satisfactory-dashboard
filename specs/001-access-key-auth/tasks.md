# Tasks: Access Key Authentication

**Input**: Design documents from `/specs/001-access-key-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - manual testing per quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/` (Go with Gin)
- **Frontend**: `dashboard/src/` (React with TypeScript)

---

## Phase 1: Setup

**Purpose**: Configuration and dependency setup

- [x] T001 Add `SD_BOOTSTRAP_PASSWORD` env var to config in `api/pkg/config/config.go`
- [x] T002 [P] Add `golang.org/x/crypto/bcrypt` dependency to `api/go.mod`
- [x] T003 [P] Add `golang.org/x/time/rate` dependency to `api/go.mod`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create auth models in `api/models/models/auth.go` (LoginRequest, LoginResponse, AuthStatusResponse, ChangePasswordRequest, ChangePasswordResponse, LogoutResponse)
- [x] T005 Run `make generate` to create TypeScript types in `dashboard/src/apiTypes.ts`
- [x] T006 Create auth service in `api/service/auth/auth.go` with password hashing (bcrypt), token generation (crypto/rand), Redis storage
- [x] T007 [P] Create rate limiter in `api/service/auth/rate_limiter.go` (5 requests/min/IP using sync.Map + rate.Limiter)
- [x] T008 Create auth middleware in `api/routers/api/v1/middleware/auth.go` for token validation and TTL refresh
- [x] T009 Create auth routing group in `api/routers/routes/auth.go` implementing RoutingGroup interface
- [x] T010 Register auth routes in `api/routers/routes/routes.go` (add to RoutingGroups slice)
- [x] T011 Initialize password on startup in `api/cmd/main.go` (check Redis, hash bootstrap password if not exists)

**Checkpoint**: Auth infrastructure ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Initial Dashboard Access (Priority: P1) 🎯 MVP

**Goal**: Users can authenticate with the access key to gain entry to the dashboard

**Independent Test**: Visit dashboard URL → see login screen → enter password → see dashboard (or error for wrong password)

### Backend Implementation for User Story 1

- [x] T012 [US1] Implement POST `/v1/auth/login` handler in `api/routers/api/v1/auth.go` (validate password, create token, set HTTP-only cookie, return usedDefaultPassword flag)
- [x] T013 [US1] Implement GET `/v1/auth/status` handler in `api/routers/api/v1/auth.go` (check cookie, return authenticated status)
- [x] T014 [US1] Add Swagger annotations to login and status handlers in `api/routers/api/v1/auth.go`
- [x] T015 [US1] Run `swag init` in `api/` to regenerate Swagger docs

### Frontend Implementation for User Story 1

- [x] T016 [P] [US1] Create auth service in `dashboard/src/services/auth.ts` (login, getStatus API calls)
- [x] T017 [P] [US1] Create AuthContext in `dashboard/src/contexts/auth/AuthContext.tsx` (authenticated state, usedDefaultPassword flag)
- [x] T018 [US1] Create useAuth hook in `dashboard/src/contexts/auth/useAuth.ts`
- [x] T019 [US1] Create login page in `dashboard/src/pages/login.tsx` (password input, submit button, error display)
- [x] T020 [US1] Create AuthGuard component in `dashboard/src/components/auth-guard/AuthGuard.tsx` (redirect unauthenticated to login)
- [x] T021 [US1] Wrap app routes with AuthGuard in `dashboard/src/App.tsx`
- [x] T022 [US1] Add default password warning notification in `dashboard/src/App.tsx` (show toast when usedDefaultPassword is true)

**Checkpoint**: User Story 1 complete - users can authenticate and access the dashboard

---

## Phase 4: User Story 2 - Persistent Session with Auto-Refresh (Priority: P2)

**Goal**: Sessions persist across browser closes and auto-extend on activity

**Independent Test**: Authenticate → close browser → reopen → still authenticated. Make requests → session TTL extends.

### Backend Implementation for User Story 2

- [x] T023 [US2] Ensure auth middleware in `api/routers/api/v1/middleware/auth.go` refreshes Redis TTL on each validated request (sliding expiration)
- [x] T024 [US2] Apply auth middleware to all existing route groups in `api/routers/routes/routes.go` except auth login/status

### Frontend Implementation for User Story 2

- [x] T025 [US2] Update AuthContext in `dashboard/src/contexts/auth/AuthContext.tsx` to check auth status on mount (persist across page reloads)

**Checkpoint**: User Story 2 complete - sessions persist and auto-refresh

---

## Phase 5: User Story 3 - Password Change (Priority: P3)

**Goal**: Authenticated users can change the access key via Settings

**Independent Test**: Authenticate → navigate to Settings → enter current password, new password → old password no longer works, new password works

### Backend Implementation for User Story 3

- [x] T026 [US3] Implement POST `/v1/auth/change-password` handler in `api/routers/api/v1/auth.go` (verify current password, update Redis hash)
- [x] T027 [US3] Add Swagger annotations to change-password handler in `api/routers/api/v1/auth.go`
- [x] T028 [US3] Run `swag init` in `api/` to regenerate Swagger docs

### Frontend Implementation for User Story 3

- [x] T029 [P] [US3] Add changePassword function to auth service in `dashboard/src/services/auth.ts`
- [x] T030 [US3] Add password change form to Settings page in `dashboard/src/sections/settings/view/settings-view.tsx` (current password, new password, confirm, submit)

**Checkpoint**: User Story 3 complete - users can change the password

---

## Phase 6: User Story 4 - Session Expiration Handling (Priority: P4)

**Goal**: Graceful logout and notification when session expires

**Independent Test**: Authenticate → wait for session to expire (or manually delete token from Redis) → see expiration notification and login screen

### Backend Implementation for User Story 4

- [x] T031 [US4] Implement POST `/v1/auth/logout` handler in `api/routers/api/v1/auth.go` (delete token from Redis, clear cookie)
- [x] T032 [US4] Add Swagger annotations to logout handler in `api/routers/api/v1/auth.go`
- [x] T033 [US4] Run `swag init` in `api/` to regenerate Swagger docs

### Frontend Implementation for User Story 4

- [x] T034 [P] [US4] Add logout function to auth service in `dashboard/src/services/auth.ts`
- [x] T035 [US4] Update AuthContext in `dashboard/src/contexts/auth/AuthContext.tsx` to handle 401 responses (clear state, show expiration notification, redirect to login)
- [x] T036 [US4] Add logout button to dashboard header or settings in `dashboard/src/components/` or sidebar

**Checkpoint**: User Story 4 complete - graceful session expiration handling

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, documentation, and validation

- [x] T037 Run `make prepare-for-commit` (generate, format, lint)
- [x] T038 [P] Verify all exported functions have godoc comments in `api/service/auth/auth.go`
- [x] T039 [P] Verify all exported functions have JSDoc comments in `dashboard/src/contexts/auth/AuthContext.tsx`
- [x] T040 Run quickstart.md validation checklist manually
- [x] T041 Update `api/docker-compose.yml` or `.env.example` with `SD_BOOTSTRAP_PASSWORD` documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 auth infrastructure but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Requires being authenticated (US1) but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Requires being authenticated (US1) but independently testable

### Within Each User Story

- Backend handlers before frontend integration
- Models and types available (from Phase 2)
- API calls before UI components
- Core functionality before polish

### Parallel Opportunities

- T002 and T003 can run in parallel (different dependencies)
- T007 can run in parallel with T006 (different files)
- T016 and T017 can run in parallel (different files)
- T029 and T034 can run in parallel (additive to same file)
- T038 and T039 can run in parallel (different languages)

---

## Parallel Example: Phase 2 Foundational

```bash
# After T004-T005 (models and types):
Task: "Create auth service in api/service/auth/auth.go"
Task: "Create rate limiter in api/service/auth/rate_limiter.go"
# These can run in parallel - different files
```

## Parallel Example: User Story 1 Frontend

```bash
# After backend handlers complete:
Task: "Create auth service in dashboard/src/services/auth.ts"
Task: "Create AuthContext in dashboard/src/contexts/auth/AuthContext.tsx"
# These can run in parallel - different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011)
3. Complete Phase 3: User Story 1 (T012-T022)
4. **STOP and VALIDATE**: Test authentication flow end-to-end
5. Deploy/demo if ready - dashboard is protected!

### Incremental Delivery

1. Setup + Foundational → Auth infrastructure ready
2. Add User Story 1 → Dashboard requires password (MVP!)
3. Add User Story 2 → Sessions persist, no repeated logins
4. Add User Story 3 → Users can change password
5. Add User Story 4 → Graceful expiration handling
6. Each story adds value without breaking previous stories

### Suggested Order for Single Developer

Execute phases sequentially:
1. Phase 1: Setup (3 tasks)
2. Phase 2: Foundational (8 tasks)
3. Phase 3: US1 (11 tasks) → **Test MVP**
4. Phase 4: US2 (3 tasks)
5. Phase 5: US3 (5 tasks)
6. Phase 6: US4 (6 tasks)
7. Phase 7: Polish (5 tasks)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `make prepare-for-commit` before any commits
