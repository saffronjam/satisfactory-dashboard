# Quickstart: Universal Map Selection

**Date**: 2026-01-16
**Feature**: 004-universal-map-selection

## Prerequisites

- Node.js and Bun installed
- Redis running (for backend)
- Repository cloned with LFS assets unpacked

```bash
make unpack-assets  # If not done after clone
make deps           # Start Redis
```

## Development Setup

### 1. Start the application

```bash
make run  # Starts frontend (3039) + backend (8081) with hot reload
```

Or start components separately:
```bash
make frontend  # Dashboard only on :3039
make backend   # API only on :8081
```

### 2. Enable mock mode (recommended for testing)

Edit `api/config/config.local.yaml`:
```yaml
mock: true
```

This provides consistent test data without connecting to a real Satisfactory server.

## Key Files to Modify

### New Files to Create

| File | Purpose |
|------|---------|
| `dashboard/src/sections/map/overlay/components/SelectionHighlight.tsx` | Renders persistent selection highlights |
| `dashboard/src/sections/map/hooks/useSelection.ts` | Selection state management and aggregation |

### Files to Modify

| File | Changes |
|------|---------|
| `dashboard/src/types.ts` | Add `Selection`, `SelectableEntity` types; update `SelectedMapItem` |
| `dashboard/src/sections/map/view/map-view.tsx` | Add `showSelection` setting; remove machine group state |
| `dashboard/src/sections/map/selectionSidebar.tsx` | Add `renderSelection` function with sub-tabs |
| `dashboard/src/sections/map/overlay/components/SelectionRectangle.tsx` | Extend to select all entity types |
| `dashboard/src/sections/map/overlay/Overlay.tsx` | Remove MachineGroupMarkers; add SelectionHighlight |

### Files to Delete

| File | Reason |
|------|--------|
| `dashboard/src/sections/map/overlay/components/MachineGroupMarkers.tsx` | Machine groups removed |
| `dashboard/src/sections/map/overlay/utils/groupIconCreation.ts` | Machine groups removed |

### Files to Clean Up

| File | Code to Remove |
|------|----------------|
| `dashboard/src/sections/map/utils.ts` | `computeUnifiedGroups`, `UnionFind`, `zoomToGroupDistance`, `groupByDistance` |

## Testing Checklist

### Universal Selection (P1)

- [ ] Ctrl+drag selects all visible entity types within rectangle
- [ ] Ctrl+click adds/removes individual entities from selection
- [ ] Multi-select mode toggle works on mobile
- [ ] Selection respects layer visibility (hidden layers not selectable)

### Selection Tab (P2)

- [ ] Selection tab appears when multiple entities selected
- [ ] Sub-tabs show: Items, Buildings, Power, Vehicles
- [ ] Sub-tabs hide when no relevant data (e.g., no Power tab for belts-only)
- [ ] Aggregated statistics are correct

### Persistent Display (P3)

- [ ] "Show Selection" toggle appears in map settings
- [ ] Highlights show when Selection tab active + setting enabled
- [ ] Highlights hide when switching to other tabs
- [ ] Setting persists to localStorage

### Single-Click Integration (P4)

- [ ] Single-click on Radar Tower opens dedicated view
- [ ] Single-click on HUB opens dedicated view
- [ ] Single-click on Space Elevator opens dedicated view
- [ ] Ctrl+click on these adds to selection instead

### Machine Group Removal (P5)

- [ ] No "Machine Groups" in layers menu
- [ ] No grouping slider in settings
- [ ] No auto-group checkbox
- [ ] `grep -r "machineGroup" dashboard/src/` returns no results
- [ ] `grep -r "computeUnifiedGroups" dashboard/src/` returns no results

## Common Commands

```bash
# Development
make run               # Start full dev environment
make lint              # Check code quality
make format            # Auto-format code
make prepare-for-commit # Run generate, format, lint

# Search for machine group references (should return empty after cleanup)
grep -r "machineGroup" dashboard/src/
grep -r "groupDistance" dashboard/src/
grep -r "computeUnifiedGroups" dashboard/src/
```

## Architecture Notes

### Selection State Flow

```
User Action (drag/click)
    │
    ▼
SelectionRectangle / Entity Click Handler
    │
    ▼
Selection State Update (map-view.tsx)
    │
    ├───► SelectionSidebar (aggregated stats display)
    │
    └───► SelectionHighlight (visual indicators on map)
```

### Sub-tab Rendering Logic

```typescript
// Determine which sub-tabs to show
const showItemsTab = selection.hasItems;
const showPowerTab = selection.hasPower;
const showVehiclesTab = selection.hasVehicles;
const showBuildingsTab = true; // Always show

// Default to first available tab
const defaultTab = showItemsTab ? 'items'
  : showPowerTab ? 'power'
  : showVehiclesTab ? 'vehicles'
  : 'buildings';
```

### Selection Highlight Visibility

```typescript
const showHighlights =
  settings.showSelection &&           // User setting enabled
  selectedItems.some(item => item.type === 'selection') && // Has selection
  activeTabIsSelection;               // Selection tab is active
```
