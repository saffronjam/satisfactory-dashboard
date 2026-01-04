import L from 'leaflet';
import { memo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import {
  Train,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useTrainAnimation } from '../hooks/useTrainAnimation';

type TrainVehicleLayerProps = {
  trains: Train[];
  enabled: boolean;
  onTrainClick?: (train: Train) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
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

const createTrainIcon = (
  rotation: number,
  status: string,
  isSelected: boolean,
  showName: boolean,
  name: string
) => {
  const color = getTrainColor(status);
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
              border: 2px solid #22c55e;
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

function TrainVehicleLayerInner({
  trains,
  enabled,
  onTrainClick,
  onPositionsUpdate,
  selectedName,
  showNames = false,
}: TrainVehicleLayerProps) {
  const animatedPositions = useTrainAnimation(trains, enabled);

  // Pass animated positions to parent - use useEffect to avoid calling during render
  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {trains.map((train, index) => {
        const animatedPos = animatedPositions.get(train.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === train.name;
        const icon = createTrainIcon(
          animatedPos.rotation,
          train.status,
          isSelected,
          showNames,
          train.name
        );

        return (
          <Marker
            key={`train-${index}-${train.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                console.log('Train clicked:', train.name);
                e.originalEvent.stopPropagation();
                onTrainClick?.(train);
              },
            }}
          />
        );
      })}
    </>
  );
}

export const TrainVehicleLayer = memo(TrainVehicleLayerInner);
