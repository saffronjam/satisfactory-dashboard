import L from 'leaflet';
import { RadarTower, ResourceNode, ResourceNodePurity } from 'src/apiTypes';
import { PURITY_COLORS } from './radarTowerUtils';

// Create custom icon for resource nodes
export function createResourceNodeIcon(node: ResourceNode, nodeId: string) {
  const purityColor =
    PURITY_COLORS[node.purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;

  return L.divIcon({
    className: 'resource-node-icon',
    html: `
      <div
        data-node-id="${nodeId}"
        style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid ${purityColor};
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          pointer-events: auto;
        "
      >
        <img src="assets/images/satisfactory/64x64/${node.name}.png"
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
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Check if a node is visible by any radar tower (geometric check)
export function isNodeVisibleByRadar(
  node: ResourceNode,
  radarTowers: RadarTower[]
): boolean {
  for (const tower of radarTowers) {
    // Calculate tower center from bounding box
    const towerCenterX = (tower.boundingBox.min.x + tower.boundingBox.max.x) / 2;
    const towerCenterY = (tower.boundingBox.min.y + tower.boundingBox.max.y) / 2;

    // Calculate distance from node to tower center
    const dx = node.x - towerCenterX;
    const dy = node.y - towerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within reveal radius
    if (distance <= tower.revealRadius) {
      return true;
    }
  }
  return false;
}

// Get purity display name
export function getPurityDisplayName(purity: ResourceNodePurity): string {
  return purity || 'Unknown';
}
