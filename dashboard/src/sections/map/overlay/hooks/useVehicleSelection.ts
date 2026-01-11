import { useCallback, useEffect, useState } from 'react';
import { Drone, Explorer, Tractor, Train, Truck } from 'src/apiTypes';
import { AnimatedPosition } from '../../hooks/useVehicleAnimation';
import { VehicleSubLayer } from '../../view/map-view';

export type VehicleType = 'train' | 'drone' | 'truck' | 'tractor' | 'explorer';

export interface VehicleSelectionState {
  selectedName: string | null;
  popoverVisible: boolean;
  animatedPosition: AnimatedPosition | null;
}

const initialSelectionState: VehicleSelectionState = {
  selectedName: null,
  popoverVisible: true,
  animatedPosition: null,
};

const initialSelections: Record<VehicleType, VehicleSelectionState> = {
  train: { ...initialSelectionState },
  drone: { ...initialSelectionState },
  truck: { ...initialSelectionState },
  tractor: { ...initialSelectionState },
  explorer: { ...initialSelectionState },
};

export interface VehicleSelectionResult {
  selections: Record<VehicleType, VehicleSelectionState>;
  // Click handlers for each vehicle type
  handleTrainClick: (train: Train, pos: AnimatedPosition) => void;
  handleDroneClick: (drone: Drone, pos: AnimatedPosition) => void;
  handleTruckClick: (truck: Truck, pos: AnimatedPosition) => void;
  handleTractorClick: (tractor: Tractor, pos: AnimatedPosition) => void;
  handleExplorerClick: (explorer: Explorer, pos: AnimatedPosition) => void;
  // Position update handlers
  setTrainPosition: (pos: AnimatedPosition | null) => void;
  setDronePosition: (pos: AnimatedPosition | null) => void;
  setTruckPosition: (pos: AnimatedPosition | null) => void;
  setTractorPosition: (pos: AnimatedPosition | null) => void;
  setExplorerPosition: (pos: AnimatedPosition | null) => void;
  // Close handlers (deselect entirely)
  handleCloseVehicle: (type: VehicleType) => void;
  // Hide handlers (hide popover but keep selection for route lines)
  handleHideVehicle: (type: VehicleType) => void;
  // Clear all selections
  clearAllSelections: () => void;
}

export function useVehicleSelection(
  vehicleSubLayers: Set<VehicleSubLayer>
): VehicleSelectionResult {
  const [selections, setSelections] = useState<Record<VehicleType, VehicleSelectionState>>(
    initialSelections
  );

  // Generic function to update a specific vehicle type's selection
  const updateSelection = useCallback(
    (type: VehicleType, update: Partial<VehicleSelectionState>) => {
      setSelections((prev) => ({
        ...prev,
        [type]: { ...prev[type], ...update },
      }));
    },
    []
  );

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelections(initialSelections);
  }, []);

  // Generic click handler that clears all and sets new selection
  const handleVehicleClick = useCallback(
    (type: VehicleType, name: string, pos: AnimatedPosition) => {
      setSelections({
        ...initialSelections,
        [type]: {
          selectedName: name,
          popoverVisible: true,
          animatedPosition: pos,
        },
      });
    },
    []
  );

  // Typed click handlers for each vehicle type
  const handleTrainClick = useCallback(
    (train: Train, pos: AnimatedPosition) => {
      handleVehicleClick('train', train.name, pos);
    },
    [handleVehicleClick]
  );

  const handleDroneClick = useCallback(
    (drone: Drone, pos: AnimatedPosition) => {
      handleVehicleClick('drone', drone.name, pos);
    },
    [handleVehicleClick]
  );

  const handleTruckClick = useCallback(
    (truck: Truck, pos: AnimatedPosition) => {
      handleVehicleClick('truck', truck.name, pos);
    },
    [handleVehicleClick]
  );

  const handleTractorClick = useCallback(
    (tractor: Tractor, pos: AnimatedPosition) => {
      handleVehicleClick('tractor', tractor.name, pos);
    },
    [handleVehicleClick]
  );

  const handleExplorerClick = useCallback(
    (explorer: Explorer, pos: AnimatedPosition) => {
      handleVehicleClick('explorer', explorer.name, pos);
    },
    [handleVehicleClick]
  );

  // Position update handlers
  const setTrainPosition = useCallback(
    (pos: AnimatedPosition | null) => updateSelection('train', { animatedPosition: pos }),
    [updateSelection]
  );

  const setDronePosition = useCallback(
    (pos: AnimatedPosition | null) => updateSelection('drone', { animatedPosition: pos }),
    [updateSelection]
  );

  const setTruckPosition = useCallback(
    (pos: AnimatedPosition | null) => updateSelection('truck', { animatedPosition: pos }),
    [updateSelection]
  );

  const setTractorPosition = useCallback(
    (pos: AnimatedPosition | null) => updateSelection('tractor', { animatedPosition: pos }),
    [updateSelection]
  );

  const setExplorerPosition = useCallback(
    (pos: AnimatedPosition | null) => updateSelection('explorer', { animatedPosition: pos }),
    [updateSelection]
  );

  // Close handler (deselect entirely)
  const handleCloseVehicle = useCallback((type: VehicleType) => {
    setSelections((prev) => ({
      ...prev,
      [type]: { ...initialSelectionState },
    }));
  }, []);

  // Hide handler (hide popover but keep selection for route lines)
  const handleHideVehicle = useCallback(
    (type: VehicleType) => {
      updateSelection(type, { popoverVisible: false });
    },
    [updateSelection]
  );

  // Clear vehicle selections when their sub-layers are disabled
  useEffect(() => {
    if (!vehicleSubLayers.has('trains') && selections.train.selectedName) {
      handleCloseVehicle('train');
    }
  }, [vehicleSubLayers, selections.train.selectedName, handleCloseVehicle]);

  useEffect(() => {
    if (!vehicleSubLayers.has('drones') && selections.drone.selectedName) {
      handleCloseVehicle('drone');
    }
  }, [vehicleSubLayers, selections.drone.selectedName, handleCloseVehicle]);

  useEffect(() => {
    if (!vehicleSubLayers.has('trucks') && selections.truck.selectedName) {
      handleCloseVehicle('truck');
    }
  }, [vehicleSubLayers, selections.truck.selectedName, handleCloseVehicle]);

  useEffect(() => {
    if (!vehicleSubLayers.has('tractors') && selections.tractor.selectedName) {
      handleCloseVehicle('tractor');
    }
  }, [vehicleSubLayers, selections.tractor.selectedName, handleCloseVehicle]);

  useEffect(() => {
    if (!vehicleSubLayers.has('explorers') && selections.explorer.selectedName) {
      handleCloseVehicle('explorer');
    }
  }, [vehicleSubLayers, selections.explorer.selectedName, handleCloseVehicle]);

  return {
    selections,
    handleTrainClick,
    handleDroneClick,
    handleTruckClick,
    handleTractorClick,
    handleExplorerClick,
    setTrainPosition,
    setDronePosition,
    setTruckPosition,
    setTractorPosition,
    setExplorerPosition,
    handleCloseVehicle,
    handleHideVehicle,
    clearAllSelections,
  };
}
