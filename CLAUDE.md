# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Satisfactory Dashboard is a real-time dashboard application for monitoring and managing a Satisfactory game factory. Features: factory statistics visualization, power circuit monitoring, drone/train tracking, player management, interactive map with Leaflet, and real-time updates via Server-Sent Events (SSE).

Architecture: React frontend (Dashboard) with Vite + Material-UI, Go backend (API) with Gin framework, Redis for caching and event streaming.

## Quick Start

```bash
make unpack-assets           # Extract LFS assets (required after clone)
docker compose up --build    # Run all services (frontend:3000, api:8081, redis:6379)
```

### Development

```bash
make unpack-assets   # Extract LFS assets (required after clone)
make deps      # Start Redis
make run       # Run frontend (3039) + backend (8081) with hot reload
```

### Essential Commands

```bash
make help      # Show all available commands
make lint      # Run all linters
make format    # Format all code
make build     # Build for production
make generate  # Generate TypeScript types from Go structs
```

**CRITICAL**: Run `make generate` after any changes to Go model structs to keep frontend types in sync.

## API Endpoints

**Sessions** (multi-session support)

| Endpoint                       | Description              |
| ------------------------------ | ------------------------ |
| `GET /v1/sessions`             | List all sessions        |
| `POST /v1/sessions`            | Create new session       |
| `GET /v1/sessions/preview`     | Preview session config   |
| `GET /v1/sessions/:id`         | Get session details      |
| `PATCH /v1/sessions/:id`       | Update session           |
| `DELETE /v1/sessions/:id`      | Delete session           |
| `GET /v1/sessions/:id/validate`| Validate session         |
| `GET /v1/sessions/:id/events`  | SSE event stream         |
| `GET /v1/sessions/:id/state`   | Get session game state   |

**Data Endpoints**

| Endpoint                       | Description              |
| ------------------------------ | ------------------------ |
| `GET /v1/satisfactoryApiStatus`| Satisfactory API health  |
| `GET /v1/state`                | Current game state       |
| `GET /v1/circuits`             | Power circuit data       |
| `GET /v1/drones`               | Drone list               |
| `GET /v1/droneStations`        | Drone stations           |
| `GET /v1/droneSetup`           | Drone setup info         |
| `GET /v1/trains`               | Train list               |
| `GET /v1/trainStations`        | Train stations           |
| `GET /v1/trainSetup`           | Train setup info         |
| `GET /v1/players`              | Player list              |
| `GET /v1/generatorStats`       | Generator statistics     |
| `GET /v1/prodStats`            | Production statistics    |
| `GET /v1/factoryStats`         | Factory statistics       |
| `GET /v1/sinkStats`            | Sink statistics          |

**Infrastructure Endpoints**

| Endpoint                       | Description              |
| ------------------------------ | ------------------------ |
| `GET /v1/belts`                | Conveyor belts & splitters |
| `GET /v1/pipes`                | Pipes & junctions        |
| `GET /v1/cables`               | Power cables             |
| `GET /v1/trainRails`           | Train rail network       |

**Internal**

| Endpoint                       | Description              |
| ------------------------------ | ------------------------ |
| `/v2/docs/*`                   | Swagger UI               |
| `/internal/metrics`            | Prometheus metrics       |

## Development Workflow

### Adding New Features

1. **Backend**: Add model in `models/models/`, create handler in `routers/api/v1/`, register route in `routers/routes/`
2. **Type sync**: Run `make generate`
3. **Frontend**: Use generated types from `apiTypes.ts`, create page/component
4. **Code quality**: Run `make lint` and `make format`

### Adding New Endpoints

1. Create handler function in `routers/api/v1/`
2. Add route definition in `routers/routes/` implementing RoutingGroup
3. Add to `routes.RoutingGroups()` registration
4. Add Swagger annotations for documentation
5. Run `swag init` in `api/` to regenerate docs

## Docker Deployment

```bash
docker compose up --build           # Build and run all
docker compose up -d                # Detached mode
docker compose logs -f api          # Follow API logs
```

## Important Notes

- **NEVER Start Services Without User Permission**: NEVER run backend or frontend services (make run, make backend, make frontend, etc.) without CLEAR and EXPLICIT instructions from the user. The user controls all service startup and will handle testing and verification themselves. Only start services when the user explicitly asks you to.
- **Never Maintain Backward Compatibility**: Always implement the correct fix for a better system. Remove old code paths completely rather than maintaining dual behavior. Clean breaks are preferred over gradual migrations.
- **State Management**: Backend is the source of truth, frontend receives updates via SSE
- **Type Safety**: Run `make generate` after Go model changes
- **Testing**: Set `mock: true` in config to use mock data

## Detailed Documentation

- **api/CLAUDE.md**: Backend architecture, patterns, and development guide
- **dashboard/CLAUDE.md**: Frontend architecture, patterns, and development guide
- **Swagger UI**: `/v2/docs/` when API is running

## Active Technologies
- Go 1.24 (backend), TypeScript 5.6 (frontend) + Gin (HTTP), Redis (session store), React 18, Material-UI 6 (001-access-key-auth)
- Redis for access tokens and hashed password (001-access-key-auth)
- Go 1.24.1 + go-redis/v9 (existing), gin-gonic (existing), zap (logging) (002-redis-poll-lease)
- Redis (existing infrastructure, used for sessions and caching) (002-redis-poll-lease)
- TypeScript 5.6, React 18.3, Bun 1.3 + shadcn/ui, Tailwind CSS v4, Recharts, React Router 6, Leaflet (003-shadcn-migration)
- TypeScript 5.6 (frontend), React 18.3 + React, Leaflet, Material-UI 6, zustand (for potential state management) (004-universal-map-selection)
- localStorage (map settings persistence) (004-universal-map-selection)

## Recent Changes
- 001-access-key-auth: Added Go 1.24 (backend), TypeScript 5.6 (frontend) + Gin (HTTP), Redis (session store), React 18, Material-UI 6
