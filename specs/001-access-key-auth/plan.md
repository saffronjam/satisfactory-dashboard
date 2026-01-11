# Implementation Plan: Access Key Authentication

**Branch**: `001-access-key-auth` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-access-key-auth/spec.md`

## Summary

Add password-based access control to the Satisfactory Dashboard. Users must enter an access key (password) to view the dashboard. The password is configured via `SD_BOOTSTRAP_PASSWORD` environment variable (default: "change-me"). Authentication exchanges the password for an access token stored in an HTTP-only cookie with 7-day sliding expiration. All API routes except the authentication endpoint require a valid token. Users can change the password via Settings.

## Technical Context

**Language/Version**: Go 1.24 (backend), TypeScript 5.6 (frontend)
**Primary Dependencies**: Gin (HTTP), Redis (session store), React 18, Material-UI 6
**Storage**: Redis for access tokens and hashed password
**Testing**: Mock client pattern (existing), manual testing
**Target Platform**: Linux server (Docker), modern browsers
**Project Type**: Web application (Go API + React SPA)
**Performance Goals**: <5s authentication flow, <100ms token validation per request
**Constraints**: HTTP-only cookies, bcrypt password hashing, rate limiting
**Scale/Scope**: Single-instance deployment, multiple concurrent browser sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety First | ✅ Pass | New auth models will be Go structs, TypeScript types auto-generated via `make generate` |
| II. Clean Code, No Dead Weight | ✅ Pass | No deprecated code; clean implementation |
| III. Function Documentation | ✅ Pass | All exported auth functions will have godoc/JSDoc comments |
| IV. Backend as Source of Truth | ✅ Pass | Auth state managed by backend; frontend only holds cookie |
| V. Format and Lint Always | ✅ Pass | Will run `make prepare-for-commit` |
| VI. Interface-Driven Design | ✅ Pass | Auth service will follow existing service patterns |
| VII. Consistent API Patterns | ✅ Pass | New endpoints use RoutingGroup, RequestContext, Swagger annotations |
| VIII. Simplicity Over Abstraction | ✅ Pass | Simple token-based auth; no complex OAuth/JWT library |

**Gate Status**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-access-key-auth/
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
│   └── auth.go                    # Auth request/response models
├── routers/
│   ├── api/v1/
│   │   ├── auth.go                # Login/logout/change-password handlers
│   │   └── middleware/
│   │       └── auth.go            # Token validation middleware
│   └── routes/
│       └── auth.go                # Auth routing group
├── service/
│   └── auth/
│       └── auth.go                # Password hashing, token generation, validation
└── pkg/
    └── config/
        └── config.go              # Add SD_BOOTSTRAP_PASSWORD env var

dashboard/src/
├── pages/
│   └── login.tsx                  # Login page
├── components/
│   └── auth-guard/
│       └── AuthGuard.tsx          # Route protection wrapper
├── contexts/
│   └── auth/
│       ├── AuthContext.tsx        # Auth state provider
│       └── useAuth.ts             # Auth hook
├── sections/
│   └── settings/
│       └── view/
│           └── settings-view.tsx  # Add password change form
└── services/
    └── auth.ts                    # Auth API calls
```

**Structure Decision**: Web application structure using existing `api/` and `dashboard/` directories. Auth components integrate with existing patterns (RoutingGroup, RequestContext, React Context).

## Complexity Tracking

> No violations - section not applicable.
