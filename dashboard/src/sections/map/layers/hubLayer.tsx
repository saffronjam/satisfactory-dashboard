import L from 'leaflet';
import { memo } from 'react';
import { Marker } from 'react-leaflet';
import { Hub } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';

// HUB color (orange/amber for home-like feel)
export const HUB_COLOR = '#F59E0B';

// HUB icon SVG (material-symbols:house-rounded)
const hubIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M7 20q-.825 0-1.412-.587T5 18v-7.15l-2 1.525q-.35.25-.75.213T1.6 12.2t-.2-.75t.4-.65l8.975-6.875q.275-.2.588-.3t.637-.1t.638.1t.587.3L16 6.05V5.5q0-.625.438-1.062T17.5 4t1.063.438T19 5.5v2.85l3.2 2.45q.325.25.388.65t-.188.75t-.65.388t-.75-.213l-2-1.525V18q0 .825-.587 1.413T17 20h-1q-.825 0-1.412-.587T14 18v-2q0-.825-.587-1.412T12 14t-1.412.588T10 16v2q0 .825-.587 1.413T8 20zm3-9.975h4q0-.8-.6-1.313T12 8.2t-1.4.513t-.6 1.312"/>
</svg>`;

// Create HUB icon
const createHubIcon = (isSelected: boolean) => {
  const size = 32;
  const containerSize = size + 12;
  const color = HUB_COLOR;

  return L.divIcon({
    className: 'hub-marker',
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
          ${hubIconSvg}
        </div>
      </div>
    `,
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize / 2],
  });
};

type HubLayerProps = {
  hub?: Hub;
  selectedId?: string;
  onHubClick?: (hub: Hub, containerPoint: { x: number; y: number }) => void;
  onCtrlClick?: (hub: Hub) => void;
  opacity?: number;
};

function HubLayerInner({
  hub,
  selectedId,
  onHubClick,
  onCtrlClick,
  opacity: _opacity = 0.5,
}: HubLayerProps) {
  if (!hub) return null;

  const centerX = (hub.boundingBox.min.x + hub.boundingBox.max.x) / 2;
  const centerY = (hub.boundingBox.min.y + hub.boundingBox.max.y) / 2;
  const position = ConvertToMapCoords2(centerX, centerY);
  const isSelected = selectedId === hub.id;
  const icon = createHubIcon(isSelected);

  return (
    <Marker
      key={`hub-${hub.id}`}
      position={position}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          const isCtrlOrCmd = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
          if (isCtrlOrCmd && onCtrlClick) {
            onCtrlClick(hub);
          } else {
            onHubClick?.(hub, { x: e.containerPoint.x, y: e.containerPoint.y });
          }
        },
      }}
    />
  );
}

export const HubLayer = memo(HubLayerInner);
