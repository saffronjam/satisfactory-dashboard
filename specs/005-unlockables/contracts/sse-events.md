# SSE Event Contract: Schematics

**Feature**: 005-unlockables
**Event Type**: `schematics`

## Event Structure

```typescript
interface SchematicsEvent {
  type: "schematics";
  data: Schematic[];
}

interface Schematic {
  id: string;
  name: string;
  tier: number;
  type: string;      // Always "Milestone" (filtered)
  purchased: boolean;
}
```

## Event Flow

1. Backend polls FRM API `/getSchematics` every 30 seconds
2. Backend filters to `Type === "Milestone"`
3. Backend transforms `TechTier` → `tier`
4. Backend caches in Redis at `state:{sessionID}:schematics`
5. Backend emits SSE event to connected clients

## Example Event

```json
{
  "type": "schematics",
  "data": [
    {
      "id": "Schematic_1-1_C",
      "name": "Base Building",
      "tier": 1,
      "type": "Milestone",
      "purchased": true
    },
    {
      "id": "Schematic_6-3_C",
      "name": "Monorail Train Technology",
      "tier": 6,
      "type": "Milestone",
      "purchased": true
    },
    {
      "id": "Schematic_7-4_C",
      "name": "Aeronautical Engineering",
      "tier": 8,
      "type": "Milestone",
      "purchased": false
    }
  ]
}
```

## Frontend Handling

```typescript
// In ApiProvider.tsx SSE listener
case 'schematics':
  setState(prev => ({ ...prev, schematics: event.data }));
  break;
```

## Polling Behavior

- **Interval**: 30 seconds
- **Initial Load**: Included in `/v1/sessions/{id}/state` response
- **Updates**: Pushed via SSE when poll completes
- **Failure**: Previous cached data retained, no event emitted
