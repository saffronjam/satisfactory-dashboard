import { useCallback, useState } from 'react';
import { MachineCategoryGenerator } from 'src/apiTypes';
import { Selection, SelectableEntity } from 'src/types';

/**
 * Return type for the useSelection hook providing selection state and actions.
 */
export interface UseSelectionReturn {
  /** Current selection state, null if nothing is selected */
  selection: Selection | null;
  /** Replace the current selection with a new set of entities */
  setSelection: (entities: SelectableEntity[]) => void;
  /** Clear the current selection */
  clearSelection: () => void;
  /** Add an entity to the current selection */
  addEntity: (entity: SelectableEntity) => void;
  /** Remove an entity from the current selection by type and id */
  removeEntity: (entityType: SelectableEntity['type'], entityId: string) => void;
  /** Toggle an entity in the selection: add if not selected, remove if already selected */
  toggleEntity: (entity: SelectableEntity) => void;
  /** Check if an entity is currently selected */
  isSelected: (entityType: SelectableEntity['type'], entityId: string) => boolean;
}

/**
 * Hook for managing universal map selection state.
 * Provides methods to set, clear, add to, and remove from the current selection.
 * Selection aggregation is computed via createSelection when selection changes.
 */
export function useSelection(): UseSelectionReturn {
  const [selection, setSelectionState] = useState<Selection | null>(null);

  const setSelection = useCallback((entities: SelectableEntity[]) => {
    if (entities.length === 0) {
      setSelectionState(null);
      return;
    }
    const newSelection = createSelection(entities);
    setSelectionState(newSelection);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(null);
  }, []);

  const addEntity = useCallback((entity: SelectableEntity) => {
    setSelectionState((prev) => {
      const currentEntities = prev ? selectionToEntities(prev) : [];
      const entityId = getEntityId(entity);

      // Check if entity is already selected
      const alreadySelected = currentEntities.some(
        (e) => e.type === entity.type && getEntityId(e) === entityId
      );
      if (alreadySelected) {
        return prev;
      }

      const newEntities = [...currentEntities, entity];
      return createSelection(newEntities);
    });
  }, []);

  const removeEntity = useCallback((entityType: SelectableEntity['type'], entityId: string) => {
    setSelectionState((prev) => {
      if (!prev) return null;

      const currentEntities = selectionToEntities(prev);
      const newEntities = currentEntities.filter(
        (e) => !(e.type === entityType && getEntityId(e) === entityId)
      );

      if (newEntities.length === 0) {
        return null;
      }

      return createSelection(newEntities);
    });
  }, []);

  const toggleEntity = useCallback((entity: SelectableEntity) => {
    setSelectionState((prev) => {
      const currentEntities = prev ? selectionToEntities(prev) : [];
      const entityId = getEntityId(entity);

      const existingIndex = currentEntities.findIndex(
        (e) => e.type === entity.type && getEntityId(e) === entityId
      );

      if (existingIndex >= 0) {
        // Entity is already selected - remove it
        const newEntities = currentEntities.filter((_, idx) => idx !== existingIndex);
        if (newEntities.length === 0) {
          return null;
        }
        return createSelection(newEntities);
      } else {
        // Entity is not selected - add it
        const newEntities = [...currentEntities, entity];
        return createSelection(newEntities);
      }
    });
  }, []);

  const isSelected = useCallback(
    (entityType: SelectableEntity['type'], entityId: string): boolean => {
      if (!selection) return false;
      const entities = selectionToEntities(selection);
      return entities.some((e) => e.type === entityType && getEntityId(e) === entityId);
    },
    [selection]
  );

  return {
    selection,
    setSelection,
    clearSelection,
    addEntity,
    removeEntity,
    toggleEntity,
    isSelected,
  };
}

/**
 * Creates a unique identifier from entity coordinates.
 * Used for entities that don't have a native id field.
 */
function coordsToId(x: number, y: number, z: number): string {
  return `${x}_${y}_${z}`;
}

/**
 * Extracts the unique identifier from a selectable entity.
 * For entities without native id fields, uses coordinates or name.
 */
export function getEntityId(entity: SelectableEntity): string {
  switch (entity.type) {
    case 'machine':
      // Machines don't have id - use position as unique key
      return coordsToId(entity.data.x, entity.data.y, entity.data.z);
    case 'storage':
      return entity.data.id;
    case 'trainStation':
      return entity.data.name;
    case 'droneStation':
      // DroneStations use name as identifier
      return entity.data.name;
    case 'radarTower':
      return entity.data.id;
    case 'hub':
      return entity.data.id;
    case 'spaceElevator':
      return entity.data.name;
    case 'train':
      return entity.data.id;
    case 'drone':
      // Drones use name as identifier
      return entity.data.name;
    case 'truck':
      return entity.data.id;
    case 'tractor':
      return entity.data.id;
    case 'explorer':
      return entity.data.id;
    case 'player':
      return entity.data.id;
    case 'belt':
      return entity.data.id;
    case 'pipe':
      return entity.data.id;
    case 'cable':
      return entity.data.id;
    case 'rail':
      return entity.data.id;
    case 'hypertube':
      return entity.data.id;
  }
}

/**
 * Converts a Selection back to an array of SelectableEntity for manipulation.
 */
function selectionToEntities(selection: Selection): SelectableEntity[] {
  const entities: SelectableEntity[] = [];

  for (const machine of selection.entities.machines) {
    entities.push({ type: 'machine', data: machine });
  }
  for (const storage of selection.entities.storages) {
    entities.push({ type: 'storage', data: storage });
  }
  for (const station of selection.entities.trainStations) {
    entities.push({ type: 'trainStation', data: station });
  }
  for (const station of selection.entities.droneStations) {
    entities.push({ type: 'droneStation', data: station });
  }
  for (const tower of selection.entities.radarTowers) {
    entities.push({ type: 'radarTower', data: tower });
  }
  for (const hub of selection.entities.hubs) {
    entities.push({ type: 'hub', data: hub });
  }
  for (const elevator of selection.entities.spaceElevators) {
    entities.push({ type: 'spaceElevator', data: elevator });
  }
  for (const train of selection.entities.trains) {
    entities.push({ type: 'train', data: train });
  }
  for (const drone of selection.entities.drones) {
    entities.push({ type: 'drone', data: drone });
  }
  for (const truck of selection.entities.trucks) {
    entities.push({ type: 'truck', data: truck });
  }
  for (const tractor of selection.entities.tractors) {
    entities.push({ type: 'tractor', data: tractor });
  }
  for (const explorer of selection.entities.explorers) {
    entities.push({ type: 'explorer', data: explorer });
  }
  for (const player of selection.entities.players) {
    entities.push({ type: 'player', data: player });
  }
  for (const belt of selection.entities.belts) {
    entities.push({ type: 'belt', data: belt });
  }
  for (const pipe of selection.entities.pipes) {
    entities.push({ type: 'pipe', data: pipe });
  }
  for (const cable of selection.entities.cables) {
    entities.push({ type: 'cable', data: cable });
  }
  for (const rail of selection.entities.rails) {
    entities.push({ type: 'rail', data: rail });
  }
  for (const hypertube of selection.entities.hypertubes) {
    entities.push({ type: 'hypertube', data: hypertube });
  }

  return entities;
}

/**
 * Creates a Selection from an array of SelectableEntity objects.
 * Sorts entities into their respective category arrays and initializes selection metadata.
 * Aggregated statistics (power, items, buildingCounts) are computed separately via computeSelectionAggregates.
 *
 * @param entities - Array of selectable entities to include in the selection
 * @param bounds - Optional bounds of the selection rectangle (map coordinates)
 * @returns A new Selection object with entities categorized and basic metadata set
 */
export function createSelection(
  entities: SelectableEntity[],
  bounds?: { start: { lat: number; lng: number }; end: { lat: number; lng: number } }
): Selection {
  const selection: Selection = {
    id: `selection-${Date.now()}`,
    bounds,
    entities: {
      machines: [],
      storages: [],
      trainStations: [],
      droneStations: [],
      radarTowers: [],
      hubs: [],
      spaceElevators: [],
      trains: [],
      drones: [],
      trucks: [],
      tractors: [],
      explorers: [],
      players: [],
      belts: [],
      pipes: [],
      cables: [],
      rails: [],
      hypertubes: [],
    },
    totalCount: 0,
    power: { consumption: 0, production: 0 },
    items: { production: Object.create(null), consumption: Object.create(null) },
    buildingCounts: Object.create(null),
    inventory: Object.create(null),
    hasItems: false,
    hasPower: false,
    hasVehicles: false,
    hasInventory: false,
  };

  for (const entity of entities) {
    switch (entity.type) {
      case 'machine':
        selection.entities.machines.push(entity.data);
        break;
      case 'storage':
        selection.entities.storages.push(entity.data);
        break;
      case 'trainStation':
        selection.entities.trainStations.push(entity.data);
        break;
      case 'droneStation':
        selection.entities.droneStations.push(entity.data);
        break;
      case 'radarTower':
        selection.entities.radarTowers.push(entity.data);
        break;
      case 'hub':
        selection.entities.hubs.push(entity.data);
        break;
      case 'spaceElevator':
        selection.entities.spaceElevators.push(entity.data);
        break;
      case 'train':
        selection.entities.trains.push(entity.data);
        break;
      case 'drone':
        selection.entities.drones.push(entity.data);
        break;
      case 'truck':
        selection.entities.trucks.push(entity.data);
        break;
      case 'tractor':
        selection.entities.tractors.push(entity.data);
        break;
      case 'explorer':
        selection.entities.explorers.push(entity.data);
        break;
      case 'player':
        selection.entities.players.push(entity.data);
        break;
      case 'belt':
        selection.entities.belts.push(entity.data);
        break;
      case 'pipe':
        selection.entities.pipes.push(entity.data);
        break;
      case 'cable':
        selection.entities.cables.push(entity.data);
        break;
      case 'rail':
        selection.entities.rails.push(entity.data);
        break;
      case 'hypertube':
        selection.entities.hypertubes.push(entity.data);
        break;
    }
  }

  selection.totalCount = entities.length;
  selection.hasVehicles =
    selection.entities.trainStations.length > 0 ||
    selection.entities.droneStations.length > 0 ||
    selection.entities.trains.length > 0 ||
    selection.entities.drones.length > 0 ||
    selection.entities.trucks.length > 0 ||
    selection.entities.tractors.length > 0 ||
    selection.entities.explorers.length > 0;

  computeSelectionAggregates(selection);

  return selection;
}

/**
 * Checks if an entity is present in a Selection by type and ID.
 *
 * @param selection - The selection to check
 * @param entityType - The type of entity to look for
 * @param entityId - The unique identifier of the entity
 * @returns True if the entity is in the selection, false otherwise
 */
export function isEntityInSelection(
  selection: Selection,
  entityType: SelectableEntity['type'],
  entityId: string
): boolean {
  switch (entityType) {
    case 'machine':
      // Machines use coordinate-based ID
      return selection.entities.machines.some((m) => coordsToId(m.x, m.y, m.z) === entityId);
    case 'storage':
      return selection.entities.storages.some((s) => s.id === entityId);
    case 'trainStation':
      return selection.entities.trainStations.some((s) => s.name === entityId);
    case 'droneStation':
      // DroneStations use name as identifier
      return selection.entities.droneStations.some((s) => s.name === entityId);
    case 'radarTower':
      return selection.entities.radarTowers.some((t) => t.id === entityId);
    case 'hub':
      return selection.entities.hubs.some((h) => h.id === entityId);
    case 'spaceElevator':
      return selection.entities.spaceElevators.some((e) => e.name === entityId);
    case 'train':
      return selection.entities.trains.some((t) => t.id === entityId);
    case 'drone':
      // Drones use name as identifier
      return selection.entities.drones.some((d) => d.name === entityId);
    case 'truck':
      return selection.entities.trucks.some((t) => t.id === entityId);
    case 'tractor':
      return selection.entities.tractors.some((t) => t.id === entityId);
    case 'explorer':
      return selection.entities.explorers.some((e) => e.id === entityId);
    case 'player':
      return selection.entities.players.some((p) => p.id === entityId);
    case 'belt':
      return selection.entities.belts.some((b) => b.id === entityId);
    case 'pipe':
      return selection.entities.pipes.some((p) => p.id === entityId);
    case 'cable':
      return selection.entities.cables.some((c) => c.id === entityId);
    case 'rail':
      return selection.entities.rails.some((r) => r.id === entityId);
    case 'hypertube':
      return selection.entities.hypertubes.some((h) => h.id === entityId);
  }
}

/**
 * Adds an entity to an existing Selection and returns a new Selection with updated aggregates.
 *
 * @param selection - The existing selection
 * @param entity - The entity to add
 * @returns A new Selection with the entity added
 */
export function addEntityToSelection(selection: Selection, entity: SelectableEntity): Selection {
  const entities = selectionToEntities(selection);
  entities.push(entity);
  return createSelection(entities);
}

/**
 * Removes an entity from an existing Selection and returns a new Selection with updated aggregates.
 *
 * @param selection - The existing selection
 * @param entityType - The type of entity to remove
 * @param entityId - The unique identifier of the entity to remove
 * @returns A new Selection with the entity removed
 */
export function removeEntityFromSelection(
  selection: Selection,
  entityType: SelectableEntity['type'],
  entityId: string
): Selection {
  const entities = selectionToEntities(selection);
  const filteredEntities = entities.filter(
    (e) => !(e.type === entityType && getEntityId(e) === entityId)
  );
  return createSelection(filteredEntities);
}

/**
 * Toggles an entity in an existing Selection: adds it if not present, removes it if already selected.
 * Returns a new Selection with updated aggregates, or null if the selection becomes empty.
 *
 * @param selection - The existing selection (or null for empty selection)
 * @param entity - The entity to toggle
 * @returns A new Selection with the entity toggled, or null if the selection becomes empty
 */
export function toggleEntityInSelection(
  selection: Selection | null,
  entity: SelectableEntity
): Selection | null {
  const entities = selection ? selectionToEntities(selection) : [];
  const entityId = getEntityId(entity);

  const existingIndex = entities.findIndex(
    (e) => e.type === entity.type && getEntityId(e) === entityId
  );

  if (existingIndex >= 0) {
    // Entity is already selected - remove it
    const newEntities = entities.filter((_, idx) => idx !== existingIndex);
    if (newEntities.length === 0) {
      return null;
    }
    return createSelection(newEntities);
  } else {
    // Entity is not selected - add it
    const newEntities = [...entities, entity];
    return createSelection(newEntities);
  }
}

/**
 * Filters a Selection to only include entities that still exist in the provided game state.
 * Returns a new Selection with updated aggregates, or null if no entities remain.
 *
 * @param selection - The selection to filter
 * @param gameState - Current game state with arrays of entities by type
 * @returns A new filtered Selection, or null if the selection becomes empty
 */
export function filterSelectionByGameState(
  selection: Selection,
  gameState: {
    machines?: { x: number; y: number; z: number }[];
    storages?: { id: string }[];
    trainStations?: { name: string }[];
    droneStations?: { name: string }[];
    radarTowers?: { id: string }[];
    hub?: { id: string } | null;
    spaceElevator?: { name: string } | null;
    trains?: { id: string }[];
    drones?: { name: string }[];
    trucks?: { id: string }[];
    tractors?: { id: string }[];
    explorers?: { id: string }[];
    players?: { id: string }[];
    belts?: { id: string }[];
    pipes?: { id: string }[];
    cables?: { id: string }[];
    trainRails?: { id: string }[];
    hypertubes?: { id: string }[];
  }
): Selection | null {
  const entities = selectionToEntities(selection);

  // Machines use coordinate-based IDs
  const machineIds = new Set(gameState.machines?.map((m) => coordsToId(m.x, m.y, m.z)) ?? []);
  const storageIds = new Set(gameState.storages?.map((s) => s.id) ?? []);
  const trainStationNames = new Set(gameState.trainStations?.map((s) => s.name) ?? []);
  // DroneStations use name as identifier
  const droneStationNames = new Set(gameState.droneStations?.map((s) => s.name) ?? []);
  const radarTowerIds = new Set(gameState.radarTowers?.map((t) => t.id) ?? []);
  const hubId = gameState.hub?.id ?? null;
  const spaceElevatorName = gameState.spaceElevator?.name ?? null;
  const trainIds = new Set(gameState.trains?.map((t) => t.id) ?? []);
  // Drones use name as identifier
  const droneNames = new Set(gameState.drones?.map((d) => d.name) ?? []);
  const truckIds = new Set(gameState.trucks?.map((t) => t.id) ?? []);
  const tractorIds = new Set(gameState.tractors?.map((t) => t.id) ?? []);
  const explorerIds = new Set(gameState.explorers?.map((e) => e.id) ?? []);
  const playerIds = new Set(gameState.players?.map((p) => p.id) ?? []);
  const beltIds = new Set(gameState.belts?.map((b) => b.id) ?? []);
  const pipeIds = new Set(gameState.pipes?.map((p) => p.id) ?? []);
  const cableIds = new Set(gameState.cables?.map((c) => c.id) ?? []);
  const railIds = new Set(gameState.trainRails?.map((r) => r.id) ?? []);
  const hypertubeIds = new Set(gameState.hypertubes?.map((h) => h.id) ?? []);

  const filteredEntities = entities.filter((entity) => {
    switch (entity.type) {
      case 'machine':
        return machineIds.has(coordsToId(entity.data.x, entity.data.y, entity.data.z));
      case 'storage':
        return storageIds.has(entity.data.id);
      case 'trainStation':
        return trainStationNames.has(entity.data.name);
      case 'droneStation':
        return droneStationNames.has(entity.data.name);
      case 'radarTower':
        return radarTowerIds.has(entity.data.id);
      case 'hub':
        return entity.data.id === hubId;
      case 'spaceElevator':
        return entity.data.name === spaceElevatorName;
      case 'train':
        return trainIds.has(entity.data.id);
      case 'drone':
        return droneNames.has(entity.data.name);
      case 'truck':
        return truckIds.has(entity.data.id);
      case 'tractor':
        return tractorIds.has(entity.data.id);
      case 'explorer':
        return explorerIds.has(entity.data.id);
      case 'player':
        return playerIds.has(entity.data.id);
      case 'belt':
        return beltIds.has(entity.data.id);
      case 'pipe':
        return pipeIds.has(entity.data.id);
      case 'cable':
        return cableIds.has(entity.data.id);
      case 'rail':
        return railIds.has(entity.data.id);
      case 'hypertube':
        return hypertubeIds.has(entity.data.id);
    }
  });

  if (filteredEntities.length === 0) {
    return null;
  }

  if (filteredEntities.length === entities.length) {
    return selection;
  }

  return createSelection(filteredEntities);
}

/**
 * Computes aggregated statistics for a selection based on its entities.
 * Mutates the selection object to populate power, items, buildingCounts, inventory, and visibility flags.
 *
 * @param selection - The selection object to compute aggregates for (mutated in place)
 */
export function computeSelectionAggregates(selection: Selection): void {
  const { machines } = selection.entities;

  const power = { consumption: 0, production: 0 };
  // Use Object.create(null) to avoid prototype pollution (e.g., "constructor" machine type)
  const itemProduction: Record<string, number> = Object.create(null);
  const itemConsumption: Record<string, number> = Object.create(null);
  const buildingCounts: Record<string, number> = Object.create(null);
  const inventory: Record<string, number> = Object.create(null);

  for (const machine of machines) {
    const isGenerator = machine.category === MachineCategoryGenerator;

    // Power: consumption from non-generators, production from generators
    if (isGenerator) {
      const powerOutput = machine.output.find((o) => o.name === 'Power');
      if (powerOutput) {
        power.production += powerOutput.current;
      }
    } else {
      const powerInput = machine.input.find((i) => i.name === 'Power');
      if (powerInput) {
        power.consumption += powerInput.current;
      }
    }

    // Item production (exclude Power and Unassigned)
    for (const output of machine.output) {
      if (output.name === 'Power' || output.name === 'Unassigned') continue;
      itemProduction[output.name] = (itemProduction[output.name] || 0) + output.current;
    }

    // Item consumption (exclude Power and Unassigned)
    for (const input of machine.input) {
      if (input.name === 'Power' || input.name === 'Unassigned') continue;
      itemConsumption[input.name] = (itemConsumption[input.name] || 0) + input.current;
    }

    // Building counts by machine type
    buildingCounts[machine.type] = (buildingCounts[machine.type] || 0) + 1;
  }

  // Add train power consumption
  for (const train of selection.entities.trains) {
    power.consumption += train.powerConsumption;
  }

  // Aggregate inventory from storage containers
  for (const storage of selection.entities.storages) {
    for (const item of storage.inventory) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
  }

  // Aggregate inventory from trains (vehicles have inventory)
  for (const train of selection.entities.trains) {
    for (const vehicle of train.vehicles) {
      for (const item of vehicle.inventory) {
        inventory[item.name] = (inventory[item.name] || 0) + item.count;
      }
    }
  }

  // Aggregate inventory from train station platforms
  for (const station of selection.entities.trainStations) {
    for (const platform of station.platforms) {
      for (const item of platform.inventory) {
        inventory[item.name] = (inventory[item.name] || 0) + item.count;
      }
    }
  }

  // Aggregate inventory from ground vehicles
  for (const explorer of selection.entities.explorers) {
    for (const item of explorer.inventory) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
  }
  for (const truck of selection.entities.trucks) {
    for (const item of truck.inventory) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
  }
  for (const tractor of selection.entities.tractors) {
    for (const item of tractor.inventory) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
  }

  // Aggregate inventory from drone stations (input + output inventory)
  for (const station of selection.entities.droneStations) {
    for (const item of station.inputInventory ?? []) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
    for (const item of station.outputInventory ?? []) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
  }

  selection.power = power;
  selection.items = { production: itemProduction, consumption: itemConsumption };
  selection.buildingCounts = buildingCounts;
  selection.inventory = inventory;

  // Compute visibility flags
  selection.hasItems =
    Object.keys(itemProduction).length > 0 || Object.keys(itemConsumption).length > 0;
  selection.hasPower =
    power.consumption > 0 || power.production > 0 || selection.entities.trains.length > 0;
  selection.hasInventory = Object.keys(inventory).length > 0;
}
