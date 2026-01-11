import L from 'leaflet';
import { memo } from 'react';
import { Marker } from 'react-leaflet';
import { SpaceElevator } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';

// Space Elevator color (purple)
export const SPACE_ELEVATOR_COLOR = '#9333EA';

// Space Elevator icon SVG (tdesign:tower-filled)
const spaceElevatorIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M13 1v1h3v6h-.977c.079 1.872.37 4.353.903 6.731c.317 1.414.714 2.768 1.192 3.925c.355.86.74 1.574 1.145 2.118q.112.123.201.226H20v2h-6v-2h1.674q-.133-.123-.275-.246c-.54-.47-1.14-.921-1.749-1.25c-.615-.33-1.174-.504-1.65-.504s-1.035.173-1.65.505c-.608.328-1.209.778-1.75 1.249q-.14.123-.274.246H10v2H4v-2h1.536l.2-.226c.405-.544.79-1.259 1.146-2.118c.478-1.157.875-2.511 1.192-3.925c.533-2.378.824-4.859.903-6.731H8V2h3V1zm-2.021 7a42 42 0 0 1-.953 7.169c-.2.89-.433 1.774-.703 2.618l.076-.042C10.173 17.327 11.07 17 12 17c.932 0 1.827.327 2.6.745l.077.042a31 31 0 0 1-.703-2.618A42 42 0 0 1 13.021 8z"/>
</svg>`;

// Create Space Elevator icon
const createSpaceElevatorIcon = (isSelected: boolean) => {
  const size = 32;
  const containerSize = size + 12;
  const color = SPACE_ELEVATOR_COLOR;

  return L.divIcon({
    className: 'space-elevator-marker',
    html: `
      <div style="
        width: ${containerSize}px;
        height: ${containerSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        pointer-events: auto;
        cursor: pointer;
      ">
        ${
          isSelected
            ? `
          <div style="
            position: absolute;
            width: ${containerSize}px;
            height: ${containerSize}px;
            background-color: ${color}33;
            border: 2px solid ${color};
            border-radius: 50%;
          "></div>
        `
            : ''
        }
        <div style="
          width: ${size}px;
          height: ${size}px;
          color: ${color};
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.6));
        ">
          ${spaceElevatorIconSvg}
        </div>
      </div>
    `,
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize / 2],
  });
};

type SpaceElevatorLayerProps = {
  spaceElevator?: SpaceElevator;
  selectedId?: string;
  onSpaceElevatorClick?: (
    spaceElevator: SpaceElevator,
    containerPoint: { x: number; y: number }
  ) => void;
  opacity?: number;
};

function SpaceElevatorLayerInner({
  spaceElevator,
  selectedId,
  onSpaceElevatorClick,
  opacity: _opacity = 0.5,
}: SpaceElevatorLayerProps) {
  if (!spaceElevator) return null;

  const centerX = (spaceElevator.boundingBox.min.x + spaceElevator.boundingBox.max.x) / 2;
  const centerY = (spaceElevator.boundingBox.min.y + spaceElevator.boundingBox.max.y) / 2;
  const position = ConvertToMapCoords2(centerX, centerY);
  // SpaceElevator doesn't have an id field - use name as identifier (there's only one per game)
  const isSelected = selectedId === spaceElevator.name;
  const icon = createSpaceElevatorIcon(isSelected);

  return (
    <Marker
      key={`space-elevator-${spaceElevator.name}`}
      position={position}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onSpaceElevatorClick?.(spaceElevator, { x: e.containerPoint.x, y: e.containerPoint.y });
        },
      }}
    />
  );
}

export const SpaceElevatorLayer = memo(SpaceElevatorLayerInner);
