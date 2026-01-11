# Satisfactory Dashboard

<div align="center">
  <img src="docs/images/dashboard.png" alt="Satisfactory Dashboard" width="800">
</div>

A real-time scalable dashboard for monitoring and managing your Satisfactory factory.

## Requirements

This dashboard is built on the [Ficsit Remote Monitoring (FRM)](https://github.com/porisius/FicsitRemoteMonitoring) mod, which exposes factory data via an API. You must have FRM installed and running in your Satisfactory game for the dashboard to work.

**Installing the mod:**

Use [Satisfactory Mod Manager](https://docs.ficsit.app/) to install and manage mods. Search for "Ficsit Remote Monitoring" in the mod manager and install it. Once in-game, start with `/frm http start` (See docs [here](https://docs.ficsit.app/ficsitremotemonitoring/latest/commands.html)). This should print the port that is exposed. After that, you can add your session endpoint in this dashboard.

## Features

- Factory statistics visualization (energy, resources, sink points)
- Power circuit monitoring
- Drone and train tracking
- Player management
- Interactive map with Leaflet
- Real-time updates via Server-Sent Events
- **Multi-session support:** Connect to multiple FRM endpoints simultaneously - like your friends FRM endpoints

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Satisfactory│     │             │     │    Redis    │     │   Browser   │
│   (FRM)     │◄────│  API Poller │────►│   Pub/Sub   │◄────│   Clients   │
│             │     │             │     │             │     │    (SSE)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     1 poll              1 API              N subscribers        N clients
```

The dashboard is designed so that **client browsers never directly communicate with the FRM API**. Instead:

1. **API Poller:** A single poller in the API server periodically fetches data from your Satisfactory FRM endpoint
2. **Redis Pub/Sub:** The poller publishes updates to a Redis pub/sub queue
3. **SSE Stream:** Each browser client establishes a Server-Sent Events connection to the API, which proxies events from Redis

This architecture means that **many dashboard clients will never affect your Satisfactory game performance** - the game only sees a single polling connection regardless of how many people are viewing the dashboard. The load scales on Redis (which is highly scalable) and the API server, not on your game.

### Current Limitations

> **Single API Instance:** The API should currently run as a single instance. Running multiple instances would create duplicate pollers for the same session. (To be implemented: distributed polling coordination)

> **Server-wide Sessions:** When a session is added, it's visible to all users of that dashboard instance - there are no user-scoped sessions. This dashboard is intended for private/trusted hosting. (To be implemented: user authentication and scoped sessions)

## Quick Start

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- API: http://localhost:8081

## Development

```bash
make deps      # Start Redis
make run       # Run frontend (3039) + backend (8081) with hot reload
```

Other useful commands:

```bash
make help      # Show all available commands
make lint      # Run linters
make build     # Build for production
```

## Tech Stack

- **Frontend:** React, TypeScript, Material-UI, Vite, Bun
- **Backend:** Go, Gin, Redis
- **Real-time:** Server-Sent Events (SSE)

## Production Deployment

For production deployments, the dashboard is split into three services:

```
                  Ingress
                     │
    ┌────────────────┼────────────────┐
    │                │                │
/assets/images/*     /api/*           /*
    │                │                │
Asset Server       API Server      Dashboard
 (nginx)            (Go)           (nginx)
```

### Services

| Service | Description | Port |
|---------|-------------|------|
| Dashboard | React frontend (no assets) | 3000 |
| API | Go backend with Redis | 8081 |
| Asset Server | Static assets (map tiles, icons) | 80 |

### Building

```bash
# Build all images
make docker-build                    # Dashboard with assets (local dev)
make asset-server                    # Asset server image

# Push to registry
make asset-server-push               # Build and push asset server
```

### Local Development vs Production

| Environment | Assets Location |
|-------------|-----------------|
| Local (`docker compose up`) | Bundled in dashboard container |
| Production | Separate asset server container |

The `INCLUDE_ASSETS` build argument controls whether assets are bundled into the dashboard image. For local development, `compose.yml` sets `INCLUDE_ASSETS=true`. For production, assets are served by a dedicated nginx container.

## Note on Repository Size

This repository includes all assets (map tiles, images, etc.) and does not rely on third-party hosting. This makes the repo self-contained but relatively large.
