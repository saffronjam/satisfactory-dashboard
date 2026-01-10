# Feature Specification: Access Key Authentication

**Feature Branch**: `001-access-key-auth`
**Created**: 2026-01-10
**Status**: Draft
**Input**: User description: "Add access key authentication for dashboard - single password-based access control with token exchange"

## Clarifications

### Session 2026-01-10

- Q: What should the session inactivity timeout be? → A: 7 days
- Q: When changing the password, should users be required to enter the current password first? → A: Yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Dashboard Access (Priority: P1)

A user visits the dashboard for the first time and is presented with a password prompt. They enter the access key to gain entry to the dashboard. This is the core authentication gate that protects all dashboard functionality.

**Why this priority**: Without this, there is no access control. This is the foundation of the entire feature - no other stories can function without the ability to authenticate.

**Independent Test**: Can be fully tested by visiting the dashboard URL and verifying that a password prompt appears, and that entering the correct password grants access to the main dashboard view.

**Acceptance Scenarios**:

1. **Given** a user visits the dashboard URL without being authenticated, **When** the page loads, **Then** they see a password entry screen instead of the dashboard content.
2. **Given** a user is on the password entry screen, **When** they enter the correct access key and submit, **Then** they are granted access and see the full dashboard.
3. **Given** a user is on the password entry screen, **When** they enter an incorrect access key, **Then** they see an error message and remain on the password screen.
4. **Given** a user enters "change-me" as the password and it is accepted, **When** they gain access, **Then** a notification warns them that the default password should be changed in settings.

---

### User Story 2 - Persistent Session with Auto-Refresh (Priority: P2)

An authenticated user keeps the dashboard open in their browser. As long as they remain active (making requests), their session stays valid indefinitely. If they close the browser and return, they remain authenticated until the session expires from inactivity.

**Why this priority**: This provides the seamless user experience expected from a dashboard that may be displayed continuously. Without this, users would be repeatedly prompted for passwords during active use.

**Independent Test**: Can be tested by authenticating, making periodic requests, and verifying the session remains valid. Then testing that after a period of inactivity, the session expires.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active session, **When** they make a request to the dashboard, **Then** their session expiration is extended.
2. **Given** an authenticated user closes their browser, **When** they return within the session timeout period, **Then** they remain authenticated without re-entering the password.
3. **Given** an authenticated user has been inactive beyond the session timeout, **When** they attempt to access the dashboard, **Then** they are logged out and shown a notification that their session expired.

---

### User Story 3 - Password Change (Priority: P3)

An authenticated administrator wants to change the dashboard access key. They navigate to the Settings page and update the password to a new value.

**Why this priority**: While important for security, the dashboard is functional without this capability. Users can always restart the server with a new bootstrap password if needed.

**Independent Test**: Can be tested by authenticating, navigating to Settings, entering a new password, and verifying that the old password no longer works while the new one does.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Settings page, **When** they enter the current password, a new password, and confirm, **Then** the access key is updated.
2. **Given** an authenticated user on the Settings page, **When** they enter an incorrect current password, **Then** the password change is rejected with an error message.
3. **Given** a user has changed the password, **When** they or another user attempts to authenticate with the old password, **Then** authentication fails.
4. **Given** a user has changed the password, **When** they authenticate with the new password, **Then** they gain access to the dashboard.

---

### User Story 4 - Session Expiration Handling (Priority: P4)

A user's session expires while they have the dashboard open. The system detects this and gracefully logs them out with a clear notification.

**Why this priority**: This is an edge case that affects user experience but not core functionality.

**Independent Test**: Can be tested by authenticating, waiting for the session to expire, and verifying the logout behavior and notification appear.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an expired session, **When** the frontend detects the expiration, **Then** the user is logged out and shown a notification "Session expired. Please log in again."
2. **Given** a user is logged out due to session expiration, **When** they view the screen, **Then** they see the password entry form ready for re-authentication.

---

### Edge Cases

- What happens when the backend is restarted? Access tokens stored in the session store are cleared, requiring re-authentication.
- What happens if multiple users are authenticated simultaneously? Each user has their own independent session token; one user's logout does not affect others.
- What happens if the password is changed while other users are authenticated? Existing sessions remain valid until they expire; only new authentication attempts use the new password.
- What happens if someone brute-forces the password? The system should rate-limit authentication attempts (assumption: 5 attempts per minute per IP).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a bootstrap password via environment variable `SD_BOOTSTRAP_PASSWORD`, defaulting to "change-me" if not set.
- **FR-002**: System MUST display a password entry screen when an unauthenticated user accesses the dashboard.
- **FR-003**: System MUST exchange a valid password for an access token upon successful authentication.
- **FR-004**: System MUST store the access token in an HTTP-only cookie to prevent client-side script access.
- **FR-005**: System MUST validate the access token on all protected routes via middleware.
- **FR-006**: System MUST extend the session expiration on each authenticated request (sliding expiration).
- **FR-007**: System MUST automatically expire sessions after 7 days of inactivity.
- **FR-008**: System MUST display a warning notification when a user authenticates with the default password "change-me".
- **FR-009**: System MUST allow authenticated users to change the access key via the Settings page, requiring verification of the current password before accepting the change.
- **FR-010**: System MUST clear the session cookie and display an expiration notification when a session times out.
- **FR-011**: System MUST exempt only the password-to-token exchange endpoint from authentication requirements.
- **FR-012**: System MUST store access tokens in a session store for validation.
- **FR-013**: System MUST rate-limit authentication attempts to prevent brute-force attacks.

### Key Entities

- **Access Token**: A unique identifier issued upon successful authentication. Has an expiration time that is extended on each use. Stored server-side for validation.
- **Session Cookie**: HTTP-only cookie containing the access token. Sent with every request for authentication.
- **Access Key (Password)**: The single shared password used to access the dashboard. Initially set via environment variable or defaults to "change-me". Can be changed at runtime via Settings.

## Assumptions

- Session timeout is 7 days of inactivity.
- Rate limiting for authentication attempts is 5 attempts per minute per IP address.
- The password is stored hashed, not in plain text.
- When the password is changed via Settings, it persists across server restarts (stored in the same backing store as the bootstrap value would override).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can authenticate and access the dashboard in under 5 seconds from entering the correct password.
- **SC-002**: Authenticated users can keep the dashboard open indefinitely without re-authenticating, as long as they make at least one request per session timeout period.
- **SC-003**: 100% of dashboard routes (except the authentication endpoint) reject requests without a valid access token.
- **SC-004**: Users who authenticate with the default password see a warning notification within 2 seconds of gaining access.
- **SC-005**: Users can change the access key in under 30 seconds via the Settings page.
- **SC-006**: Sessions expire correctly after the inactivity timeout, with a clear notification shown to the user.
