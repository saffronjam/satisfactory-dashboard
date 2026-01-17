# Data Model: Universal Map Selection

**Date**: 2026-01-16
**Feature**: 004-universal-map-selection

## Entity Definitions

### SelectableEntity

A union type representing any entity that can be selected on the map.

```typescript
/**
 * Represents any entity that can be selected on the map.
 * Used for universal selection across all visible layers.
 */
type SelectableEntity =
  // Buildings
  | { type: 'machine'; data: Machine }
  // Special structures
  | { type: 'trainStation'; data: TrainStation }
  | { type: 'droneStation'; data: DroneStation }
  | { type: 'radarTower'; data: RadarTower }
  | { type: 'hub'; data: Hub }
  | { type: 'spaceElevator'; data: SpaceElevator }
  // Vehicles
  | { type: 'train'; data: Train }
  | { type: 'drone'; data: Drone }
  | { type: 'truck'; data: Truck }
  | { type: 'tractor'; data: Tractor }
  | { type: 'explorer'; data: Explorer }
  | { type: 'player'; data: Player }
  // Infrastructure (optional - may not be selectable in v1)
  | { type: 'belt'; data: Belt }
  | { type: 'pipe'; data: Pipe }
  | { type: 'cable'; data: PowerCable }
  | { type: 'rail'; data: TrainRail }
  | { type: 'hypertube'; data: Hypertube };
```

### Selection

Aggregated selection state containing all selected entities and computed statistics.

```typescript
/**
 * Represents a multi-entity selection with aggregated statistics.
 * Used to populate the Selection tab in the map sidebar.
 */
interface Selection {
  /** Unique identifier for this selection (for tab management) */
  id: string;

  /** All selected entities by category */
  entities: {
    machines: Machine[];
    trainStations: TrainStation[];
    droneStations: DroneStation[];
    radarTowers: RadarTower[];
    hubs: Hub[];
    spaceElevators: SpaceElevator[];
    trains: Train[];
    drones: Drone[];
    trucks: Truck[];
    tractors: Tractor[];
    explorers: Explorer[];
    players: Player[];
    // Infrastructure (optional)
    belts: Belt[];
    pipes: Pipe[];
    cables: PowerCable[];
    rails: TrainRail[];
    hypertubes: Hypertube[];
  };

  /** Total count of all selected entities */
  totalCount: number;

  /** Aggregated power statistics (computed) */
  power: {
    consumption: number;  // MW consumed by all selected entities
    production: number;   // MW produced by all generators in selection
  };

  /** Aggregated item statistics (computed) */
  items: {
    production: Record<string, number>;   // item name → items/min
    consumption: Record<string, number>;  // item name → items/min
  };

  /** Entity counts by type for Buildings sub-tab */
  buildingCounts: Record<string, number>;  // e.g., { "Constructor": 5, "Assembler": 3 }

  /** Flags for which sub-tabs should be visible */
  hasItems: boolean;      // Show Items sub-tab
  hasPower: boolean;      // Show Power sub-tab
  hasVehicles: boolean;   // Show Vehicles sub-tab (stations with docked vehicles)
}
```

### SelectedMapItem (Updated)

The sidebar selection type, now simplified to support either dedicated entity views or a universal selection.

```typescript
/**
 * Represents an item displayed as a tab in the map sidebar.
 * Supports both single-entity dedicated views and multi-entity selections.
 */
type SelectedMapItem =
  // Single entities with dedicated views (existing behavior preserved)
  | { type: 'trainStation'; data: SelectedTrainStation }
  | { type: 'droneStation'; data: SelectedDroneStation }
  | { type: 'radarTower'; data: RadarTower }
  | { type: 'hub'; data: Hub }
  | { type: 'spaceElevator'; data: SpaceElevator }
  // Universal multi-entity selection (new)
  | { type: 'selection'; data: Selection };
```

### MapSettings (Extended)

Extended map settings to include selection display preference.

```typescript
/**
 * Persisted map settings stored in localStorage.
 */
interface PersistedMapState {
  // Existing fields...
  enabledLayers: string[];
  buildingSubLayers: string[];
  infrastructureSubLayers: string[];
  vehicleSubLayers: string[];
  useGameMapStyle: boolean;
  buildingOpacity: number;
  buildingColorMode: 'type' | 'grid';
  showVehicleNames: boolean;
  zoom: number;
  center: [number, number];
  resourceNodeFilter: ResourceNodeFilter;

  // New field for selection display
  showSelection: boolean;  // default: true
}
```

## Entity Relationships

```
Selection (1)
├── machines (0..n) ─────────► Machine
├── trainStations (0..n) ────► TrainStation ──► dockedTrains (computed)
├── droneStations (0..n) ────► DroneStation ──► dockedDrones (computed)
├── radarTowers (0..n) ──────► RadarTower
├── hubs (0..n) ─────────────► Hub
├── spaceElevators (0..n) ───► SpaceElevator
├── trains (0..n) ───────────► Train
├── drones (0..n) ───────────► Drone
├── trucks (0..n) ───────────► Truck
├── tractors (0..n) ─────────► Tractor
├── explorers (0..n) ────────► Explorer
├── players (0..n) ──────────► Player
└── [infrastructure] (0..n) ─► Belt, Pipe, Cable, Rail, Hypertube
```

## Validation Rules

### Selection Creation
- Selection MUST contain at least 1 entity
- All entities in selection MUST be from visible (enabled) layers
- Entity identity determined by unique `id` field

### Selection Aggregation
- Power consumption: Sum of `powerConsumption` from all machines where machine is not a generator
- Power production: Sum of `powerConsumption` from all machines where machine IS a generator
- Item production: Sum of all `production` entries from machines, grouped by item name
- Item consumption: Sum of all `ingredients` entries from machines, grouped by item name
- Building counts: Count of machines grouped by `type` field (formatted to display name)

### Sub-tab Visibility
- Items sub-tab: `hasItems = Object.keys(items.production).length > 0 || Object.keys(items.consumption).length > 0`
- Power sub-tab: `hasPower = power.consumption > 0 || power.production > 0`
- Vehicles sub-tab: `hasVehicles = trainStations.length > 0 || droneStations.length > 0` (with docked vehicles)
- Buildings sub-tab: Always visible (shows counts for all selected entities)

## State Transitions

### Selection Lifecycle

```
Empty State
    │
    ├─[drag rectangle / Ctrl+click]──► Selection Created
    │                                        │
    │                                        ├─[Ctrl+click entity]──► Entity Added
    │                                        │                             │
    │                                        │                             └──► Recalculate aggregates
    │                                        │
    │                                        ├─[Ctrl+click selected]──► Entity Removed
    │                                        │                              │
    │                                        │                              ├─[count > 0]─► Recalculate
    │                                        │                              │
    │                                        │                              └─[count = 0]─► Empty State
    │                                        │
    │                                        ├─[entity removed from game]──► Entity Removed (auto)
    │                                        │
    │                                        └─[close tab / clear]──► Empty State
    │
    └─[click entity (no modifier)]──► Dedicated View (existing flow)
```

### Selection Display State

```
Selection Exists
    │
    ├─[showSelection = false]──► No highlights shown
    │
    └─[showSelection = true]
          │
          ├─[Selection tab active]──► Highlights visible
          │
          └─[Other tab active]──► Highlights hidden
```

## Removed Types

The following types are **removed** as part of machine group cleanup:

```typescript
// REMOVED - replaced by Selection
interface MachineGroup {
  hash: string;
  machines: Machine[];
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  center: { x: number; y: number };
  powerConsumption: number;
  powerProduction: number;
  itemProduction: Record<string, number>;
  itemConsumption: Record<string, number>;
}

// REMOVED from SelectedMapItem union
| { type: 'machineGroup'; data: MachineGroup }
| { type: 'machineGroups'; data: MachineGroup[] }
| { type: 'multiSelection'; data: MultiSelection }

// REMOVED
interface MultiSelection {
  machineGroups: MachineGroup[];
  trainStations: SelectedTrainStation[];
  droneStations: SelectedDroneStation[];
}
```
