import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Circle, Marker, Polygon } from 'react-leaflet';
import {
  RadarTower,
  ResourceNodePurityImpure,
  ResourceNodePurityNormal,
  ResourceNodePurityPure,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { rotatePoint, toRotationRad } from '../utils';

// Radar tower color
const RADAR_TOWER_COLOR = '#3B82F6'; // Blue

// Purity colors
const PURITY_COLORS = {
  [ResourceNodePurityImpure]: '#EF4444', // Red
  [ResourceNodePurityNormal]: '#EAB308', // Yellow
  [ResourceNodePurityPure]: '#22C55E', // Green
  default: '#6B7280', // Gray
};

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

type RadarTowerLayerProps = {
  radarTowers: RadarTower[];
  enabled: boolean;
  hoveredTower: RadarTower | null;
  onHover: (tower: RadarTower | null, position: { x: number; y: number } | null) => void;
  onRadarTowerClick?: (tower: RadarTower, position: { x: number; y: number }) => void;
};

function RadarTowerLayerInner({
  radarTowers,
  enabled,
  hoveredTower,
  onHover,
  onRadarTowerClick,
}: RadarTowerLayerProps) {
  // Convert reveal radius from meters to map units
  // The map uses a specific scale - approximately 1 unit = 1cm in game coordinates
  // RevealRadius is already in meters, we need to convert to game units (cm) then to map scale
  const getRadiusInMapUnits = (radiusMeters: number) => {
    // Convert meters to game units (cm) - 1 meter = 100 cm
    // Then scale for the map - the map bounds suggest a large scale factor
    // Based on MapBounds, the map is roughly 800000 units across
    // This scale factor aligns with how other distances work in the codebase
    return radiusMeters * 100; // meters to cm (game units)
  };

  const hoveredTowerCenter = useMemo(() => {
    if (!hoveredTower) return null;
    const centerX = (hoveredTower.boundingBox.min.x + hoveredTower.boundingBox.max.x) / 2;
    const centerY = (hoveredTower.boundingBox.min.y + hoveredTower.boundingBox.max.y) / 2;
    return ConvertToMapCoords2(centerX, centerY);
  }, [hoveredTower]);

  if (!enabled) return null;

  return (
    <>
      {/* Render radar tower buildings */}
      {radarTowers.map((tower, index) => {
        const corners = getRotatedBoundingBoxCorners(
          tower.boundingBox.min.x,
          tower.boundingBox.min.y,
          tower.boundingBox.max.x,
          tower.boundingBox.max.y,
          tower.rotation
        );

        const isHovered = hoveredTower?.name === tower.name;

        return (
          <Polygon
            key={`radar-tower-${index}-${tower.name}`}
            positions={corners}
            pathOptions={{
              color: isHovered ? '#60A5FA' : RADAR_TOWER_COLOR,
              fillColor: RADAR_TOWER_COLOR,
              fillOpacity: isHovered ? 0.5 : 0.3,
              weight: isHovered ? 3 : 2,
            }}
            eventHandlers={{
              mouseover: (e) => {
                onHover(tower, { x: e.originalEvent.clientX, y: e.originalEvent.clientY });
              },
              mouseout: () => {
                onHover(null, null);
              },
              click: (e) => {
                e.originalEvent.stopPropagation();
                onRadarTowerClick?.(tower, {
                  x: e.originalEvent.clientX,
                  y: e.originalEvent.clientY,
                });
              },
            }}
          />
        );
      })}

      {/* Render reveal radius circle when hovered */}
      {hoveredTower && hoveredTowerCenter && (
        <Circle
          center={hoveredTowerCenter}
          radius={getRadiusInMapUnits(hoveredTower.revealRadius)}
          pathOptions={{
            color: '#60A5FA',
            fillColor: '#3B82F6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '8, 8',
          }}
        />
      )}

      {/* Render resource nodes when hovered */}
      {hoveredTower &&
        hoveredTower.nodes.map((node, index) => {
          const position = ConvertToMapCoords2(node.x, node.y);
          const purityColor =
            PURITY_COLORS[node.purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;

          return (
            <Marker
              key={`node-${index}-${node.id}`}
              position={position}
              icon={L.divIcon({
                className: 'resource-node-icon',
                html: `
                  <div style="
                    position: relative;
                    width: 32px;
                    height: 32px;
                  ">
                    <!-- Circular background with purity outline -->
                    <div style="
                      position: absolute;
                      width: 32px;
                      height: 32px;
                      border-radius: 50%;
                      background-color: rgba(0, 0, 0, 0.7);
                      border: 3px solid ${purityColor};
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      <!-- Resource icon -->
                      <img
                        src="assets/images/satisfactory/64x64/${node.name}.png"
                        alt="${node.name}"
                        style="width: 20px; height: 20px; object-fit: contain;"
                        onerror="this.style.display='none'"
                      />
                    </div>

                    <!-- Checkmark if exploited -->
                    ${
                      node.exploited
                        ? `
                      <div style="
                        position: absolute;
                        bottom: -2px;
                        right: -2px;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background-color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid rgba(0,0,0,0.2);
                      ">
                        <svg width="10" height="10" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="black"/>
                        </svg>
                      </div>
                    `
                        : ''
                    }
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
            />
          );
        })}
    </>
  );
}

export const RadarTowerLayer = memo(RadarTowerLayerInner);
