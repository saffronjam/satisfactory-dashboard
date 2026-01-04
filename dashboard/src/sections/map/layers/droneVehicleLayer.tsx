import L from 'leaflet';
import { memo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import { Drone, DroneStatusDocking, DroneStatusFlying, DroneStatusIdle } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type DroneVehicleLayerProps = {
  drones: Drone[];
  enabled: boolean;
  onDroneClick?: (drone: Drone) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
};

// Drone icon SVG
const droneIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M6.475 22Q4.6 22 3.3 20.675t-1.3-3.2T3.3 14.3T6.475 13q.55 0 1.063.125t.962.35q.35-.725.375-1.5t-.275-1.5q-.475.25-1 .375t-1.1.125q-1.875 0-3.187-1.312T2 6.474T3.313 3.3T6.5 2t3.188 1.3T11 6.475q0 .575-.137 1.1t-.388 1q.725.3 1.5.288t1.5-.363q-.225-.45-.35-.962T13 6.475Q13 4.6 14.3 3.3T17.475 2t3.2 1.3T22 6.475t-1.325 3.2t-3.2 1.325q-.6 0-1.137-.15t-1.038-.425q-.325.75-.3 1.538t.375 1.562q.475-.25 1-.387t1.1-.138q1.875 0 3.2 1.3T22 17.475t-1.325 3.2t-3.2 1.325t-3.175-1.325t-1.3-3.2q0-.575.138-1.1t.387-1q-.775-.35-1.563-.387t-1.537.287q.275.5.425 1.05t.15 1.15q0 1.875-1.325 3.2T6.475 22"/>
</svg>`;

const getDroneColor = (status: string): string => {
  switch (status) {
    case DroneStatusFlying:
      return '#8B5CF6'; // Purple - flying
    case DroneStatusDocking:
      return '#eab308'; // Yellow - docking
    case DroneStatusIdle:
      return '#6b7280'; // Gray - idle
    default:
      return '#6b7280'; // Gray - unknown
  }
};

const createDroneIcon = (
  rotation: number,
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string
) => {
  const color = getDroneColor(status);
  const size = 24;
  const containerSize = size + 12; // Extra space for selection circle
  const labelHeight = showName && name ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'drone-marker',
    html: `
      <div style="
        width: ${containerSize}px;
        height: ${totalHeight}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
      ">
        <div style="
          width: ${containerSize}px;
          height: ${containerSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          ${
            isSelected
              ? `
            <div style="
              position: absolute;
              width: ${containerSize}px;
              height: ${containerSize}px;
              background-color: rgba(139, 92, 246, 0.3);
              border: 2px solid #8B5CF6;
              border-radius: 50%;
            "></div>
          `
              : ''
          }
          <div style="
            width: ${size}px;
            height: ${size}px;
            transform: rotate(${rotation}deg);
            color: ${color};
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
          ">
            ${droneIconSvg}
          </div>
        </div>
        ${
          showName && name
            ? `
          <div style="
            background-color: rgba(55, 65, 81, 0.9);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 8px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
          ">
            ${name}
          </div>
        `
            : ''
        }
      </div>
    `,
    iconSize: [containerSize, totalHeight],
    iconAnchor: [containerSize / 2, containerSize / 2],
  });
};

function DroneVehicleLayerInner({
  drones,
  enabled,
  onDroneClick,
  onPositionsUpdate,
  selectedName,
  showNames = false,
}: DroneVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(drones, enabled);

  // Pass animated positions to parent - use useEffect to avoid calling during render
  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {drones.map((drone, index) => {
        const animatedPos = animatedPositions.get(drone.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === drone.name;
        const icon = createDroneIcon(
          animatedPos.rotation,
          drone.status,
          isSelected,
          showNames,
          drone.name
        );

        return (
          <Marker
            key={`drone-${index}-${drone.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                console.log('Drone clicked:', drone.name);
                e.originalEvent.stopPropagation();
                onDroneClick?.(drone);
              },
            }}
          />
        );
      })}
    </>
  );
}

export const DroneVehicleLayer = memo(DroneVehicleLayerInner);
