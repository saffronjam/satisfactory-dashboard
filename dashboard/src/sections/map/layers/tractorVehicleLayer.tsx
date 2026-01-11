import L from 'leaflet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import {
  Tractor,
  TractorStatusManualDriving,
  TractorStatusParked,
  TractorStatusSelfDriving,
} from 'src/apiTypes';
import { BuildingColorMode, getGridFillColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type TractorVehicleLayerProps = {
  tractors: Tractor[];
  onTractorClick?: (tractor: Tractor, animatedPos: AnimatedPosition) => void;
  onSelectedPositionUpdate?: (position: AnimatedPosition | null) => void;
  selectedName?: string | null;
  showNames?: boolean;
  buildingColorMode?: BuildingColorMode;
};

// Tractor icon SVG (mdi:tractor)
const tractorIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M5 4v2h3v4h6v-2h3v2h1V4H5zm2 8c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2zm10-6c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z"/>
</svg>`;

const getTractorColor = (status: string): string => {
  switch (status) {
    case TractorStatusSelfDriving:
    case TractorStatusManualDriving:
      return '#22C55E'; // Green - driving
    case TractorStatusParked:
      return '#6b7280'; // Gray - parked
    default:
      return '#6b7280'; // Gray - unknown
  }
};

// Icon creation WITHOUT rotation - rotation is applied via DOM manipulation to prevent icon replacement
const createTractorIcon = (
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string,
  colorOverride?: string
) => {
  const color = colorOverride ?? getTractorColor(status);
  const size = 24;
  const containerSize = size + 12;
  const labelHeight = showName ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'tractor-marker',
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
              background-color: rgba(34, 197, 94, 0.3);
              border: 2px solid #22C55E;
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
            ${tractorIconSvg}
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

// Individual tractor marker component that handles rotation via ref
interface TractorMarkerProps {
  tractor: Tractor;
  animatedPos: AnimatedPosition;
  isSelected: boolean;
  showNames: boolean;
  onTractorClick?: (tractor: Tractor, animatedPos: AnimatedPosition) => void;
  colorOverride?: string;
}

function TractorMarkerComponent({
  tractor,
  animatedPos,
  isSelected,
  showNames,
  onTractorClick,
  colorOverride,
}: TractorMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Memoize icon to prevent recreation when only rotation changes
  const icon = useMemo(
    () => createTractorIcon(tractor.status, isSelected, showNames, tractor.name, colorOverride),
    [tractor.status, isSelected, showNames, tractor.name, colorOverride]
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
          onTractorClick?.(tractor, animatedPos);
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

function TractorVehicleLayerInner({
  tractors,
  onTractorClick,
  onSelectedPositionUpdate,
  selectedName,
  showNames = false,
  buildingColorMode = 'type',
}: TractorVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(tractors);
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
      {tractors.map((tractor) => {
        const animatedPos = animatedPositions.get(tractor.name);
        if (!animatedPos) return null;

        const isSelected = selectedName === tractor.name;
        // Determine color override for grid mode
        const colorOverride =
          buildingColorMode === 'grid' ? getGridFillColor(tractor.circuitGroupId) : undefined;

        return (
          <TractorMarkerComponent
            key={`tractor-${tractor.id}`}
            tractor={tractor}
            animatedPos={animatedPos}
            isSelected={isSelected}
            showNames={showNames}
            onTractorClick={onTractorClick}
            colorOverride={colorOverride}
          />
        );
      })}
    </>
  );
}

export const TractorVehicleLayer = memo(TractorVehicleLayerInner);
