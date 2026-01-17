---
name: frm-endpoint
description: Adding a new FRM endpoint in the API. Use when the user asks to add a new data type, endpoint, or expose new Satisfactory game data. Covers backend model, FRM client, mock client, route registration, and Debug view integration.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Adding a New FRM Endpoint

This skill guides you through adding a new endpoint that fetches data from the FRM (Ficsit Remote Monitoring) mod API and exposes it through our backend.

## Overview

FRM endpoints are **forwarding layers** - they fetch data from the Satisfactory game server via the FRM mod and expose it through our REST API. The data flows:

```
FRM Mod (Satisfactory) → frm_client → Redis Cache → REST API → Frontend
```

## Key Principles

1. **Reuse existing data types where possible** - Check `api/models/models/` for existing structs that might fit your needs
2. **FRM endpoints forward data** - Don't over-engineer; the goal is to translate FRM format to our format
3. **Mock data is required** - Every endpoint needs a mock implementation for testing
4. **Debug view integration** - Add new data types to the Debug page for visibility

## Step-by-Step Process

### Step 1: Check for Existing Types

Before creating new models, search for existing types that might work:

```bash
# Search for similar models
grep -r "type.*struct" api/models/models/
```

Common reusable types:
- `models.Location` - 3D coordinates with rotation
- `models.BoundingBox` - Min/max coordinates
- `models.Inventory` - Item slot arrays

### Step 2: Create the Model (if needed)

Add your model to `api/models/models/`. Use existing file or create a new one.

```go
// api/models/models/your_entity.go
package models

// YourEntity represents a game entity from the FRM API.
type YourEntity struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    Location    Location `json:"location"`
    // ... other fields
}
```

**Naming conventions:**
- Use Go naming (PascalCase for exported)
- JSON tags use camelCase
- Keep fields minimal - only what the frontend needs

### Step 3: Add FRM Model (if structure differs)

If FRM's JSON structure differs from your model, add a translation struct:

```go
// api/service/frm_client/frm_models/models.go

// YourEntityFRM matches the FRM API response structure.
type YourEntityFRM struct {
    ID       string   `json:"ID"`        // FRM uses different casing
    Name     string   `json:"Name"`
    Location Location `json:"location"`  // Sometimes matches
}
```

**Note:** FRM field names are inconsistent - some `PascalCase`, some `camelCase`. Match exactly what FRM returns.

### Step 4: Add Event Type Constant

Add the SSE event type in `api/models/models/satisfactory_event.go`:

```go
const (
    // ... existing constants
    SatisfactoryEventYourEntity SatisfactoryEventType = "yourEntity"
)
```

### Step 5: Add to State Struct

Add the field to the State struct in `api/models/models/state.go`:

```go
type State struct {
    // ... existing fields
    YourEntities []YourEntity `json:"yourEntities"`
}
```

### Step 6: Add Client Interface Method

Add the method signature to `api/service/client/client.go`:

```go
type Client interface {
    // ... existing methods
    ListYourEntities(ctx context.Context) ([]models.YourEntity, error)
    // or for single items:
    GetYourEntity(ctx context.Context) (*models.YourEntity, error)
}
```

**Naming conventions:**
- `List*` for arrays
- `Get*` for single items or aggregated data

### Step 7: Implement FRM Client Method

Create or add to an appropriate file in `api/service/frm_client/`:

```go
// api/service/frm_client/your_entity.go
package frm_client

import (
    "api/models/models"
    "api/service/frm_client/frm_models"
    "context"
    "fmt"
)

// ListYourEntities fetches entity data from the FRM API.
func (client *Client) ListYourEntities(ctx context.Context) ([]models.YourEntity, error) {
    var rawEntities []frm_models.YourEntityFRM
    err := client.makeSatisfactoryCall(ctx, "/getYourEntity", &rawEntities)
    if err != nil {
        return nil, fmt.Errorf("failed to get your entities: %w", err)
    }

    // Convert FRM models to our models
    entities := make([]models.YourEntity, 0, len(rawEntities))
    for _, raw := range rawEntities {
        entities = append(entities, models.YourEntity{
            ID:       raw.ID,
            Name:     raw.Name,
            Location: parseLocation(raw.Location),
        })
    }

    return entities, nil
}
```

### Step 8: Add to FRM Polling Loop

In `api/service/frm_client/client.go`, add to the `endpoints` slice in `SetupLightPolling`:

```go
{
    Type:     models.SatisfactoryEventYourEntity,
    Endpoint: func(c context.Context) (interface{}, error) { return client.ListYourEntities(c) },
    Interval: 30 * time.Second,  // Choose appropriate interval
},
```

**Polling intervals:**
- `4s` - Dynamic data (players, vehicles, stats)
- `30s` - Semi-static data (schematics, space elevator)
- `120s` - Infrastructure (belts, pipes, rails)

### Step 9: Implement Mock Client Method (CRITICAL!)

**This step is often forgotten but is essential for testing.**

```go
// api/service/mock_client/your_entity.go
package mock_client

import (
    "api/models/models"
    "context"
    "math/rand"
    "time"
)

var yourEntityData = []models.YourEntity{
    {ID: "entity-1", Name: "Test Entity 1", Location: loc(1000, 500, 2000, 0)},
    {ID: "entity-2", Name: "Test Entity 2", Location: loc(3000, 500, 4000, 90)},
}

// ListYourEntities returns mock entity data for testing.
func (c *Client) ListYourEntities(_ context.Context) ([]models.YourEntity, error) {
    time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
    entities := make([]models.YourEntity, len(yourEntityData))
    copy(entities, yourEntityData)
    return entities, nil
}
```

### Step 10: Add to Mock Polling Loop (CRITICAL!)

In `api/service/mock_client/client.go`, add to `SetupLightPolling`:

```go
Publish(ctx, models.SatisfactoryEventYourEntity, c.ListYourEntities, onEvent)
```

**If you forget this step, mock sessions will show `null` for this data type.**

### Step 11: Add to Cache Retrieval

In `api/service/session/cache.go`, add to `GetCachedState`:

```go
getCached(models.SatisfactoryEventYourEntity, &state.YourEntities)
```

### Step 12: Create API Handler

```go
// api/routers/api/v1/your_entity.go
package v1

import (
    "api/models/models"
    "api/service"
    "net/http"

    "github.com/gin-gonic/gin"
)

// ListYourEntities godoc
// @Summary      List your entities
// @Description  Get all your entities from the current session
// @Tags         entities
// @Produce      json
// @Success      200 {array} models.YourEntity
// @Failure      500 {object} models.ErrorResponse
// @Router       /v1/yourEntities [get]
func ListYourEntities(svc *service.Service) gin.HandlerFunc {
    return func(c *gin.Context) {
        rc := NewRequestContext(c)
        client, ok := rc.GetClient(svc)
        if !ok {
            return
        }

        entities, err := client.ListYourEntities(c.Request.Context())
        if err != nil {
            rc.Error(http.StatusInternalServerError, err.Error())
            return
        }
        rc.Success(entities)
    }
}
```

### Step 13: Create Route Registration

```go
// api/routers/routes/your_entity.go
package routes

import v1 "api/routers/api/v1"

type YourEntityRoutingGroup struct{ RoutingGroupBase }

func YourEntityRoutes() *YourEntityRoutingGroup { return &YourEntityRoutingGroup{} }

func (group *YourEntityRoutingGroup) PublicRoutes() []Route {
    return []Route{
        {Method: "GET", Pattern: "/v1/yourEntities", HandlerFunc: v1.ListYourEntities},
    }
}
```

### Step 14: Register Routes

In `api/routers/routes/routes.go`, add to `RoutingGroups()`:

```go
func RoutingGroups() []RoutingGroup {
    return []RoutingGroup{
        // ... existing routes
        YourEntityRoutes(),
    }
}
```

### Step 15: Regenerate Swagger Docs

```bash
cd api && swag init
```

### Step 16: Generate TypeScript Types

```bash
make generate
```

### Step 17: Add SSE Event Handler (Frontend)

In `dashboard/src/contexts/api/ApiProvider.tsx`, add the case:

```tsx
case API.SatisfactoryEventYourEntity:
    dataRef.current.yourEntities = parsed.data;
    break;
```

Also add to the `fetchState` function and `DEFAULT_DATA`.

### Step 18: Add to ApiData Interface

In `dashboard/src/contexts/api/useApi.ts`:

```tsx
export interface ApiData {
    // ... existing fields
    yourEntities: API.YourEntity[];
}
```

### Step 19: Add to Debug View

In `dashboard/src/sections/debug/view/debug-view.tsx`:

1. Add to the `useContextSelector` call:
```tsx
yourEntities: v.yourEntities,
```

2. Add to `currentData` useMemo:
```tsx
yourEntities: api.yourEntities as unknown as JsonValue,
```

3. Add to `dataRoots` array:
```tsx
{ name: 'yourEntities', icon: 'mdi:your-icon' },
```

## Checklist

Use this checklist when adding a new FRM endpoint:

- [ ] Check for existing reusable types in `api/models/models/`
- [ ] Create model in `api/models/models/` (if needed)
- [ ] Add FRM model in `api/service/frm_client/frm_models/models.go` (if structure differs)
- [ ] Add event type constant in `api/models/models/satisfactory_event.go`
- [ ] Add field to State struct in `api/models/models/state.go`
- [ ] Add method to Client interface in `api/service/client/client.go`
- [ ] Implement FRM client method in `api/service/frm_client/`
- [ ] Add to FRM polling loop in `api/service/frm_client/client.go`
- [ ] Implement mock client method in `api/service/mock_client/`
- [ ] **Add to mock polling loop** in `api/service/mock_client/client.go` (commonly forgotten!)
- [ ] Add to cache retrieval in `api/service/session/cache.go`
- [ ] Create handler in `api/routers/api/v1/`
- [ ] Create route registration in `api/routers/routes/`
- [ ] Register routes in `api/routers/routes/routes.go`
- [ ] Run `swag init` to regenerate Swagger docs
- [ ] Run `make generate` for TypeScript types
- [ ] Add SSE handler case in `dashboard/src/contexts/api/ApiProvider.tsx`
- [ ] Add to ApiData interface in `dashboard/src/contexts/api/useApi.ts`
- [ ] Add to Debug view in `dashboard/src/sections/debug/view/debug-view.tsx`

## Common Mistakes

1. **Forgetting mock `Publish()` call** - Mock data shows `null` in frontend
2. **Wrong FRM field casing** - FRM uses inconsistent casing; match exactly
3. **Missing cache retrieval** - GET endpoint returns empty data
4. **Missing Debug view entry** - Can't inspect data during development

## FRM API Reference

Official FRM documentation: https://docs.ficsit.app/ficsitremotemonitoring/latest/

Common endpoints:
- `/getPower` - Power circuits
- `/getFactory` - Factory machines
- `/getTrains` - Train data
- `/getDrones` - Drone data
- `/getSchematics` - Milestones and research
- `/getBelts` - Conveyor infrastructure
- `/getSpaceElevator` - Space elevator status
