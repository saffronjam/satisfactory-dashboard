# Feature Specification: Universal Map Selection

**Feature Branch**: `004-universal-map-selection`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User description: "Replace Machine Groups with universal map selection system supporting all entity types, with persistent selection display and aggregated statistics in a Selection tab"

## Clarifications

### Session 2026-01-16

- Q: What should the Selection tab display for entities without production/consumption data? → A: Show relevant stats only, organized into sub-tabs within the Selection tab (mirroring the Machine Groups pattern with Items/Buildings/Power/Vehicles tabs). Only show sub-tabs that have relevant data for the current selection.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Select Any Map Entity (Priority: P1)

A user wants to select multiple entities of any type on the map to see aggregated statistics about their selection. They can drag a selection rectangle over any combination of entities (buildings, vehicles, infrastructure, special structures) and view combined power consumption, production rates, and other relevant metrics.

**Why this priority**: This is the core feature - universal selection capability replaces the limited machine-group-only selection system and enables all subsequent functionality.

**Independent Test**: Can be fully tested by dragging a selection rectangle over mixed entity types (e.g., a factory, a train, and a radar tower) and verifying all are selected and appear in the sidebar.

**Acceptance Scenarios**:

1. **Given** the map displays various entity types (buildings, vehicles, infrastructure), **When** the user drags a selection rectangle over multiple entities, **Then** all entities within the rectangle are selected regardless of their type.
2. **Given** entities are displayed on the map, **When** the user Ctrl+clicks (or Cmd+clicks on Mac) on individual entities, **Then** each entity is added to the current selection without clearing previous selections.
3. **Given** the user has multi-select mode enabled, **When** the user drags on the map, **Then** a selection rectangle appears and selects all entities within it.

---

### User Story 2 - Selection Tab with Aggregated Statistics (Priority: P2)

When users multi-select entities, they see a "Selection" tab in the map sidebar that displays aggregated statistics organized into sub-tabs (Items, Buildings, Power, Vehicles) mirroring the Machine Groups pattern. Only sub-tabs with relevant data for the current selection are displayed.

**Why this priority**: This delivers the value of universal selection by presenting meaningful aggregated data to the user in an organized, familiar format.

**Independent Test**: Can be tested by selecting 3+ entities of different types and verifying the Selection tab shows correct sub-tabs with aggregated statistics relevant to the selection.

**Acceptance Scenarios**:

1. **Given** the user has selected multiple entities, **When** the sidebar opens, **Then** a "Selection" tab appears with sub-tabs for relevant data categories.
2. **Given** the Selection tab is active and the selection includes factories, **When** viewing the Items sub-tab, **Then** aggregated item production and consumption rates are displayed.
3. **Given** the Selection tab is active and the selection includes generators or power-consuming buildings, **When** viewing the Power sub-tab, **Then** total power draw and production are displayed.
4. **Given** the user selects only infrastructure (e.g., belts, pipes), **When** viewing the Selection tab, **Then** only the Buildings sub-tab appears showing entity counts by type.
5. **Given** the selection includes train or drone stations with docked vehicles, **When** viewing the Vehicles sub-tab, **Then** the docked vehicles are listed.

---

### User Story 3 - Persistent Selection Display (Priority: P3)

Users can configure the map to show their current selection highlighted on the map even after the selection rectangle is dismissed. This setting is available in the map settings popover. The selection highlight is only visible when the Selection tab in the sidebar is active.

**Why this priority**: Enhances usability by allowing users to see what they've selected while reviewing statistics, but is not essential to core selection functionality.

**Independent Test**: Can be tested by enabling the setting, making a selection, and verifying the selection remains visible when the Selection tab is active and disappears when switching to another tab.

**Acceptance Scenarios**:

1. **Given** the map settings popover is open, **When** the user views the settings, **Then** a "Show Selection" toggle appears near the building opacity setting.
2. **Given** "Show Selection" is enabled and entities are selected, **When** the Selection tab is active in the sidebar, **Then** selected entities are visually highlighted on the map.
3. **Given** "Show Selection" is enabled and the user switches away from the Selection tab, **When** viewing the map, **Then** the selection highlight is hidden.
4. **Given** "Show Selection" is disabled, **When** entities are selected, **Then** no persistent highlight appears regardless of active tab.

---

### User Story 4 - Single-Click Entities Integrate with Multi-Select (Priority: P4)

Entities that previously had dedicated single-click selection (Radar Towers, Space Elevators, HUBs, Train Stations, Drone Stations) now integrate with the universal selection system. Single-clicking still opens their dedicated sidebar view, but they can also be included in multi-selections where they contribute to aggregated statistics.

**Why this priority**: Ensures backward compatibility while extending functionality - existing users can still single-click for detailed views.

**Independent Test**: Can be tested by single-clicking a Radar Tower (verify dedicated view opens), then Ctrl+clicking a factory (verify both are selected and Selection tab shows aggregated stats).

**Acceptance Scenarios**:

1. **Given** a Radar Tower is on the map, **When** the user single-clicks it, **Then** the dedicated Radar Tower sidebar view opens (existing behavior preserved).
2. **Given** a Space Elevator is selected, **When** the user Ctrl+clicks on a factory building, **Then** both are selected and the Selection tab shows aggregated statistics.
3. **Given** multiple entity types are selected including a HUB, **When** the user clicks the HUB's tab in the sidebar, **Then** they see the dedicated HUB view with its specific details.

---

### User Story 5 - Complete Removal of Machine Groups (Priority: P5)

All traces of the "Machine Groups" feature are removed from the codebase. This includes the grouping algorithm, group distance settings, auto-group toggle, machine group markers, and any UI related to machine groups.

**Why this priority**: Clean-up task that should only happen after universal selection is fully functional, ensuring no broken references.

**Independent Test**: Can be tested by searching the codebase for "machineGroup", "groupDistance", "computeUnifiedGroups" and verifying no results; verifying the layers popover has no "Machine Groups" option.

**Acceptance Scenarios**:

1. **Given** the updated application, **When** viewing the layers popover, **Then** there is no "Machine Groups" layer option.
2. **Given** the codebase, **When** searching for machine group related code, **Then** no references exist (grouping algorithms, group markers, group filters).
3. **Given** the map at any zoom level, **When** viewing buildings, **Then** buildings appear as individual markers, never as grouped circles.

---

### Edge Cases

- What happens when selecting only infrastructure (belts, pipes, cables) with no power data? Display only the Buildings sub-tab showing entity counts by type; Items, Power, and Vehicles sub-tabs are hidden.
- What happens when selecting entities outside the current viewport? Entities are selected if they intersect with the selection rectangle, even if partially off-screen.
- What happens when the user makes an empty selection (rectangle contains no entities)? Clear any existing selection.
- How does selection behave with hidden layers? Entities on hidden layers cannot be selected; only visible entities are selectable.
- What happens when a selected entity is removed from the game state (e.g., train moves away)? Remove it from the selection automatically and update aggregated statistics.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow selection of any visible entity type on the map via selection rectangle (drag or Ctrl+drag).
- **FR-002**: System MUST allow additive selection via Ctrl+click (Cmd+click on Mac) on individual entities.
- **FR-003**: System MUST display a "Selection" tab in the sidebar when multiple entities are selected.
- **FR-004**: System MUST organize Selection tab content into sub-tabs (Items, Buildings, Power, Vehicles) mirroring the Machine Groups pattern.
- **FR-005**: System MUST only display sub-tabs that have relevant data for the current selection (hide empty sub-tabs).
- **FR-006**: System MUST aggregate and display total power consumption and production in the Power sub-tab when selection includes power-related entities.
- **FR-007**: System MUST aggregate and display item production and consumption rates in the Items sub-tab when selection includes producing/consuming entities.
- **FR-008**: System MUST display entity counts by type in the Buildings sub-tab for all selections.
- **FR-009**: System MUST display docked vehicles in the Vehicles sub-tab when selection includes stations with docked trains or drones.
- **FR-010**: System MUST provide a "Show Selection" toggle in the map settings popover.
- **FR-011**: System MUST visually highlight selected entities on the map when "Show Selection" is enabled AND the Selection tab is active.
- **FR-012**: System MUST hide selection highlights when the Selection tab is not active, regardless of the "Show Selection" setting.
- **FR-013**: System MUST preserve single-click behavior for entities with dedicated sidebar views (Radar Towers, HUBs, Space Elevators, Train Stations, Drone Stations).
- **FR-014**: System MUST allow entities with dedicated views to be included in multi-selections.
- **FR-015**: System MUST only allow selection of entities on currently visible (enabled) layers.
- **FR-016**: System MUST remove all machine group functionality including: grouping algorithm, group distance slider, auto-group toggle, group markers, and group-related filters.
- **FR-017**: System MUST persist the "Show Selection" setting to local storage with other map settings.
- **FR-018**: System MUST automatically remove entities from selection when they are no longer present in game state.

### Selectable Entity Types

The following entity categories MUST be selectable:

**Buildings**:
- Factories (Constructors, Assemblers, Manufacturers, Smelters, Foundries, Refineries, Blenders, Particle Accelerators, Converters)
- Extractors (Miners, Oil Extractors, Water Extractors, Resource Wells)
- Generators (Coal, Fuel, Nuclear, Geothermal, Biomass Burners)
- Stations (Train Stations, Drone Stations, Truck Stations)
- Storage (Industrial Storage, Fluid Buffers)
- Special (Space Elevator, HUB, Radar Towers)

**Infrastructure**:
- Conveyor Belts
- Splitters and Mergers
- Pipes and Pipe Junctions
- Power Cables
- Train Rails
- Hypertubes

**Vehicles**:
- Trains
- Drones
- Trucks
- Tractors
- Explorers
- Players

### Key Entities

- **Selection**: A collection of selected map entities with computed aggregate statistics (total power draw, total power production, item production rates, item consumption rates, entity count by type).
- **SelectableEntity**: Any map entity that can be included in a selection - encompasses all building types, infrastructure, vehicles, and special structures.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select any combination of 50+ different entity types in a single selection operation.
- **SC-002**: Selection aggregation calculates and displays statistics within 100ms of selection completion.
- **SC-003**: 100% of previously single-click-selectable entities (Radar Towers, HUBs, Space Elevators, stations) retain their dedicated sidebar views.
- **SC-004**: Zero references to "machine group" functionality remain in the codebase after completion.
- **SC-005**: Selection highlighting updates within one frame when toggling the "Show Selection" setting or switching sidebar tabs.
- **SC-006**: Users can select 1000+ entities simultaneously without UI freezing or significant lag.

## Assumptions

- The existing map layer visibility system will be used to determine which entities are selectable (hidden layers = non-selectable entities).
- Power statistics will use existing data structures from the game state (machines already have power consumption/production data).
- Item production/consumption rates are available from existing factory data structures.
- The Selection tab will follow the existing sidebar tab design patterns.
- Infrastructure entities (belts, pipes, cables) may not have power data and will contribute only to entity counts and throughput statistics where applicable.
