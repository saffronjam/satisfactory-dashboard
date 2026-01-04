import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Backdrop,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Slider,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CRS } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MachineCategory,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
  ResourceNodePurity,
  ResourceNodePurityImpure,
  ResourceNodePurityNormal,
  ResourceNodePurityPure,
  ResourceType,
  ResourceTypeIronOre,
  ResourceTypeCopperOre,
  ResourceTypeLimestone,
  ResourceTypeCoal,
  ResourceTypeSAM,
  ResourceTypeSulfur,
  ResourceTypeCateriumOre,
  ResourceTypeBauxite,
  ResourceTypeRawQuartz,
  ResourceTypeUranium,
  ResourceTypeCrudeOil,
  ResourceTypeGeyser,
  ResourceTypeNitrogenGas,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { ApiContext } from 'src/contexts/api/useApi';
import { DashboardContent } from 'src/layouts/dashboard';
import { varAlpha } from 'src/theme/styles';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { BuildingColorMode } from 'src/utils/gridColors';
import { useContextSelector } from 'use-context-selector';
import { MapBounds } from '../bounds';
import { FilterCategory, Overlay } from '../overlay';
import { SelectionSidebar } from '../selectionSidebar';
import { computeUnifiedGroups, zoomToGroupDistance } from '../utils';

// Grouping distance values (doubling/halving from 1000)
const groupingValues = [
  0, 1, 2, 4, 8, 16, 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000,
];

// Linear slider marks (evenly spaced) that map to groupingValues
const groupingMarks = groupingValues.map((val, idx) => ({
  value: idx,
  label: val === 0 ? 'None' : val >= 1000 ? `${val / 1000}K` : `${val}`,
}));

// Only show labels for some marks to avoid clutter (indices: None, 8, 62, 500, 2K, 16K, 32K)
const visibleLabelIndices = [0, 4, 7, 10, 12, 15, 16];
const groupingMarksWithLabels = groupingMarks.map((mark, idx) => ({
  ...mark,
  label: visibleLabelIndices.includes(idx) ? mark.label : undefined,
}));

// Filter categories
const filterCategories: { key: FilterCategory; label: string }[] = [
  { key: 'production', label: 'Production' },
  { key: 'power', label: 'Power' },
  { key: 'resource', label: 'Resource' },
  { key: 'train', label: 'Trains' },
  { key: 'drone', label: 'Drones' },
];

// Map layer types
export type MapLayer = 'machineGroups' | 'buildings' | 'infrastructure' | 'vehicles' | 'power' | 'resources';

// Resource sub-layers
export type ResourceSubLayer = 'nodes';

// Resource node filter state
export type ResourceNodeFilter = {
  enabledCells: Set<string>; // Keys: "${resourceType}:${purity}"
  exploitedFilter: 'all' | 'exploited' | 'notExploited';
  radarVisibilityFilter: 'all' | 'visible' | 'notVisible';
};

// All resource types for the filter UI
const allResourceTypes: { key: ResourceType; label: string; color: string }[] = [
  { key: ResourceTypeIronOre, label: 'Iron', color: '#8B4513' },
  { key: ResourceTypeCopperOre, label: 'Copper', color: '#B87333' },
  { key: ResourceTypeLimestone, label: 'Limestone', color: '#D4C4A8' },
  { key: ResourceTypeCoal, label: 'Coal', color: '#2C2C2C' },
  { key: ResourceTypeSulfur, label: 'Sulfur', color: '#FFFF00' },
  { key: ResourceTypeCateriumOre, label: 'Caterium', color: '#FFD700' },
  { key: ResourceTypeRawQuartz, label: 'Quartz', color: '#FFB6C1' },
  { key: ResourceTypeBauxite, label: 'Bauxite', color: '#CD853F' },
  { key: ResourceTypeUranium, label: 'Uranium', color: '#00FF00' },
  { key: ResourceTypeSAM, label: 'SAM', color: '#9400D3' },
  { key: ResourceTypeCrudeOil, label: 'Oil', color: '#1C1C1C' },
  { key: ResourceTypeNitrogenGas, label: 'Nitrogen', color: '#87CEEB' },
  { key: ResourceTypeGeyser, label: 'Geyser', color: '#FF6347' },
];

// All purity levels
const allPurities: { key: ResourceNodePurity; label: string; color: string }[] = [
  { key: ResourceNodePurityImpure, label: 'Impure', color: '#EF4444' },
  { key: ResourceNodePurityNormal, label: 'Normal', color: '#F59E0B' },
  { key: ResourceNodePurityPure, label: 'Pure', color: '#22C55E' },
];

// Building sub-layers
export type BuildingSubLayer =
  | 'factory'
  | 'generator'
  | 'extractor'
  | 'trainStation'
  | 'droneStation'
  | 'truckStation'
  | 'storage'
  | 'spaceElevator'
  | 'radarTowers';

// Infrastructure sub-layers
export type InfrastructureSubLayer = 'belts' | 'pipes' | 'railway';

// Vehicle sub-layers
export type VehicleSubLayer =
  | 'trains'
  | 'drones'
  | 'trucks'
  | 'tractors'
  | 'explorers'
  | 'players'
  | 'paths';

const layerOptions: { key: MapLayer; label: string; expandable?: boolean }[] = [
  { key: 'machineGroups', label: 'Machine groups', expandable: true },
  { key: 'buildings', label: 'Buildings', expandable: true },
  { key: 'infrastructure', label: 'Infrastructure', expandable: true },
  { key: 'vehicles', label: 'Vehicles', expandable: true },
  { key: 'power', label: 'Power' },
  { key: 'resources', label: 'Resources', expandable: true },
];

const resourceSubLayerOptions: { key: ResourceSubLayer; label: string; color: string }[] = [
  { key: 'nodes', label: 'Resource Nodes', color: '#10B981' },
];

const buildingSubLayerOptions: { key: BuildingSubLayer; label: string; color: string }[] = [
  { key: 'factory', label: 'Factory', color: '#4056A1' },
  { key: 'extractor', label: 'Extractor', color: '#C97B2A' },
  { key: 'generator', label: 'Generator', color: '#2E8B8B' },
  { key: 'trainStation', label: 'Train stations', color: '#5A5A5A' },
  { key: 'droneStation', label: 'Drone stations', color: '#4A5A6A' },
  { key: 'truckStation', label: 'Truck stations', color: '#8B5A2B' },
  { key: 'storage', label: 'Storage', color: '#8B4513' },
  { key: 'spaceElevator', label: 'Space Elevator', color: '#9333EA' },
  { key: 'radarTowers', label: 'Radar Towers', color: '#3B82F6' },
];

const infrastructureSubLayerOptions: {
  key: InfrastructureSubLayer;
  label: string;
  color: string;
}[] = [
  { key: 'belts', label: 'Belts', color: '#FFA500' },
  { key: 'pipes', label: 'Pipes', color: '#4169E1' },
  { key: 'railway', label: 'Railway', color: '#404040' },
];

const vehicleSubLayerOptions: { key: VehicleSubLayer; label: string; color: string }[] = [
  { key: 'trains', label: 'Trains', color: '#22c55e' },
  { key: 'drones', label: 'Drones', color: '#8B5CF6' },
  { key: 'trucks', label: 'Trucks', color: '#F59E0B' },
  { key: 'tractors', label: 'Tractors', color: '#22C55E' },
  { key: 'explorers', label: 'Explorers', color: '#06B6D4' },
  { key: 'players', label: 'Players', color: '#FF6B6B' },
  { key: 'paths', label: 'Vehicle Paths', color: '#9CA3AF' },
];

export function MapView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const api = useContextSelector(ApiContext, (v) => {
    return {
      factoryStats: v.factoryStats,
      generatorStats: v.generatorStats,
      machines: v.machines,
      trainStations: v.trainStations,
      droneStations: v.droneStations,
      truckStations: v.truckStations,
      trains: v.trains,
      drones: v.drones,
      trucks: v.trucks,
      tractors: v.tractors,
      explorers: v.explorers,
      vehiclePaths: v.vehiclePaths,
      players: v.players,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
      belts: v.belts,
      pipes: v.pipes,
      pipeJunctions: v.pipeJunctions,
      trainRails: v.trainRails,
      splitterMergers: v.splitterMergers,
      cables: v.cables,
      storages: v.storages,
      spaceElevator: v.spaceElevator,
      radarTowers: v.radarTowers,
      resourceNodes: v.resourceNodes,
    };
  });
  const [machineGroups, setMachineGroups] = useState<MachineGroup[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedMapItem | null>(null);
  const [zoom, setZoom] = useState(3);
  const [autoGroup, setAutoGroup] = useState(false);
  const [manualGroupIndex, setManualGroupIndex] = useState(15); // Index 15 = 16000
  const [visibleCategories, setVisibleCategories] = useState<Set<FilterCategory>>(
    new Set(['production', 'power', 'resource', 'train', 'drone'])
  );
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);
  const [layersAnchor, setLayersAnchor] = useState<HTMLElement | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [enabledLayers, setEnabledLayers] = useState<Set<MapLayer>>(new Set());
  const [buildingSubLayers, setBuildingSubLayers] = useState<Set<BuildingSubLayer>>(new Set());
  const [infrastructureSubLayers, setInfrastructureSubLayers] = useState<
    Set<InfrastructureSubLayer>
  >(new Set());
  const [vehicleSubLayers, setVehicleSubLayers] = useState<Set<VehicleSubLayer>>(new Set());
  const [resourceSubLayers, setResourceSubLayers] = useState<Set<ResourceSubLayer>>(new Set());
  const [resourceNodeFilter, setResourceNodeFilter] = useState<ResourceNodeFilter>({
    enabledCells: new Set(
      allResourceTypes.flatMap((rt) => allPurities.map((p) => `${rt.key}:${p.key}`))
    ),
    exploitedFilter: 'all',
    radarVisibilityFilter: 'all',
  });
  const [showVehicleNames, setShowVehicleNames] = useState(true);
  const [buildingColorMode, setBuildingColorMode] = useState<BuildingColorMode>('type');
  const [buildingOpacity, setBuildingOpacity] = useState(0.5);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<MapLayer>>(new Set());

  const [isDragging, setIsDragging] = useState(false);
  const frozenDataRef = useRef<typeof api>(api);

  if (!isDragging) {
    frozenDataRef.current = api;
  }

  const displayData = isDragging ? frozenDataRef.current : api;

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const groupDistance = autoGroup ? zoomToGroupDistance(zoom) : groupingValues[manualGroupIndex];

  const toggleCategory = (category: FilterCategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle layer visibility
  const toggleLayer = (layer: MapLayer) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
        // Disable multi-select mode when machine groups layer is turned off
        if (layer === 'machineGroups') {
          setMultiSelectMode(false);
          // Clear selection if it's a machine group selection
          setSelectedItem((prevSelected) => {
            if (
              prevSelected?.type === 'machineGroup' ||
              prevSelected?.type === 'machineGroups' ||
              prevSelected?.type === 'multiSelection'
            ) {
              return null;
            }
            return prevSelected;
          });
        }
        // When buildings layer is turned off, turn off all sub-layers
        if (layer === 'buildings') {
          setBuildingSubLayers(new Set());
          // Clear selection if it's a building-related selection
          setSelectedItem((prevSelected) => {
            if (
              prevSelected?.type === 'trainStation' ||
              prevSelected?.type === 'droneStation'
            ) {
              return null;
            }
            return prevSelected;
          });
        }
        // When infrastructure layer is turned off, turn off all sub-layers
        if (layer === 'infrastructure') {
          setInfrastructureSubLayers(new Set());
        }
        // When vehicles layer is turned off, turn off all sub-layers
        if (layer === 'vehicles') {
          setVehicleSubLayers(new Set());
        }
        // When resources layer is turned off, turn off all sub-layers
        if (layer === 'resources') {
          setResourceSubLayers(new Set());
        }
      } else {
        next.add(layer);
        // When buildings layer is turned on, turn on all sub-layers
        if (layer === 'buildings') {
          setBuildingSubLayers(
            new Set([
              'factory',
              'generator',
              'extractor',
              'trainStation',
              'droneStation',
              'truckStation',
              'storage',
              'spaceElevator',
              'radarTowers',
            ])
          );
        }
        // When infrastructure layer is turned on, turn on all sub-layers
        if (layer === 'infrastructure') {
          setInfrastructureSubLayers(new Set(['belts', 'pipes', 'railway']));
        }
        // When vehicles layer is turned on, turn on all sub-layers
        if (layer === 'vehicles') {
          setVehicleSubLayers(
            new Set(['trains', 'drones', 'trucks', 'tractors', 'explorers', 'players', 'paths'])
          );
        }
        // When resources layer is turned on, turn on all sub-layers
        if (layer === 'resources') {
          setResourceSubLayers(new Set(['nodes']));
        }
      }
      return next;
    });
  };

  // Toggle resource sub-layer
  const toggleResourceSubLayer = (subLayer: ResourceSubLayer) => {
    setResourceSubLayers((prev) => {
      const next = new Set(prev);
      if (next.has(subLayer)) {
        next.delete(subLayer);
      } else {
        next.add(subLayer);
      }
      // Update parent resources layer based on sub-layers
      if (next.size === 0) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.delete('resources');
          return nextLayers;
        });
      } else if (!enabledLayers.has('resources')) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.add('resources');
          return nextLayers;
        });
      }
      return next;
    });
  };

  // Cell-based filter helpers for resource nodes
  const getCellKey = (resourceType: ResourceType, purity: ResourceNodePurity) =>
    `${resourceType}:${purity}`;

  const isCellEnabled = (resourceType: ResourceType, purity: ResourceNodePurity) =>
    resourceNodeFilter.enabledCells.has(getCellKey(resourceType, purity));

  const toggleCell = (resourceType: ResourceType, purity: ResourceNodePurity) => {
    const key = getCellKey(resourceType, purity);
    setResourceNodeFilter((prev) => {
      const next = new Set(prev.enabledCells);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...prev, enabledCells: next };
    });
  };

  // Map ResourceType to image filename
  const getResourceImageName = (resourceType: ResourceType): string => {
    const mapping: Record<ResourceType, string> = {
      [ResourceTypeIronOre]: 'Iron Ore',
      [ResourceTypeCopperOre]: 'Copper Ore',
      [ResourceTypeLimestone]: 'Limestone',
      [ResourceTypeCoal]: 'Coal',
      [ResourceTypeSulfur]: 'Sulfur',
      [ResourceTypeCateriumOre]: 'Caterium Ore',
      [ResourceTypeRawQuartz]: 'Raw Quartz',
      [ResourceTypeBauxite]: 'Bauxite',
      [ResourceTypeUranium]: 'Uranium',
      [ResourceTypeSAM]: 'SAM',
      [ResourceTypeCrudeOil]: 'Crude Oil',
      [ResourceTypeNitrogenGas]: 'Nitrogen Gas',
      [ResourceTypeGeyser]: 'Geyser',
    };
    return mapping[resourceType] ?? resourceType;
  };

  // Toggle building sub-layer
  const toggleBuildingSubLayer = (subLayer: BuildingSubLayer) => {
    setBuildingSubLayers((prev) => {
      const next = new Set(prev);
      if (next.has(subLayer)) {
        next.delete(subLayer);
        // Clear selection if it's related to the disabled sub-layer
        if (subLayer === 'trainStation') {
          setSelectedItem((prevSelected) => {
            if (prevSelected?.type === 'trainStation') {
              return null;
            }
            return prevSelected;
          });
        }
        if (subLayer === 'droneStation') {
          setSelectedItem((prevSelected) => {
            if (prevSelected?.type === 'droneStation') {
              return null;
            }
            return prevSelected;
          });
        }
      } else {
        next.add(subLayer);
      }
      // Update parent buildings layer based on sub-layers
      if (next.size === 0) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.delete('buildings');
          return nextLayers;
        });
      } else if (!enabledLayers.has('buildings')) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.add('buildings');
          return nextLayers;
        });
      }
      return next;
    });
  };

  // Toggle infrastructure sub-layer
  const toggleInfrastructureSubLayer = (subLayer: InfrastructureSubLayer) => {
    setInfrastructureSubLayers((prev) => {
      const next = new Set(prev);
      if (next.has(subLayer)) {
        next.delete(subLayer);
      } else {
        next.add(subLayer);
      }
      // Update parent infrastructure layer based on sub-layers
      if (next.size === 0) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.delete('infrastructure');
          return nextLayers;
        });
      } else if (!enabledLayers.has('infrastructure')) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.add('infrastructure');
          return nextLayers;
        });
      }
      return next;
    });
  };

  // Toggle vehicle sub-layer
  const toggleVehicleSubLayer = (subLayer: VehicleSubLayer) => {
    setVehicleSubLayers((prev) => {
      const next = new Set(prev);
      if (next.has(subLayer)) {
        next.delete(subLayer);
      } else {
        next.add(subLayer);
      }
      // Update parent vehicles layer based on sub-layers
      if (next.size === 0) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.delete('vehicles');
          return nextLayers;
        });
      } else if (!enabledLayers.has('vehicles')) {
        setEnabledLayers((prevLayers) => {
          const nextLayers = new Set(prevLayers);
          nextLayers.add('vehicles');
          return nextLayers;
        });
      }
      return next;
    });
  };

  // Toggle layer expansion
  const toggleLayerExpansion = (layer: MapLayer) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  // Convert BuildingSubLayer set to MachineCategory set (only machine-related sub-layers)
  const visibleBuildingCategories = new Set<MachineCategory>(
    Array.from(buildingSubLayers)
      .map((sub): MachineCategory | null => {
        switch (sub) {
          case 'factory':
            return 'factory' as MachineCategory;
          case 'extractor':
            return 'extractor' as MachineCategory;
          case 'generator':
            return 'generator' as MachineCategory;
          default:
            return null; // trainStation and droneStation don't map to MachineCategory
        }
      })
      .filter((cat): cat is MachineCategory => cat !== null)
  );

  useEffect(() => {
    if (!enabledLayers.has('machineGroups')) {
      setMachineGroups([]);
      return;
    }

    if (isDragging) {
      return;
    }

    if (!displayData.isLoading && displayData.isOnline) {
      const allMachines = displayData.machines || [];
      const filteredMachines = allMachines.filter((m) => {
        if (m.category === MachineCategoryFactory && visibleCategories.has('production'))
          return true;
        if (m.category === MachineCategoryGenerator && visibleCategories.has('power')) return true;
        if (m.category === MachineCategoryExtractor && visibleCategories.has('resource'))
          return true;
        return false;
      });

      const filteredTrainStations = visibleCategories.has('train')
        ? displayData.trainStations || []
        : [];
      const filteredDroneStations = visibleCategories.has('drone')
        ? displayData.droneStations || []
        : [];
      const groups = computeUnifiedGroups(
        filteredMachines,
        filteredTrainStations,
        filteredDroneStations,
        groupDistance
      );
      setMachineGroups(groups);

      // Update selection if it's a machine group (use functional update to avoid stale closure)
      setSelectedItem((prevSelected) => {
        if (prevSelected?.type === 'machineGroup') {
          const newActiveGroup = groups.find((g) => g.hash === prevSelected.data.hash);
          if (newActiveGroup) {
            return { type: 'machineGroup', data: newActiveGroup };
          }
          // Group no longer exists, keep the selection but with stale data
          // (better UX than clearing it unexpectedly)
          return prevSelected;
        }
        return prevSelected;
      });
    }
  }, [
    displayData.factoryStats,
    displayData.generatorStats,
    displayData.trainStations,
    displayData.droneStations,
    displayData.isLoading,
    displayData.isOnline,
    groupDistance,
    visibleCategories,
    enabledLayers,
    isDragging,
  ]);

  const handleSelectItem = (item: SelectedMapItem | null) => {
    console.log('handleSelectItem called with:', item?.type, item);
    setSelectedItem(item);
    // Auto-disable multi-select mode after a selection is made
    if (item && multiSelectMode) {
      setMultiSelectMode(false);
    }
  };

  return (
    <DashboardContent
      maxWidth={false}
      disablePadding
      sx={{
        position: 'relative',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Backdrop
        open={api.isLoading}
        sx={{
          position: 'absolute',
          color: theme.palette.primary.main,
          backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.5),
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {!api.isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: isMobile ? 16 : 'calc(var(--layout-nav-vertical-width) + 16px)',
            right: 16,
            bottom: 16,
            zIndex: 1,
          }}
        >
          {/* Map Controls Buttons */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: isMobile || !selectedItem ? 16 : 324, // Show offset only when sidebar is visible (non-mobile + selected)
              zIndex: 1000,
              display: 'flex',
              gap: 1,
              transition: 'right 0.3s ease',
            }}
          >
            {/* Multi-select toggle button (works alongside Ctrl+drag) */}
            <Tooltip
              title={
                !enabledLayers.has('machineGroups')
                  ? 'Enable Machine Groups layer to use multi-select'
                  : multiSelectMode
                    ? 'Disable multi-select mode'
                    : 'Enable multi-select mode'
              }
              placement="bottom"
            >
              <span>
                <IconButton
                  onClick={() => setMultiSelectMode(!multiSelectMode)}
                  disabled={!enabledLayers.has('machineGroups')}
                  size="small"
                  sx={{
                    backgroundColor: multiSelectMode
                      ? theme.palette.primary.main
                      : varAlpha(theme.palette.background.paperChannel, 0.9),
                    backdropFilter: 'blur(8px)',
                    color: multiSelectMode ? theme.palette.primary.contrastText : 'inherit',
                    '&:hover': {
                      backgroundColor: multiSelectMode
                        ? theme.palette.primary.dark
                        : varAlpha(theme.palette.background.paperChannel, 1),
                    },
                    '&.Mui-disabled': {
                      backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.5),
                      color: varAlpha(theme.palette.text.primaryChannel, 0.3),
                    },
                  }}
                >
                  <Iconify icon="mdi:selection-drag" />
                </IconButton>
              </span>
            </Tooltip>

            {/* Layers Button */}
            <IconButton
              onClick={(e) => setLayersAnchor(e.currentTarget)}
              size="small"
              sx={{
                backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.9),
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 1),
                },
              }}
            >
              <Iconify icon="mdi:layers" />
            </IconButton>

            {/* Help Button (desktop only) */}
            {!isMobile && (
              <IconButton
                onClick={(e) => setHelpAnchor(e.currentTarget)}
                size="small"
                sx={{
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.9),
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    backgroundColor: varAlpha(theme.palette.background.paperChannel, 1),
                  },
                }}
              >
                <Iconify icon="mdi:help-circle-outline" />
              </IconButton>
            )}

            {/* Settings Button */}
            <Tooltip title="Map Settings">
              <IconButton
                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                size="small"
                sx={{
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.9),
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    backgroundColor: varAlpha(theme.palette.background.paperChannel, 1),
                  },
                }}
              >
                <Iconify icon="mdi:cog" width={20} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Help Popover */}
          <Popover
            open={Boolean(helpAnchor)}
            anchorEl={helpAnchor}
            onClose={() => setHelpAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.95),
                  backdropFilter: 'blur(8px)',
                  mt: 1,
                },
              },
            }}
          >
            <Box sx={{ p: 2, minWidth: 220 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Controls
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Ctrl"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Typography variant="body2">+ Drag</Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Multi-select items on the map
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Click"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Select a single item
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Scroll"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Zoom in/out
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Popover>

          {/* Layers Popover */}
          <Popover
            open={Boolean(layersAnchor)}
            anchorEl={layersAnchor}
            onClose={() => setLayersAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.95),
                  backdropFilter: 'blur(8px)',
                  mt: 1,
                },
              },
            }}
          >
            <Box sx={{ p: 2, minWidth: 220 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Layers
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {layerOptions.map((layer) => (
                  <Box key={layer.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={enabledLayers.has(layer.key)}
                            onChange={() => toggleLayer(layer.key)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">{layer.label}</Typography>}
                        sx={{ ml: 0, flex: 1 }}
                      />
                      {layer.expandable && (
                        <IconButton
                          size="small"
                          onClick={() => toggleLayerExpansion(layer.key)}
                          sx={{ p: 0.5 }}
                        >
                          <Iconify
                            icon={
                              expandedLayers.has(layer.key) ? 'mdi:chevron-up' : 'mdi:chevron-down'
                            }
                            width={18}
                          />
                        </IconButton>
                      )}
                    </Box>
                    {/* Machine Groups settings */}
                    {layer.key === 'machineGroups' && (
                      <Collapse in={expandedLayers.has('machineGroups')}>
                        <Box sx={{ pl: 2, pt: 1 }}>
                          {/* Filters Section */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, display: 'block' }}
                          >
                            Filters
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                            {filterCategories.map((cat) => (
                              <Chip
                                key={cat.key}
                                label={cat.label}
                                onClick={() => toggleCategory(cat.key)}
                                color={visibleCategories.has(cat.key) ? 'primary' : 'default'}
                                variant={visibleCategories.has(cat.key) ? 'filled' : 'outlined'}
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 24 }}
                              />
                            ))}
                          </Box>

                          {/* Grouping Section */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, display: 'block' }}
                          >
                            Grouping
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={autoGroup}
                                onChange={(e) => setAutoGroup(e.target.checked)}
                                size="small"
                              />
                            }
                            label={<Typography variant="caption">Auto-group by zoom</Typography>}
                            sx={{ ml: 0, my: -0.5 }}
                          />
                          <Box sx={{ px: 0.5, mt: 0.5 }}>
                            <Slider
                              disabled={autoGroup}
                              value={manualGroupIndex}
                              onChange={(_, value) => setManualGroupIndex(value as number)}
                              step={1}
                              marks={groupingMarksWithLabels}
                              min={0}
                              max={groupingValues.length - 1}
                              size="small"
                              valueLabelDisplay="auto"
                              valueLabelFormat={(idx) => {
                                const val = groupingValues[idx];
                                return val === 0
                                  ? 'None'
                                  : val >= 1000
                                    ? `${val / 1000}K`
                                    : `${val}`;
                              }}
                              sx={{
                                '& .MuiSlider-markLabel': {
                                  fontSize: '0.55rem',
                                },
                              }}
                            />
                          </Box>
                        </Box>
                      </Collapse>
                    )}
                    {/* Building sub-layers */}
                    {layer.key === 'buildings' && (
                      <Collapse in={expandedLayers.has('buildings')}>
                        <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {buildingSubLayerOptions.map((subLayer) => (
                            <Box key={subLayer.key}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={buildingSubLayers.has(subLayer.key)}
                                    onChange={() => toggleBuildingSubLayer(subLayer.key)}
                                    size="small"
                                    sx={{
                                      color: subLayer.color,
                                      '&.Mui-checked': {
                                        color: subLayer.color,
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {subLayer.label}
                                  </Typography>
                                }
                                sx={{ ml: 0, my: -0.5 }}
                              />
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                    {/* Infrastructure sub-layers */}
                    {layer.key === 'infrastructure' && (
                      <Collapse in={expandedLayers.has('infrastructure')}>
                        <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {infrastructureSubLayerOptions.map((subLayer) => (
                            <FormControlLabel
                              key={subLayer.key}
                              control={
                                <Checkbox
                                  checked={infrastructureSubLayers.has(subLayer.key)}
                                  onChange={() => toggleInfrastructureSubLayer(subLayer.key)}
                                  size="small"
                                  sx={{
                                    color: subLayer.color,
                                    '&.Mui-checked': {
                                      color: subLayer.color,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {subLayer.label}
                                </Typography>
                              }
                              sx={{ ml: 0, my: -0.5 }}
                            />
                          ))}
                        </Box>
                      </Collapse>
                    )}
                    {/* Vehicles sub-layers */}
                    {layer.key === 'vehicles' && (
                      <Collapse in={expandedLayers.has('vehicles')}>
                        <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {vehicleSubLayerOptions.map((subLayer) => (
                            <FormControlLabel
                              key={subLayer.key}
                              control={
                                <Checkbox
                                  checked={vehicleSubLayers.has(subLayer.key)}
                                  onChange={() => toggleVehicleSubLayer(subLayer.key)}
                                  size="small"
                                  sx={{
                                    color: subLayer.color,
                                    '&.Mui-checked': {
                                      color: subLayer.color,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {subLayer.label}
                                </Typography>
                              }
                              sx={{ ml: 0, my: -0.5 }}
                            />
                          ))}
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={showVehicleNames}
                                onChange={() => setShowVehicleNames((prev) => !prev)}
                                size="small"
                                sx={{
                                  color: 'text.secondary',
                                  '&.Mui-checked': {
                                    color: 'text.primary',
                                  },
                                }}
                              />
                            }
                            label={
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Show names
                              </Typography>
                            }
                            sx={{
                              ml: 0,
                              my: -0.5,
                              mt: 0.5,
                              pt: 0.5,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        </Box>
                      </Collapse>
                    )}
                    {/* Resources sub-layers */}
                    {layer.key === 'resources' && (
                      <Collapse in={expandedLayers.has('resources')}>
                        <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {resourceSubLayerOptions.map((subLayer) => (
                            <FormControlLabel
                              key={subLayer.key}
                              control={
                                <Checkbox
                                  checked={resourceSubLayers.has(subLayer.key)}
                                  onChange={() => toggleResourceSubLayer(subLayer.key)}
                                  size="small"
                                  sx={{
                                    color: subLayer.color,
                                    '&.Mui-checked': {
                                      color: subLayer.color,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {subLayer.label}
                                </Typography>
                              }
                              sx={{ ml: 0, my: -0.5 }}
                            />
                          ))}
                          {/* Resource matrix filter */}
                          {resourceSubLayers.has('nodes') && (
                            <Box sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                                {allResourceTypes.map((rt) => (
                                  <Box
                                    key={rt.key}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 1,
                                    }}
                                  >
                                    {/* Resource name - left aligned, muted color */}
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.65rem',
                                        minWidth: 60,
                                      }}
                                    >
                                      {rt.label}
                                    </Typography>

                                    {/* Purity icons - right aligned */}
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      {allPurities.map((p) => (
                                        <IconButton
                                          key={p.key}
                                          size="small"
                                          onClick={() => toggleCell(rt.key, p.key)}
                                          sx={{
                                            width: 24,
                                            height: 24,
                                            p: 0,
                                            border: `2px solid ${p.color}`,
                                            borderRadius: '50%',
                                            opacity: isCellEnabled(rt.key, p.key) ? 1 : 0.3,
                                            backgroundColor: 'rgba(0,0,0,0.5)',
                                            '&:hover': {
                                              backgroundColor: 'rgba(0,0,0,0.7)',
                                            },
                                          }}
                                        >
                                          <Box
                                            component="img"
                                            src={`assets/images/satisfactory/64x64/${getResourceImageName(rt.key)}.png`}
                                            sx={{ width: 16, height: 16, objectFit: 'contain' }}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        </IconButton>
                                      ))}
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mb: 0.5, display: 'block' }}
                              >
                                Filters
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                <Chip
                                  label="Exploited"
                                  onClick={() =>
                                    setResourceNodeFilter((prev) => ({
                                      ...prev,
                                      exploitedFilter:
                                        prev.exploitedFilter === 'exploited' ? 'all' : 'exploited',
                                    }))
                                  }
                                  size="small"
                                  variant={
                                    resourceNodeFilter.exploitedFilter === 'exploited'
                                      ? 'filled'
                                      : 'outlined'
                                  }
                                  color={
                                    resourceNodeFilter.exploitedFilter === 'exploited'
                                      ? 'success'
                                      : 'default'
                                  }
                                  sx={{ fontSize: '0.65rem', height: 22 }}
                                />
                                <Chip
                                  label="Not Exploited"
                                  onClick={() =>
                                    setResourceNodeFilter((prev) => ({
                                      ...prev,
                                      exploitedFilter:
                                        prev.exploitedFilter === 'notExploited' ? 'all' : 'notExploited',
                                    }))
                                  }
                                  size="small"
                                  variant={
                                    resourceNodeFilter.exploitedFilter === 'notExploited'
                                      ? 'filled'
                                      : 'outlined'
                                  }
                                  color={
                                    resourceNodeFilter.exploitedFilter === 'notExploited'
                                      ? 'warning'
                                      : 'default'
                                  }
                                  sx={{ fontSize: '0.65rem', height: 22 }}
                                />
                                <Chip
                                  label="Radar Visible"
                                  onClick={() =>
                                    setResourceNodeFilter((prev) => ({
                                      ...prev,
                                      radarVisibilityFilter:
                                        prev.radarVisibilityFilter === 'visible' ? 'all' : 'visible',
                                    }))
                                  }
                                  size="small"
                                  variant={
                                    resourceNodeFilter.radarVisibilityFilter === 'visible'
                                      ? 'filled'
                                      : 'outlined'
                                  }
                                  color={
                                    resourceNodeFilter.radarVisibilityFilter === 'visible'
                                      ? 'info'
                                      : 'default'
                                  }
                                  sx={{ fontSize: '0.65rem', height: 22 }}
                                />
                                <Chip
                                  label="Not Radar Visible"
                                  onClick={() =>
                                    setResourceNodeFilter((prev) => ({
                                      ...prev,
                                      radarVisibilityFilter:
                                        prev.radarVisibilityFilter === 'notVisible' ? 'all' : 'notVisible',
                                    }))
                                  }
                                  size="small"
                                  variant={
                                    resourceNodeFilter.radarVisibilityFilter === 'notVisible'
                                      ? 'filled'
                                      : 'outlined'
                                  }
                                  color={
                                    resourceNodeFilter.radarVisibilityFilter === 'notVisible'
                                      ? 'secondary'
                                      : 'default'
                                  }
                                  sx={{ fontSize: '0.65rem', height: 22 }}
                                />
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Popover>

          {/* Settings Popover */}
          <Popover
            open={Boolean(settingsAnchor)}
            anchorEl={settingsAnchor}
            onClose={() => setSettingsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.95),
                  backdropFilter: 'blur(8px)',
                  mt: 1,
                },
              },
            }}
          >
            <Box sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Map Settings
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Building Opacity
              </Typography>
              <Slider
                value={buildingOpacity}
                onChange={(_, value) => setBuildingOpacity(value as number)}
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                size="small"
              />
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                Building Color Mode
              </Typography>
              <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                <Select
                  value={buildingColorMode}
                  onChange={(e) => setBuildingColorMode(e.target.value as BuildingColorMode)}
                >
                  <MenuItem value="type">By Type</MenuItem>
                  <MenuItem value="status">By Status</MenuItem>
                  <MenuItem value="grid">By Power Grid</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Popover>

          {/* MapContainer */}
          <MapContainer
            center={[-80, 80]}
            maxBounds={MapBounds}
            crs={CRS.Simple}
            preferCanvas={true}
            attributionControl={false}
            zoom={3}
            minZoom={3}
            maxZoom={8}
            zoomDelta={0.25}
            zoomSnap={0.25}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              backgroundColor: '#0e0e0e',
              border: '1px solid #1e1e1e',
              boxShadow: '0 0 15px rgba(0, 0, 0, 0.8)',
              zIndex: 0,
            }}
          >
            <TileLayer
              url="assets/images/satisfactory/map/1732184952/{z}/{x}/{y}.png"
              tileSize={256}
              minZoom={3}
              maxZoom={8}
              noWrap={true}
            />
            <Overlay
              machineGroups={machineGroups}
              onSelectItem={handleSelectItem}
              onZoomEnd={setZoom}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              multiSelectMode={multiSelectMode}
              isMobile={isMobile}
              enabledLayers={enabledLayers}
              belts={displayData.belts}
              pipes={displayData.pipes}
              pipeJunctions={displayData.pipeJunctions}
              trainRails={displayData.trainRails}
              splitterMergers={displayData.splitterMergers}
              cables={displayData.cables}
              machines={displayData.machines || []}
              storages={displayData.storages}
              visibleBuildingCategories={visibleBuildingCategories}
              trains={displayData.trains}
              drones={displayData.drones}
              trucks={displayData.trucks}
              tractors={displayData.tractors}
              explorers={displayData.explorers}
              vehiclePaths={displayData.vehiclePaths}
              players={displayData.players}
              infrastructureSubLayers={infrastructureSubLayers}
              vehicleSubLayers={vehicleSubLayers}
              trainStations={displayData.trainStations}
              droneStations={displayData.droneStations}
              truckStations={displayData.truckStations}
              buildingSubLayers={buildingSubLayers}
              showVehicleNames={showVehicleNames}
              buildingColorMode={buildingColorMode}
              buildingOpacity={buildingOpacity}
              spaceElevator={displayData.spaceElevator}
              radarTowers={displayData.radarTowers}
              resourceNodes={displayData.resourceNodes}
              resourceSubLayers={resourceSubLayers}
              resourceNodeFilter={resourceNodeFilter}
            />
          </MapContainer>

          {/* Only render sidebar on mobile or when something is selected */}
          {(isMobile || selectedItem) && (
            <SelectionSidebar
              selectedItem={selectedItem}
              isMobile={isMobile}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </Box>
      )}
    </DashboardContent>
  );
}
