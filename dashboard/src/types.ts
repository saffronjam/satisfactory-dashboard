import {
  Drone,
  DroneStation,
  Hub,
  Machine,
  RadarTower,
  SpaceElevator,
  Train,
  TrainStation,
} from 'src/apiTypes';

export type Settings = {
  apiUrl: string;
  productionView: {
    includeMinable: boolean;
    includeItems: boolean;
    showTrend: boolean;
  };
};

export type MachineGroup = {
  hash: string;
  machines: Machine[];
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  center: { x: number; y: number };

  powerConsumption: number;
  powerProduction: number;

  itemProduction: {
    [key: string]: number;
  };
  itemConsumption: {
    [key: string]: number;
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

// Multi-selection data combining machine groups and stations
export type MultiSelection = {
  machineGroups: MachineGroup[];
  trainStations: SelectedTrainStation[];
  droneStations: SelectedDroneStation[];
};

export type SelectedMapItem =
  | { type: 'machineGroup'; data: MachineGroup }
  | { type: 'machineGroups'; data: MachineGroup[] }
  | { type: 'multiSelection'; data: MultiSelection }
  | { type: 'trainStation'; data: SelectedTrainStation }
  | { type: 'droneStation'; data: SelectedDroneStation }
  | { type: 'radarTower'; data: RadarTower }
  | { type: 'hub'; data: Hub }
  | { type: 'spaceElevator'; data: SpaceElevator };
