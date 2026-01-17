import L from 'leaflet';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import {
  Train,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { BuildingColorMode, getGridFillColor } from 'src/utils/gridColors';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useTrainAnimation } from '../hooks/useTrainAnimation';

type TrainVehicleLayerProps = {
  trains: Train[];
  onTrainClick?: (train: Train, animatedPos: AnimatedPosition) => void;
  onSelectedPositionUpdate?: (position: AnimatedPosition | null) => void;
  selectedName?: string | null;
  showNames?: boolean;
  buildingColorMode?: BuildingColorMode;
};

// Train locomotive icon SVG
const trainIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m3.5-7H6V6h5zm2 0V6h5v4zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"/>
</svg>`;

const getTrainColor = (status: string): string => {
  switch (status) {
    case TrainStatusSelfDriving:
    case TrainStatusManualDriving:
      return '#22c55e'; // Green - moving
    case TrainStatusDocking:
      return '#eab308'; // Yellow - docking
    case TrainStatusDerailed:
      return '#ef4444'; // Red - derailed
    default:
      return '#6b7280'; // Gray - parked/unknown
  }
};

// Icon creation WITHOUT rotation - rotation is applied via DOM manipulation to prevent icon replacement
const createTrainIcon = (
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string,
  colorOverride?: string
) => {
  const color = colorOverride ?? getTrainColor(status);
  const size = 28;
  const containerSize = size + 12; // Extra space for selection circle
  const labelHeight = showName ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'train-marker',
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
              border: 2px solid #22c55e;
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
            ${trainIconSvg}
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

// Individual train marker component that handles rotation via ref
interface TrainMarkerProps {
  train: Train;
  animatedPos: AnimatedPosition;
  isSelected: boolean;
  showNames: boolean;
  onTrainClick?: (train: Train, animatedPos: AnimatedPosition) => void;
  colorOverride?: string;
}

function TrainMarkerComponent({
  train,
  animatedPos,
  isSelected,
  showNames,
  onTrainClick,
  colorOverride,
}: TrainMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Memoize icon to prevent recreation when only rotation changes
  const icon = useMemo(
    () => createTrainIcon(train.status, isSelected, showNames, train.name, colorOverride),
    [train.status, isSelected, showNames, train.name, colorOverride]
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
          onTrainClick?.(train, animatedPos);
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

function TrainVehicleLayerInner({
  trains,
  onTrainClick,
  onSelectedPositionUpdate,
  selectedName,
  showNames = false,
  buildingColorMode = 'type',
}: TrainVehicleLayerProps) {
  const animatedPositions = useTrainAnimation(trains);
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
      {trains.map((train) => {
        // Use animated position if available, otherwise fall back to train's actual position
        // This ensures trains render immediately on first frame before animation state updates
        const animatedPos = animatedPositions.get(train.name) ?? {
          x: train.x,
          y: train.y,
          rotation: train.rotation,
        };

        const isSelected = selectedName === train.name;
        // Determine color override for grid mode
        const colorOverride =
          buildingColorMode === 'grid' ? getGridFillColor(train.circuitGroupId) : undefined;

        return (
          <TrainMarkerComponent
            key={`train-${train.id}`}
            train={train}
            animatedPos={animatedPos}
            isSelected={isSelected}
            showNames={showNames}
            onTrainClick={onTrainClick}
            colorOverride={colorOverride}
          />
        );
      })}
    </>
  );
}

export const TrainVehicleLayer = memo(TrainVehicleLayerInner);
