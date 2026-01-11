import { Drone, Explorer, Player, Tractor, Train, Truck, VehiclePath } from 'src/apiTypes';
import { BuildingColorMode } from 'src/utils/gridColors';
import { AnimatedPosition } from '../../hooks/useVehicleAnimation';
import { DroneVehicleLayer } from '../../layers/droneVehicleLayer';
import { ExplorerVehicleLayer } from '../../layers/explorerVehicleLayer';
import { PlayerVehicleLayer } from '../../layers/playerVehicleLayer';
import { TractorVehicleLayer } from '../../layers/tractorVehicleLayer';
import { TrainVehicleLayer } from '../../layers/trainVehicleLayer';
import { TruckVehicleLayer } from '../../layers/truckVehicleLayer';
import { VehiclePathsOverlay } from '../../vehiclePathsOverlay';
import { VehicleSubLayer } from '../../view/map-view';
import { VehicleSelectionState, VehicleType } from '../hooks/useVehicleSelection';

interface VehicleLayersProps {
  // Vehicles
  trains: Train[];
  drones: Drone[];
  trucks: Truck[];
  tractors: Tractor[];
  explorers: Explorer[];
  players: Player[];
  vehiclePaths: VehiclePath[];
  // Layer visibility
  vehicleSubLayers: Set<VehicleSubLayer>;
  // Selections
  selections: Record<VehicleType, VehicleSelectionState>;
  // Click handlers
  onTrainClick: (train: Train, pos: AnimatedPosition) => void;
  onDroneClick: (drone: Drone, pos: AnimatedPosition) => void;
  onTruckClick: (truck: Truck, pos: AnimatedPosition) => void;
  onTractorClick: (tractor: Tractor, pos: AnimatedPosition) => void;
  onExplorerClick: (explorer: Explorer, pos: AnimatedPosition) => void;
  // Position update handlers
  onTrainPositionUpdate: (pos: AnimatedPosition | null) => void;
  onDronePositionUpdate: (pos: AnimatedPosition | null) => void;
  onTruckPositionUpdate: (pos: AnimatedPosition | null) => void;
  onTractorPositionUpdate: (pos: AnimatedPosition | null) => void;
  onExplorerPositionUpdate: (pos: AnimatedPosition | null) => void;
  // Display options
  showVehicleNames: boolean;
  buildingColorMode: BuildingColorMode;
}

export function VehicleLayers({
  trains,
  drones,
  trucks,
  tractors,
  explorers,
  players,
  vehiclePaths,
  vehicleSubLayers,
  selections,
  onTrainClick,
  onDroneClick,
  onTruckClick,
  onTractorClick,
  onExplorerClick,
  onTrainPositionUpdate,
  onDronePositionUpdate,
  onTruckPositionUpdate,
  onTractorPositionUpdate,
  onExplorerPositionUpdate,
  showVehicleNames,
  buildingColorMode,
}: VehicleLayersProps) {
  return (
    <>
      {vehicleSubLayers.has('trains') && (
        <TrainVehicleLayer
          trains={trains}
          onTrainClick={onTrainClick}
          onSelectedPositionUpdate={onTrainPositionUpdate}
          selectedName={selections.train.selectedName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('drones') && (
        <DroneVehicleLayer
          drones={drones}
          onDroneClick={onDroneClick}
          onSelectedPositionUpdate={onDronePositionUpdate}
          selectedName={selections.drone.selectedName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('trucks') && (
        <TruckVehicleLayer
          trucks={trucks}
          onTruckClick={onTruckClick}
          onSelectedPositionUpdate={onTruckPositionUpdate}
          selectedName={selections.truck.selectedName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('tractors') && (
        <TractorVehicleLayer
          tractors={tractors}
          onTractorClick={onTractorClick}
          onSelectedPositionUpdate={onTractorPositionUpdate}
          selectedName={selections.tractor.selectedName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('explorers') && (
        <ExplorerVehicleLayer
          explorers={explorers}
          onExplorerClick={onExplorerClick}
          onSelectedPositionUpdate={onExplorerPositionUpdate}
          selectedName={selections.explorer.selectedName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('players') && (
        <PlayerVehicleLayer players={players} showNames={showVehicleNames} />
      )}

      {vehicleSubLayers.has('paths') && (
        <VehiclePathsOverlay
          vehiclePaths={vehiclePaths}
          visiblePaths={new Set(vehiclePaths.map((p) => p.name))}
          showNames={showVehicleNames}
        />
      )}
    </>
  );
}
