# Mock Client - Test Data Provider

This package provides **static/generated test data** for development and testing without requiring a running Satisfactory game server.

## Purpose

The mock client implements the same `client.Client` interface as `frm_client`, but returns fabricated data instead of fetching from a real FRM API. This enables:

- Frontend development without game server
- Testing API endpoints and SSE streaming
- Demo mode for showcasing the dashboard

## Architecture

```
┌─────────────────────────────────────────┐
│  mock_client                            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Get*/List* methods             │    │  ← Return static/random data
│  │  (same interface as frm_client) │    │
│  └─────────────────────────────────┘    │
│              │                          │
│              ▼                          │
│  ┌─────────────────────────────────┐    │
│  │  SetupEventStream               │    │  ← Publishes all events
│  │  (must include ALL event types) │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `client.go` | Main client, `SetupEventStream`, `Publish` helper |
| `stats.go` | Factory stats, production stats, sink stats |
| `power.go` | Circuits, cables (realistic power grid) |
| `trains.go` | Trains and stations (with timetables) |
| `drones.go` | Drones and drone stations |
| `vehicles.go` | Trucks, tractors, explorers |
| `infra.go` | Belts, pipes, rails, hypertubes |
| `misc.go` | Space elevator, HUB, radar towers |
| `world.go` | Resource nodes |
| `players.go` | Player data |
| `machines.go` | Factory machines |
| `session.go` | Session info |

## Adding a New Endpoint

### Step 1: Implement the Method

Add the method to return test data:

```go
// misc.go (or appropriate file)
func (c *Client) GetNewThing(_ context.Context) (*models.NewThing, error) {
    time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)  // Simulate latency

    return &models.NewThing{
        ID:       "newthing-1",
        Name:     "Test Thing",
        Level:    3,
        Location: loc(8000, 500, 3000, 0),  // Use loc() helper
        BoundingBox: models.BoundingBox{
            Min: models.Location{X: 7500, Y: 0, Z: 2500},
            Max: models.Location{X: 8500, Y: 1000, Z: 3500},
        },
    }, nil
}
```

### Step 2: Add to SetupEventStream (CRITICAL!)

**This is the most commonly forgotten step.** In `client.go`, add to `SetupEventStream`:

```go
func (c *Client) SetupEventStream(ctx context.Context, onEvent func(*models.SatisfactoryEvent)) error {
    // ... existing Publish calls ...
    Publish(ctx, models.SatisfactoryEventNewThing, c.GetNewThing, onEvent)  // ADD THIS
    // ...
    return nil
}
```

**If you forget this step, the data will show as `null` in the frontend for mock sessions.**

## Common Mistake: Forgetting SetupEventStream

When adding new data types, it's easy to:
1. ✅ Add the `Get*` or `List*` method
2. ❌ Forget to add the `Publish()` call in `SetupEventStream`

**Result:** The method exists but is never called, so the event is never emitted and the frontend shows `null`.

**Example of the bug (Hub was missing):**
```go
// GetHub existed and returned data...
func (c *Client) GetHub(_ context.Context) (*models.Hub, error) {
    return &models.Hub{ID: "hub-1", ...}, nil
}

// ...but SetupEventStream didn't include it:
func (c *Client) SetupEventStream(...) error {
    Publish(ctx, models.SatisfactoryEventSpaceElevator, c.GetSpaceElevator, onEvent)
    // Publish(ctx, models.SatisfactoryEventHub, c.GetHub, onEvent)  // MISSING!
    Publish(ctx, models.SatisfactoryEventRadarTowers, c.ListRadarTowers, onEvent)
}
```

## Helper Functions

### Location Helper

```go
// Creates a models.Location with rotation
loc(x, y, z, rotation float64) models.Location
```

### Random Helpers

```go
randInt(base, variance int) int           // base ± variance
randFloat(base, variance float64) float64 // base ± variance
```

### Publish Helper

```go
// Publish starts a goroutine that calls the fetcher and emits the event
func Publish[T any](
    ctx context.Context,
    eventType models.SatisfactoryEventType,
    fetcher func(context.Context) (T, error),
    onEvent func(*models.SatisfactoryEvent),
)
```

## Data Realism

Mock data is designed to be realistic:

- **Trains** follow timetables between named stations
- **Power grid** has realistic circuit topology
- **Production** stats show plausible factory output
- **Infrastructure** forms connected networks
- **Coordinates** place items across the map

## Connection Health (No-ops)

Mock client never "disconnects":

```go
func (c *Client) GetFailureCount() int { return 0 }
func (c *Client) IsDisconnected() bool { return false }
func (c *Client) SetDisconnectedCallback(callback func()) {} // No-op
```

## Checklist for New Endpoints

When adding a new data type to mock_client:

- [ ] Add `Get*` or `List*` method with realistic test data
- [ ] **Add `Publish()` call in `SetupEventStream`** ← Don't forget!
- [ ] Use appropriate helpers (`loc()`, `randInt()`, etc.)
- [ ] Add simulated latency: `time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)`
