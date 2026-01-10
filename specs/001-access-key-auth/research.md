# Research: Access Key Authentication

**Feature**: 001-access-key-auth
**Date**: 2026-01-10

## Token Generation Strategy

**Decision**: Use cryptographically secure random tokens (32 bytes, hex-encoded = 64 characters)

**Rationale**:
- Simple to implement with Go's `crypto/rand`
- No need for JWT complexity - tokens are validated server-side via Redis lookup
- 256-bit entropy provides sufficient security against brute-force attacks
- Stateless tokens would require JWT/HMAC, adding unnecessary complexity for a single-instance deployment

**Alternatives Considered**:
- JWT: Rejected - adds library dependency, token size overhead, and complexity for no benefit (we need server-side session tracking anyway for sliding expiration)
- UUID v4: Acceptable alternative but hex-encoded random bytes are equally secure and simpler

## Password Hashing

**Decision**: Use bcrypt with cost factor 12

**Rationale**:
- bcrypt is the industry standard for password hashing
- Go's `golang.org/x/crypto/bcrypt` is well-maintained and already used in many Go projects
- Cost factor 12 provides ~250ms hashing time, balancing security and UX
- Adaptive: can increase cost factor later without breaking existing hashes

**Alternatives Considered**:
- Argon2: More modern but adds dependency; bcrypt is sufficient for this use case
- scrypt: Similar to Argon2 - unnecessary complexity
- SHA-256 with salt: Rejected - too fast, vulnerable to GPU attacks

## Session Storage in Redis

**Decision**: Store tokens in Redis with key pattern `auth:token:{token}` and TTL of 7 days

**Rationale**:
- Redis already used in the project for session state caching
- Native TTL support handles automatic expiration
- Simple key-value lookup for O(1) token validation
- Sliding expiration implemented by updating TTL on each validated request

**Data Structure**:
```
Key: auth:token:{64-char-hex-token}
Value: JSON { "created_at": timestamp, "last_used": timestamp, "ip": string }
TTL: 7 days (604800 seconds), refreshed on each use
```

**Password Storage**:
```
Key: auth:password
Value: bcrypt hash string
TTL: none (persistent)
```

## Rate Limiting Strategy

**Decision**: Use in-memory rate limiter with sliding window (5 requests per minute per IP)

**Rationale**:
- Simple to implement without additional dependencies
- Sufficient for single-instance deployment
- IP-based limiting prevents brute-force attacks
- Gin middleware can access client IP from request context

**Implementation**:
- Use `golang.org/x/time/rate` for token bucket algorithm
- Store per-IP limiters in sync.Map
- Clean up stale entries periodically (every 10 minutes)

**Alternatives Considered**:
- Redis-based rate limiting: Overkill for single-instance; adds Redis calls per request
- Fixed window: Less accurate than sliding window
- No rate limiting: Security risk - rejected

## Cookie Configuration

**Decision**: HTTP-only cookie named `sd_access_token` with SameSite=Lax

**Rationale**:
- HTTP-only prevents XSS attacks from reading the token
- SameSite=Lax allows normal navigation while preventing CSRF from other sites
- Cookie name prefixed with `sd_` to avoid conflicts
- Path set to `/` to cover all API routes
- Secure flag set only when running over HTTPS (detected from request)

**Cookie Attributes**:
```
Name: sd_access_token
Value: {64-char-hex-token}
HttpOnly: true
SameSite: Lax
Secure: true (if HTTPS)
Path: /
MaxAge: 604800 (7 days)
```

## Frontend Auth State Detection

**Decision**: Backend provides `/v1/auth/status` endpoint; frontend checks on app load

**Rationale**:
- Frontend cannot read HTTP-only cookie, so must ask backend
- Status endpoint returns `{ authenticated: bool, usedDefaultPassword: bool }`
- Allows frontend to show default password warning without knowing the password
- SSE connection implicitly validates auth (401 response triggers logout)

**Flow**:
1. App loads → calls `/v1/auth/status`
2. If authenticated: show dashboard, optionally show default password warning
3. If not authenticated: redirect to login page
4. On 401 from any API call: clear local state, redirect to login

## Environment Variable Handling

**Decision**: Read `SD_BOOTSTRAP_PASSWORD` at startup; hash and store in Redis if not already set

**Rationale**:
- Bootstrap password only used on first run or if Redis is cleared
- Once password is changed via Settings, Redis value takes precedence
- Default "change-me" is intentionally weak to force users to change it

**Startup Flow**:
1. Check if `auth:password` exists in Redis
2. If not: hash `SD_BOOTSTRAP_PASSWORD` (or default) and store
3. If exists: use stored password (env var ignored after first setup)

## Default Password Warning

**Decision**: Backend returns `usedDefaultPassword: true` in login response when authenticating with "change-me"

**Rationale**:
- Frontend can show toast notification without backend storing password in plain text
- Warning only shown once per login session (frontend stores flag in React state)
- Does not reveal whether default password is still active to unauthenticated users

## Middleware Placement

**Decision**: Auth middleware applied to all routes except `/v1/auth/login` and `/v1/auth/status`

**Rationale**:
- Login endpoint must be accessible without auth
- Status endpoint allows frontend to check auth state without triggering redirect loops
- All other routes (including SSE, sessions, data endpoints) require valid token
- Middleware refreshes token TTL on successful validation (sliding expiration)

**Exempt Routes**:
- `POST /v1/auth/login` - Exchange password for token
- `GET /v1/auth/status` - Check if currently authenticated

**Protected Routes**:
- All existing routes (`/v1/sessions/*`, `/v1/circuits`, etc.)
- `POST /v1/auth/logout` - Invalidate token
- `POST /v1/auth/change-password` - Update password
