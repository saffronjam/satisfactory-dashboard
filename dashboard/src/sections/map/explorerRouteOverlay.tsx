import { memo, useEffect, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import {
  Explorer,
  ExplorerStatusManualDriving,
  ExplorerStatusParked,
  ExplorerStatusSelfDriving,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';
import { LocationInfo } from './components/locationInfo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface ExplorerRouteOverlayProps {
  explorer: Explorer | null;
  onHide: () => void;
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
  showPopover?: boolean;
}

/** Gets the status color for the explorer status indicator */
const getStatusColor = (status: string): string => {
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

/** Gets the human-readable status label */
const getStatusLabel = (status: string): string => {
  switch (status) {
    case ExplorerStatusSelfDriving:
      return 'Self-Driving';
    case ExplorerStatusManualDriving:
      return 'Manual Driving';
    case ExplorerStatusParked:
      return 'Parked';
    default:
      return 'Unknown';
  }
};

function ExplorerRouteOverlayInner({
  explorer,
  onHide,
  onClose,
  animatedPosition,
  showPopover = true,
}: ExplorerRouteOverlayProps) {
  const map = useMap();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  const updateScreenPosition = useCallback(() => {
    if (!explorer || !animatedPosition) return;
    const mapPos = ConvertToMapCoords2(animatedPosition.x, animatedPosition.y);
    const point = map.latLngToContainerPoint(mapPos);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, explorer, animatedPosition]);

  useEffect(() => {
    updateScreenPosition();
  }, [updateScreenPosition]);

  useMapEvents({
    move: updateScreenPosition,
    zoom: updateScreenPosition,
  });

  if (!explorer) return null;

  const isMoving =
    explorer.status === ExplorerStatusSelfDriving ||
    explorer.status === ExplorerStatusManualDriving;

  return (
    <>
      {screenPos && showPopover && (
        <Card
          onMouseMove={(e) => e.stopPropagation()}
          onMouseOver={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute z-[1500] p-3 pr-12 min-w-[200px] max-w-[350px] rounded-md pointer-events-auto shadow-lg"
          style={{
            left: screenPos.x + 20,
            top: screenPos.y + 10,
          }}
        >
          <div className="absolute top-2 right-2 flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onHide} title="Hide popover">
              <Iconify icon="mdi:eye-off" width={18} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose} title="Deselect">
              <Iconify icon="mdi:close" width={18} />
            </Button>
          </div>
          <div className="mb-1">
            <span className="text-xs text-muted-foreground">Explorer</span>
            <p className="text-sm font-medium">{explorer.name}</p>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(explorer.status) }}
              />
              <span className="text-xs text-muted-foreground">
                Status: {getStatusLabel(explorer.status)}
              </span>
            </div>
          </div>

          {explorer.fuel && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <Iconify icon="mdi:gas-station" width={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Fuel: {fShortenNumber(explorer.fuel.amount, [], { decimals: 1 })}
                </span>
              </div>
            </div>
          )}

          {explorer.inventory && explorer.inventory.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground block mb-1">Inventory:</span>
              <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto">
                {explorer.inventory.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <img
                      src={`assets/images/satisfactory/64x64/${item.name}.png`}
                      alt={item.name}
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-foreground">
                      {fShortenNumber(item.count, [], { decimals: 1 })}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isMoving && (
            <div className="mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Speed: {explorer.speed.toFixed(0)} km/h
              </span>
            </div>
          )}

          <LocationInfo x={explorer.x} y={explorer.y} z={explorer.z} />
        </Card>
      )}
    </>
  );
}

export const ExplorerRouteOverlay = memo(ExplorerRouteOverlayInner);
