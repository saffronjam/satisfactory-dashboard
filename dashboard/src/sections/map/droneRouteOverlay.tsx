import { LatLngExpression } from 'leaflet';
import { memo, useCallback, useEffect, useState } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Drone, DroneStation, DroneStatusDocking, DroneStatusFlying } from 'src/apiTypes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';
import { LocationInfo } from './components/locationInfo';

interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface DroneRouteOverlayProps {
  drone: Drone | null;
  droneStations: DroneStation[];
  onHide: () => void;
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
  showPopover?: boolean;
}

// Get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case DroneStatusFlying:
      return '#8B5CF6'; // Purple - flying
    case DroneStatusDocking:
      return '#3b82f6'; // Blue - docking
    default:
      return '#6b7280'; // Gray - idle
  }
};

// Get status label
const getStatusLabel = (status: string): string => {
  switch (status) {
    case DroneStatusFlying:
      return 'Flying';
    case DroneStatusDocking:
      return 'Docking';
    default:
      return 'Idle';
  }
};

function DroneRouteOverlayInner({
  drone,
  droneStations: _droneStations,
  onHide,
  onClose,
  animatedPosition,
  showPopover = true,
}: DroneRouteOverlayProps) {
  const map = useMap();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate screen position from map position
  const updateScreenPosition = useCallback(() => {
    if (!drone || !animatedPosition) return;
    const mapPos = ConvertToMapCoords2(animatedPosition.x, animatedPosition.y);
    const point = map.latLngToContainerPoint(mapPos);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, drone, animatedPosition]);

  // Update position when animated position changes
  useEffect(() => {
    updateScreenPosition();
  }, [updateScreenPosition]);

  // Update position when map moves/zooms
  useMapEvents({
    move: updateScreenPosition,
    zoom: updateScreenPosition,
  });

  if (!drone) return null;

  // Use passed animated position, or fall back to drone's raw position
  const animatedPos = animatedPosition ?? {
    x: drone.x ?? 0,
    y: drone.y ?? 0,
    rotation: drone.rotation ?? 0,
  };
  if (!animatedPos) return null;

  // Get current drone position in map coordinates
  const droneMapPos = ConvertToMapCoords2(animatedPos.x, animatedPos.y);

  // Determine source and destination stations
  const isFlying = drone.status === DroneStatusFlying;
  const isDocking = drone.status === DroneStatusDocking;

  // Source station: home or paired (whichever it left from)
  const sourceStation = drone.paired ?? drone.home;
  const destinationStation = drone.destination;

  // Get station positions
  const sourceStationPos: LatLngExpression | null = sourceStation
    ? ConvertToMapCoords2(sourceStation.x, sourceStation.y)
    : null;
  const destStationPos: LatLngExpression | null = destinationStation
    ? ConvertToMapCoords2(destinationStation.x, destinationStation.y)
    : null;

  // Get docking station (if docking)
  const dockingStationName = isDocking ? (destinationStation?.name ?? sourceStation?.name) : null;

  return (
    <>
      {/* Line FROM source station (static) - not shown when docking */}
      {!isDocking && isFlying && sourceStationPos && (
        <Polyline
          positions={[sourceStationPos, droneMapPos]}
          pathOptions={{
            color: '#4b5563',
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}

      {/* Line TO destination station (animated dashed) - not shown when docking */}
      {!isDocking && isFlying && destStationPos && (
        <Polyline
          positions={[droneMapPos, destStationPos]}
          pathOptions={{
            color: '#8B5CF6',
            weight: 5,
            opacity: 0.9,
            dashArray: '8, 4',
          }}
          className="animated-drone-route-line"
        />
      )}

      {/* Popover follows drone position */}
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
          <p className="text-sm font-medium mb-1">Drone</p>

          {/* Status and route info */}
          <div className="mt-2 flex flex-col gap-1">
            {isDocking && dockingStationName ? (
              <div className="flex items-center gap-2">
                <div className="docking-indicator w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Docking at: {dockingStationName}
                </span>
              </div>
            ) : (
              <>
                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(drone.status) }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Status: {getStatusLabel(drone.status)}
                  </span>
                </div>

                {/* Route info (only when flying) */}
                {isFlying && (
                  <>
                    {sourceStation && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                        <span className="text-xs text-muted-foreground">
                          From: {sourceStation.name}
                        </span>
                      </div>
                    )}
                    {destinationStation && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <span className="text-xs text-muted-foreground">
                          To: {destinationStation.name}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Home station (when idle) */}
                {!isFlying && drone.home && (
                  <div className="flex items-center gap-2">
                    <Iconify icon="mdi:home" width={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Home: {drone.home.name}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Destination station fuel info */}
          {destinationStation?.fuel && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <Iconify icon="mdi:gas-station" width={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Dest. Fuel: {fShortenNumber(destinationStation.fuel.amount, [], { decimals: 1 })}
                </span>
              </div>
            </div>
          )}

          {/* Speed info */}
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Speed: {drone.speed.toFixed(0)} km/h
            </span>
          </div>

          <LocationInfo x={drone.x ?? 0} y={drone.y ?? 0} z={drone.z} />
        </Card>
      )}

      {/* CSS for animated dashed line and docking indicator */}
      <style>
        {`
          .animated-drone-route-line path {
            animation: drone-dash-animation 0.8s linear infinite;
          }
          @keyframes drone-dash-animation {
            from {
              stroke-dashoffset: 24;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .docking-indicator {
            animation: docking-pulse 1.5s ease-in-out infinite;
          }
          @keyframes docking-pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.4;
              transform: scale(0.8);
            }
          }
        `}
      </style>
    </>
  );
}

export const DroneRouteOverlay = memo(DroneRouteOverlayInner);
