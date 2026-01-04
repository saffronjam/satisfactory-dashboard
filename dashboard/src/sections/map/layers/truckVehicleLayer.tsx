import L from 'leaflet';
import { memo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import {
  Truck,
  TruckStatusManualDriving,
  TruckStatusParked,
  TruckStatusSelfDriving,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type TruckVehicleLayerProps = {
  trucks: Truck[];
  enabled: boolean;
  onTruckClick?: (truck: Truck) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
};

// Truck icon SVG
const truckIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5s.67 1.5 1.5 1.5m1.5-9H17V12h4.46zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5s.67 1.5 1.5 1.5M20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4z"/>
</svg>`;

const getTruckColor = (status: string): string => {
  switch (status) {
    case TruckStatusSelfDriving:
    case TruckStatusManualDriving:
      return '#F59E0B'; // Amber - driving
    case TruckStatusParked:
      return '#6b7280'; // Gray - parked
    default:
      return '#6b7280'; // Gray - unknown
  }
};

const createTruckIcon = (
  rotation: number,
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string
) => {
  const color = getTruckColor(status);
  const size = 26;
  const containerSize = size + 12; // Extra space for selection circle
  const labelHeight = showName ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'truck-marker',
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
              background-color: rgba(245, 158, 11, 0.3);
              border: 2px solid #F59E0B;
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
            ${truckIconSvg}
          </div>
        </div>
        ${
          showName
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

function TruckVehicleLayerInner({
  trucks,
  enabled,
  onTruckClick,
  onPositionsUpdate,
  selectedName,
  showNames = false,
}: TruckVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(trucks, enabled);

  // Pass animated positions to parent - use useEffect to avoid calling during render
  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {trucks.map((truck, index) => {
        const animatedPos = animatedPositions.get(truck.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === truck.name;
        const icon = createTruckIcon(
          animatedPos.rotation,
          truck.status,
          isSelected,
          showNames,
          truck.name
        );

        return (
          <Marker
            key={`truck-${index}-${truck.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                console.log('Truck clicked:', truck.name);
                e.originalEvent.stopPropagation();
                onTruckClick?.(truck);
              },
            }}
          />
        );
      })}
    </>
  );
}

export const TruckVehicleLayer = memo(TruckVehicleLayerInner);
