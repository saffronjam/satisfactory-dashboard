import L from 'leaflet';
import { RadarTower, ResourceNode, ResourceNodePurity } from 'src/apiTypes';
import { PURITY_COLORS } from './radarTowerUtils';

// Lollipop icon dimensions
const ICON_SIZE = 28;
const STEM_HEIGHT = 20;
const POINT_SIZE = 6;
const TOTAL_HEIGHT = ICON_SIZE + STEM_HEIGHT;
const TOTAL_WIDTH = ICON_SIZE;

// Icon cache to avoid recreating identical icons
const iconCache = new Map<string, L.DivIcon>();

// Get or create a cached icon for a resource node
export function getResourceNodeIcon(node: ResourceNode): L.DivIcon {
  // Key based on properties that affect icon appearance
  const key = `${node.resourceType}:${node.purity}:${node.exploited}:${node.name}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = createResourceNodeIconInternal(node);
    iconCache.set(key, icon);
  }
  return icon;
}

// Create custom lollipop-style icon for resource nodes (internal - use getResourceNodeIcon instead)
// The icon has a circular head at the top, a stem going down, and a small circle at the exact point
function createResourceNodeIconInternal(node: ResourceNode): L.DivIcon {
  const purityColor =
    PURITY_COLORS[node.purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;

  return L.divIcon({
    className: 'resource-node-icon',
    html: `
      <div
        style="
          width: ${TOTAL_WIDTH}px;
          height: ${TOTAL_HEIGHT}px;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        "
      >
        <!-- Main circular icon head -->
        <div style="
          width: ${ICON_SIZE}px;
          height: ${ICON_SIZE}px;
          border-radius: 50%;
          border: 3px solid ${purityColor};
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          pointer-events: auto;
          flex-shrink: 0;
        ">
          <img src="assets/images/satisfactory/32x32/${node.name}.png"
               style="width: 20px; height: 20px; object-fit: contain; pointer-events: none;"
               onerror="this.style.display='none'" />
          ${
            node.exploited
              ? `
            <div style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              width: 14px;
              height: 14px;
              background: #22c55e;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
            ">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" style="pointer-events: none;">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          `
              : ''
          }
        </div>
        <!-- Stem line -->
        <div style="
          width: 2px;
          height: ${STEM_HEIGHT - POINT_SIZE / 2}px;
          background: ${purityColor};
          opacity: 0.8;
        "></div>
        <!-- Point marker at exact location -->
        <div style="
          width: ${POINT_SIZE}px;
          height: ${POINT_SIZE}px;
          border-radius: 50%;
          background: ${purityColor};
          flex-shrink: 0;
        "></div>
      </div>
    `,
    iconSize: [TOTAL_WIDTH, TOTAL_HEIGHT],
    iconAnchor: [TOTAL_WIDTH / 2, TOTAL_HEIGHT], // Anchor at the bottom point
  });
}

// Pre-computed tower data for optimized visibility checks
export type TowerVisibilityData = {
  cx: number;
  cy: number;
  radiusSq: number;
};

// Pre-compute tower visibility data from radar towers (call once when towers change)
export function computeTowerVisibilityData(radarTowers: RadarTower[]): TowerVisibilityData[] {
  return radarTowers.map((tower) => ({
    cx: (tower.boundingBox.min.x + tower.boundingBox.max.x) / 2,
    cy: (tower.boundingBox.min.y + tower.boundingBox.max.y) / 2,
    radiusSq: tower.revealRadius * tower.revealRadius,
  }));
}

// Check if a node is visible by any radar tower using pre-computed data (optimized)
export function isNodeVisibleByRadarOptimized(
  node: ResourceNode,
  towerData: TowerVisibilityData[]
): boolean {
  for (const tower of towerData) {
    const dx = node.x - tower.cx;
    const dy = node.y - tower.cy;
    // Use squared distance to avoid sqrt
    if (dx * dx + dy * dy <= tower.radiusSq) {
      return true;
    }
  }
  return false;
}

// Check if a node is visible by any radar tower (geometric check)
// Note: prefer isNodeVisibleByRadarOptimized with pre-computed tower data for better performance
export function isNodeVisibleByRadar(node: ResourceNode, radarTowers: RadarTower[]): boolean {
  for (const tower of radarTowers) {
    // Calculate tower center from bounding box
    const towerCenterX = (tower.boundingBox.min.x + tower.boundingBox.max.x) / 2;
    const towerCenterY = (tower.boundingBox.min.y + tower.boundingBox.max.y) / 2;

    // Calculate distance from node to tower center
    const dx = node.x - towerCenterX;
    const dy = node.y - towerCenterY;
    const distanceSq = dx * dx + dy * dy;

    // Check if within reveal radius (use squared comparison to avoid sqrt)
    if (distanceSq <= tower.revealRadius * tower.revealRadius) {
      return true;
    }
  }
  return false;
}

// Get purity display name
export function getPurityDisplayName(purity: ResourceNodePurity): string {
  return purity || 'Unknown';
}
