import L from 'leaflet';
import {
  MachineCategory,
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
} from 'src/apiTypes';
import { MachineGroup } from 'src/types';
import {
  categoryColors,
  droneStationColor,
  iconifyDroneStation,
  iconifyFactory,
  iconifyGenerator,
  iconifyMiner,
  iconifyTrainStation,
  trainStationColor,
} from '../constants';

export const getCategoryColor = (categories: MachineCategory[]): string => {
  const uniqueCategories = [...new Set(categories)];
  if (uniqueCategories.length === 1) {
    return categoryColors[uniqueCategories[0]] || '#505050';
  }
  // Mixed groups get a neutral grey
  return '#505050';
};

// Get all entity types present in a group
export const getGroupEntityTypes = (group: MachineGroup): ('machine' | 'train' | 'drone')[] => {
  const types: ('machine' | 'train' | 'drone')[] = [];
  if (group.machines.length > 0) types.push('machine');
  if (group.trainStations.length > 0) types.push('train');
  if (group.droneStations.length > 0) types.push('drone');
  return types;
};

// Get machine categories from a group
export const getMachineCategories = (group: MachineGroup): MachineCategory[] => {
  return group.machines.map((m) => m.category);
};

// Get total item count in a group
export const getGroupTotalCount = (group: MachineGroup): number => {
  return group.machines.length + group.trainStations.length + group.droneStations.length;
};

// Create unified icon for a group that may contain machines, train stations, and/or drone stations
export const createUnifiedGroupIcon = (
  group: MachineGroup,
  isSelected: boolean = false
): L.DivIcon => {
  const entityTypes = getGroupEntityTypes(group);
  const totalCount = getGroupTotalCount(group);
  const showBadge = totalCount > 1;

  // Selection outline style
  const outlineStyle = isSelected ? 'outline: 3px solid #3b82f6; outline-offset: 2px;' : '';

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
      <div style="position: relative; background-color: ${backgroundColor}; border-radius: 50%; padding: 7px; width: ${width}px; height: ${size}px; display: flex; justify-content: center; align-items: center; gap: 2px; pointer-events: auto; cursor: pointer; ${outlineStyle}">
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
      <div style="position: relative; background-color: ${backgroundColor}; border-radius: 12px; padding: 6px; width: ${width}px; height: ${height}px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; pointer-events: auto; cursor: pointer; ${outlineStyle}">
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
