import { useCallback, useEffect, useRef, useState } from 'react';
import { Hub, RadarTower, ResourceNode, SpaceElevator } from 'src/apiTypes';
import { HoveredItem, HoverTooltip } from '../hoverTooltip';
import { HoverEvent, InfrastructureOverlay } from '../infrastructureOverlay';
import { ClickedItem, ItemPopover } from '../itemPopover';
import { HubLayer } from '../layers/hubLayer';
import { RadarTowerLayer } from '../layers/radarTowerLayer';
import { SpaceElevatorLayer } from '../layers/spaceElevatorLayer';
import { ResourceNodesLayer } from '../layers/resourceNodesLayer';
import { MachineGroupMarkers } from './components/MachineGroupMarkers';
import { SelectionRectangle } from './components/SelectionRectangle';
import { VehicleLayers } from './components/VehicleLayers';
import { VehicleRouteOverlays } from './components/VehicleRouteOverlays';
import { useVehicleSelection } from './hooks/useVehicleSelection';
import { OverlayProps } from './types';

export function Overlay({
  machineGroups,
  selectedItems,
  onSelectItem,
  onZoomEnd,
  onMoveEnd,
  onDragStart,
  onDragEnd,
  multiSelectMode = false,
  isMobile: _isMobile = false,
  enabledLayers,
  belts,
  pipes,
  pipeJunctions,
  trainRails,
  splitterMergers,
  cables,
  machines,
  storages,
  visibleBuildingCategories,
  trains,
  drones,
  trucks,
  tractors,
  explorers,
  vehiclePaths,
  players,
  infrastructureSubLayers,
  vehicleSubLayers,
  trainStations,
  droneStations,
  truckStations,
  buildingSubLayers,
  showVehicleNames = false,
  buildingColorMode = 'type',
  buildingOpacity = 0.5,
  spaceElevator,
  hub,
  radarTowers,
  resourceNodes,
  resourceNodeFilter,
  towerVisibilityData,
  hypertubes,
  hypertubeEntrances,
}: OverlayProps) {
  const [clickedInfraItem, setClickedInfraItem] = useState<ClickedItem | null>(null);

  // Hover tooltip state for infrastructure
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Derive all selected radar tower IDs from selectedItems
  const selectedRadarTowerIds = selectedItems
    .filter((item) => item.type === 'radarTower')
    .map((item) => item.data.id);

  // Ref to track when a layer click should suppress the map click handler
  const ignoreMapClickRef = useRef(false);

  // Vehicle selection state and handlers
  const vehicleSelection = useVehicleSelection(vehicleSubLayers);

  const handleClosePopover = () => {
    setClickedInfraItem(null);
  };

  const handleItemHover = useCallback((event: HoverEvent) => {
    if (event.item === null) {
      setHoveredItem(null);
      setHoverPosition(null);
    } else {
      setHoveredItem(event.item);
      setHoverPosition(event.position);
    }
  }, []);

  const handleResourceNodeHover = useCallback(
    (event: { node: ResourceNode | null; position: { x: number; y: number } | null }) => {
      if (event.node === null) {
        setHoveredItem(null);
        setHoverPosition(null);
      } else {
        setHoveredItem({ type: 'resourceNode', data: event.node });
        setHoverPosition(event.position);
      }
    },
    []
  );

  const handleRadarTowerClick = (tower: RadarTower, _containerPoint: { x: number; y: number }) => {
    ignoreMapClickRef.current = true;
    // Use onSelectItem - the toggle logic is handled by the parent
    onSelectItem({ type: 'radarTower', data: tower });
  };

  const handleHubClick = (clickedHub: Hub, _containerPoint: { x: number; y: number }) => {
    ignoreMapClickRef.current = true;
    onSelectItem({ type: 'hub', data: clickedHub });
  };

  const handleSpaceElevatorClick = (
    clickedSpaceElevator: SpaceElevator,
    _containerPoint: { x: number; y: number }
  ) => {
    ignoreMapClickRef.current = true;
    onSelectItem({ type: 'spaceElevator', data: clickedSpaceElevator });
  };

  // Derive selected hub ID from selectedItems
  const selectedHubId = selectedItems
    .filter((item) => item.type === 'hub')
    .map((item) => item.data.id)[0];

  // Derive selected space elevator name from selectedItems (SpaceElevator uses name as identifier)
  const selectedSpaceElevatorId = selectedItems
    .filter((item) => item.type === 'spaceElevator')
    .map((item) => item.data.name)[0];

  const handleMapClick = () => {
    // Reset the ignore flag if it was set by a layer click
    if (ignoreMapClickRef.current) {
      ignoreMapClickRef.current = false;
    }
    // Note: Pinned popovers are only closed via X button or clicking the same bounding box
  };

  // When a vehicle is clicked, clear the infrastructure item selection
  const handleVehicleClickWrapper = useCallback(
    <T extends { name: string }>(
      handler: (vehicle: T, pos: import('../hooks/useVehicleAnimation').AnimatedPosition) => void
    ) => {
      return (vehicle: T, pos: import('../hooks/useVehicleAnimation').AnimatedPosition) => {
        setClickedInfraItem(null);
        handler(vehicle, pos);
      };
    },
    []
  );

  // Clear resource node hover tooltip when all radar towers are deselected AND resources layer is off
  useEffect(() => {
    const resourcesLayerEnabled = enabledLayers.has('resources');
    if (
      selectedRadarTowerIds.length === 0 &&
      !resourcesLayerEnabled &&
      hoveredItem?.type === 'resourceNode'
    ) {
      setHoveredItem(null);
      setHoverPosition(null);
    }
  }, [selectedRadarTowerIds.length, hoveredItem?.type, enabledLayers]);

  return (
    <>
      {/* Infrastructure layers (rendered below markers) */}
      <InfrastructureOverlay
        enabledLayers={enabledLayers}
        belts={belts}
        pipes={pipes}
        pipeJunctions={pipeJunctions}
        trainRails={trainRails}
        splitterMergers={splitterMergers}
        cables={cables}
        machines={machines}
        storages={storages}
        visibleBuildingCategories={visibleBuildingCategories}
        onItemHover={handleItemHover}
        showBelts={infrastructureSubLayers.has('belts')}
        showPipes={infrastructureSubLayers.has('pipes')}
        showRailway={infrastructureSubLayers.has('railway')}
        showStorages={buildingSubLayers.has('storage')}
        trainStations={trainStations}
        droneStations={droneStations}
        truckStations={truckStations}
        showTrainStations={buildingSubLayers.has('trainStation')}
        showDroneStations={buildingSubLayers.has('droneStation')}
        showTruckStations={buildingSubLayers.has('truckStation')}
        buildingColorMode={buildingColorMode}
        buildingOpacity={buildingOpacity}
        hypertubes={hypertubes}
        hypertubeEntrances={hypertubeEntrances}
        showHypertubes={infrastructureSubLayers.has('hypertubes')}
      />

      {buildingSubLayers.has('radarTowers') && radarTowers && (
        <RadarTowerLayer
          radarTowers={radarTowers}
          selectedIds={selectedRadarTowerIds}
          onRadarTowerClick={handleRadarTowerClick}
          onResourceNodeHover={handleResourceNodeHover}
          opacity={buildingOpacity}
        />
      )}

      {buildingSubLayers.has('hub') && hub && (
        <HubLayer
          hub={hub}
          selectedId={selectedHubId}
          onHubClick={handleHubClick}
          opacity={buildingOpacity}
        />
      )}

      {buildingSubLayers.has('spaceElevator') && spaceElevator && (
        <SpaceElevatorLayer
          spaceElevator={spaceElevator}
          selectedId={selectedSpaceElevatorId}
          onSpaceElevatorClick={handleSpaceElevatorClick}
          opacity={buildingOpacity}
        />
      )}

      {/* Resource Nodes Layer */}
      {enabledLayers.has('resources') &&
        resourceNodes &&
        resourceNodeFilter &&
        towerVisibilityData && (
          <ResourceNodesLayer
            resourceNodes={resourceNodes}
            towerVisibilityData={towerVisibilityData}
            filter={resourceNodeFilter}
            onNodeHover={handleResourceNodeHover}
          />
        )}

      {/* Vehicle Layers */}
      <VehicleLayers
        trains={trains}
        drones={drones}
        trucks={trucks}
        tractors={tractors}
        explorers={explorers}
        players={players}
        vehiclePaths={vehiclePaths}
        vehicleSubLayers={vehicleSubLayers}
        selections={vehicleSelection.selections}
        onTrainClick={handleVehicleClickWrapper(vehicleSelection.handleTrainClick)}
        onDroneClick={handleVehicleClickWrapper(vehicleSelection.handleDroneClick)}
        onTruckClick={handleVehicleClickWrapper(vehicleSelection.handleTruckClick)}
        onTractorClick={handleVehicleClickWrapper(vehicleSelection.handleTractorClick)}
        onExplorerClick={handleVehicleClickWrapper(vehicleSelection.handleExplorerClick)}
        onTrainPositionUpdate={vehicleSelection.setTrainPosition}
        onDronePositionUpdate={vehicleSelection.setDronePosition}
        onTruckPositionUpdate={vehicleSelection.setTruckPosition}
        onTractorPositionUpdate={vehicleSelection.setTractorPosition}
        onExplorerPositionUpdate={vehicleSelection.setExplorerPosition}
        showVehicleNames={showVehicleNames}
        buildingColorMode={buildingColorMode}
      />

      {/* Vehicle Route Overlays */}
      <VehicleRouteOverlays
        trains={trains}
        drones={drones}
        trucks={trucks}
        tractors={tractors}
        explorers={explorers}
        trainStations={trainStations}
        droneStations={droneStations}
        selections={vehicleSelection.selections}
        onHideVehicle={vehicleSelection.handleHideVehicle}
        onCloseVehicle={vehicleSelection.handleCloseVehicle}
      />

      <ItemPopover item={clickedInfraItem} onClose={handleClosePopover} />

      {/* Hover tooltip for infrastructure */}
      {hoveredItem && hoverPosition && <HoverTooltip item={hoveredItem} position={hoverPosition} />}

      {/* Unified Groups (machines + train stations + drone stations) */}
      {enabledLayers.has('machineGroups') && (
        <MachineGroupMarkers
          machineGroups={machineGroups}
          selectedItems={selectedItems}
          onSelectItem={onSelectItem}
        />
      )}

      {/* Selection Rectangle */}
      <SelectionRectangle
        machineGroups={machineGroups}
        enabledLayers={enabledLayers}
        multiSelectMode={multiSelectMode}
        onSelectItem={onSelectItem}
        onZoomEnd={onZoomEnd}
        onMoveEnd={onMoveEnd}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onMapClick={handleMapClick}
      />
    </>
  );
}
