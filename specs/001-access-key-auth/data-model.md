# Data Model: Access Key Authentication

**Feature**: 001-access-key-auth
**Date**: 2026-01-10

## Entities

### AccessToken (Redis)

Represents an active authentication session.

| Field | Type | Description |
|-------|------|-------------|
| token | string (64 chars) | Hex-encoded 32-byte random token (primary key) |
| created_at | int64 | Unix timestamp when token was created |
| last_used | int64 | Unix timestamp of last successful validation |
| client_ip | string | IP address that created the token |

**Redis Key**: `auth:token:{token}`
**Redis Value**: JSON object with fields above
**TTL**: 604800 seconds (7 days), refreshed on each use

### StoredPassword (Redis)

The hashed access key for the dashboard.

| Field | Type | Description |
|-------|------|-------------|
| hash | string | bcrypt hash of the password |

**Redis Key**: `auth:password`
**Redis Value**: bcrypt hash string (no JSON wrapper needed)
**TTL**: None (persistent)

### RateLimitEntry (In-Memory)

Tracks authentication attempts per IP.

| Field | Type | Description |
|-------|------|-------------|
| ip | string | Client IP address (map key) |
| limiter | *rate.Limiter | Token bucket limiter (5 tokens/minute) |
| last_seen | time.Time | Last attempt timestamp (for cleanup) |

**Storage**: sync.Map in auth service
**Cleanup**: Entries older than 10 minutes removed periodically

## Go Structs (api/models/models/auth.go)

```go
// LoginRequest represents the request body for authentication
type LoginRequest struct {
    Password string `json:"password" binding:"required"`
}

// LoginResponse represents the response after successful authentication
type LoginResponse struct {
    Success            bool `json:"success"`
    UsedDefaultPassword bool `json:"usedDefaultPassword"`
}

// AuthStatusResponse represents the current authentication status
type AuthStatusResponse struct {
    Authenticated      bool `json:"authenticated"`
    UsedDefaultPassword bool `json:"usedDefaultPassword,omitempty"`
}

// ChangePasswordRequest represents the request to change the access key
type ChangePasswordRequest struct {
    CurrentPassword string `json:"currentPassword" binding:"required"`
    NewPassword     string `json:"newPassword" binding:"required,min=1"`
}

// ChangePasswordResponse represents the response after password change
type ChangePasswordResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message,omitempty"`
}

// LogoutResponse represents the response after logout
type LogoutResponse struct {
    Success bool `json:"success"`
}
```

## TypeScript Types (auto-generated)

After running `make generate`, the following types will be available in `dashboard/src/apiTypes.ts`:

```typescript
export interface LoginRequest {
    password: string;
}

export interface LoginResponse {
    success: boolean;
    usedDefaultPassword: boolean;
}

export interface AuthStatusResponse {
    authenticated: boolean;
    usedDefaultPassword?: boolean;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface ChangePasswordResponse {
    success: boolean;
    message?: string;
}

export interface LogoutResponse {
    success: boolean;
}
```

## State Transitions

### Authentication State Machine

```
┌──────────────┐
│ Unauthenticated │
└───────┬──────┘
        │ POST /v1/auth/login (valid password)
        ▼
┌──────────────┐
│ Authenticated  │◄──────────────────┐
└───────┬──────┘                    │
        │                           │
        ├─── Any API request ───────┤ (TTL refreshed)
        │                           │
        ├─── POST /v1/auth/logout ──┼──► Unauthenticated
        │                           │
        └─── TTL expires ───────────┴──► Unauthenticated
```

### Password State

```
┌─────────────────┐
│ Bootstrap/Default │ (SD_BOOTSTRAP_PASSWORD or "change-me")
└────────┬────────┘
         │ First startup (Redis empty)
         ▼
┌─────────────────┐
│ Stored in Redis   │ (bcrypt hash)
└────────┬────────┘
         │ POST /v1/auth/change-password
         ▼
┌─────────────────┐
│ Updated in Redis  │ (new bcrypt hash)
└─────────────────┘
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| LoginRequest | password | Required, non-empty |
| ChangePasswordRequest | currentPassword | Required, must match stored hash |
| ChangePasswordRequest | newPassword | Required, minimum 1 character |
| AccessToken | token | 64 hex characters |
| AccessToken | TTL | Max 7 days, refreshed on use |
| RateLimitEntry | attempts | Max 5 per minute per IP |

## Relationships

```
User (browser) ──1:N──► AccessToken (multiple devices/browsers)
                          │
                          └───► validates against ──► StoredPassword (single)
```

- One stored password shared by all users
- Each browser session has its own access token
- Tokens are independent (logout one doesn't affect others)
- Password change doesn't invalidate existing tokens (by design)
