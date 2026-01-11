import L from 'leaflet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import {
  Explorer,
  ExplorerStatusManualDriving,
  ExplorerStatusParked,
  ExplorerStatusSelfDriving,
} from 'src/apiTypes';
import { BuildingColorMode, getGridFillColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type ExplorerVehicleLayerProps = {
  explorers: Explorer[];
  onExplorerClick?: (explorer: Explorer, animatedPos: AnimatedPosition) => void;
  onSelectedPositionUpdate?: (position: AnimatedPosition | null) => void;
  selectedName?: string | null;
  showNames?: boolean;
  buildingColorMode?: BuildingColorMode;
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

// Icon creation WITHOUT rotation - rotation is applied via DOM manipulation to prevent icon replacement
const createExplorerIcon = (
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string,
  colorOverride?: string
) => {
  const color = colorOverride ?? getExplorerColor(status);
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
              background-color: rgba(6, 182, 212, 0.3);
              border: 2px solid #06B6D4;
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

// Individual explorer marker component that handles rotation via ref
interface ExplorerMarkerProps {
  explorer: Explorer;
  animatedPos: AnimatedPosition;
  isSelected: boolean;
  showNames: boolean;
  onExplorerClick?: (explorer: Explorer, animatedPos: AnimatedPosition) => void;
  colorOverride?: string;
}

function ExplorerMarkerComponent({
  explorer,
  animatedPos,
  isSelected,
  showNames,
  onExplorerClick,
  colorOverride,
}: ExplorerMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Memoize icon to prevent recreation when only rotation changes
  const icon = useMemo(
    () => createExplorerIcon(explorer.status, isSelected, showNames, explorer.name, colorOverride),
    [explorer.status, isSelected, showNames, explorer.name, colorOverride]
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
          onExplorerClick?.(explorer, animatedPos);
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

function ExplorerVehicleLayerInner({
  explorers,
  onExplorerClick,
  onSelectedPositionUpdate,
  selectedName,
  showNames = false,
  buildingColorMode = 'type',
}: ExplorerVehicleLayerProps) {
  const animatedPositions = useVehicleAnimation(explorers);
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
      {explorers.map((explorer) => {
        const animatedPos = animatedPositions.get(explorer.name);
        if (!animatedPos) return null;

        const isSelected = selectedName === explorer.name;
        // Determine color override for grid mode
        const colorOverride =
          buildingColorMode === 'grid' ? getGridFillColor(explorer.circuitGroupId) : undefined;

        return (
          <ExplorerMarkerComponent
            key={`explorer-${explorer.id}`}
            explorer={explorer}
            animatedPos={animatedPos}
            isSelected={isSelected}
            showNames={showNames}
            onExplorerClick={onExplorerClick}
            colorOverride={colorOverride}
          />
        );
      })}
    </>
  );
}

export const ExplorerVehicleLayer = memo(ExplorerVehicleLayerInner);
