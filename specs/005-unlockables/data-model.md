# Data Model: Unlockables System

**Feature**: 005-unlockables
**Date**: 2026-01-17

## Entities

### Schematic (Backend Model)

Represents a game milestone/schematic with unlock status.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| ID | string | Unique schematic identifier | FRM API `ID` |
| Name | string | Display name for matching | FRM API `Name` |
| Tier | int | Technology tier (1-9) | FRM API `TechTier` (renamed) |
| Type | string | Schematic type (filtered to "Milestone") | FRM API `Type` |
| Purchased | bool | Whether milestone has been unlocked | FRM API `Purchased` |

**Storage**: Redis cache, session-scoped (`state:{sessionID}:schematics`)
**Lifecycle**: Refreshed every 30 seconds via FRM API polling

### LockableFeature (Frontend Config)

Static configuration defining which features require milestones.

| Field | Type | Description |
|-------|------|-------------|
| route | string | Page route path (e.g., "/trains") |
| navKey | string | Navigation item identifier |
| milestoneName | string | Exact milestone name to match |
| tier | number | Milestone tier for display |
| displayName | string | Human-readable feature name |

**Storage**: Static TypeScript configuration
**Lifecycle**: Compile-time constant

### UnlockStatus (Derived State)

Computed state combining schematics and lock mapping.

| Field | Type | Description |
|-------|------|-------------|
| featureKey | string | Feature identifier (navKey) |
| isUnlocked | boolean | Whether feature is accessible |
| lockInfo | LockableFeature | null | Lock configuration if locked |

**Storage**: React hook state (computed on demand)
**Lifecycle**: Updates when schematics SSE event received

## Relationships

```
┌─────────────────┐     fetches      ┌─────────────────┐
│   FRM API       │ ──────────────▶  │   Backend       │
│ /getSchematics  │                  │   (Go)          │
└─────────────────┘                  └────────┬────────┘
                                              │
                                         filters to
                                         milestones
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   Redis Cache   │
                                     │   (Schematics)  │
                                     └────────┬────────┘
                                              │
                                           SSE
                                              │
                                              ▼
┌─────────────────┐     matches      ┌─────────────────┐
│ LockableFeature │ ◀──────────────  │   Frontend      │
│   (Config)      │                  │   (React)       │
└─────────────────┘                  └────────┬────────┘
                                              │
                                          computes
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  UnlockStatus   │
                                     │   (Derived)     │
                                     └─────────────────┘
```

## State Transitions

### Schematic Purchase Flow

```
┌────────────────┐    Player purchases    ┌────────────────┐
│   Purchased:   │    milestone in game   │   Purchased:   │
│     false      │ ─────────────────────▶ │     true       │
└────────────────┘                        └────────────────┘
```

**Trigger**: In-game milestone completion
**Detection**: Next FRM API poll (≤30 seconds)
**Propagation**: Redis → SSE → Frontend → UI update

### Feature Unlock Flow

```
┌────────────────┐    Schematic.Purchased  ┌────────────────┐
│    Locked      │    changes to true      │   Unlocked     │
│  (faded nav,   │ ──────────────────────▶ │  (normal nav,  │
│  locked page)  │                         │  full content) │
└────────────────┘                         └────────────────┘
```

**UI Changes**:
- Navigation: Opacity 100%, no padlock icon
- Page: Full content renders instead of locked screen

## Validation Rules

### Schematic
- ID must be non-empty string
- Name must be non-empty string
- Tier must be 0-9 (game tier range)
- Type must be "Milestone" (after filtering)
- Purchased is boolean (no null)

### LockableFeature
- route must start with "/"
- navKey must be unique across all features
- milestoneName must match exactly (case-sensitive)
- tier must be 1-9
- displayName must be non-empty

## Initial Data

### Lockable Features Configuration

```typescript
const LOCKABLE_FEATURES: LockableFeature[] = [
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

## FRM API Response Structure (Reference)

Full schematic object from `/getSchematics`:

```json
{
  "ID": "Schematic_6-3_C",
  "Name": "Monorail Train Technology",
  "ClassName": "Schematic_6-3_C",
  "TechTier": 6,
  "Type": "Milestone",
  "HasUnlocks": true,
  "Locked": false,
  "Purchased": true,
  "DepLocked": false,
  "LockedTutorial": false,
  "LockedPhase": false,
  "Tutorial": false,
  "Recipes": [...],
  "Cost": [...]
}
```

**Fields used by this feature**: ID, Name, TechTier (→Tier), Type, Purchased
**Fields ignored**: ClassName, HasUnlocks, Locked, DepLocked, LockedTutorial, LockedPhase, Tutorial, Recipes, Cost
