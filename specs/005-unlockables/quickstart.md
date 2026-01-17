# Quickstart: Unlockables System

**Feature**: 005-unlockables
**Branch**: `005-unlockables`

## Overview

This feature adds an unlockables system to the dashboard where certain pages (Trains, Drones) are locked until the player unlocks the corresponding milestone in-game.

## Key Files

### Backend (Go)

| File | Purpose |
|------|---------|
| `api/models/models/schematic.go` | Schematic model definition |
| `api/models/models/satisfactory_event.go` | Add `SatisfactoryEventSchematics` constant |
| `api/models/models/state.go` | Add `Schematics` field to State |
| `api/service/client/client.go` | Add `ListSchematics` interface method |
| `api/service/frm_client/schematics.go` | FRM API implementation |
| `api/service/frm_client/frm_models/models.go` | Raw FRM schematic struct |
| `api/service/mock_client/schematics.go` | Mock implementation |
| `api/service/session/cache.go` | Add schematics to cache retrieval |
| `api/routers/api/v1/schematics.go` | HTTP handler |
| `api/routers/routes/schematics.go` | Route registration |

### Frontend (TypeScript/React)

| File | Purpose |
|------|---------|
| `dashboard/src/config/unlockables.ts` | Feature-to-milestone mapping |
| `dashboard/src/hooks/use-unlockables.ts` | Unlock status hook |
| `dashboard/src/components/locked-feature/locked-feature.tsx` | Locked page component |
| `dashboard/src/contexts/api/useApi.ts` | Add schematics to ApiData |
| `dashboard/src/contexts/api/ApiProvider.tsx` | Handle schematics SSE event |
| `dashboard/src/layouts/config-nav-dashboard.tsx` | Nav item lock status |
| `dashboard/src/layouts/dashboard/sidebar.tsx` | Render locked nav styling |
| `dashboard/src/pages/trains.tsx` | Wrap with lock check |
| `dashboard/src/pages/drones.tsx` | Wrap with lock check |

## Implementation Order

### Phase 1: Backend Schematic Endpoint

1. Create `api/models/models/schematic.go`
2. Add event type to `api/models/models/satisfactory_event.go`
3. Add field to `api/models/models/state.go`
4. Add FRM struct to `api/service/frm_client/frm_models/models.go`
5. Add interface method to `api/service/client/client.go`
6. Create `api/service/frm_client/schematics.go`
7. Create `api/service/mock_client/schematics.go`
8. Add to polling in `api/service/frm_client/client.go`
9. Add to cache in `api/service/session/cache.go`
10. Create handler `api/routers/api/v1/schematics.go`
11. Create routes `api/routers/routes/schematics.go`
12. Run `swag init` in `api/` directory

### Phase 2: Frontend Data Integration

1. Run `make generate` for TypeScript types
2. Add schematics to `ApiData` interface in `useApi.ts`
3. Add SSE handler case in `ApiProvider.tsx`

### Phase 3: Unlockables Logic

1. Create `dashboard/src/config/unlockables.ts`
2. Create `dashboard/src/hooks/use-unlockables.ts`

### Phase 4: UI Components

1. Create `dashboard/src/components/locked-feature/locked-feature.tsx`
2. Update `dashboard/src/layouts/config-nav-dashboard.tsx`
3. Update `dashboard/src/layouts/dashboard/sidebar.tsx`
4. Update `dashboard/src/pages/trains.tsx`
5. Update `dashboard/src/pages/drones.tsx`

### Phase 5: Finalization

1. Run `make prepare-for-commit`
2. Test with mock mode
3. Test with real FRM API

## Testing Checklist

- [ ] Schematics endpoint returns filtered milestones
- [ ] SSE events include schematics data
- [ ] Locked nav items show faded + padlock
- [ ] Clicking locked nav navigates to locked page
- [ ] Locked page shows padlock icon and requirement
- [ ] Unlocking milestone in-game updates UI
- [ ] Missing schematic data shows features as unlocked (fail-open)

## Configuration Reference

### Feature Lock Mapping

```typescript
// dashboard/src/config/unlockables.ts
export const LOCKABLE_FEATURES = [
  {
    route: "/trains",
    navKey: "trains",
    milestoneName: "Monorail Train Technology",
    tier: 6,
    displayName: "Trains"
  },
  {
    route: "/drones",
    navKey: "drones",
    milestoneName: "Aeronautical Engineering",
    tier: 8,
    displayName: "Drones"
  }
];
```

## Related Docs

- [Spec](./spec.md) - Feature requirements
- [Data Model](./data-model.md) - Entity definitions
- [API Contract](./contracts/schematics-api.yaml) - OpenAPI spec
- [SSE Contract](./contracts/sse-events.md) - Event format
- [Research](./research.md) - Design decisions
