import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Circle, Marker, Polygon } from 'react-leaflet';
import { RadarTower, ResourceNode } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { rotatePoint, toRotationRad } from '../utils';
import { createResourceNodeIcon } from '../utils/resourceNodeUtils';
import { RADAR_TOWER_COLOR } from '../utils/radarTowerUtils';

// Get rotated bounding box corners
function getRotatedBoundingBoxCorners(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  rotation: number
): L.LatLngExpression[] {
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const rotationRad = toRotationRad(rotation || 0);

  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  return corners.map((corner) => {
    const rotated = rotatePoint(corner.x, corner.y, centerX, centerY, rotationRad);
    return ConvertToMapCoords2(rotated.x, rotated.y);
  });
}

type ResourceNodeHoverEvent = {
  node: ResourceNode | null;
  position: { x: number; y: number } | null;
};

type RadarTowerLayerProps = {
  radarTowers: RadarTower[];
  enabled: boolean;
  selectedId: string | null;
  onRadarTowerClick?: (tower: RadarTower, containerPoint: { x: number; y: number }) => void;
  onResourceNodeHover?: (event: ResourceNodeHoverEvent) => void;
  opacity?: number;
};

function RadarTowerLayerInner({
  radarTowers,
  enabled,
  selectedId,
  onRadarTowerClick,
  onResourceNodeHover,
  opacity = 0.5,
}: RadarTowerLayerProps) {
  const getRadiusInMapUnits = (radiusMeters: number) => {
    return radiusMeters / 58.6; // This is an arbitrary number that I found out to best fit the map scale.
  };

  // Find selected tower for reveal radius
  const selectedTower = useMemo(() => {
    if (!selectedId) return null;
    return radarTowers.find((t) => t.id === selectedId) ?? null;
  }, [selectedId, radarTowers]);

  const selectedTowerCenter = useMemo(() => {
    if (!selectedTower) return null;
    const centerX = (selectedTower.boundingBox.min.x + selectedTower.boundingBox.max.x) / 2;
    const centerY = (selectedTower.boundingBox.min.y + selectedTower.boundingBox.max.y) / 2;
    return ConvertToMapCoords2(centerX, centerY);
  }, [selectedTower]);

  if (!enabled) return null;

  return (
    <>
      {/* Render radar tower buildings */}
      {radarTowers.map((tower) => {
        const corners = getRotatedBoundingBoxCorners(
          tower.boundingBox.min.x,
          tower.boundingBox.min.y,
          tower.boundingBox.max.x,
          tower.boundingBox.max.y,
          tower.rotation
        );

        const isSelected = selectedId === tower.id;

        return (
          <Polygon
            key={`radar-tower-${tower.id}`}
            positions={corners}
            pathOptions={{
              color: isSelected ? '#60A5FA' : RADAR_TOWER_COLOR,
              fillColor: RADAR_TOWER_COLOR,
              fillOpacity: isSelected ? Math.min(opacity + 0.2, 1) : opacity,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onRadarTowerClick?.(tower, { x: e.containerPoint.x, y: e.containerPoint.y });
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

      {/* Render reveal radius circle when selected */}
      {selectedTower && selectedTowerCenter && (
        <Circle
          center={selectedTowerCenter}
          radius={getRadiusInMapUnits(selectedTower.revealRadius)}
          pathOptions={{
            color: '#60A5FA',
            fillColor: '#3B82F6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '8, 8',
          }}
          interactive={false}
        />
      )}

      {/* Render scanned resource nodes when tower is selected */}
      {selectedTower?.nodes?.map((node) => {
        const nodeCenter = ConvertToMapCoords2(node.x, node.y);
        const icon = createResourceNodeIcon(node, node.id);

        return (
          <Marker
            key={`node-${node.id}`}
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
      })}
    </>
  );
}

export const RadarTowerLayer = memo(RadarTowerLayerInner);
