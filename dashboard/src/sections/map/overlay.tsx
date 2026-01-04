import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Marker, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import {
  Belt,
  Cable,
  Drone,
  DroneStation,
  Explorer,
  Machine,
  MachineCategory,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
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
import { ConvertToMapCoords2 } from './bounds';
import { DroneRouteOverlay } from './droneRouteOverlay';
import { ExplorerRouteOverlay } from './explorerRouteOverlay';
import { AnimatedPosition } from './hooks/useVehicleAnimation';
import { HoveredItem, HoverTooltip } from './hoverTooltip';
import { HoverEvent, InfrastructureOverlay } from './infrastructureOverlay';
import { ClickedItem, ItemPopover } from './itemPopover';
import { DroneVehicleLayer } from './layers/droneVehicleLayer';
import { ExplorerVehicleLayer } from './layers/explorerVehicleLayer';
import { PlayerVehicleLayer } from './layers/playerVehicleLayer';
import { RadarTowerLayer } from './layers/radarTowerLayer';
import { ResourceNodesLayer } from './layers/resourceNodesLayer';
import { TractorVehicleLayer } from './layers/tractorVehicleLayer';
import { TrainVehicleLayer } from './layers/trainVehicleLayer';
import { TruckVehicleLayer } from './layers/truckVehicleLayer';
import { RadarTowerSidebar } from './radarTowerSidebar';
import { TractorRouteOverlay } from './tractorRouteOverlay';
import { TrainRouteOverlay } from './trainRouteOverlay';
import { TruckRouteOverlay } from './truckRouteOverlay';
import { VehiclePathsOverlay } from './vehiclePathsOverlay';
import {
  BuildingSubLayer,
  InfrastructureSubLayer,
  MapLayer,
  ResourceNodeFilter,
  ResourceSubLayer,
  VehicleSubLayer,
} from './view/map-view';

export type FilterCategory = 'production' | 'power' | 'resource' | 'train' | 'drone';

// Category-based colors
const categoryColors: Record<MachineCategory, string> = {
  [MachineCategoryFactory]: '#4056A1', // Deep blue for Production
  [MachineCategoryExtractor]: '#C97B2A', // Rich amber for Resource
  [MachineCategoryGenerator]: '#2E8B8B', // Deep teal for Power
};

const getCategoryColor = (categories: MachineCategory[]): string => {
  const uniqueCategories = [...new Set(categories)];
  if (uniqueCategories.length === 1) {
    return categoryColors[uniqueCategories[0]] || '#505050';
  }
  // Mixed groups get a neutral grey
  return '#505050';
};

const iconifyFactory = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M2 22V9.975L9 7v2l5-2v3h8v12zm9-4h2v-4h-2zm-4 0h2v-4H7zm8 0h2v-4h-2zm6.8-9.5h-4.625l.85-6.5H21z"/>
      </svg>`;
const iconifyMiner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.1 5.3a.5.5 0 0 1 0-.6zm11.386 3.785l-1.806-2.41l-.776 2.413zm-3.633.004l.961-2.989H4.186l.963 2.995zM5.47 5.495L8 13.366l2.532-7.876zm-1.371-.999l-.78-2.422l-1.818 2.425zM1.499 5.5l5.113 6.817l-2.192-6.82zm7.889 6.817l5.123-6.83l-2.928.002z"/>
      </svg>`;
const iconifyGenerator = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M19.836 10.486a.9.9 0 0 1-.21.47l-9.75 10.71a.94.94 0 0 1-.49.33q-.125.015-.25 0a1 1 0 0 1-.41-.09a.92.92 0 0 1-.45-.46a.9.9 0 0 1-.07-.58l.86-6.86h-3.63a1.7 1.7 0 0 1-.6-.15a1.29 1.29 0 0 1-.68-.99a1.3 1.3 0 0 1 .09-.62l3.78-9.45c.1-.239.266-.444.48-.59a1.3 1.3 0 0 1 .72-.21h7.24c.209.004.414.055.6.15c.188.105.349.253.47.43c.112.179.18.38.2.59a1.2 1.2 0 0 1-.1.61l-2.39 5.57h3.65a1 1 0 0 1 .51.16a1 1 0 0 1 .43 1z"/>
     </svg>`;

// Train station icon
const iconifyTrainStation = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m3.5-7H6V6h5zm2 0V6h5v4zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"/>
     </svg>`;

// Drone station icon
const iconifyDroneStation = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="currentColor" d="M6.475 22Q4.6 22 3.3 20.675t-1.3-3.2T3.3 14.3T6.475 13q.55 0 1.063.125t.962.35q.35-.725.375-1.5t-.275-1.5q-.475.25-1 .375t-1.1.125q-1.875 0-3.187-1.312T2 6.474T3.313 3.3T6.5 2t3.188 1.3T11 6.475q0 .575-.137 1.1t-.388 1q.725.3 1.5.288t1.5-.363q-.225-.45-.35-.962T13 6.475Q13 4.6 14.3 3.3T17.475 2t3.2 1.3T22 6.475t-1.325 3.2t-3.2 1.325q-.6 0-1.137-.15t-1.038-.425q-.325.75-.3 1.538t.375 1.562q.475-.25 1-.387t1.1-.138q1.875 0 3.2 1.3T22 17.475t-1.325 3.2t-3.2 1.325t-3.175-1.325t-1.3-3.2q0-.575.138-1.1t.387-1q-.775-.35-1.563-.387t-1.537.287q.275.5.425 1.05t.15 1.15q0 1.875-1.325 3.2T6.475 22m11-13q1.05 0 1.788-.738T20 6.475t-.737-1.762T17.475 4t-1.763.713T15 6.475q0 .2.038.413t.087.412l1.5-1.5q.3-.3.7-.3t.7.3t.3.7t-.3.7l-1.55 1.575q.225.125.475.175t.525.05M6.5 8.975q.25 0 .475-.05T7.4 8.8L5.8 7.2q-.3-.3-.3-.7t.3-.7t.7-.3t.7.3l1.625 1.6q.075-.2.125-.437T9 6.475q0-1.05-.725-1.775T6.5 3.975T4.725 4.7T4 6.475t.725 1.775t1.775.725M17.475 20q1.05 0 1.787-.737T20 17.475t-.737-1.763T17.475 15q-.25 0-.475.038t-.425.112l1.65 1.65q.3.3.3.7t-.3.7q-.325.3-.725.3t-.7-.3l-1.625-1.625q-.075.2-.125.425t-.05.475q0 1.05.712 1.788t1.763.737m-11 0q1.05 0 1.788-.737T9 17.475q0-.275-.05-.537t-.175-.488l-1.75 1.75q-.3.3-.713.3t-.712-.3t-.3-.7t.3-.7l1.675-1.675q-.2-.05-.4-.088t-.4-.037q-1.05 0-1.763.713T4 17.475t.713 1.788T6.475 20M12 13q.425 0 .713-.288T13 12t-.288-.712T12 11t-.712.288T11 12t.288.713T12 13"/>
     </svg>`;

// Station colors (darker for visibility)
const trainStationColor = '#5A5A5A'; // Dark warm grey
const droneStationColor = '#4A5A6A'; // Dark cool grey

type OverlayProps = {
  machineGroups: MachineGroup[];
  onSelectItem: (item: SelectedMapItem | null) => void;
  onZoomEnd: (zoom: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  multiSelectMode?: boolean; // For mobile: programmatic multi-select mode
  isMobile?: boolean;
  enabledLayers: Set<MapLayer>;
  belts: Belt[];
  pipes: Pipe[];
  pipeJunctions: PipeJunction[];
  trainRails: TrainRail[];
  splitterMergers: SplitterMerger[];
  cables: Cable[];
  machines: Machine[];
  storages: Storage[];
  visibleBuildingCategories: Set<MachineCategory>;
  trains: Train[];
  drones: Drone[];
  trucks: Truck[];
  tractors: Tractor[];
  explorers: Explorer[];
  vehiclePaths: VehiclePath[];
  players: Player[];
  infrastructureSubLayers: Set<InfrastructureSubLayer>;
  vehicleSubLayers: Set<VehicleSubLayer>;
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  truckStations: TruckStation[];
  buildingSubLayers: Set<BuildingSubLayer>;
  showVehicleNames?: boolean;
  buildingColorMode?: BuildingColorMode;
  buildingOpacity?: number;
  spaceElevator?: SpaceElevator | null;
  radarTowers?: RadarTower[];
  resourceNodes?: ResourceNode[];
  resourceSubLayers?: Set<ResourceSubLayer>;
  resourceNodeFilter?: ResourceNodeFilter;
};

export function Overlay({
  machineGroups,
  onSelectItem,
  onZoomEnd,
  onDragStart,
  onDragEnd,
  multiSelectMode = false,
  isMobile = false,
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
  radarTowers,
  resourceNodes,
  resourceSubLayers,
  resourceNodeFilter,
}: OverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    start: L.LatLng;
    end: L.LatLng;
  } | null>(null);
  const [clickedInfraItem, setClickedInfraItem] = useState<ClickedItem | null>(null);

  // Hover tooltip state for infrastructure
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Selected radar tower state
  const [selectedRadarTower, setSelectedRadarTower] = useState<string | null>(null);


  // Get map instance for coordinate conversions
  const map = useMap();

  // Ref to track when a layer click should suppress the map click handler
  const ignoreMapClickRef = useRef(false);

  // Store vehicle NAMEs instead of objects to always get current position from arrays
  const [selectedTrainName, setSelectedTrainName] = useState<string | null>(null);
  const [selectedDroneName, setSelectedDroneName] = useState<string | null>(null);
  const [selectedTruckName, setSelectedTruckName] = useState<string | null>(null);
  const [selectedTractorName, setSelectedTractorName] = useState<string | null>(null);
  const [selectedExplorerName, setSelectedExplorerName] = useState<string | null>(null);

  // Popover visibility state (hide popover but keep selection for route lines)
  const [trainPopoverVisible, setTrainPopoverVisible] = useState(true);
  const [dronePopoverVisible, setDronePopoverVisible] = useState(true);
  const [truckPopoverVisible, setTruckPopoverVisible] = useState(true);
  const [tractorPopoverVisible, setTractorPopoverVisible] = useState(true);
  const [explorerPopoverVisible, setExplorerPopoverVisible] = useState(true);

  // Store animated positions for selected vehicles only (not all vehicles)
  const [selectedTrainPos, setSelectedTrainPos] = useState<AnimatedPosition | null>(null);
  const [selectedDronePos, setSelectedDronePos] = useState<AnimatedPosition | null>(null);
  const [selectedTruckPos, setSelectedTruckPos] = useState<AnimatedPosition | null>(null);
  const [selectedTractorPos, setSelectedTractorPos] = useState<AnimatedPosition | null>(null);
  const [selectedExplorerPos, setSelectedExplorerPos] = useState<AnimatedPosition | null>(null);

  // Look up current vehicles from arrays to get latest data
  const selectedTrain = selectedTrainName
    ? (trains.find((t) => t.name === selectedTrainName) ?? null)
    : null;
  const selectedDrone = selectedDroneName
    ? (drones.find((d) => d.name === selectedDroneName) ?? null)
    : null;
  const selectedTruck = selectedTruckName
    ? (trucks.find((t) => t.name === selectedTruckName) ?? null)
    : null;
  const selectedTractor = selectedTractorName
    ? (tractors.find((t) => t.name === selectedTractorName) ?? null)
    : null;
  const selectedExplorer = selectedExplorerName
    ? (explorers.find((e) => e.name === selectedExplorerName) ?? null)
    : null;

  // Animated positions are now stored directly from vehicle layer callbacks
  // (no longer derived from Maps)

  const clearAllVehicleSelections = () => {
    setSelectedTrainName(null);
    setSelectedDroneName(null);
    setSelectedTruckName(null);
    setSelectedTractorName(null);
    setSelectedExplorerName(null);
  };

  const handleClosePopover = () => {
    setClickedInfraItem(null);
  };

  const handleItemHover = (event: HoverEvent) => {
    if (event.item === null) {
      setHoveredItem(null);
      setHoverPosition(null);
    } else {
      setHoveredItem(event.item);
      setHoverPosition(event.position);
    }
  };

  const handleResourceNodeHover = (event: {
    node: ResourceNode | null;
    position: { x: number; y: number } | null;
  }) => {
    if (event.node === null) {
      setHoveredItem(null);
      setHoverPosition(null);
    } else {
      setHoveredItem({ type: 'resourceNode', data: event.node });
      setHoverPosition(event.position);
    }
  };

  const handleRadarTowerClick = (
    tower: RadarTower,
    _containerPoint: { x: number; y: number }
  ) => {
    ignoreMapClickRef.current = true;
    if (selectedRadarTower === tower.id) {
      // Clicking selected tower → deselect
      setSelectedRadarTower(null);
    } else {
      // Clicking unselected tower → select
      setSelectedRadarTower(tower.id);
    }
  };


  const handleTrainClick = (train: Train, animatedPos: AnimatedPosition) => {
    clearAllVehicleSelections();
    setSelectedTrainPos(animatedPos); // Set position immediately from click callback
    setSelectedTrainName(train.name);
    setTrainPopoverVisible(true);
    setClickedInfraItem(null);
  };

  const handleDroneClick = (drone: Drone, animatedPos: AnimatedPosition) => {
    clearAllVehicleSelections();
    setSelectedDronePos(animatedPos); // Set position immediately from click callback
    setSelectedDroneName(drone.name);
    setDronePopoverVisible(true);
    setClickedInfraItem(null);
  };

  const handleTruckClick = (truck: Truck, animatedPos: AnimatedPosition) => {
    clearAllVehicleSelections();
    setSelectedTruckPos(animatedPos); // Set position immediately from click callback
    setSelectedTruckName(truck.name);
    setTruckPopoverVisible(true);
    setClickedInfraItem(null);
  };

  const handleTractorClick = (tractor: Tractor, animatedPos: AnimatedPosition) => {
    clearAllVehicleSelections();
    setSelectedTractorPos(animatedPos); // Set position immediately from click callback
    setSelectedTractorName(tractor.name);
    setTractorPopoverVisible(true);
    setClickedInfraItem(null);
  };

  const handleExplorerClick = (explorer: Explorer, animatedPos: AnimatedPosition) => {
    clearAllVehicleSelections();
    setSelectedExplorerPos(animatedPos); // Set position immediately from click callback
    setSelectedExplorerName(explorer.name);
    setExplorerPopoverVisible(true);
    setClickedInfraItem(null);
  };

  // Close handlers (deselect entirely)
  const handleCloseTrainRoute = () => {
    setSelectedTrainName(null);
  };

  const handleCloseDroneRoute = () => {
    setSelectedDroneName(null);
  };

  const handleCloseTruckRoute = () => {
    setSelectedTruckName(null);
  };

  const handleCloseTractorRoute = () => {
    setSelectedTractorName(null);
  };

  const handleCloseExplorerRoute = () => {
    setSelectedExplorerName(null);
  };

  // Hide handlers (hide popover but keep selection for route lines)
  const handleHideTrainRoute = () => {
    setTrainPopoverVisible(false);
  };

  const handleHideDroneRoute = () => {
    setDronePopoverVisible(false);
  };

  const handleHideTruckRoute = () => {
    setTruckPopoverVisible(false);
  };

  const handleHideTractorRoute = () => {
    setTractorPopoverVisible(false);
  };

  const handleHideExplorerRoute = () => {
    setExplorerPopoverVisible(false);
  };

  const completeSelection = (endLatLng: L.LatLng) => {
    if (!selectionRect) return;

    const bounds = L.latLngBounds(selectionRect.start, endLatLng);
    const selectedGroups = machineGroups.filter((group) => {
      const position = ConvertToMapCoords2(group.center.x, group.center.y);
      return bounds.contains(position);
    });

    if (selectedGroups.length > 1) {
      onSelectItem({ type: 'machineGroups', data: selectedGroups });
    } else if (selectedGroups.length === 1) {
      onSelectItem({ type: 'machineGroup', data: selectedGroups[0] });
    } else {
      onSelectItem(null);
    }

    setIsSelecting(false);
    setSelectionRect(null);
  };

  useMapEvents({
    zoomend: () => {
      onZoomEnd(map.getZoom());
    },
    dragstart: () => {
      onDragStart?.();
    },
    dragend: () => {
      onDragEnd?.();
    },
    mousedown: (e) => {
      // Start selection if Ctrl/Meta key is pressed OR if multiSelectMode is enabled
      // Only allow selection when machine groups layer is active
      const canSelect = enabledLayers.has('machineGroups');
      if (canSelect && (e.originalEvent.ctrlKey || e.originalEvent.metaKey || multiSelectMode)) {
        e.originalEvent.preventDefault();
        setIsSelecting(true);
        setSelectionRect({ start: e.latlng, end: e.latlng });
        map.dragging.disable();
      }
    },
    mousemove: (e) => {
      if (isSelecting && selectionRect) {
        setSelectionRect({ ...selectionRect, end: e.latlng });
      }
    },
    mouseup: (e) => {
      if (isSelecting && selectionRect) {
        completeSelection(e.latlng);
        map.dragging.enable();
      }
    },
    click: () => {
      // Reset the ignore flag if it was set by a layer click
      if (ignoreMapClickRef.current) {
        ignoreMapClickRef.current = false;
      }
      // Note: Pinned popovers are only closed via X button or clicking the same bounding box
    },
  });

  // Handle touch events for mobile multi-select
  useEffect(() => {
    if (!multiSelectMode) return;

    const container = map.getContainer();

    const handleTouchStart = (e: TouchEvent) => {
      if (!multiSelectMode || e.touches.length !== 1) return;

      e.preventDefault();
      const touch = e.touches[0];
      const point = L.point(touch.clientX, touch.clientY);
      const containerPoint = point.subtract(
        L.point(container.getBoundingClientRect().left, container.getBoundingClientRect().top)
      );
      const latlng = map.containerPointToLatLng(containerPoint);

      setIsSelecting(true);
      setSelectionRect({ start: latlng, end: latlng });
      map.dragging.disable();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSelecting || !selectionRect || e.touches.length !== 1) return;

      e.preventDefault();
      const touch = e.touches[0];
      const point = L.point(touch.clientX, touch.clientY);
      const containerPoint = point.subtract(
        L.point(container.getBoundingClientRect().left, container.getBoundingClientRect().top)
      );
      const latlng = map.containerPointToLatLng(containerPoint);

      setSelectionRect({ ...selectionRect, end: latlng });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSelecting || !selectionRect) return;

      e.preventDefault();
      // Use the last known position from selectionRect.end
      completeSelection(selectionRect.end);
      map.dragging.enable();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [multiSelectMode, map, isSelecting, selectionRect, machineGroups, onSelectItem]);

  // Update cursor when multiSelectMode changes
  useEffect(() => {
    if (multiSelectMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [multiSelectMode, map]);

  // Track CTRL key for cursor change (desktop only, not needed when multiSelectMode is active)
  useEffect(() => {
    // Skip keyboard handling when in programmatic mode or when machine groups layer is off
    if (multiSelectMode || !enabledLayers.has('machineGroups')) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        map.getContainer().style.cursor = 'crosshair';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        map.getContainer().style.cursor = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [map, multiSelectMode, enabledLayers]);

  // Clear vehicle selections when their sub-layers are disabled
  useEffect(() => {
    if (!vehicleSubLayers.has('trains') && selectedTrainName) {
      setSelectedTrainName(null);
    }
  }, [vehicleSubLayers, selectedTrainName]);

  useEffect(() => {
    if (!vehicleSubLayers.has('drones') && selectedDroneName) {
      setSelectedDroneName(null);
    }
  }, [vehicleSubLayers, selectedDroneName]);

  useEffect(() => {
    if (!vehicleSubLayers.has('trucks') && selectedTruckName) {
      setSelectedTruckName(null);
    }
  }, [vehicleSubLayers, selectedTruckName]);

  useEffect(() => {
    if (!vehicleSubLayers.has('tractors') && selectedTractorName) {
      setSelectedTractorName(null);
    }
  }, [vehicleSubLayers, selectedTractorName]);

  useEffect(() => {
    if (!vehicleSubLayers.has('explorers') && selectedExplorerName) {
      setSelectedExplorerName(null);
    }
  }, [vehicleSubLayers, selectedExplorerName]);

  // Clear radar tower selection when the radarTowers sub-layer is disabled
  useEffect(() => {
    if (!buildingSubLayers.has('radarTowers') && selectedRadarTower) {
      setSelectedRadarTower(null);
    }
  }, [buildingSubLayers, selectedRadarTower]);

  // Clear resource node hover tooltip when radar tower is deselected (nodes disappear from DOM)
  useEffect(() => {
    if (!selectedRadarTower && hoveredItem?.type === 'resourceNode') {
      setHoveredItem(null);
      setHoverPosition(null);
    }
  }, [selectedRadarTower, hoveredItem?.type]);

  // Get all entity types present in a group
  const getGroupEntityTypes = (group: MachineGroup) => {
    const types: ('machine' | 'train' | 'drone')[] = [];
    if (group.machines.length > 0) types.push('machine');
    if (group.trainStations.length > 0) types.push('train');
    if (group.droneStations.length > 0) types.push('drone');
    return types;
  };

  // Get machine categories from a group
  const getMachineCategories = (group: MachineGroup): MachineCategory[] => {
    return group.machines.map((m) => m.category);
  };

  // Get total item count in a group
  const getGroupTotalCount = (group: MachineGroup) => {
    return group.machines.length + group.trainStations.length + group.droneStations.length;
  };

  // Create unified icon for a group that may contain machines, train stations, and/or drone stations
  const createUnifiedGroupIcon = (group: MachineGroup) => {
    const entityTypes = getGroupEntityTypes(group);
    const totalCount = getGroupTotalCount(group);
    const showBadge = totalCount > 1;

    // Collect SVGs based on what's in the group
    const svgs: string[] = [];
    let backgroundColor = '#505050';

    if (group.machines.length > 0) {
      const categories = getMachineCategories(group);
      backgroundColor = getCategoryColor(categories);

      if (categories.includes(MachineCategoryExtractor)) {
        svgs.push(iconifyMiner);
      }
      if (categories.includes(MachineCategoryFactory)) {
        svgs.push(iconifyFactory);
      }
      if (categories.includes(MachineCategoryGenerator)) {
        svgs.push(iconifyGenerator);
      }
    }

    if (group.trainStations.length > 0) {
      svgs.push(iconifyTrainStation);
      if (group.machines.length === 0) {
        backgroundColor = trainStationColor;
      }
    }

    if (group.droneStations.length > 0) {
      svgs.push(iconifyDroneStation);
      if (group.machines.length === 0 && group.trainStations.length === 0) {
        backgroundColor = droneStationColor;
      }
    }

    // Mixed entity types get a neutral grey
    if (entityTypes.length > 1) {
      backgroundColor = '#505050';
    }

    const size = 35;
    const iconSize = 16; // Size of each individual icon

    // Create icon HTML based on number of icons
    let iconHtml: string;

    if (svgs.length <= 2) {
      // 1-2 icons: single row
      const width = svgs.length === 1 ? size : size * 1.2;
      iconHtml = `
        <div style="position: relative; background-color: ${backgroundColor}; border-radius: 50%; padding: 7px; width: ${width}px; height: ${size}px; display: flex; justify-content: center; align-items: center; gap: 2px; pointer-events: auto; cursor: pointer;">
          ${svgs.join('')}
          ${
            showBadge
              ? `<div style="position: absolute; top: -6px; right: -6px; background-color: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: bold; display: flex; justify-content: center; align-items: center;">${totalCount}</div>`
              : ''
          }
        </div>`;
    } else {
      // 3+ icons: use 2 rows
      // 3 icons: 2+1, 4 icons: 2+2, 5 icons: 3+2
      const topRowCount = svgs.length <= 4 ? 2 : 3;
      const topRow = svgs.slice(0, topRowCount);
      const bottomRow = svgs.slice(topRowCount);
      const width = Math.max(topRowCount, bottomRow.length) * (iconSize + 4) + 12;
      const height = iconSize * 2 + 18; // Height for 2 rows + padding

      // Wrap each SVG in a sized container
      const wrapSvg = (svg: string) =>
        `<div style="width: ${iconSize}px; height: ${iconSize}px; color: white;">${svg}</div>`;

      iconHtml = `
        <div style="position: relative; background-color: ${backgroundColor}; border-radius: 12px; padding: 6px; width: ${width}px; height: ${height}px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; pointer-events: auto; cursor: pointer;">
          <div style="display: flex; justify-content: center; gap: 4px;">
            ${topRow.map(wrapSvg).join('')}
          </div>
          <div style="display: flex; justify-content: center; gap: 4px;">
            ${bottomRow.map(wrapSvg).join('')}
          </div>
          ${
            showBadge
              ? `<div style="position: absolute; top: -6px; right: -6px; background-color: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: bold; display: flex; justify-content: center; align-items: center;">${totalCount}</div>`
              : ''
          }
        </div>`;
    }

    return L.divIcon({
      className: 'custom-icon',
      html: iconHtml,
      iconAnchor: [12, 24],
    });
  };

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
        spaceElevator={spaceElevator}
        showSpaceElevator={buildingSubLayers.has('spaceElevator')}
      />

      {buildingSubLayers.has('radarTowers') && radarTowers && (
        <RadarTowerLayer
          radarTowers={radarTowers}
          enabled={true}
          selectedId={selectedRadarTower}
          onRadarTowerClick={handleRadarTowerClick}
          onResourceNodeHover={handleResourceNodeHover}
          opacity={buildingOpacity}
        />
      )}

      {/* Resource Nodes Layer */}
      {enabledLayers.has('resources') &&
        resourceNodes &&
        resourceSubLayers &&
        resourceNodeFilter && (
          <ResourceNodesLayer
            resourceNodes={resourceNodes}
            radarTowers={radarTowers ?? []}
            resourceSubLayers={resourceSubLayers}
            filter={resourceNodeFilter}
            enabled={true}
            onNodeHover={handleResourceNodeHover}
          />
        )}

      {vehicleSubLayers.has('trains') && (
        <TrainVehicleLayer
          trains={trains}
          enabled={true}
          onTrainClick={handleTrainClick}
          onSelectedPositionUpdate={setSelectedTrainPos}
          selectedName={selectedTrainName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('drones') && (
        <DroneVehicleLayer
          drones={drones}
          enabled={true}
          onDroneClick={handleDroneClick}
          onSelectedPositionUpdate={setSelectedDronePos}
          selectedName={selectedDroneName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('trucks') && (
        <TruckVehicleLayer
          trucks={trucks}
          enabled={true}
          onTruckClick={handleTruckClick}
          onSelectedPositionUpdate={setSelectedTruckPos}
          selectedName={selectedTruckName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('tractors') && (
        <TractorVehicleLayer
          tractors={tractors}
          enabled={true}
          onTractorClick={handleTractorClick}
          onSelectedPositionUpdate={setSelectedTractorPos}
          selectedName={selectedTractorName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('explorers') && (
        <ExplorerVehicleLayer
          explorers={explorers}
          enabled={true}
          onExplorerClick={handleExplorerClick}
          onSelectedPositionUpdate={setSelectedExplorerPos}
          selectedName={selectedExplorerName}
          showNames={showVehicleNames}
          buildingColorMode={buildingColorMode}
        />
      )}

      {vehicleSubLayers.has('players') && (
        <PlayerVehicleLayer players={players} enabled={true} showNames={showVehicleNames} />
      )}

      {vehicleSubLayers.has('paths') && (
        <VehiclePathsOverlay
          vehiclePaths={vehiclePaths}
          visiblePaths={new Set(vehiclePaths.map((p) => p.name))}
          showNames={showVehicleNames}
        />
      )}

      {selectedTrain && (
        <TrainRouteOverlay
          train={selectedTrain}
          trainStations={trainStations}
          onHide={handleHideTrainRoute}
          onClose={handleCloseTrainRoute}
          animatedPosition={selectedTrainPos}
          showPopover={trainPopoverVisible}
        />
      )}

      {selectedDrone && (
        <DroneRouteOverlay
          drone={selectedDrone}
          droneStations={droneStations}
          onHide={handleHideDroneRoute}
          onClose={handleCloseDroneRoute}
          animatedPosition={selectedDronePos}
          showPopover={dronePopoverVisible}
        />
      )}

      {selectedTruck && (
        <TruckRouteOverlay
          truck={selectedTruck}
          onHide={handleHideTruckRoute}
          onClose={handleCloseTruckRoute}
          animatedPosition={selectedTruckPos}
          showPopover={truckPopoverVisible}
        />
      )}

      {selectedTractor && (
        <TractorRouteOverlay
          tractor={selectedTractor}
          onHide={handleHideTractorRoute}
          onClose={handleCloseTractorRoute}
          animatedPosition={selectedTractorPos}
          showPopover={tractorPopoverVisible}
        />
      )}

      {selectedExplorer && (
        <ExplorerRouteOverlay
          explorer={selectedExplorer}
          onHide={handleHideExplorerRoute}
          onClose={handleCloseExplorerRoute}
          animatedPosition={selectedExplorerPos}
          showPopover={explorerPopoverVisible}
        />
      )}

      <ItemPopover item={clickedInfraItem} onClose={handleClosePopover} />

      {/* Hover tooltip for infrastructure */}
      {hoveredItem && hoverPosition && (
        <HoverTooltip item={hoveredItem} position={hoverPosition} />
      )}

      {/* Selected radar tower sidebar */}
      <RadarTowerSidebar
        tower={
          selectedRadarTower ? radarTowers?.find((t) => t.id === selectedRadarTower) ?? null : null
        }
        isMobile={isMobile}
        onClose={() => setSelectedRadarTower(null)}
      />

      {/* Unified Groups (machines + train stations + drone stations) */}
      {enabledLayers.has('machineGroups') &&
        machineGroups.map((group, index) => {
          const position = ConvertToMapCoords2(group.center.x, group.center.y);
          const icon = createUnifiedGroupIcon(group);

          return (
            <Marker
              key={`group-${index}`}
              position={position}
              eventHandlers={{
                click: (e) => {
                  console.log('Machine group clicked:', group.hash);
                  e.originalEvent.stopPropagation();
                  onSelectItem({ type: 'machineGroup', data: group });
                },
              }}
              icon={icon}
            />
          );
        })}

      {/* Selection Rectangle */}
      {selectionRect && (
        <Rectangle
          bounds={[
            [selectionRect.start.lat, selectionRect.start.lng],
            [selectionRect.end.lat, selectionRect.end.lng],
          ]}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
      )}
    </>
  );
}
