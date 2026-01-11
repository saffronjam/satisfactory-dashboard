# FRM Client - Ficsit Remote Monitoring API Client

This package is a **translation layer** between the FRM (Ficsit Remote Monitoring) mod API and our internal application models.

## Purpose

The FRM mod exposes a REST API from the Satisfactory game server. This client:

1. **Fetches data** from FRM endpoints (e.g., `/getPower`, `/getTrains`, `/getFactory`)
2. **Translates** FRM's JSON response format into our internal `models.` types
3. **Polls** endpoints at configured intervals and emits events via callbacks
4. **Handles** connection health, timeouts, and request queuing

## Architecture

```
FRM Mod API (game server)
       │
       ▼
┌─────────────────────────────────────────┐
│  frm_client                             │
│  ┌─────────────────────────────────┐    │
│  │  frm_models/                    │    │  ← Raw FRM response structs
│  │  (FRM JSON field names)         │    │
│  └─────────────────────────────────┘    │
│              │                          │
│              ▼ parse + convert          │
│  ┌─────────────────────────────────┐    │
│  │  models.* (our internal types)  │    │  ← Clean app models
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
       │
       ▼
  Application (cached in Redis, sent via SSE)
```

## Key Files

| File | Purpose |
|------|---------|
| `client.go` | Main client, `SetupEventStream` polling config, HTTP helpers |
| `frm_models/models.go` | Raw FRM API response structs (match FRM's JSON exactly) |
| `stats.go` | Factory stats, production stats, sink stats |
| `power.go` | Circuits, cables, generators |
| `trains.go` | Trains and train stations |
| `drones.go` | Drones and drone stations |
| `vehicles.go` | Trucks, tractors, explorers |
| `infra.go` | Belts, pipes, rails, hypertubes |
| `misc.go` | Space elevator, HUB, radar towers |
| `world.go` | Resource nodes |
| `players.go` | Player data |
| `utils.go` | Helper functions for coordinate conversion |
| `request_queue.go` | Request deduplication and sequential processing |

## Adding a New Endpoint

### Step 1: Add FRM Model (if needed)

If the FRM API response has a unique structure, add it to `frm_models/models.go`:

```go
// frm_models/models.go
type NewThing struct {
    ID       string   `json:"ID"`        // FRM uses uppercase field names
    Name     string   `json:"Name"`
    Location Location `json:"location"`  // Some fields are lowercase
    Features BoundingBox `json:"features"` // FRM calls bounding box "features"
}
```

**Note:** FRM field names are inconsistent - some are `PascalCase`, some `camelCase`. Match exactly what FRM returns.

### Step 2: Implement Client Method

Add the method to fetch and convert data (typically in the appropriate domain file):

```go
// misc.go (or appropriate file)
func (client *Client) GetNewThing(ctx context.Context) (*models.NewThing, error) {
    var rawList []frm_models.NewThing
    err := client.makeSatisfactoryCallWithTimeout(ctx, "/getNewThing", &rawList, apiTimeout)
    if err != nil {
        return nil, fmt.Errorf("failed to get new thing: %w", err)
    }

    // Handle empty response (single-item endpoints)
    if len(rawList) == 0 {
        return nil, nil
    }

    raw := rawList[0]
    if raw.ID == "" {
        return nil, nil  // No valid data
    }

    // Convert FRM model to our model
    return &models.NewThing{
        ID:          raw.ID,
        Name:        raw.Name,
        Location:    parseLocation(raw.Location),
        BoundingBox: parseBoundingBox(raw.Features),
    }, nil
}
```

### Step 3: Add to Event Polling

In `client.go`, add to the `endpoints` slice in `SetupEventStream`:

```go
{
    Type:     models.SatisfactoryEventNewThing,
    Endpoint: func(c context.Context) (interface{}, error) { return client.GetNewThing(c) },
    Interval: 30 * time.Second,  // Choose appropriate interval
},
```

**Polling intervals:**
- `4s` - Dynamic data (players, vehicles, stats)
- `30s` - Semi-static data (space elevator, HUB)
- `120s` - Infrastructure (belts, pipes, rails)

## Helper Functions

Common conversion helpers in `utils.go`:

```go
parseLocation(raw frm_models.Location) models.Location
parseBoundingBox(raw frm_models.BoundingBox) models.BoundingBox
```

## Connection Health

The client tracks consecutive failures and triggers a disconnection callback after 5 failures:

- `incrementFailureCount()` - Called on network errors
- `resetFailureCount()` - Called on successful requests
- `IsDisconnected()` - Returns true if failure threshold reached
- `SetDisconnectedCallback()` - Set handler for disconnection events

## Request Queue

`RequestQueue` prevents overwhelming the FRM API:

- Sequential request processing
- Deduplication (skips if same endpoint already in-flight)
- Used via `client.requestQueue.Enqueue(endpointType, func)`

## FRM API Documentation

Official FRM endpoint documentation: https://docs.ficsit.app/ficsitremotemonitoring/latest/

Common endpoints:
- `/` - API status check
- `/getPower` - Power circuits
- `/getFactory` - Factory machines
- `/getTrains` - Train data
- `/getDrones` - Drone data
- `/getBelts` - Conveyor infrastructure
- `/getSpaceElevator` - Space elevator
- `/getTradingPost` - HUB (Trading Post is old name)
