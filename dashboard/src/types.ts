import {
  Belt,
  Cable,
  Drone,
  DroneStation,
  Explorer,
  Hub,
  Hypertube,
  Machine,
  Pipe,
  Player,
  RadarTower,
  SpaceElevator,
  Tractor,
  Train,
  TrainRail,
  TrainStation,
  Truck,
} from 'src/apiTypes';

/**
 * Represents any entity that can be selected on the map.
 * Used for universal selection across all visible layers.
 */
export type SelectableEntity =
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
  // Infrastructure
  | { type: 'belt'; data: Belt }
  | { type: 'pipe'; data: Pipe }
  | { type: 'cable'; data: Cable }
  | { type: 'rail'; data: TrainRail }
  | { type: 'hypertube'; data: Hypertube };

/**
 * Represents a multi-entity selection with aggregated statistics.
 * Used to populate the Selection tab in the map sidebar.
 */
export interface Selection {
  /** Unique identifier for this selection (for tab management) */
  id: string;

  /** The bounds of the selection rectangle (map coordinates) */
  bounds?: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  };

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
    belts: Belt[];
    pipes: Pipe[];
    cables: Cable[];
    rails: TrainRail[];
    hypertubes: Hypertube[];
  };

  /** Total count of all selected entities */
  totalCount: number;

  /** Aggregated power statistics (computed) */
  power: {
    consumption: number;
    production: number;
  };

  /** Aggregated item statistics (computed) */
  items: {
    production: Record<string, number>;
    consumption: Record<string, number>;
  };

  /** Entity counts by type for Buildings sub-tab */
  buildingCounts: Record<string, number>;

  /** Flags for which sub-tabs should be visible */
  hasItems: boolean;
  hasPower: boolean;
  hasVehicles: boolean;
}

export type Settings = {
  apiUrl: string;
  productionView: {
    includeMinable: boolean;
    includeItems: boolean;
    showTrend: boolean;
  };
};

// Types for map selection
export type SelectedTrainStation = {
  station: TrainStation;
  dockedTrains: Train[];
};

export type SelectedDroneStation = {
  station: DroneStation;
  dockedDrones: Drone[];
};

// Grouped stations
export type TrainStationGroup = {
  stations: TrainStation[];
  center: { x: number; y: number };
};

export type DroneStationGroup = {
  stations: DroneStation[];
  center: { x: number; y: number };
};

export type SelectedMapItem =
  | { type: 'trainStation'; data: SelectedTrainStation }
  | { type: 'droneStation'; data: SelectedDroneStation }
  | { type: 'radarTower'; data: RadarTower }
  | { type: 'hub'; data: Hub }
  | { type: 'spaceElevator'; data: SpaceElevator }
  | { type: 'selection'; data: Selection };
