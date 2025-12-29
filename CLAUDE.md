# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commander is a real-time dashboard application for monitoring and managing a Satisfactory game factory. Features: factory statistics visualization, power circuit monitoring, drone/train tracking, player management, interactive map with Leaflet, and real-time updates via Server-Sent Events (SSE).

Architecture: React frontend (Commander) with Vite + Material-UI, Go backend (API) with Gin framework, Redis for caching and event streaming.

## Quick Start

```bash
docker compose up --build    # Run all services (frontend:3000, api:8081, redis:6379)
```

### Individual Services

```bash
# Frontend
cd commander && yarn dev     # Vite dev server (port 3039)

# Backend
cd api && go run main.go     # Go server (port 8081)
```

## Essential Commands

### Frontend (commander/)

```bash
yarn dev          # Start Vite dev server with HMR
yarn build        # TypeScript check + production build
yarn lint         # ESLint check
yarn lint:fix     # ESLint auto-fix
yarn fm:check     # Prettier format check
yarn fm:fix       # Prettier auto-format
```

### Backend (api/)

```bash
go run main.go              # Run API server
go build -o main .          # Build binary
swag init                   # Regenerate Swagger docs
```

### Type Generation

```bash
cd api && tygo generate     # Generate TypeScript types from Go structs
```

Output: `commander/src/apiTypes.ts`

**CRITICAL**: Run `tygo generate` after any changes to Go model structs to keep frontend types in sync.

### Code Quality

```bash
# Frontend
cd commander && yarn lint:fix && yarn fm:fix

# Backend
cd api && go fmt ./...
```

## Backend Architecture (api/)

Go backend using Gin framework with Redis caching and SSE for real-time updates.

### Directory Structure

```
api/
├── main.go                    # Entry point
├── cmd/                       # App initialization and CLI flags
├── routers/                   # HTTP routing
│   ├── router.go             # Router setup, middleware, validators
│   ├── api/v1/               # V1 endpoint handlers
│   │   ├── status.go         # API status
│   │   ├── state.go          # Game state
│   │   ├── circuits.go       # Power circuits
│   │   ├── drones.go         # Drone data
│   │   ├── trains.go         # Train data
│   │   ├── players.go        # Player info
│   │   ├── stats.go          # Factory statistics
│   │   └── events_sse.go     # Server-Sent Events
│   └── routes/               # Route group definitions (interface pattern)
├── models/                    # Data models and DTOs
│   └── models/               # Domain models (drone, train, circuit, etc.)
├── service/                   # Satisfactory API client
│   ├── client/               # Client interface
│   ├── implClient/           # Real client implementation
│   └── mockClient/           # Mock client for testing
├── pkg/                       # Shared packages
│   ├── config/               # YAML configuration management
│   ├── db/                   # Redis connection and KV store
│   ├── log/                  # Zap structured logging
│   └── metrics/              # Prometheus metrics
├── worker/                    # Background workers
│   └── publisher.go          # Event publisher (Satisfactory → Redis)
├── docs/                      # Generated Swagger documentation
├── config.local.yml          # Local dev configuration
└── config.docker.yml         # Docker configuration
```

### Core Patterns

**RoutingGroup Interface Pattern**

```go
type RoutingGroup interface {
    Register(group *gin.RouterGroup)
}

// Each route group (status, circuits, drones, etc.) implements this interface
// Centralized registration in routes.RoutingGroups()
```

**RequestContext Pattern**

```go
// Consistent response handling across handlers
type RequestContext struct {
    ctx *gin.Context
}
func (r *RequestContext) Success(data interface{})
func (r *RequestContext) Error(code int, message string)
```

**Event Streaming (SSE)**

- Publisher worker polls Satisfactory API and publishes events to Redis
- Clients subscribe to `/v1/events` for real-time updates
- Events: state changes, circuit updates, drone/train status

### API Endpoints

| Endpoint                    | Description             |
| --------------------------- | ----------------------- |
| `/v1/satisfactoryApiStatus` | Satisfactory API health |
| `/v1/state`                 | Current game state      |
| `/v1/circuits`              | Power circuit data      |
| `/v1/drones`                | Drone information       |
| `/v1/trains`                | Train information       |
| `/v1/players`               | Player list             |
| `/v1/stats`                 | Factory statistics      |
| `/v1/events`                | SSE event stream        |
| `/v2/docs/*`                | Swagger UI              |
| `/internal/metrics`         | Prometheus metrics      |

### Configuration

YAML-based config with environment variants:

- `config.local.yml` - Local development
- `config.docker.yml` - Docker environment

```yaml
port: 8081
mode: dev                           # dev/test/prod
satisfactoryApiUrl: "http://..."    # Satisfactory API endpoint
redisUrl: "redis://..."             # Redis connection
mock: false                         # Use mock client
```

## Frontend Architecture (commander/)

React dashboard with Material-UI, Vite bundler, and real-time SSE integration.

### Directory Structure

```
commander/src/
├── pages/              # Page components (home, map, production, power, trains, drones, players, settings)
├── components/         # Reusable UI components
│   ├── chart/         # Chart components (MUI X Charts)
│   ├── iconify/       # Icon integration
│   ├── label/         # Label components
│   ├── logo/          # Logo component
│   └── scrollbar/     # Custom scrollbar
├── layouts/           # Dashboard layout with sidebar navigation
│   └── dashboard/     # Main layout structure
├── routes/            # React Router configuration
├── sections/          # Feature-specific sections
├── theme/             # Material-UI theme customization
│   ├── core/          # Theme configuration (palette, typography, shadows)
│   └── styles/        # Global and mixin styles
├── hooks/             # Custom React hooks
├── utils/             # Utility functions (formatting, abbreviations)
├── contexts/          # React Context API (API provider)
├── apiTypes.ts        # Auto-generated TypeScript types from backend
├── types.ts           # Frontend-specific types
└── main.tsx           # React DOM entry point
```

### Tech Stack

- **React 18** with TypeScript 5.6
- **Material-UI 6** for UI components
- **Vite 5** for build and dev server
- **React Router 6** for routing
- **MUI X Charts + Recharts** for data visualization
- **Leaflet + React Leaflet** for interactive maps
- **Day.js** for date formatting

### Key Patterns

**API Context Provider**

```tsx
// contexts/api/ provides data fetching and SSE subscription
const { circuits, drones, trains, loading } = useApi();
```

**Theme System**

```tsx
// Theme customization in theme/core/
// Colors defined in theme/colors.json
// Access via MUI's useTheme() hook
```

**Page Components**

- Located in `pages/` directory
- Use Material-UI components
- Consume data via context hooks

### Code Quality Tools

- **ESLint** with Airbnb + TypeScript config
- **Prettier** for formatting
- **TypeScript** strict mode enabled
- **Perfectionist** plugin for import ordering

## Type Generation (Tygo)

Go structs in `api/models/` generate TypeScript interfaces:

```go
// api/models/models/drone.go
type Drone struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Location Location `json:"location"`
}
```

Generates:

```typescript
// commander/src/apiTypes.ts
export interface Drone {
    id: string;
    name: string;
    location: Location;
}
```

Configuration: `api/export/tygo.yml`

## Development Workflow

### Adding New Features

1. **Backend**: Add model in `models/models/`, create handler in `routers/api/v1/`, register route in `routers/routes/`
2. **Type sync**: Run `cd api && tygo generate`
3. **Frontend**: Use generated types from `apiTypes.ts`, create page/component
4. **Code quality**: Run linters and formatters

### Adding New Endpoints

1. Create handler function in `routers/api/v1/`
2. Add route definition in `routers/routes/` implementing RoutingGroup
3. Add to `routes.RoutingGroups()` registration
4. Add Swagger annotations for documentation
5. Run `swag init` to regenerate docs

## Docker Deployment

### Services

```yaml
# compose.yml
services:
  commander:     # Frontend (port 3000)
  api:           # Backend (port 8081)
  redis:         # Cache/events (port 6379)
```

### Build

```bash
docker compose up --build           # Build and run all
docker compose up -d                # Detached mode
docker compose logs -f api          # Follow API logs
```

### CI/CD

GitHub Actions workflow (`.github/workflows/build-push.yaml`):

- Triggers: push to main, tags (v\*), pull requests
- Builds and pushes Docker images to ghcr.io
- Separate jobs for frontend and API

## Important Notes

### State Management

- Backend is the source of truth
- Frontend receives updates via SSE
- No complex client-side state management needed

### Error Handling

- Backend: Use RequestContext for consistent error responses
- Frontend: Handle loading and error states in components

### Logging

- Backend uses Zap structured logging via `pkg/log`
- Include context in log messages

### Testing

- Backend: Mock client available in `service/mockClient/`
- Set `mock: true` in config to use mock data

## Related Documentation

- **api/CLAUDE.md**: Detailed backend architecture
- **commander/CLAUDE.md**: Detailed frontend architecture
- **Swagger UI**: `/v2/docs/` when API is running
