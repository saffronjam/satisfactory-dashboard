# Research: Universal Map Selection

**Date**: 2026-01-16
**Feature**: 004-universal-map-selection

## Research Questions

### 1. How should selection state be structured for universal entity selection?

**Decision**: Use a unified `Selection` type that contains arrays of entity references by category, with computed aggregate statistics.

**Rationale**:
- Current system has 8 different `SelectedMapItem` types making the sidebar rendering complex
- A single `Selection` type with categorized arrays is cleaner and supports the sub-tab UI directly
- Aggregation logic can be computed once when selection changes, not on every render

**Alternatives considered**:
- Keep existing union type approach: Rejected because it requires handling many cases in sidebar
- Single flat array of entities: Rejected because aggregation by type is needed for sub-tabs

### 2. How should the SelectionRectangle be modified for universal entity selection?

**Decision**: Extend SelectionRectangle to query all visible entity layers (not just machine groups) and collect entities within bounds.

**Rationale**:
- Current SelectionRectangle only checks machine group markers
- Need to check: buildings (via canvas hit detection or bounding boxes), vehicles (marker positions), infrastructure (polyline bounds), special entities (marker positions)
- Buildings already have bounding box data that can be used for intersection testing

**Alternatives considered**:
- Create separate selection handlers per layer: Rejected due to complexity
- Use Leaflet's built-in selection: Not available for mixed layer types

### 3. How should entity click handlers support both single-click dedicated views and multi-select?

**Decision**: Modifier key detection - plain click opens dedicated view, Ctrl/Cmd+click adds to selection.

**Rationale**:
- Matches existing pattern (Ctrl+drag for selection rectangle)
- Intuitive for desktop users familiar with file managers
- Mobile uses multi-select mode toggle (already exists)

**Alternatives considered**:
- Long-press for multi-select: Conflicts with map panning
- Always show selection, click again for details: More clicks required

### 4. How should persistent selection highlighting be implemented?

**Decision**: New `SelectionHighlight` layer component that renders visual indicators (circles/rectangles) at selected entity positions.

**Rationale**:
- Separate from entity markers so highlights can be toggled independently
- Renders on top of entities but below UI controls
- Only renders when: "Show Selection" setting enabled AND Selection tab is active

**Alternatives considered**:
- Modify each entity marker to show selection state: Too many components to modify
- Use CSS filter on selected entities: Not possible with Leaflet markers

### 5. How should aggregation statistics be computed efficiently for 1000+ entities?

**Decision**: Memoize aggregation with `useMemo`, compute once per selection change.

**Rationale**:
- Current machine group aggregation already handles similar computation
- Selection changes are user-initiated (not continuous like animations)
- `useMemo` prevents recalculation on unrelated re-renders

**Alternatives considered**:
- Web Worker for heavy computation: Overkill for this scale
- Incremental aggregation: Complexity not justified given selection change frequency

### 6. Which entity types have which statistics available?

**Decision**: Map entity types to available statistics:

| Entity Type | Power Data | Production Data | Vehicles Data |
|-------------|------------|-----------------|---------------|
| Factories (Constructors, etc.) | ✅ Consumption | ✅ Production/Consumption | ❌ |
| Extractors (Miners, etc.) | ✅ Consumption | ✅ Production | ❌ |
| Generators | ✅ Production | ❌ | ❌ |
| Train Stations | ❌ | ❌ | ✅ Docked trains |
| Drone Stations | ❌ | ❌ | ✅ Docked drones |
| Truck Stations | ❌ | ❌ | ❌ |
| Storage | ❌ | ❌ | ❌ |
| Space Elevator | ❌ | ❌ | ❌ |
| HUB | ❌ | ❌ | ❌ |
| Radar Tower | ❌ | ❌ | ❌ |
| Vehicles (all types) | ❌ | ❌ | ❌ |
| Infrastructure (all types) | ❌ | ❌ | ❌ |

**Rationale**: This determines which sub-tabs appear - Buildings always, others only when relevant data exists.

### 7. What machine group code needs to be removed?

**Decision**: Complete removal of the following:

**Files to delete**:
- `dashboard/src/sections/map/overlay/components/MachineGroupMarkers.tsx`
- `dashboard/src/sections/map/overlay/utils/groupIconCreation.ts`

**Code to remove from files**:
- `utils.ts`: `computeUnifiedGroups`, `UnionFind`, `zoomToGroupDistance`, `groupByDistance` functions
- `types.ts`: `MachineGroup` type (keep entity types), `machineGroup`/`machineGroups`/`multiSelection` from `SelectedMapItem`
- `map-view.tsx`: `groupDistance` state, `autoGroupByZoom` state, machine groups layer toggle, grouping slider, auto-group checkbox
- `selectionSidebar.tsx`: `renderMachineGroup`, `renderMachineGroups`, `renderMultiSelection` functions
- `Overlay.tsx`: MachineGroupMarkers rendering
- Layer settings: "Machine Groups" layer option and all related filters

**Rationale**: Clean removal prevents confusion and dead code accumulation per Constitution Principle II.

### 8. What is the structure of building data for selection?

**Decision**: Use existing `Machine` type from API which includes:
```typescript
Machine {
  id: string
  type: string (building class name)
  x, y, z: number
  rotation: number
  recipe: string | null
  ingredients: IngredientEntry[]
  production: ProductionEntry[]
  powerConsumption: number
  // ... other fields
}
```

**Rationale**: All needed data (position, type, power, production) already available in the existing data structures.

## Findings Summary

All technical questions resolved. No NEEDS CLARIFICATION items remain.

**Key architecture decisions**:
1. Single unified `Selection` type replacing the union of selection types
2. Selection aggregation computed via `useMemo` on selection change
3. SelectionRectangle extended to check all visible layers
4. New `SelectionHighlight` component for persistent visual highlighting
5. Ctrl+click for additive selection, plain click for dedicated views
6. Complete removal of machine group code (2 files deleted, ~6 files modified)
