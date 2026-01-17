import {
  Belt,
  Cable,
  Circuit,
  Drone,
  DroneStation,
  Explorer,
  FactoryStats,
  GeneratorStats,
  Hub,
  Hypertube,
  HypertubeEntrance,
  Machine,
  Pipe,
  PipeJunction,
  Player,
  ProdStats,
  RadarTower,
  ResourceNode,
  SatisfactoryApiStatus,
  Schematic,
  SinkStats,
  SpaceElevator,
  SplitterMerger,
  Storage,
  Tractor,
  Train,
  TrainRail,
  TrainStation,
  Truck,
  TruckStation,
  VehiclePath,
} from 'src/apiTypes';
import { createContext } from 'use-context-selector';

export type ApiData = {
  isLoading: boolean;
  isOnline: boolean;
  satisfactoryApiStatus?: SatisfactoryApiStatus;

  circuits: Circuit[];
  factoryStats: FactoryStats;
  prodStats: ProdStats;
  sinkStats: SinkStats;
  players: Player[];
  generatorStats: GeneratorStats;
  machines: Machine[];
  trains: Train[];
  trainStations: TrainStation[];
  drones: Drone[];
  droneStations: DroneStation[];
  trucks: Truck[];
  truckStations: TruckStation[];
  belts: Belt[];
  pipes: Pipe[];
  pipeJunctions: PipeJunction[];
  trainRails: TrainRail[];
  splitterMergers: SplitterMerger[];
  hypertubes: Hypertube[];
  hypertubeEntrances: HypertubeEntrance[];
  cables: Cable[];
  storages: Storage[];
  tractors: Tractor[];
  explorers: Explorer[];
  vehiclePaths: VehiclePath[];
  spaceElevator?: SpaceElevator;
  hub?: Hub;
  radarTowers: RadarTower[];
  resourceNodes: ResourceNode[];
  schematics: Schematic[];
};

export type ApiContextType = ApiData & {
  history: (ApiData & { timestamp: Date })[];
};

export const DefaultApiContext: ApiContextType = {
  isLoading: true,
  isOnline: false,
  satisfactoryApiStatus: undefined,

  circuits: [],
  factoryStats: {} as FactoryStats,
  prodStats: {} as ProdStats,
  sinkStats: {} as SinkStats,
  players: [],
  generatorStats: {} as GeneratorStats,
  machines: [],
  trains: [],
  trainStations: [],
  drones: [],
  droneStations: [],
  trucks: [],
  truckStations: [],
  belts: [],
  pipes: [],
  pipeJunctions: [],
  trainRails: [],
  splitterMergers: [],
  hypertubes: [],
  hypertubeEntrances: [],
  cables: [],
  storages: [],
  tractors: [],
  explorers: [],
  vehiclePaths: [],
  spaceElevator: undefined,
  hub: undefined,
  radarTowers: [],
  resourceNodes: [],
  schematics: [],

  history: [
    {
      timestamp: new Date(),
      isLoading: true,
      isOnline: false,
      satisfactoryApiStatus: undefined,
      circuits: [],
      factoryStats: {} as FactoryStats,
      prodStats: {} as ProdStats,
      sinkStats: {} as SinkStats,
      players: [],
      generatorStats: {} as GeneratorStats,
      machines: [],
      trains: [],
      trainStations: [],
      drones: [],
      droneStations: [],
      trucks: [],
      truckStations: [],
      belts: [],
      pipes: [],
      pipeJunctions: [],
      trainRails: [],
      splitterMergers: [],
      hypertubes: [],
      hypertubeEntrances: [],
      cables: [],
      storages: [],
      tractors: [],
      explorers: [],
      vehiclePaths: [],
      spaceElevator: undefined,
      hub: undefined,
      radarTowers: [],
      resourceNodes: [],
      schematics: [],
    },
  ] as any,
};

export const ApiContext = createContext<ApiContextType>(DefaultApiContext);
