import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { ConvertToMapCoords2 } from '../../bounds';
import { MapLayer } from '../../view/map-view';

interface SelectionRectangleProps {
  machineGroups: MachineGroup[];
  enabledLayers: Set<MapLayer>;
  multiSelectMode: boolean;
  onSelectItem: (item: SelectedMapItem | null) => void;
  onZoomEnd: (zoom: number) => void;
  onMoveEnd?: (center: [number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMapClick?: () => void;
}

export function SelectionRectangle({
  machineGroups,
  enabledLayers,
  multiSelectMode,
  onSelectItem,
  onZoomEnd,
  onMoveEnd,
  onDragStart,
  onDragEnd,
  onMapClick,
}: SelectionRectangleProps) {
  const map = useMap();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    start: L.LatLng;
    end: L.LatLng;
  } | null>(null);

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
