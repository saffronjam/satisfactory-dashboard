import L from 'leaflet';
import { memo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import {
  Explorer,
  ExplorerStatusManualDriving,
  ExplorerStatusParked,
  ExplorerStatusSelfDriving,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type ExplorerVehicleLayerProps = {
  explorers: Explorer[];
  enabled: boolean;
  onExplorerClick?: (explorer: Explorer) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
};

// Explorer icon SVG (car/buggy shape)
const explorerIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M5 11l1.5-4.5h11L19 11M17.5 15a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-11 0A1.5 1.5 0 0 1 5 13.5A1.5 1.5 0 0 1 6.5 12A1.5 1.5 0 0 1 8 13.5A1.5 1.5 0 0 1 6.5 15M18.92 6c-.2-.58-.76-1-1.42-1h-11c-.66 0-1.22.42-1.42 1L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8z"/>
</svg>`;

const getExplorerColor = (status: string): string => {
  switch (status) {
    case ExplorerStatusSelfDriving:
    case ExplorerStatusManualDriving:
      return '#06B6D4'; // Cyan - driving
    case ExplorerStatusParked:
      return '#6b7280'; // Gray - parked
    default:
      return '#6b7280'; // Gray - unknown
  }
};

const createExplorerIcon = (
  rotation: number,
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string
) => {
  const color = getExplorerColor(status);
  const size = 24;
  const containerSize = size + 12;
  const labelHeight = showName ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'explorer-marker',
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
              background-color: rgba(6, 182, 212, 0.3);
              border: 2px solid #06B6D4;
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
            ${explorerIconSvg}
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

function ExplorerVehicleLayerInner({
  explorers,
  enabled,
  onExplorerClick,
  onPositionsUpdate,
  selectedName,
  showNames = false,
}: ExplorerVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(explorers, enabled);

  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {explorers.map((explorer, index) => {
        const animatedPos = animatedPositions.get(explorer.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === explorer.name;
        const icon = createExplorerIcon(
          animatedPos.rotation,
          explorer.status,
          isSelected,
          showNames,
          explorer.name
        );

        return (
          <Marker
            key={`explorer-${index}-${explorer.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onExplorerClick?.(explorer);
              },
            }}
          />
        );
      })}
    </>
  );
}

export const ExplorerVehicleLayer = memo(ExplorerVehicleLayerInner);
