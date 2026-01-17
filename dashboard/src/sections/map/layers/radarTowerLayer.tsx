import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Circle, Marker } from 'react-leaflet';
import { RadarTower, ResourceNode } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { getResourceNodeIcon } from '../utils/resourceNodeUtils';
import { RADAR_TOWER_COLOR } from '../utils/radarTowerUtils';

// Radar icon SVG (material-symbols:radar)
const radarIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8m4.95-12.95L15.54 8.46A4.96 4.96 0 0 1 17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5s2.24-5 5-5c1.38 0 2.64.56 3.54 1.46l1.41-1.41A6.96 6.96 0 0 0 12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7s7-3.13 7-7c0-1.93-.78-3.68-2.05-4.95M14 12c0 1.1-.9 2-2 2s-2-.9-2-2s.9-2 2-2s2 .9 2 2"/>
</svg>`;

// Create radar tower icon
const createRadarTowerIcon = (isSelected: boolean) => {
  const size = 28;
  const containerSize = size + 12;
  const color = RADAR_TOWER_COLOR;

  return L.divIcon({
    className: 'radar-tower-marker',
    html: `
      <div style="
        width: ${containerSize}px;
        height: ${containerSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        pointer-events: auto;
        cursor: pointer;
      ">
        ${
          isSelected
            ? `
          <div style="
            position: absolute;
            width: ${containerSize}px;
            height: ${containerSize}px;
            background-color: ${color}33;
            border: 2px solid ${color};
            border-radius: 50%;
          "></div>
        `
            : ''
        }
        <div style="
          width: ${size}px;
          height: ${size}px;
          color: ${color};
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.6));
        ">
          ${radarIconSvg}
        </div>
      </div>
    `,
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize / 2],
  });
};

type ResourceNodeHoverEvent = {
  node: ResourceNode | null;
  position: { x: number; y: number } | null;
};

type RadarTowerLayerProps = {
  radarTowers: RadarTower[];
  selectedIds: string[];
  onRadarTowerClick?: (tower: RadarTower, containerPoint: { x: number; y: number }) => void;
  onCtrlClick?: (tower: RadarTower) => void;
  onResourceNodeHover?: (event: ResourceNodeHoverEvent) => void;
  opacity?: number;
};

function RadarTowerLayerInner({
  radarTowers,
  selectedIds,
  onRadarTowerClick,
  onCtrlClick,
  onResourceNodeHover,
  opacity: _opacity = 0.5,
}: RadarTowerLayerProps) {
  const getRadiusInMapUnits = (radiusMeters: number) => {
    return radiusMeters / 58.6; // This is an arbitrary number that I found out to best fit the map scale.
  };

  // Find all selected towers for reveal radius circles and resource nodes
  const selectedTowers = useMemo(() => {
    if (selectedIds.length === 0) return [];
    return radarTowers.filter((t) => selectedIds.includes(t.id));
  }, [selectedIds, radarTowers]);

  return (
    <>
      {/* Render radar tower icons */}
      {radarTowers.map((tower) => {
        const centerX = (tower.boundingBox.min.x + tower.boundingBox.max.x) / 2;
        const centerY = (tower.boundingBox.min.y + tower.boundingBox.max.y) / 2;
        const position = ConvertToMapCoords2(centerX, centerY);
        const isSelected = selectedIds.includes(tower.id);
        const icon = createRadarTowerIcon(isSelected);

        return (
          <Marker
            key={`radar-tower-${tower.id}`}
            position={position}
            icon={icon}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                const isCtrlOrCmd = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
                if (isCtrlOrCmd && onCtrlClick) {
                  onCtrlClick(tower);
                } else {
                  onRadarTowerClick?.(tower, { x: e.containerPoint.x, y: e.containerPoint.y });
                }
              },
              dblclick: (e) => {
                // Prevent map zoom and pan on double-click
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                L.DomEvent.stop(e as unknown as Event);
              },
            }}
          />
        );
      })}

      {/* Render reveal radius circles for all selected towers */}
      {selectedTowers.map((tower) => {
        const centerX = (tower.boundingBox.min.x + tower.boundingBox.max.x) / 2;
        const centerY = (tower.boundingBox.min.y + tower.boundingBox.max.y) / 2;
        const center = ConvertToMapCoords2(centerX, centerY);
        return (
          <Circle
            key={`reveal-${tower.id}`}
            center={center}
            radius={getRadiusInMapUnits(tower.revealRadius)}
            pathOptions={{
              color: '#60A5FA',
              fillColor: '#3B82F6',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '8, 8',
            }}
            interactive={false}
          />
        );
      })}

      {/* Render scanned resource nodes for all selected towers */}
      {selectedTowers.flatMap(
        (tower) =>
          tower.nodes?.map((node) => {
            const nodeCenter = ConvertToMapCoords2(node.x, node.y);
            const icon = getResourceNodeIcon(node);

            return (
              <Marker
                key={`node-${tower.id}-${node.id}`}
                position={nodeCenter}
                icon={icon}
                eventHandlers={{
                  mouseover: (e) => {
                    e.originalEvent.stopPropagation();
                    onResourceNodeHover?.({
                      node,
                      position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                    });
                  },
                  mouseout: () => {
                    onResourceNodeHover?.({ node: null, position: null });
                  },
                  // Add redundant handler for reliability
                  add: (e) => {
                    const element = e.target.getElement();
                    if (element) {
                      element.addEventListener('mouseleave', () => {
                        onResourceNodeHover?.({ node: null, position: null });
                      });
                    }
                  },
                }}
              />
            );
          }) ?? []
      )}
    </>
  );
}

export const RadarTowerLayer = memo(RadarTowerLayerInner);
