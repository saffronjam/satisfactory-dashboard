# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commander is a real-time dashboard application for monitoring and managing a Satisfactory game factory. Features: factory statistics visualization, power circuit monitoring, drone/train tracking, player management, interactive map with Leaflet, and real-time updates via Server-Sent Events (SSE).

Architecture: React frontend (Commander) with Vite + Material-UI, Go backend (API) with Gin framework, Redis for caching and event streaming.

## Quick Start

```bash
docker compose up --build    # Run all services (frontend:3000, api:8081, redis:6379)
```

### Development

```bash
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

- **State Management**: Backend is the source of truth, frontend receives updates via SSE
- **Type Safety**: Run `make generate` after Go model changes
- **Testing**: Set `mock: true` in config to use mock data

## Detailed Documentation

- **api/CLAUDE.md**: Backend architecture, patterns, and development guide
- **commander/CLAUDE.md**: Frontend architecture, patterns, and development guide
- **Swagger UI**: `/v2/docs/` when API is running
