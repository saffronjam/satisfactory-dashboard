# Satisfactory Dashboard

<div align="center">
  <img src="docs/images/dashboard.png" alt="Satisfactory Dashboard" width="800">
</div>

A real-time dashboard for monitoring and managing your Satisfactory factory.

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

## Note on Repository Size

This repository includes all assets (map tiles, images, etc.) and does not rely on third-party hosting. This makes the repo self-contained but relatively large.
