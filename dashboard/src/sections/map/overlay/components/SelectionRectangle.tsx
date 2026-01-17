import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Rectangle, useMap, useMapEvents } from 'react-leaflet';
import {
  Belt,
  Cable,
  Drone,
  DroneStation,
  Explorer,
  Hub,
  Hypertube,
  Machine,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
  Pipe,
  Player,
  RadarTower,
  SpaceElevator,
  Tractor,
  Train,
  TrainRail,
  TrainStation,
  Truck,
} from 'src/apiTypes';
import { SelectableEntity, SelectedMapItem } from 'src/types';
import { ConvertToMapCoords2 } from '../../bounds';
import { createSelection } from '../../hooks/useSelection';
import { getEntityBounds } from '../../utils';
import {
  BuildingSubLayer,
  InfrastructureSubLayer,
  MapLayer,
  VehicleSubLayer,
} from '../../view/map-view';

/**
 * Checks if a line segment intersects with an axis-aligned rectangle.
 * Uses the Cohen-Sutherland algorithm approach for line-rectangle intersection.
 */
function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rectMinX: number,
  rectMinY: number,
  rectMaxX: number,
  rectMaxY: number
): boolean {
  // If either endpoint is inside the rectangle, they intersect
  const p1Inside = x1 >= rectMinX && x1 <= rectMaxX && y1 >= rectMinY && y1 <= rectMaxY;
  const p2Inside = x2 >= rectMinX && x2 <= rectMaxX && y2 >= rectMinY && y2 <= rectMaxY;
  if (p1Inside || p2Inside) {
    return true;
  }

  // Check if the line segment intersects any of the four rectangle edges
  const edges: [number, number, number, number][] = [
    [rectMinX, rectMinY, rectMaxX, rectMinY], // bottom
    [rectMaxX, rectMinY, rectMaxX, rectMaxY], // right
    [rectMinX, rectMaxY, rectMaxX, rectMaxY], // top
    [rectMinX, rectMinY, rectMinX, rectMaxY], // left
  ];

  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if two line segments intersect.
 */
function segmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const d1 = direction(x3, y3, x4, y4, x1, y1);
  const d2 = direction(x3, y3, x4, y4, x2, y2);
  const d3 = direction(x1, y1, x2, y2, x3, y3);
  const d4 = direction(x1, y1, x2, y2, x4, y4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;

  return false;
}

/**
 * Computes the cross product direction of vectors.
 */
function direction(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
  return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
}

/**
 * Checks if point (px, py) lies on segment (x1, y1)-(x2, y2).
 */
function onSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number
): boolean {
  return (
    Math.min(x1, x2) <= px &&
    px <= Math.max(x1, x2) &&
    Math.min(y1, y2) <= py &&
    py <= Math.max(y1, y2)
  );
}

/**
 * Checks if a SelectableEntity is a machine (production building).
 */
export function isMachine(entity: SelectableEntity): entity is { type: 'machine'; data: Machine } {
  return entity.type === 'machine';
}

/**
 * Checks if a SelectableEntity is a vehicle (trains, drones, trucks, tractors, explorers, players).
 */
export function isVehicle(
  entity: SelectableEntity
): entity is
  | { type: 'train'; data: Train }
  | { type: 'drone'; data: Drone }
  | { type: 'truck'; data: Truck }
  | { type: 'tractor'; data: Tractor }
  | { type: 'explorer'; data: Explorer }
  | { type: 'player'; data: Player } {
  return (
    entity.type === 'train' ||
    entity.type === 'drone' ||
    entity.type === 'truck' ||
    entity.type === 'tractor' ||
    entity.type === 'explorer' ||
    entity.type === 'player'
  );
}

/**
 * Checks if a SelectableEntity is infrastructure (belts, pipes, cables, rails, hypertubes).
 */
export function isInfrastructure(
  entity: SelectableEntity
): entity is
  | { type: 'belt'; data: Belt }
  | { type: 'pipe'; data: Pipe }
  | { type: 'cable'; data: Cable }
  | { type: 'rail'; data: TrainRail }
  | { type: 'hypertube'; data: Hypertube } {
  return (
    entity.type === 'belt' ||
    entity.type === 'pipe' ||
    entity.type === 'cable' ||
    entity.type === 'rail' ||
    entity.type === 'hypertube'
  );
}

/**
 * Checks if a SelectableEntity is a special entity (stations, HUB, Space Elevator, Radar Towers).
 */
export function isSpecialEntity(
  entity: SelectableEntity
): entity is
  | { type: 'trainStation'; data: TrainStation }
  | { type: 'droneStation'; data: DroneStation }
  | { type: 'radarTower'; data: RadarTower }
  | { type: 'hub'; data: Hub }
  | { type: 'spaceElevator'; data: SpaceElevator } {
  return (
    entity.type === 'trainStation' ||
    entity.type === 'droneStation' ||
    entity.type === 'radarTower' ||
    entity.type === 'hub' ||
    entity.type === 'spaceElevator'
  );
}

interface SelectionRectangleProps {
  enabledLayers: Set<MapLayer>;
  buildingSubLayers: Set<BuildingSubLayer>;
  infrastructureSubLayers: Set<InfrastructureSubLayer>;
  vehicleSubLayers: Set<VehicleSubLayer>;
  multiSelectMode: boolean;
  onSelectItem: (item: SelectedMapItem | null) => void;
  onZoomEnd: (zoom: number) => void;
  onMoveEnd?: (center: [number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMapClick?: () => void;
  machines: Machine[];
  trainStations: TrainStation[];
  droneStations: DroneStation[];
  radarTowers: RadarTower[];
  hub: Hub | null | undefined;
  spaceElevator: SpaceElevator | null | undefined;
  trains: Train[];
  drones: Drone[];
  trucks: Truck[];
  tractors: Tractor[];
  explorers: Explorer[];
  players: Player[];
  belts: Belt[];
  pipes: Pipe[];
  cables: Cable[];
  rails: TrainRail[];
  hypertubes: Hypertube[];
}

export function SelectionRectangle({
  enabledLayers,
  buildingSubLayers,
  infrastructureSubLayers,
  vehicleSubLayers,
  multiSelectMode,
  onSelectItem,
  onZoomEnd,
  onMoveEnd,
  onDragStart,
  onDragEnd,
  onMapClick,
  machines,
  trainStations,
  droneStations,
  radarTowers,
  hub,
  spaceElevator,
  trains,
  drones,
  trucks,
  tractors,
  explorers,
  players,
  belts,
  pipes,
  cables,
  rails,
  hypertubes,
}: SelectionRectangleProps) {
  const map = useMap();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    start: L.LatLng;
    end: L.LatLng;
  } | null>(null);

  /**
   * Collects all visible entities that fall within the given map bounds.
   * Returns an array of SelectableEntity objects that can be passed to createSelection.
   */
  const collectEntitiesInBounds = (bounds: L.LatLngBounds): SelectableEntity[] => {
    const entities: SelectableEntity[] = [];

    /**
     * Checks if an entity's bounding box intersects with the selection bounds.
     * Converts entity game coordinates to map coordinates for comparison.
     */
    const isEntityInBounds = (entity: SelectableEntity): boolean => {
      const entityBounds = getEntityBounds(entity);
      const minPos = ConvertToMapCoords2(entityBounds.min.x, entityBounds.min.y) as [
        number,
        number,
      ];
      const maxPos = ConvertToMapCoords2(entityBounds.max.x, entityBounds.max.y) as [
        number,
        number,
      ];

      const entityMapBounds = L.latLngBounds(
        [Math.min(minPos[0], maxPos[0]), Math.min(minPos[1], maxPos[1])],
        [Math.max(minPos[0], maxPos[0]), Math.max(minPos[1], maxPos[1])]
      );

      return bounds.intersects(entityMapBounds);
    };

    /**
     * Checks if an infrastructure entity (polyline segment) intersects with the selection bounds.
     * Uses proper line-rectangle intersection instead of bounding box intersection.
     */
    const isInfrastructureInBounds = (entity: SelectableEntity): boolean => {
      if (!isInfrastructure(entity)) {
        return isEntityInBounds(entity);
      }

      const { location0, location1 } = entity.data;

      // Convert both endpoints to map coordinates
      const p0 = ConvertToMapCoords2(location0.x, location0.y) as [number, number];
      const p1 = ConvertToMapCoords2(location1.x, location1.y) as [number, number];

      // Get selection rectangle bounds
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const rectMinLat = Math.min(sw.lat, ne.lat);
      const rectMaxLat = Math.max(sw.lat, ne.lat);
      const rectMinLng = Math.min(sw.lng, ne.lng);
      const rectMaxLng = Math.max(sw.lng, ne.lng);

      // Check if line segment intersects with selection rectangle
      return lineIntersectsRect(
        p0[0],
        p0[1],
        p1[0],
        p1[1],
        rectMinLat,
        rectMinLng,
        rectMaxLat,
        rectMaxLng
      );
    };

    // Collect machines if buildings layer is enabled
    // Filter by building sublayer based on machine category
    if (enabledLayers.has('buildings')) {
      for (const machine of machines) {
        // Check if the machine's category sublayer is enabled
        const categoryEnabled =
          (machine.category === MachineCategoryFactory && buildingSubLayers.has('factory')) ||
          (machine.category === MachineCategoryExtractor && buildingSubLayers.has('extractor')) ||
          (machine.category === MachineCategoryGenerator && buildingSubLayers.has('generator'));

        if (!categoryEnabled) continue;

        const entity: SelectableEntity = { type: 'machine', data: machine };
        if (isEntityInBounds(entity)) {
          entities.push(entity);
        }
      }

      // Collect train stations if the sublayer is enabled
      if (buildingSubLayers.has('trainStation')) {
        for (const station of trainStations) {
          const entity: SelectableEntity = { type: 'trainStation', data: station };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      // Collect drone stations if the sublayer is enabled
      if (buildingSubLayers.has('droneStation')) {
        for (const station of droneStations) {
          const entity: SelectableEntity = { type: 'droneStation', data: station };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      // Collect radar towers if the sublayer is enabled
      if (buildingSubLayers.has('radarTowers')) {
        for (const tower of radarTowers) {
          const entity: SelectableEntity = { type: 'radarTower', data: tower };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      // Collect hub if the sublayer is enabled
      if (buildingSubLayers.has('hub') && hub) {
        const entity: SelectableEntity = { type: 'hub', data: hub };
        if (isEntityInBounds(entity)) {
          entities.push(entity);
        }
      }

      // Collect space elevator if the sublayer is enabled
      if (buildingSubLayers.has('spaceElevator') && spaceElevator) {
        const entity: SelectableEntity = { type: 'spaceElevator', data: spaceElevator };
        if (isEntityInBounds(entity)) {
          entities.push(entity);
        }
      }
    }

    // Collect vehicles if vehicles layer is enabled
    if (enabledLayers.has('vehicles')) {
      if (vehicleSubLayers.has('trains')) {
        for (const train of trains) {
          const entity: SelectableEntity = { type: 'train', data: train };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (vehicleSubLayers.has('drones')) {
        for (const drone of drones) {
          const entity: SelectableEntity = { type: 'drone', data: drone };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (vehicleSubLayers.has('trucks')) {
        for (const truck of trucks) {
          const entity: SelectableEntity = { type: 'truck', data: truck };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (vehicleSubLayers.has('tractors')) {
        for (const tractor of tractors) {
          const entity: SelectableEntity = { type: 'tractor', data: tractor };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (vehicleSubLayers.has('explorers')) {
        for (const explorer of explorers) {
          const entity: SelectableEntity = { type: 'explorer', data: explorer };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (vehicleSubLayers.has('players')) {
        for (const player of players) {
          const entity: SelectableEntity = { type: 'player', data: player };
          if (isEntityInBounds(entity)) {
            entities.push(entity);
          }
        }
      }
    }

    // Collect infrastructure if infrastructure layer is enabled
    // Uses line-rectangle intersection for accurate polyline segment selection
    if (enabledLayers.has('infrastructure')) {
      if (infrastructureSubLayers.has('belts')) {
        for (const belt of belts) {
          const entity: SelectableEntity = { type: 'belt', data: belt };
          if (isInfrastructureInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (infrastructureSubLayers.has('pipes')) {
        for (const pipe of pipes) {
          const entity: SelectableEntity = { type: 'pipe', data: pipe };
          if (isInfrastructureInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (infrastructureSubLayers.has('railway')) {
        for (const rail of rails) {
          const entity: SelectableEntity = { type: 'rail', data: rail };
          if (isInfrastructureInBounds(entity)) {
            entities.push(entity);
          }
        }
      }

      if (infrastructureSubLayers.has('hypertubes')) {
        for (const hypertube of hypertubes) {
          const entity: SelectableEntity = { type: 'hypertube', data: hypertube };
          if (isInfrastructureInBounds(entity)) {
            entities.push(entity);
          }
        }
      }
    }

    // Collect power cables if power layer is enabled
    // Uses line-rectangle intersection for accurate polyline segment selection
    if (enabledLayers.has('power')) {
      for (const cable of cables) {
        const entity: SelectableEntity = { type: 'cable', data: cable };
        if (isInfrastructureInBounds(entity)) {
          entities.push(entity);
        }
      }
    }

    return entities;
  };

  const completeSelection = (endLatLng: L.LatLng) => {
    if (!selectionRect) return;

    const bounds = L.latLngBounds(selectionRect.start, endLatLng);
    const selectedEntities = collectEntitiesInBounds(bounds);

    if (selectedEntities.length > 0) {
      // Pass the selection bounds (map coordinates) to preserve the rectangle for "Show Selection"
      const selectionBounds = {
        start: { lat: selectionRect.start.lat, lng: selectionRect.start.lng },
        end: { lat: endLatLng.lat, lng: endLatLng.lng },
      };
      const selection = createSelection(selectedEntities, selectionBounds);
      onSelectItem({ type: 'selection', data: selection });
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
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd?.([center.lat, center.lng]);
    },
    dragstart: () => {
      onDragStart?.();
    },
    dragend: () => {
      onDragEnd?.();
    },
    mousedown: (e) => {
      // Start selection if Ctrl/Meta key is pressed OR if multiSelectMode is enabled
      // Allow selection when any selectable layer is active
      const hasSelectableLayers =
        enabledLayers.has('buildings') ||
        enabledLayers.has('vehicles') ||
        enabledLayers.has('infrastructure') ||
        enabledLayers.has('power');
      if (
        hasSelectableLayers &&
        (e.originalEvent.ctrlKey || e.originalEvent.metaKey || multiSelectMode)
      ) {
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
      onMapClick?.();
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
  }, [multiSelectMode, map, isSelecting, selectionRect, onSelectItem]);

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
    // Skip keyboard handling when in programmatic mode or when no selectable layers are active
    const hasSelectableLayers =
      enabledLayers.has('buildings') ||
      enabledLayers.has('vehicles') ||
      enabledLayers.has('infrastructure') ||
      enabledLayers.has('power');
    if (multiSelectMode || !hasSelectableLayers) return;

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

  if (!selectionRect) return null;

  return (
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
  );
}
