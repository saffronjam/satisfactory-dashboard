import {
  Belt,
  Cable,
  Drone,
  DroneStation,
  Explorer,
  Hub,
  Hypertube,
  HypertubeEntrance,
  Machine,
  MachineCategory,
  Pipe,
  PipeJunction,
  Player,
  RadarTower,
  ResourceNode,
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
import { MachineGroup, SelectedMapItem } from 'src/types';
import { BuildingColorMode } from 'src/utils/gridColors';
import { TowerVisibilityData } from '../utils/resourceNodeUtils';
import {
  BuildingSubLayer,
  InfrastructureSubLayer,
  MapLayer,
  ResourceNodeFilter,
  VehicleSubLayer,
} from '../view/map-view';

// Infrastructure data
export type InfrastructureData = {
  belts: Belt[];
  pipes: Pipe[];
  pipeJunctions: PipeJunction[];
  trainRails: TrainRail[];
  splitterMergers: SplitterMerger[];
  cables: Cable[];
  hypertubes?: Hypertube[];
  hypertubeEntrances?: HypertubeEntrance[];
};

// Vehicle data
export type VehicleData = {
  trains: Train[];
  drones: Drone[];
  trucks: Truck[];
  tractors: Tractor[];
  explorers: Explorer[];
  players: Player[];
  vehiclePaths: VehiclePath[];
};

// Building data
export type BuildingData = {
  machines: Machine[];
  storages: Storage[];
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  truckStations: TruckStation[];
  spaceElevator?: SpaceElevator | null;
  hub?: Hub | null;
  radarTowers?: RadarTower[];
  resourceNodes?: ResourceNode[];
};

// Layer visibility
export type LayerVisibility = {
  enabledLayers: Set<MapLayer>;
  infrastructureSubLayers: Set<InfrastructureSubLayer>;
  vehicleSubLayers: Set<VehicleSubLayer>;
  buildingSubLayers: Set<BuildingSubLayer>;
  visibleBuildingCategories: Set<MachineCategory>;
};

// Display options
export type DisplayOptions = {
  showVehicleNames?: boolean;
  buildingColorMode?: BuildingColorMode;
  buildingOpacity?: number;
  resourceNodeFilter?: ResourceNodeFilter;
  towerVisibilityData?: TowerVisibilityData[];
};

// Callbacks
export type OverlayCallbacks = {
  onSelectItem: (item: SelectedMapItem | null) => void;
  onZoomEnd: (zoom: number) => void;
  onMoveEnd?: (center: [number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

// Combined overlay props
export type OverlayProps = InfrastructureData &
  VehicleData &
  BuildingData &
  LayerVisibility &
  DisplayOptions &
  OverlayCallbacks & {
    machineGroups: MachineGroup[];
    selectedItems: SelectedMapItem[];
    multiSelectMode?: boolean;
    isMobile?: boolean;
  };

export type FilterCategory = 'production' | 'power' | 'resource' | 'train' | 'drone';
