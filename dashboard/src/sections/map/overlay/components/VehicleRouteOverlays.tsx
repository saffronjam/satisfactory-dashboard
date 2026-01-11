import { Drone, DroneStation, Explorer, Tractor, Train, TrainStation, Truck } from 'src/apiTypes';
import { DroneRouteOverlay } from '../../droneRouteOverlay';
import { ExplorerRouteOverlay } from '../../explorerRouteOverlay';
import { TractorRouteOverlay } from '../../tractorRouteOverlay';
import { TrainRouteOverlay } from '../../trainRouteOverlay';
import { TruckRouteOverlay } from '../../truckRouteOverlay';
import { VehicleSelectionState, VehicleType } from '../hooks/useVehicleSelection';

interface VehicleRouteOverlaysProps {
  // Vehicles
  trains: Train[];
  drones: Drone[];
  trucks: Truck[];
  tractors: Tractor[];
  explorers: Explorer[];
  // Stations
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  // Selections
  selections: Record<VehicleType, VehicleSelectionState>;
  // Handlers
  onHideVehicle: (type: VehicleType) => void;
  onCloseVehicle: (type: VehicleType) => void;
}

export function VehicleRouteOverlays({
  trains,
  drones,
  trucks,
  tractors,
  explorers,
  trainStations,
  droneStations,
  selections,
  onHideVehicle,
  onCloseVehicle,
}: VehicleRouteOverlaysProps) {
  // Look up current vehicles from arrays to get latest data
  const selectedTrain = selections.train.selectedName
    ? (trains.find((t) => t.name === selections.train.selectedName) ?? null)
    : null;

  const selectedDrone = selections.drone.selectedName
    ? (drones.find((d) => d.name === selections.drone.selectedName) ?? null)
    : null;

  const selectedTruck = selections.truck.selectedName
    ? (trucks.find((t) => t.name === selections.truck.selectedName) ?? null)
    : null;

  const selectedTractor = selections.tractor.selectedName
    ? (tractors.find((t) => t.name === selections.tractor.selectedName) ?? null)
    : null;

  const selectedExplorer = selections.explorer.selectedName
    ? (explorers.find((e) => e.name === selections.explorer.selectedName) ?? null)
    : null;

  return (
    <>
      {selectedTrain && (
        <TrainRouteOverlay
          train={selectedTrain}
          trainStations={trainStations}
          onHide={() => onHideVehicle('train')}
          onClose={() => onCloseVehicle('train')}
          animatedPosition={selections.train.animatedPosition}
          showPopover={selections.train.popoverVisible}
        />
      )}

      {selectedDrone && (
        <DroneRouteOverlay
          drone={selectedDrone}
          droneStations={droneStations}
          onHide={() => onHideVehicle('drone')}
          onClose={() => onCloseVehicle('drone')}
          animatedPosition={selections.drone.animatedPosition}
          showPopover={selections.drone.popoverVisible}
        />
      )}

      {selectedTruck && (
        <TruckRouteOverlay
          truck={selectedTruck}
          onHide={() => onHideVehicle('truck')}
          onClose={() => onCloseVehicle('truck')}
          animatedPosition={selections.truck.animatedPosition}
          showPopover={selections.truck.popoverVisible}
        />
      )}

      {selectedTractor && (
        <TractorRouteOverlay
          tractor={selectedTractor}
          onHide={() => onHideVehicle('tractor')}
          onClose={() => onCloseVehicle('tractor')}
          animatedPosition={selections.tractor.animatedPosition}
          showPopover={selections.tractor.popoverVisible}
        />
      )}

      {selectedExplorer && (
        <ExplorerRouteOverlay
          explorer={selectedExplorer}
          onHide={() => onHideVehicle('explorer')}
          onClose={() => onCloseVehicle('explorer')}
          animatedPosition={selections.explorer.animatedPosition}
          showPopover={selections.explorer.popoverVisible}
        />
      )}
    </>
  );
}
