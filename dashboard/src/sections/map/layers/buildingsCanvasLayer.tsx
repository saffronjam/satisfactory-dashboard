import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import {
  Machine,
  MachineCategory,
  MachineStatus,
  MachineStatusIdle,
  MachineStatusOperating,
  MachineStatusPaused,
} from 'src/apiTypes';
import { BuildingColorMode, getGridColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from '../bounds';
import { rotatePoint, toRotationRad } from '../utils';

// Building colors by category (no alpha - opacity controlled by globalAlpha)
const BUILDING_COLORS: Record<MachineCategory, { stroke: string; fill: string }> = {
  factory: { stroke: '#4056A1', fill: '#4056A1' },
  extractor: { stroke: '#C97B2A', fill: '#C97B2A' },
  generator: { stroke: '#2E8B8B', fill: '#2E8B8B' },
};

// Building colors by status (no alpha - opacity controlled by globalAlpha)
const STATUS_COLORS: Record<string, { stroke: string; fill: string }> = {
  [MachineStatusOperating]: { stroke: '#16a34a', fill: '#22c55e' }, // Green
  [MachineStatusIdle]: { stroke: '#ca8a04', fill: '#eab308' }, // Yellow
  [MachineStatusPaused]: { stroke: '#ea580c', fill: '#f97316' }, // Orange
  default: { stroke: '#4b5563', fill: '#6b7280' }, // Gray
};

const BUILDING_STROKE_WIDTH = 1;

// Check if a point is inside a polygon using ray casting
function isPointInPolygon(
  px: number,
  py: number,
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Stored visible machine info for hit detection
type VisibleMachine = {
  machine: Machine;
  screenCorners: Array<{ x: number; y: number }>;
};

// Hover callback type
export type MachineHoverEvent = {
  machine: Machine | null;
  position: { x: number; y: number } | null;
};

type BuildingsCanvasLayerProps = {
  machines: Machine[];
  enabled: boolean;
  visibleCategories?: Set<MachineCategory>;
  onMachineHover?: (event: MachineHoverEvent) => void;
  onMachineClick?: (event: MachineHoverEvent) => void;
  buildingColorMode?: BuildingColorMode;
  opacity?: number;
};

// Custom Leaflet layer that renders buildings to canvas
class BuildingsLayer extends L.Layer {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _machines: Machine[] = [];
  private _visibleCategories: Set<MachineCategory> = new Set(['factory', 'extractor', 'generator']);
  private _cachedZoom: number | null = null;
  private _cachedBounds: L.LatLngBounds | null = null;
  private _offscreenCanvas: HTMLCanvasElement | null = null;
  private _offscreenCtx: CanvasRenderingContext2D | null = null;
  private _needsRedraw = true;
  // Hover detection
  private _visibleMachines: VisibleMachine[] = [];
  private _hoveredMachine: Machine | null = null;
  private _onHoverCallback: ((event: MachineHoverEvent) => void) | null = null;
  // Click detection
  private _onClickCallback: ((event: MachineHoverEvent) => void) | null = null;
  // Bound handlers for proper cleanup
  private _boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private _boundMouseOut: ((e: MouseEvent) => void) | null = null;
  private _boundClick: ((e: MouseEvent) => void) | null = null;
  // Building color mode
  private _buildingColorMode: BuildingColorMode = 'type';
  // Opacity
  private _opacity = 0.5;

  constructor(
    machines: Machine[],
    visibleCategories?: Set<MachineCategory>,
    onHover?: (event: MachineHoverEvent) => void,
    buildingColorMode?: BuildingColorMode,
    onClick?: (event: MachineHoverEvent) => void,
    opacity?: number
  ) {
    super();
    this._machines = machines;
    if (visibleCategories) {
      this._visibleCategories = visibleCategories;
    }
    if (onHover) {
      this._onHoverCallback = onHover;
    }
    if (buildingColorMode !== undefined) {
      this._buildingColorMode = buildingColorMode;
    }
    if (onClick) {
      this._onClickCallback = onClick;
    }
    if (opacity !== undefined) {
      this._opacity = opacity;
    }
  }

  onAdd(map: L.Map): this {
    // Create the canvas element
    this._canvas = L.DomUtil.create('canvas', 'leaflet-buildings-layer') as HTMLCanvasElement;
    this._ctx = this._canvas.getContext('2d');

    // Create offscreen canvas for caching
    this._offscreenCanvas = document.createElement('canvas');
    this._offscreenCtx = this._offscreenCanvas.getContext('2d');

    const pane = map.getPane('overlayPane');
    if (pane) {
      pane.appendChild(this._canvas);
    }

    // Set up canvas size
    this._resizeCanvas();

    // Listen for map events
    map.on('moveend', this._onMoveEnd, this);
    map.on('zoomend', this._onZoomEnd, this);
    map.on('move', this._onMove, this);
    map.on('resize', this._onResize, this);

    // Add mouse event listeners for hover detection
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseOut = this._onMouseOut.bind(this);
    this._boundClick = this._onClick.bind(this);
    map.getContainer().addEventListener('mousemove', this._boundMouseMove);
    map.getContainer().addEventListener('mouseout', this._boundMouseOut);
    map.getContainer().addEventListener('click', this._boundClick);

    // Initial draw
    this._redraw();

    return this;
  }

  onRemove(map: L.Map): this {
    map.off('moveend', this._onMoveEnd, this);
    map.off('zoomend', this._onZoomEnd, this);
    map.off('move', this._onMove, this);
    map.off('resize', this._onResize, this);

    // Remove mouse event listeners
    if (this._boundMouseMove) {
      map.getContainer().removeEventListener('mousemove', this._boundMouseMove);
    }
    if (this._boundMouseOut) {
      map.getContainer().removeEventListener('mouseout', this._boundMouseOut);
    }
    if (this._boundClick) {
      map.getContainer().removeEventListener('click', this._boundClick);
    }

    // Clear hover state
    if (this._hoveredMachine && this._onHoverCallback) {
      this._onHoverCallback({ machine: null, position: null });
    }

    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    this._offscreenCanvas = null;
    this._offscreenCtx = null;
    this._visibleMachines = [];
    this._hoveredMachine = null;

    return this;
  }

  setMachines(machines: Machine[]): void {
    this._machines = machines;
    this._needsRedraw = true;
    this._redraw();
  }

  setVisibleCategories(categories: Set<MachineCategory>): void {
    this._visibleCategories = categories;
    this._needsRedraw = true;
    this._redraw();
  }

  setOnHover(callback: ((event: MachineHoverEvent) => void) | null): void {
    this._onHoverCallback = callback;
  }

  setBuildingColorMode(mode: BuildingColorMode): void {
    this._buildingColorMode = mode;
    this._needsRedraw = true;
    this._redraw();
  }

  setOpacity(opacity: number): void {
    if (this._opacity !== opacity) {
      this._opacity = opacity;
      this._needsRedraw = true;
      this._redraw();
    }
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this._map || !this._canvas) return;

    // Get mouse position relative to the map container
    const container = this._map.getContainer();
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find machine under cursor
    let foundMachine: Machine | null = null;
    for (const vm of this._visibleMachines) {
      if (isPointInPolygon(x, y, vm.screenCorners)) {
        foundMachine = vm.machine;
        break;
      }
    }

    // Only emit if hover state changed
    if (foundMachine !== this._hoveredMachine) {
      this._hoveredMachine = foundMachine;
      if (this._onHoverCallback) {
        this._onHoverCallback({
          machine: foundMachine,
          position: foundMachine ? { x: e.clientX, y: e.clientY } : null,
        });
      }
    } else if (foundMachine && this._onHoverCallback) {
      // Update position even if same machine
      this._onHoverCallback({
        machine: foundMachine,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  }

  private _onClick(e: MouseEvent): void {
    if (!this._map || !this._canvas || !this._onClickCallback) return;

    // Get mouse position relative to the map container
    const container = this._map.getContainer();
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find machine under cursor
    let foundMachine: Machine | null = null;
    for (const vm of this._visibleMachines) {
      if (isPointInPolygon(x, y, vm.screenCorners)) {
        foundMachine = vm.machine;
        break;
      }
    }

    // Emit click event if machine found
    if (foundMachine) {
      e.stopPropagation();
      this._onClickCallback({
        machine: foundMachine,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  }

  private _onMouseOut(_e: MouseEvent): void {
    if (this._hoveredMachine) {
      this._hoveredMachine = null;
      if (this._onHoverCallback) {
        this._onHoverCallback({ machine: null, position: null });
      }
    }
  }

  private _resizeCanvas(): void {
    const map = this._map;
    if (!map || !this._canvas || !this._offscreenCanvas) return;

    const size = map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._offscreenCanvas.width = size.x;
    this._offscreenCanvas.height = size.y;

    // Position canvas at map origin
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    this._needsRedraw = true;
  }

  private _onResize(): void {
    this._resizeCanvas();
    this._redraw();
  }

  private _onMove(): void {
    // During pan, just reposition the canvas - no redraw needed
    const map = this._map;
    if (!map || !this._canvas) return;

    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    // Blit from cache with offset if we have valid cached content
    if (!this._needsRedraw && this._cachedBounds && this._ctx && this._offscreenCanvas) {
      this._blitWithOffset();
    }
  }

  private _onMoveEnd(): void {
    // After pan ends, do a full redraw to ensure crisp rendering
    this._needsRedraw = true;
    this._redraw();
  }

  private _onZoomEnd(): void {
    // Zoom changed - need full redraw
    this._needsRedraw = true;
    this._resizeCanvas();
    this._redraw();
  }

  private _blitWithOffset(): void {
    const map = this._map;
    if (!map || !this._ctx || !this._offscreenCanvas || !this._cachedBounds) return;

    // Calculate offset between cached view and current view
    const cachedTopLeft = map.latLngToContainerPoint(this._cachedBounds.getNorthWest());
    const currentTopLeft = map.latLngToContainerPoint(map.getBounds().getNorthWest());
    const offsetX = cachedTopLeft.x - currentTopLeft.x;
    const offsetY = cachedTopLeft.y - currentTopLeft.y;

    // Clear and blit with offset
    this._ctx.clearRect(0, 0, this._canvas!.width, this._canvas!.height);
    this._ctx.drawImage(this._offscreenCanvas, offsetX, offsetY);
  }

  private _redraw(): void {
    const map = this._map;
    if (!map || !this._ctx || !this._canvas || !this._offscreenCtx || !this._offscreenCanvas)
      return;

    const zoom = map.getZoom();
    const bounds = map.getBounds();

    // Clear both canvases
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._offscreenCtx.clearRect(0, 0, this._offscreenCanvas.width, this._offscreenCanvas.height);

    // Draw buildings to offscreen canvas (only those in viewport)
    this._offscreenCtx.lineWidth = BUILDING_STROKE_WIDTH;
    this._offscreenCtx.globalAlpha = this._opacity;

    // Expand bounds slightly for smoother panning
    const expandedBounds = bounds.pad(0.2);

    // Clear visible machines array for hit detection
    this._visibleMachines = [];

    for (const machine of this._machines) {
      // Skip if no bounding box data
      if (!machine.boundingBox?.min || !machine.boundingBox?.max) {
        continue;
      }

      // Skip if category is not visible
      const category = machine.category as MachineCategory;
      if (!this._visibleCategories.has(category)) {
        continue;
      }

      // Get colors based on building color mode
      let colors: { stroke: string; fill: string };
      switch (this._buildingColorMode) {
        case 'status': {
          const statusKey = machine.status as MachineStatus;
          colors = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
          break;
        }
        case 'grid': {
          colors = getGridColor(machine.circuitGroupId);
          break;
        }
        case 'type':
        default:
          colors = BUILDING_COLORS[category] || BUILDING_COLORS.factory;
      }

      const minX = machine.boundingBox.min.x;
      const minY = machine.boundingBox.min.y;
      const maxX = machine.boundingBox.max.x;
      const maxY = machine.boundingBox.max.y;

      // Calculate center in world coordinates
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const rotationRad = toRotationRad(machine.rotation || 0);

      // Calculate the four corners in world coordinates
      const corners = [
        { x: minX, y: minY }, // bottom-left
        { x: maxX, y: minY }, // bottom-right
        { x: maxX, y: maxY }, // top-right
        { x: minX, y: maxY }, // top-left
      ];

      // Rotate corners around center in world space
      const rotatedCorners = corners.map((corner) =>
        rotatePoint(corner.x, corner.y, centerX, centerY, rotationRad)
      );

      // Convert rotated corners to map coordinates
      const mapCorners = rotatedCorners.map((corner) => ConvertToMapCoords2(corner.x, corner.y));

      // Create bounds for viewport culling (use axis-aligned bounding box of rotated shape)
      const lats = mapCorners.map((c) => (Array.isArray(c) ? c[0] : c.lat));
      const lngs = mapCorners.map((c) => (Array.isArray(c) ? c[1] : c.lng));
      const buildingBounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );

      // Viewport culling - skip if not visible
      if (!expandedBounds.intersects(buildingBounds)) {
        continue;
      }

      // Convert to screen points
      const screenCorners = mapCorners.map((corner) => map.latLngToContainerPoint(corner));

      // Draw rotated rectangle as a path
      this._offscreenCtx.strokeStyle = colors.stroke;
      this._offscreenCtx.fillStyle = colors.fill;
      this._offscreenCtx.beginPath();
      this._offscreenCtx.moveTo(screenCorners[0].x, screenCorners[0].y);
      for (let i = 1; i < screenCorners.length; i++) {
        this._offscreenCtx.lineTo(screenCorners[i].x, screenCorners[i].y);
      }
      this._offscreenCtx.closePath();
      this._offscreenCtx.fill();
      this._offscreenCtx.stroke();

      // Store for hit detection
      this._visibleMachines.push({
        machine,
        screenCorners: screenCorners.map((p) => ({ x: p.x, y: p.y })),
      });
    }

    // Copy offscreen canvas to visible canvas
    this._ctx.drawImage(this._offscreenCanvas, 0, 0);

    // Cache state
    this._cachedZoom = zoom;
    this._cachedBounds = bounds;
    this._needsRedraw = false;
  }
}

export function BuildingsCanvasLayer({
  machines,
  enabled,
  visibleCategories,
  onMachineHover,
  onMachineClick,
  buildingColorMode = 'type',
  opacity = 0.5,
}: BuildingsCanvasLayerProps) {
  const map = useMap();
  const layerRef = useRef<BuildingsLayer | null>(null);

  // Default to all categories if not specified
  const categories =
    visibleCategories || new Set<MachineCategory>(['factory', 'extractor', 'generator']);

  useEffect(() => {
    if (!enabled) {
      // Remove layer if disabled
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    // Create layer if it doesn't exist
    if (!layerRef.current) {
      layerRef.current = new BuildingsLayer(
        machines,
        categories,
        onMachineHover,
        buildingColorMode,
        onMachineClick,
        opacity
      );
      map.addLayer(layerRef.current);
    } else {
      // Update machines
      layerRef.current.setMachines(machines);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled]);

  // Update machines when they change
  useEffect(() => {
    if (layerRef.current && enabled) {
      layerRef.current.setMachines(machines);
    }
  }, [machines, enabled]);

  // Update visible categories when they change
  useEffect(() => {
    if (layerRef.current && enabled) {
      layerRef.current.setVisibleCategories(categories);
    }
  }, [categories, enabled]);

  // Update hover callback when it changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setOnHover(onMachineHover ?? null);
    }
  }, [onMachineHover]);

  // Update building color mode when it changes
  useEffect(() => {
    if (layerRef.current && enabled) {
      layerRef.current.setBuildingColorMode(buildingColorMode);
    }
  }, [buildingColorMode, enabled]);

  // Update opacity when it changes
  useEffect(() => {
    if (layerRef.current && enabled) {
      layerRef.current.setOpacity(opacity);
    }
  }, [opacity, enabled]);

  return null;
}
