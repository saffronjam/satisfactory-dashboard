import L from 'leaflet';
import { memo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import {
  Tractor,
  TractorStatusManualDriving,
  TractorStatusParked,
  TractorStatusSelfDriving,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type TractorVehicleLayerProps = {
  tractors: Tractor[];
  enabled: boolean;
  onTractorClick?: (tractor: Tractor) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
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

const createTractorIcon = (
  rotation: number,
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string
) => {
  const color = getTractorColor(status);
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
              background-color: rgba(34, 197, 94, 0.3);
              border: 2px solid #22C55E;
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

function TractorVehicleLayerInner({
  tractors,
  enabled,
  onTractorClick,
  onPositionsUpdate,
  selectedName,
  showNames = false,
}: TractorVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(tractors, enabled);

  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {tractors.map((tractor, index) => {
        const animatedPos = animatedPositions.get(tractor.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === tractor.name;
        const icon = createTractorIcon(
          animatedPos.rotation,
          tractor.status,
          isSelected,
          showNames,
          tractor.name
        );

        return (
          <Marker
            key={`tractor-${index}-${tractor.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onTractorClick?.(tractor);
              },
            }}
          />
        );
      })}
    </>
  );
}

export const TractorVehicleLayer = memo(TractorVehicleLayerInner);
