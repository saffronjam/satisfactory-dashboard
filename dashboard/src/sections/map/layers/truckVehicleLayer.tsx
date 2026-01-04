import L from 'leaflet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import {
  Truck,
  TruckStatusManualDriving,
  TruckStatusParked,
  TruckStatusSelfDriving,
} from 'src/apiTypes';
import { BuildingColorMode, getGridFillColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type TruckVehicleLayerProps = {
  trucks: Truck[];
  enabled: boolean;
  onTruckClick?: (truck: Truck, animatedPos: AnimatedPosition) => void;
  onSelectedPositionUpdate?: (position: AnimatedPosition | null) => void;
  selectedName?: string | null;
  showNames?: boolean;
  buildingColorMode?: BuildingColorMode;
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

// Icon creation WITHOUT rotation - rotation is applied via DOM manipulation to prevent icon replacement
const createTruckIcon = (
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string,
  colorOverride?: string
) => {
  const color = colorOverride ?? getTruckColor(status);
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
        pointer-events: auto;
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
          <div class="vehicle-icon-rotate" style="
            width: ${size}px;
            height: ${size}px;
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

// Individual truck marker component that handles rotation via ref
interface TruckMarkerProps {
  truck: Truck;
  animatedPos: AnimatedPosition;
  isSelected: boolean;
  showNames: boolean;
  onTruckClick?: (truck: Truck, animatedPos: AnimatedPosition) => void;
  colorOverride?: string;
}

function TruckMarkerComponent({
  truck,
  animatedPos,
  isSelected,
  showNames,
  onTruckClick,
  colorOverride,
}: TruckMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Memoize icon to prevent recreation when only rotation changes
  const icon = useMemo(
    () => createTruckIcon(truck.status, isSelected, showNames, truck.name, colorOverride),
    [truck.status, isSelected, showNames, truck.name, colorOverride]
  );

  // Update rotation via DOM manipulation instead of recreating icon
  useEffect(() => {
    if (markerRef.current) {
      const element = markerRef.current.getElement();
      const rotateEl = element?.querySelector('.vehicle-icon-rotate') as HTMLElement;
      if (rotateEl) {
        rotateEl.style.transform = `rotate(${animatedPos.rotation}deg)`;
      }
    }
  }, [animatedPos.rotation, icon]);

  const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);

  return (
    <Marker
      ref={markerRef}
      position={mapPosition}
      icon={icon}
      interactive={true}
      bubblingMouseEvents={false}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          onTruckClick?.(truck, animatedPos);
        },
        mouseover: (e) => {
          e.originalEvent.stopPropagation();
        },
        mouseout: (e) => {
          e.originalEvent.stopPropagation();
        },
      }}
    />
  );
}

function TruckVehicleLayerInner({
  trucks,
  enabled,
  onTruckClick,
  onSelectedPositionUpdate,
  selectedName,
  showNames = false,
  buildingColorMode = 'type',
}: TruckVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(trucks, enabled);
  const prevSelectedPosRef = useRef<AnimatedPosition | null>(null);

  // Only update parent with SELECTED vehicle's position to avoid 60fps cascade
  useEffect(() => {
    if (!onSelectedPositionUpdate) return;

    if (!selectedName) {
      if (prevSelectedPosRef.current !== null) {
        prevSelectedPosRef.current = null;
        onSelectedPositionUpdate(null);
      }
      return;
    }

    const selectedPos = animatedPositions.get(selectedName);
    if (selectedPos) {
      const prev = prevSelectedPosRef.current;
      // Only update if position changed meaningfully
      if (
        !prev ||
        Math.abs(prev.x - selectedPos.x) > 0.01 ||
        Math.abs(prev.y - selectedPos.y) > 0.01
      ) {
        prevSelectedPosRef.current = { ...selectedPos };
        onSelectedPositionUpdate(selectedPos);
      }
    }
  }, [animatedPositions, selectedName, onSelectedPositionUpdate]);

  return (
    <>
      {trucks.map((truck) => {
        const animatedPos = animatedPositions.get(truck.name);
        if (!animatedPos) return null;

        const isSelected = selectedName === truck.name;
        // Determine color override for grid mode
        const colorOverride =
          buildingColorMode === 'grid' ? getGridFillColor(truck.circuitGroupId) : undefined;

        return (
          <TruckMarkerComponent
            key={`truck-${truck.id}`}
            truck={truck}
            animatedPos={animatedPos}
            isSelected={isSelected}
            showNames={showNames}
            onTruckClick={onTruckClick}
            colorOverride={colorOverride}
          />
        );
      })}
    </>
  );
}

export const TruckVehicleLayer = memo(TruckVehicleLayerInner);
