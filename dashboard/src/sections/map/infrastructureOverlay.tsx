import { LatLngExpression } from 'leaflet';
import React from 'react';
import { CircleMarker, Polygon, Polyline, Rectangle } from 'react-leaflet';
import {
  Belt,
  Cable,
  DroneStation,
  Hypertube,
  HypertubeEntrance,
  Location,
  Machine,
  MachineCategory,
  Pipe,
  PipeJunction,
  SpaceElevator,
  SplitterMerger,
  Storage,
  TrainRail,
  TrainStation,
  TruckStation,
} from 'src/apiTypes';
import { BuildingColorMode, getGridColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from './bounds';
import { HoveredItem } from './hoverTooltip';
import { BuildingsCanvasLayer, MachineHoverEvent } from './layers/buildingsCanvasLayer';
import { rotatePoint, toRotationRad } from './utils';
import { MapLayer } from './view/map-view';

// Hover event with position
export type HoverEvent = {
  item: HoveredItem | null;
  position: { x: number; y: number } | null;
};

// Get rotated bounding box corners as map coordinates
function getRotatedBoundingBoxCorners(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  rotationDegrees: number
): LatLngExpression[] {
  // Rotation pivot is center of bounding box
  const pivotX = (minX + maxX) / 2;
  const pivotY = (minY + maxY) / 2;

  const rotationRad = toRotationRad(rotationDegrees);

  // Define corners (counter-clockwise from min)
  const corners = [
    { x: minX, y: minY }, // p1 - min
    { x: maxX, y: minY }, // p2
    { x: maxX, y: maxY }, // p3 - max
    { x: minX, y: maxY }, // p4
  ];

  // Rotate corners around center
  const rotatedCorners = corners.map((corner) =>
    rotatePoint(corner.x, corner.y, pivotX, pivotY, rotationRad)
  );

  // Convert to map coordinates
  return rotatedCorners.map((corner) => ConvertToMapCoords2(corner.x, corner.y));
}

// Colors for infrastructure layers
const BELT_COLOR = '#FFA500'; // Orange
const PIPE_COLOR = '#4169E1'; // Royal Blue
const PIPE_JUNCTION_COLOR = '#6495ED'; // Cornflower Blue (lighter)
const TRAIN_RAIL_COLOR = '#404040'; // Dark Gray
const CABLE_COLOR = '#FFD700'; // Gold for power cables
const SPLITTER_MERGER_COLOR = '#FF6B35'; // Bright orange-red for visibility
const TRAIN_STATION_COLOR = '#5A5A5A'; // Dark warm grey
const TRAIN_STATION_PLATFORM_COLOR = '#7A6A5A'; // Lighter warm brown for platforms
const DRONE_STATION_COLOR = '#4A5A6A'; // Dark cool grey
const TRUCK_STATION_COLOR = '#8B5A2B'; // Saddle brown for truck stations
const STORAGE_COLOR = '#8B4513'; // Brown/tan for storage containers
const SPACE_ELEVATOR_COLOR = '#9333EA'; // Purple for space elevator
const HYPERTUBE_COLOR = '#00CED1'; // Dark cyan/teal for hypertubes
const HYPERTUBE_ENTRANCE_COLOR = '#20B2AA'; // Light sea green for entrances

type InfrastructureOverlayProps = {
  enabledLayers: Set<MapLayer>;
  belts: Belt[];
  pipes: Pipe[];
  pipeJunctions: PipeJunction[];
  trainRails: TrainRail[];
  splitterMergers: SplitterMerger[];
  cables: Cable[];
  machines?: Machine[];
  storages?: Storage[];
  visibleBuildingCategories: Set<MachineCategory>;
  onItemHover?: (event: HoverEvent) => void;
  showBelts?: boolean;
  showPipes?: boolean;
  showRailway?: boolean;
  showStorages?: boolean;
  trainStations?: TrainStation[];
  droneStations?: DroneStation[];
  truckStations?: TruckStation[];
  showTrainStations?: boolean;
  showDroneStations?: boolean;
  showTruckStations?: boolean;
  buildingColorMode?: BuildingColorMode;
  buildingOpacity?: number;
  spaceElevator?: SpaceElevator | null;
  showSpaceElevator?: boolean;
  hypertubes?: Hypertube[];
  hypertubeEntrances?: HypertubeEntrance[];
  showHypertubes?: boolean;
};

// Convert spline data to map coordinates
// Note: Satisfactory uses X-Y for horizontal plane in FRM mod output
const convertSplineToMapCoords = (spline: Location[]): LatLngExpression[] => {
  return spline.map((p) => ConvertToMapCoords2(p.x, p.y));
};

// Belt layer component
function BeltLayer({
  belts,
  onItemHover,
}: {
  belts: Belt[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {belts.map((belt) => {
        const positions =
          belt.splineData.length > 0
            ? convertSplineToMapCoords(belt.splineData)
            : [
                ConvertToMapCoords2(belt.location0.x, belt.location0.y),
                ConvertToMapCoords2(belt.location1.x, belt.location1.y),
              ];

        return (
          <Polyline
            key={belt.id}
            positions={positions}
            pathOptions={{
              color: BELT_COLOR,
              weight: 2,
              opacity: 0.7,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'belt', data: belt },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Pipe layer component (includes pipe junctions)
function PipeLayer({
  pipes,
  pipeJunctions,
  onItemHover,
}: {
  pipes: Pipe[];
  pipeJunctions: PipeJunction[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {/* Pipe polylines */}
      {pipes.map((pipe) => {
        const positions =
          pipe.splineData.length > 0
            ? convertSplineToMapCoords(pipe.splineData)
            : [
                ConvertToMapCoords2(pipe.location0.x, pipe.location0.y),
                ConvertToMapCoords2(pipe.location1.x, pipe.location1.y),
              ];

        return (
          <Polyline
            key={pipe.id}
            positions={positions}
            pathOptions={{
              color: PIPE_COLOR,
              weight: 2,
              opacity: 0.7,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'pipe', data: pipe },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}

      {/* Pipe junction markers */}
      {pipeJunctions.map((junction) => {
        const position = ConvertToMapCoords2(junction.x, junction.y);

        return (
          <CircleMarker
            key={junction.id}
            center={position}
            radius={3}
            pathOptions={{
              color: PIPE_JUNCTION_COLOR,
              fillColor: PIPE_JUNCTION_COLOR,
              fillOpacity: 0.8,
              weight: 1,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'pipeJunction', data: junction },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Train rail layer component
function TrainRailLayer({
  trainRails,
  onItemHover,
}: {
  trainRails: TrainRail[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {trainRails.map((rail) => {
        const positions =
          rail.splineData.length > 0
            ? convertSplineToMapCoords(rail.splineData)
            : [
                ConvertToMapCoords2(rail.location0.x, rail.location0.y),
                ConvertToMapCoords2(rail.location1.x, rail.location1.y),
              ];

        return (
          <Polyline
            key={rail.id}
            positions={positions}
            pathOptions={{
              color: TRAIN_RAIL_COLOR,
              weight: 3,
              opacity: 0.8,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'trainRail', data: rail },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Splitter/Merger layer component (rendered with belts)
function SplitterMergerLayer({
  splitterMergers,
  onItemHover,
}: {
  splitterMergers: SplitterMerger[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {splitterMergers.map((sm) => {
        const corners = getRotatedBoundingBoxCorners(
          sm.boundingBox.min.x,
          sm.boundingBox.min.y,
          sm.boundingBox.max.x,
          sm.boundingBox.max.y,
          sm.rotation
        );
        return (
          <Polygon
            key={sm.id}
            positions={corners}
            pathOptions={{
              color: SPLITTER_MERGER_COLOR,
              fillColor: SPLITTER_MERGER_COLOR,
              fillOpacity: 0.3,
              weight: 1,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'splitterMerger', data: sm },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Train station layer component
function TrainStationLayer({
  trainStations,
  onItemHover,
  opacity = 0.5,
  buildingColorMode = 'type',
}: {
  trainStations: TrainStation[];
  onItemHover?: (event: HoverEvent) => void;
  opacity?: number;
  buildingColorMode?: BuildingColorMode;
}) {
  return (
    <>
      {trainStations.map((station, index) => {
        // Get rotated corners for main station bounding box
        const stationCorners = getRotatedBoundingBoxCorners(
          station.boundingBox.min.x,
          station.boundingBox.min.y,
          station.boundingBox.max.x,
          station.boundingBox.max.y,
          station.rotation
        );

        // Determine color based on mode
        const gridColors = getGridColor(station.circuitGroupId);
        const stationColor = buildingColorMode === 'grid' ? gridColors.fill : TRAIN_STATION_COLOR;
        const platformColor =
          buildingColorMode === 'grid' ? gridColors.stroke : TRAIN_STATION_PLATFORM_COLOR;

        return (
          <React.Fragment key={`train-station-${station.name}-${index}`}>
            {/* Main station bounding box (rotated) */}
            <Polygon
              positions={stationCorners}
              pathOptions={{
                color: stationColor,
                fillColor: stationColor,
                fillOpacity: opacity,
                weight: 2,
              }}
              eventHandlers={{
                mouseover: (e) =>
                  onItemHover?.({
                    item: { type: 'trainStation', data: station },
                    position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                  }),
                mouseout: () => onItemHover?.({ item: null, position: null }),
              }}
            />
            {/* Platform bounding boxes (rotated) */}
            {station.platforms?.map((platform, platformIndex) => {
              const platformCorners = getRotatedBoundingBoxCorners(
                platform.boundingBox.min.x,
                platform.boundingBox.min.y,
                platform.boundingBox.max.x,
                platform.boundingBox.max.y,
                platform.rotation
              );
              return (
                <Polygon
                  key={`platform-${platformIndex}`}
                  positions={platformCorners}
                  pathOptions={{
                    color: platformColor,
                    fillColor: platformColor,
                    fillOpacity: opacity * 0.8,
                    weight: 1,
                  }}
                  eventHandlers={{
                    mouseover: (e) =>
                      onItemHover?.({
                        item: { type: 'trainStation', data: station },
                        position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                      }),
                    mouseout: () => onItemHover?.({ item: null, position: null }),
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

// Drone station layer component
function DroneStationLayer({
  droneStations,
  onItemHover,
  opacity = 0.5,
  buildingColorMode = 'type',
}: {
  droneStations: DroneStation[];
  onItemHover?: (event: HoverEvent) => void;
  opacity?: number;
  buildingColorMode?: BuildingColorMode;
}) {
  return (
    <>
      {droneStations.map((station, index) => {
        const corner1 = ConvertToMapCoords2(
          station.boundingBox.min.x,
          station.boundingBox.min.y
        ) as [number, number];
        const corner2 = ConvertToMapCoords2(
          station.boundingBox.max.x,
          station.boundingBox.max.y
        ) as [number, number];

        // Determine color based on mode
        const gridColors = getGridColor(station.circuitGroupId);
        const stationColor = buildingColorMode === 'grid' ? gridColors.fill : DRONE_STATION_COLOR;

        return (
          <Rectangle
            key={`drone-station-${station.name}-${index}`}
            bounds={[corner1, corner2]}
            pathOptions={{
              color: stationColor,
              fillColor: stationColor,
              fillOpacity: opacity,
              weight: 2,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'droneStation', data: station },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Truck station layer component
function TruckStationLayer({
  truckStations,
  onItemHover,
  opacity = 0.5,
  buildingColorMode = 'type',
}: {
  truckStations: TruckStation[];
  onItemHover?: (event: HoverEvent) => void;
  opacity?: number;
  buildingColorMode?: BuildingColorMode;
}) {
  return (
    <>
      {truckStations.map((station, index) => {
        const corner1 = ConvertToMapCoords2(
          station.boundingBox.min.x,
          station.boundingBox.min.y
        ) as [number, number];
        const corner2 = ConvertToMapCoords2(
          station.boundingBox.max.x,
          station.boundingBox.max.y
        ) as [number, number];

        // Determine color based on mode
        const gridColors = getGridColor(station.circuitGroupId);
        const stationColor = buildingColorMode === 'grid' ? gridColors.fill : TRUCK_STATION_COLOR;

        return (
          <Rectangle
            key={`truck-station-${station.name}-${index}`}
            bounds={[corner1, corner2]}
            pathOptions={{
              color: stationColor,
              fillColor: stationColor,
              fillOpacity: opacity,
              weight: 2,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'truckStation', data: station },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Cable layer component (power cables)
function CableLayer({
  cables,
  onItemHover,
}: {
  cables: Cable[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {cables.map((cable) => {
        const positions = [
          ConvertToMapCoords2(cable.location0.x, cable.location0.y),
          ConvertToMapCoords2(cable.location1.x, cable.location1.y),
        ];

        return (
          <Polyline
            key={cable.id}
            positions={positions}
            pathOptions={{
              color: CABLE_COLOR,
              weight: 2,
              opacity: 0.7,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'cable', data: cable },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Storage container layer component
function StorageLayer({
  storages,
  onItemHover,
  opacity = 0.5,
}: {
  storages: Storage[];
  onItemHover?: (event: HoverEvent) => void;
  opacity?: number;
}) {
  return (
    <>
      {storages.map((storage) => {
        const corners = getRotatedBoundingBoxCorners(
          storage.boundingBox.min.x,
          storage.boundingBox.min.y,
          storage.boundingBox.max.x,
          storage.boundingBox.max.y,
          storage.rotation
        );
        return (
          <Polygon
            key={storage.id}
            positions={corners}
            pathOptions={{
              color: STORAGE_COLOR,
              fillColor: STORAGE_COLOR,
              fillOpacity: opacity,
              weight: 1,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'storage', data: storage },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

// Space elevator layer component
function SpaceElevatorLayer({
  spaceElevator,
  onItemHover,
  opacity = 0.5,
}: {
  spaceElevator: SpaceElevator | null | undefined;
  onItemHover?: (event: HoverEvent) => void;
  opacity?: number;
}) {
  if (!spaceElevator) return null;

  const corners = getRotatedBoundingBoxCorners(
    spaceElevator.boundingBox.min.x,
    spaceElevator.boundingBox.min.y,
    spaceElevator.boundingBox.max.x,
    spaceElevator.boundingBox.max.y,
    spaceElevator.rotation
  );

  return (
    <Polygon
      positions={corners}
      pathOptions={{
        color: SPACE_ELEVATOR_COLOR,
        fillColor: SPACE_ELEVATOR_COLOR,
        fillOpacity: opacity,
        weight: 2,
      }}
      eventHandlers={{
        mouseover: (e) =>
          onItemHover?.({
            item: { type: 'spaceElevator', data: spaceElevator },
            position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
          }),
        mouseout: () => onItemHover?.({ item: null, position: null }),
      }}
    />
  );
}

// Hypertube layer component (includes hypertube entrances)
function HypertubeLayer({
  hypertubes,
  hypertubeEntrances,
  onItemHover,
}: {
  hypertubes: Hypertube[];
  hypertubeEntrances: HypertubeEntrance[];
  onItemHover?: (event: HoverEvent) => void;
}) {
  return (
    <>
      {/* Hypertube polylines */}
      {hypertubes.map((tube) => {
        const positions =
          tube.splineData.length > 0
            ? convertSplineToMapCoords(tube.splineData)
            : [
                ConvertToMapCoords2(tube.location0.x, tube.location0.y),
                ConvertToMapCoords2(tube.location1.x, tube.location1.y),
              ];

        return (
          <Polyline
            key={tube.id}
            positions={positions}
            pathOptions={{
              color: HYPERTUBE_COLOR,
              weight: 3,
              opacity: 0.8,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'hypertube', data: tube },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}

      {/* Hypertube entrance markers */}
      {hypertubeEntrances.map((entrance) => {
        const position = ConvertToMapCoords2(entrance.x, entrance.y);

        return (
          <CircleMarker
            key={entrance.id}
            center={position}
            radius={5}
            pathOptions={{
              color: HYPERTUBE_ENTRANCE_COLOR,
              fillColor: HYPERTUBE_ENTRANCE_COLOR,
              fillOpacity: 0.8,
              weight: 2,
            }}
            eventHandlers={{
              mouseover: (e) =>
                onItemHover?.({
                  item: { type: 'hypertubeEntrance', data: entrance },
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                }),
              mouseout: () => onItemHover?.({ item: null, position: null }),
            }}
          />
        );
      })}
    </>
  );
}

function arePropsEqual(
  prev: InfrastructureOverlayProps,
  next: InfrastructureOverlayProps
): boolean {
  if (
    prev.showBelts !== next.showBelts ||
    prev.showPipes !== next.showPipes ||
    prev.showRailway !== next.showRailway ||
    prev.showStorages !== next.showStorages ||
    prev.showTrainStations !== next.showTrainStations ||
    prev.showDroneStations !== next.showDroneStations ||
    prev.showTruckStations !== next.showTruckStations ||
    prev.buildingColorMode !== next.buildingColorMode ||
    prev.buildingOpacity !== next.buildingOpacity ||
    prev.showSpaceElevator !== next.showSpaceElevator ||
    prev.showHypertubes !== next.showHypertubes
  ) {
    return false;
  }

  // Check enabled layers - must check both directions for Set equality
  if (prev.enabledLayers.size !== next.enabledLayers.size) return false;
  for (const layer of next.enabledLayers) {
    if (!prev.enabledLayers.has(layer)) return false;
  }

  // Check visible building categories - both directions
  if (prev.visibleBuildingCategories.size !== next.visibleBuildingCategories.size) return false;
  for (const cat of next.visibleBuildingCategories) {
    if (!prev.visibleBuildingCategories.has(cat)) return false;
  }

  // Compare array lengths - re-render if data loaded/changed
  if (
    prev.belts.length !== next.belts.length ||
    prev.pipes.length !== next.pipes.length ||
    prev.pipeJunctions.length !== next.pipeJunctions.length ||
    prev.trainRails.length !== next.trainRails.length ||
    prev.splitterMergers.length !== next.splitterMergers.length ||
    prev.cables.length !== next.cables.length ||
    (prev.machines?.length ?? 0) !== (next.machines?.length ?? 0) ||
    (prev.storages?.length ?? 0) !== (next.storages?.length ?? 0) ||
    (prev.trainStations?.length ?? 0) !== (next.trainStations?.length ?? 0) ||
    (prev.droneStations?.length ?? 0) !== (next.droneStations?.length ?? 0) ||
    (prev.truckStations?.length ?? 0) !== (next.truckStations?.length ?? 0) ||
    (prev.spaceElevator != null) !== (next.spaceElevator != null) ||
    (prev.hypertubes?.length ?? 0) !== (next.hypertubes?.length ?? 0) ||
    (prev.hypertubeEntrances?.length ?? 0) !== (next.hypertubeEntrances?.length ?? 0)
  ) {
    return false;
  }

  const prevHasData = prev.belts.length > 0 || prev.pipes.length > 0 || prev.cables.length > 0;
  const nextHasData = next.belts.length > 0 || next.pipes.length > 0 || next.cables.length > 0;
  if (prevHasData !== nextHasData) {
    return false;
  }

  return true;
}

export const InfrastructureOverlay = React.memo(function InfrastructureOverlay({
  enabledLayers,
  belts,
  pipes,
  pipeJunctions,
  trainRails,
  splitterMergers,
  cables,
  machines = [],
  storages = [],
  visibleBuildingCategories,
  onItemHover,
  showBelts: showBeltsProp = false,
  showPipes: showPipesProp = false,
  showRailway = false,
  showStorages: showStoragesProp = false,
  trainStations = [],
  droneStations = [],
  truckStations = [],
  showTrainStations = false,
  showDroneStations = false,
  showTruckStations = false,
  buildingColorMode = 'type',
  buildingOpacity = 0.5,
  spaceElevator,
  showSpaceElevator = false,
  hypertubes = [],
  hypertubeEntrances = [],
  showHypertubes: showHypertubesProp = false,
}: InfrastructureOverlayProps) {
  const showBeltsLayer = showBeltsProp && belts.length > 0;
  const showPipesLayer = showPipesProp && pipes.length > 0;
  const showTrainRails = showRailway && trainRails.length > 0;
  const showPower = enabledLayers.has('power') && cables.length > 0;
  const showBuildings = enabledLayers.has('buildings');
  const showSplitterMergers = showBeltsProp && splitterMergers.length > 0;
  const showStoragesLayer = showStoragesProp && storages.length > 0;
  const showTrainStationMarkers = showTrainStations && trainStations.length > 0;
  const showDroneStationMarkers = showDroneStations && droneStations.length > 0;
  const showTruckStationMarkers = showTruckStations && truckStations.length > 0;
  const showSpaceElevatorLayer = showSpaceElevator && spaceElevator != null;
  const showHypertubesLayer =
    showHypertubesProp && (hypertubes.length > 0 || hypertubeEntrances.length > 0);

  // Handle machine hover from canvas layer
  const handleMachineHover = React.useCallback(
    (event: MachineHoverEvent) => {
      if (event.machine && event.position) {
        onItemHover?.({
          item: { type: 'machine', data: event.machine },
          position: event.position,
        });
      } else {
        onItemHover?.({ item: null, position: null });
      }
    },
    [onItemHover]
  );

  // Don't render anything if no layers are enabled
  if (
    !showBeltsLayer &&
    !showPipesLayer &&
    !showTrainRails &&
    !showBuildings &&
    !showPower &&
    !showStoragesLayer &&
    !showTrainStationMarkers &&
    !showDroneStationMarkers &&
    !showTruckStationMarkers &&
    !showSpaceElevatorLayer &&
    !showHypertubesLayer
  ) {
    return null;
  }

  return (
    <>
      {/* Buildings (canvas-based, rendered first as bottom layer) */}
      <BuildingsCanvasLayer
        machines={machines}
        enabled={showBuildings}
        visibleCategories={visibleBuildingCategories}
        onMachineHover={handleMachineHover}
        buildingColorMode={buildingColorMode}
        opacity={buildingOpacity}
      />

      {/* Storage containers */}
      {showStoragesLayer && (
        <StorageLayer storages={storages} onItemHover={onItemHover} opacity={buildingOpacity} />
      )}

      {/* Train rails (thicker lines) */}
      {showTrainRails && <TrainRailLayer trainRails={trainRails} onItemHover={onItemHover} />}

      {/* Power cables */}
      {showPower && <CableLayer cables={cables} onItemHover={onItemHover} />}

      {/* Belts */}
      {showBeltsLayer && <BeltLayer belts={belts} onItemHover={onItemHover} />}

      {/* Splitter/Mergers (rendered with belts layer) */}
      {showSplitterMergers && (
        <SplitterMergerLayer splitterMergers={splitterMergers} onItemHover={onItemHover} />
      )}

      {/* Pipes + junctions */}
      {showPipesLayer && (
        <PipeLayer pipes={pipes} pipeJunctions={pipeJunctions} onItemHover={onItemHover} />
      )}

      {/* Train stations */}
      {showTrainStationMarkers && (
        <TrainStationLayer
          trainStations={trainStations}
          onItemHover={onItemHover}
          opacity={buildingOpacity}
          buildingColorMode={buildingColorMode}
        />
      )}

      {/* Drone stations */}
      {showDroneStationMarkers && (
        <DroneStationLayer
          droneStations={droneStations}
          onItemHover={onItemHover}
          opacity={buildingOpacity}
          buildingColorMode={buildingColorMode}
        />
      )}

      {/* Truck stations */}
      {showTruckStationMarkers && (
        <TruckStationLayer
          truckStations={truckStations}
          onItemHover={onItemHover}
          opacity={buildingOpacity}
          buildingColorMode={buildingColorMode}
        />
      )}

      {/* Space elevator */}
      {showSpaceElevatorLayer && (
        <SpaceElevatorLayer
          spaceElevator={spaceElevator}
          onItemHover={onItemHover}
          opacity={buildingOpacity}
        />
      )}

      {/* Hypertubes */}
      {showHypertubesLayer && (
        <HypertubeLayer
          hypertubes={hypertubes}
          hypertubeEntrances={hypertubeEntrances}
          onItemHover={onItemHover}
        />
      )}
    </>
  );
}, arePropsEqual);
