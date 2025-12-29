import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Marker, Rectangle, useMapEvents } from 'react-leaflet';
import {
  Drone,
  MachineCategory,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
  Train,
} from 'src/apiTypes';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { ConvertToMapCoords2 } from './bounds';

export type FilterCategory = 'production' | 'power' | 'resource' | 'train' | 'drone';

type IconProps = {
  size: number;
  color: string;
  backgroundColor: string;
  padding: string;
};

// Category-based colors (vibrant palette for visibility on bright map)
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
      <path fill="currentColor" d="M22 14h-1c0-1.5-.47-2.87-1.26-4h2.12c.39.96.64 2 .71 3.08c.03.3.04.61.04.92zM2.13 10h2.12A7.4 7.4 0 0 0 3 14H2c0-.31.01-.62.04-.92c.07-1.08.32-2.12.71-3.08zM16 14h-2.26l.76-.76c.55-.56.86-1.31.86-2.1c0-.79-.31-1.54-.86-2.1l-2.36-2.36c-.21-.21-.49-.32-.78-.32c-.3 0-.57.11-.78.32L8.22 9.04c-.55.56-.86 1.31-.86 2.1c0 .79.31 1.54.86 2.1l.76.76H6c0-1.54.36-3 1-4.28V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v4.72c.64 1.28 1 2.74 1 4.28zM12 4c-.55 0-1 .45-1 1s.45 1 1 1s1-.45 1-1s-.45-1-1-1m-2 6c0-.55.45-1 1-1h2c.55 0 1 .45 1 1s-.45 1-1 1h-2c-.55 0-1-.45-1-1m2 8c0-.55.45-1 1-1s1 .45 1 1v1H6v-1c0-.55.45-1 1-1s1 .45 1 1h4c0-.55.45-1 1-1z"/>
     </svg>`;

// Station colors (darker for visibility)
const trainStationColor = '#5A5A5A'; // Dark warm grey
const droneStationColor = '#4A5A6A'; // Dark cool grey

const MultiIcon = (svgs: string[], { size, color, backgroundColor, padding }: IconProps) => {
  const width = (() => {
    if (svgs.length === 1) return size;
    if (svgs.length === 2) return size * 1.2;
    if (svgs.length === 3) return size * 1.4;
    return 0;
  })();

  const iconHtml = `
    <div color="${color}" style="background-color: ${backgroundColor}; border-radius: 50%; padding: ${padding}; width: ${width}px; height: ${size}; display: flex; justify-content: center; align-items: center;">
      ${svgs.join('')}
    </div>`;
  return L.divIcon({
    className: 'custom-icon',
    html: iconHtml,
    iconAnchor: [12, 24],
  });
};

const iconFromCategories = (categories: MachineCategory[], props: IconProps) => {
  const svgs: string[] = [];

  if (categories.includes(MachineCategoryExtractor)) {
    svgs.push(iconifyMiner);
  }
  if (categories.includes(MachineCategoryFactory)) {
    svgs.push(iconifyFactory);
  }
  if (categories.includes(MachineCategoryGenerator)) {
    svgs.push(iconifyGenerator);
  }

  return MultiIcon(svgs, props);
};

// Create a single icon for stations
const createStationIcon = (svg: string, backgroundColor: string) => {
  const iconHtml = `
    <div style="background-color: ${backgroundColor}; border-radius: 50%; padding: 7px; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center;">
      ${svg}
    </div>`;
  return L.divIcon({
    className: 'custom-icon',
    html: iconHtml,
    iconAnchor: [12, 24],
  });
};

// Create an icon for station groups with count badge
const createStationGroupIcon = (svg: string, backgroundColor: string, count: number) => {
  const showBadge = count > 1;
  const iconHtml = `
    <div style="position: relative; background-color: ${backgroundColor}; border-radius: 50%; padding: 7px; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center;">
      ${svg}
      ${
        showBadge
          ? `<div style="position: absolute; top: -6px; right: -6px; background-color: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: bold; display: flex; justify-content: center; align-items: center;">${count}</div>`
          : ''
      }
    </div>`;
  return L.divIcon({
    className: 'custom-icon',
    html: iconHtml,
    iconAnchor: [12, 24],
  });
};

type OverlayProps = {
  machineGroups: MachineGroup[];
  trains: Train[];
  drones: Drone[];
  onSelectItem: (item: SelectedMapItem | null) => void;
  onZoomEnd: (zoom: number) => void;
};

export function Overlay({ machineGroups, trains, drones, onSelectItem, onZoomEnd }: OverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{
    start: L.LatLng;
    end: L.LatLng;
  } | null>(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  const map = useMapEvents({
    zoomend: () => {
      onZoomEnd(map.getZoom());
    },
    mousedown: (e) => {
      if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
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
        const bounds = L.latLngBounds(selectionRect.start, e.latlng);

        // Find all groups within the selection rectangle
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
        map.dragging.enable();
      }
    },
  });

  // Track CTRL key for cursor change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlPressed(true);
        map.getContainer().style.cursor = 'crosshair';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlPressed(false);
        map.getContainer().style.cursor = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [map]);

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
        <div style="position: relative; background-color: ${backgroundColor}; border-radius: 50%; padding: 7px; width: ${width}px; height: ${size}px; display: flex; justify-content: center; align-items: center; gap: 2px;">
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
        <div style="position: relative; background-color: ${backgroundColor}; border-radius: 12px; padding: 6px; width: ${width}px; height: ${height}px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px;">
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
      {/* Unified Groups (machines + train stations + drone stations) */}
      {machineGroups.map((group, index) => {
        const position = ConvertToMapCoords2(group.center.x, group.center.y);
        const icon = createUnifiedGroupIcon(group);

        return (
          <Marker
            key={`group-${index}`}
            position={position}
            eventHandlers={{
              click: () => {
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
