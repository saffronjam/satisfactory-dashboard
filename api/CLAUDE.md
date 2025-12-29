# API - Commander Backend

This document provides guidance for working with the Go backend API server.

## Overview

Go-based REST API server for the Commander dashboard. Provides real-time factory data from Satisfactory via SSE streaming, with Redis caching and Prometheus metrics.

## Go Coding Standards

Follow idiomatic Go practices:

- Use `gofmt` and `goimports` for formatting
- Check all errors immediately
- Keep the happy path left-aligned (return early)
- Document all exported symbols
- Use proper naming conventions (mixedCaps, avoid underscores)

## Architecture

### Clean Architecture Layers

**Domain Layer** (`models/`)

- Data models representing Satisfactory entities
- DTOs for API responses
- No external dependencies

**Service Layer** (`service/`)

- Satisfactory API client abstraction
- Interface-driven design for testing
- Real and mock implementations

**Presentation Layer** (`routers/`)

- HTTP handlers and routing
- Request validation
- Response formatting

**Infrastructure Layer** (`pkg/`)

- Configuration management
- Redis connection
- Logging and metrics

### Directory Structure

```
api/
├── cmd/                       # App initialization and CLI flags
├── routers/                   # HTTP routing
│   ├── api/v1/               # Endpoint handlers
│   │   └── middleware/       # SSE and other middleware
│   └── routes/               # Route group definitions (interface pattern)
├── models/                    # Data models and DTOs
│   ├── mode/                 # Run mode definitions
│   └── models/               # Domain models (drone, train, circuit, etc.)
├── service/                   # Satisfactory API client
│   ├── client/               # Client interface
│   ├── implClient/           # Real client implementation
│   ├── mockClient/           # Mock client for testing
│   └── session/              # Session management
├── pkg/                       # Shared packages
│   ├── config/               # YAML configuration
│   ├── db/                   # Redis setup and KV store
│   ├── log/                  # Zap structured logging
│   └── metrics/              # Prometheus metrics
├── worker/                    # Background workers (event publisher)
├── docs/                      # Generated Swagger docs
├── export/                    # Tygo configuration for type generation
└── utils/                     # Utility functions
```

## Development Workflow

### Running the Server

```bash
go run main.go                # Run with default config
go run main.go -mode=dev      # Specify mode
go run main.go -config=config.local.yml  # Custom config
```

### Building

```bash
go build -o main .            # Build binary
CGO_ENABLED=0 go build -o main .  # Static binary for containers
```

### Swagger Documentation

```bash
swag init                     # Regenerate Swagger docs
```

Swagger UI available at `/v2/docs/` when running.

### Type Generation

```bash
tygo generate                 # Generate TypeScript types
```

Config: `export/tygo.yml`
Output: `../commander/src/apiTypes.ts`

## Key Development Patterns

### RoutingGroup Interface

Each route group implements a consistent interface:

```go
// routes/routes.go
type RoutingGroup interface {
    PublicRoutes() []Route
    PrivateRoutes() []Route
    HookRoutes() []Route
}

// Usage in routes/circuits.go
type CircuitsRoutingGroup struct{ RoutingGroupBase }

func CircuitRoutes() *CircuitsRoutingGroup { return &CircuitsRoutingGroup{} }

func (group *CircuitsRoutingGroup) PublicRoutes() []Route {
    return []Route{
        {Method: "GET", Pattern: "/v1/circuits", HandlerFunc: v1.ListCircuits},
    }
}

// Registration in routes/routes.go
func RoutingGroups() []RoutingGroup {
    return []RoutingGroup{
        SessionRoutes(),
        CircuitRoutes(),
        // ...
    }
}
```

### RequestContext Pattern

Consistent response handling:

```go
// routers/api/v1/request_context.go
type RequestContext struct {
    ctx *gin.Context
}

func NewRequestContext(ctx *gin.Context) *RequestContext {
    return &RequestContext{ctx: ctx}
}

func (r *RequestContext) Success(data interface{}) {
    r.ctx.JSON(http.StatusOK, data)
}

func (r *RequestContext) Error(code int, message string) {
    r.ctx.JSON(code, models.ErrorResponse{Message: message})
}

// Usage in handler
func GetCircuits(svc *service.Service) gin.HandlerFunc {
    return func(c *gin.Context) {
        rc := NewRequestContext(c)
        circuits, err := svc.Client.GetCircuits()
        if err != nil {
            rc.Error(http.StatusInternalServerError, err.Error())
            return
        }
        rc.Success(circuits)
    }
}
```

### Server-Sent Events

Real-time updates via SSE:

```go
// routers/api/v1/events_sse.go
func GetEvents(svc *service.Service) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Content-Type", "text/event-stream")
        c.Header("Cache-Control", "no-cache")
        c.Header("Connection", "keep-alive")

        // Subscribe to Redis pub/sub
        pubsub := svc.Redis.Subscribe(c, "events")
        defer pubsub.Close()

        for msg := range pubsub.Channel() {
            c.SSEvent("message", msg.Payload)
            c.Writer.Flush()
        }
    }
}
```

### Service Layer

Interface-driven for testing:

```go
// service/client/client.go
type Client interface {
    GetCircuits() ([]models.Circuit, error)
    GetDrones() ([]models.Drone, error)
    GetTrains() ([]models.Train, error)
    GetPlayers() ([]models.Player, error)
    // ...
}

// service/implClient/client.go - Real implementation
// service/mockClient/client.go - Mock for testing
```

### Configuration

YAML-based with environment support:

```go
// pkg/config/config.go
type Config struct {
    Port              int    `yaml:"port"`
    Mode              string `yaml:"mode"`
    ExternalURL       string `yaml:"externalUrl"`
    SatisfactoryAPIURL string `yaml:"satisfactoryApiUrl"`
    RedisURL          string `yaml:"redisUrl"`
    Mock              bool   `yaml:"mock"`
}
```

## Adding New Endpoints

1. **Create model** in `models/models/` if needed:

   ```go
   type NewEntity struct {
       ID   string `json:"id"`
       Name string `json:"name"`
   }
   ```

2. **Add client method** in `service/client/client.go`:

   ```go
   GetNewEntities() ([]models.NewEntity, error)
   ```

3. **Implement** in `service/implClient/` and `service/mockClient/`

4. **Create handler** in `routers/api/v1/`:

   ```go
   // @Summary Get new entities
   // @Tags entities
   // @Produce json
   // @Success 200 {array} models.NewEntity
   // @Router /v1/entities [get]
   func GetNewEntities(svc *service.Service) gin.HandlerFunc {
       return func(c *gin.Context) {
           rc := NewRequestContext(c)
           entities, err := svc.Client.GetNewEntities()
           if err != nil {
               rc.Error(http.StatusInternalServerError, err.Error())
               return
           }
           rc.Success(entities)
       }
   }
   ```

5. **Create route group** in `routers/routes/`:

   ```go
   type EntitiesRoutingGroup struct{ RoutingGroupBase }

   func EntityRoutes() *EntitiesRoutingGroup { return &EntitiesRoutingGroup{} }

   func (group *EntitiesRoutingGroup) PublicRoutes() []Route {
       return []Route{
           {Method: "GET", Pattern: "/v1/entities", HandlerFunc: v1.GetNewEntities},
       }
   }
   ```

6. **Register** in `routes/routes.go`:

   ```go
   func RoutingGroups() []RoutingGroup {
       return []RoutingGroup{
           // ... existing routes
           EntityRoutes(),
       }
   }
   ```

7. **Regenerate docs**:

   ```bash
   swag init
   ```

8. **Generate TypeScript types**:
   ```bash
   tygo generate
   ```

## Middleware Stack

Default middleware applied to all routes:

```go
// routers/router.go
router.Use(cors.Default())           // CORS handling
router.Use(ginzap.Ginzap(logger, time.RFC3339, true))  // Request logging
router.Use(ginzap.RecoveryWithZap(logger, true))       // Panic recovery
router.Use(metrics.Middleware())     // Prometheus metrics
```

## Background Workers

**Publisher Worker** (`worker/publisher.go`):

- Polls Satisfactory API for changes
- Publishes events to Redis pub/sub
- Clients receive updates via SSE

```go
// Start publisher in main.go
go worker.StartPublisher(ctx, service, redis)
```

## Testing

Use mock client for testing:

```yaml
# config.local.yml
mock: true
```

```go
// service/mockClient provides static test data
svc := service.NewService(config)  // Uses mockClient when mock=true
```

## Logging

Structured logging with Zap:

```go
import "api/pkg/log"

log.Info("Processing request", zap.String("endpoint", "/circuits"))
log.Error("Failed to fetch data", zap.Error(err))
```

## Metrics

Prometheus metrics at `/internal/metrics`:

- HTTP request duration
- Request count by status
- Active connections

## Docker Build

```dockerfile
# Multi-stage build
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM alpine:latest
COPY --from=builder /app/main /app/
COPY --from=builder /app/docs /app/docs
COPY --from=builder /app/config.docker.yml /app/
CMD ["/app/main"]
```

## Related Documentation

- **Root CLAUDE.md**: Full-stack architecture overview
- **commander/CLAUDE.md**: Frontend architecture
- **Swagger UI**: `/v2/docs/` for API documentation
