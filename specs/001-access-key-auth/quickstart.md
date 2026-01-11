# Quickstart: Access Key Authentication

**Feature**: 001-access-key-auth
**Date**: 2026-01-10

## Prerequisites

- Docker and Docker Compose installed
- Repository cloned and assets extracted (`make prepare`)

## Configuration

### Setting a Custom Password

Set the `SD_BOOTSTRAP_PASSWORD` environment variable before first run:

```bash
# Option 1: Export in shell
export SD_BOOTSTRAP_PASSWORD="your-secure-password"
docker compose up --build

# Option 2: Create .env file
echo "SD_BOOTSTRAP_PASSWORD=your-secure-password" > .env
docker compose up --build

# Option 3: Inline with docker compose
SD_BOOTSTRAP_PASSWORD="your-secure-password" docker compose up --build
```

### Default Password

If `SD_BOOTSTRAP_PASSWORD` is not set, the default password is `change-me`. A warning notification will appear after login prompting you to change it in Settings.

## Running the Dashboard

```bash
# Start all services
docker compose up --build

# Services:
# - Frontend: http://localhost:3000
# - API: http://localhost:8081
```

## Authentication Flow

### 1. Access the Dashboard

Navigate to `http://localhost:3000`. You will see a password entry screen.

### 2. Enter Access Key

Enter the password (either your custom `SD_BOOTSTRAP_PASSWORD` or `change-me`).

### 3. View Dashboard

After successful authentication, you'll see the full dashboard. If you used the default password, a warning toast will appear.

### 4. Change Password (Optional)

1. Navigate to Settings (gear icon in sidebar)
2. Find the "Change Access Key" section
3. Enter current password, new password, and confirm
4. Click "Change Password"

## Session Behavior

- **Duration**: Sessions last 7 days of inactivity
- **Auto-refresh**: Each request extends the session by 7 days
- **Multiple sessions**: Each browser/device has its own session
- **Logout**: Click logout to end the current session only

## Troubleshooting

### "Invalid password" error

- Check that `SD_BOOTSTRAP_PASSWORD` was set before the first run
- If Redis was previously initialized, the stored password takes precedence
- To reset: clear Redis data and restart with desired password

### Session expired unexpectedly

- Sessions expire after 7 days of no activity
- Keeping the dashboard open with SSE connection counts as activity
- Check if backend was restarted (clears all sessions)

### Rate limited

- Authentication attempts are limited to 5 per minute per IP
- Wait 60 seconds before retrying
- This protects against brute-force attacks

## Development Mode

For local development:

```bash
make deps      # Start Redis
make run       # Start frontend (3039) + backend (8081)

# Default password is "change-me" unless SD_BOOTSTRAP_PASSWORD is set
```

## API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/v1/auth/login` | POST | No | Exchange password for token |
| `/v1/auth/logout` | POST | Yes | Invalidate current token |
| `/v1/auth/status` | GET | No | Check authentication status |
| `/v1/auth/change-password` | POST | Yes | Change the access key |

All other endpoints (`/v1/sessions/*`, `/v1/circuits`, etc.) require authentication.

## Verification Steps

After implementation, verify the feature works:

1. [ ] Visit dashboard URL → see login screen
2. [ ] Enter wrong password → see error, stay on login
3. [ ] Enter correct password → access dashboard
4. [ ] Use default password → see warning notification
5. [ ] Close browser, reopen → still authenticated
6. [ ] Wait 7+ days → session expires, redirected to login
7. [ ] Change password in Settings → old password no longer works
8. [ ] Logout → redirected to login, token invalidated
