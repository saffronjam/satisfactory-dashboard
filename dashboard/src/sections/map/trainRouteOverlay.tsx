import { LatLngExpression } from 'leaflet';
import { memo, useCallback, useEffect, useState } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import {
  Train,
  TrainStation,
  TrainStatusDocking,
  TrainTypeLocomotive,
  TrainVehicle,
} from 'src/apiTypes';
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

interface TrainRouteOverlayProps {
  train: Train | null;
  trainStations: TrainStation[];
  onHide: () => void;
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
  showPopover?: boolean;
}

// Find station by name
const findStationByName = (name: string, stations: TrainStation[]): TrainStation | undefined => {
  return stations.find((s) => s.name === name);
};

// Get icon for train vehicle
const getVehicleIcon = (vehicle: TrainVehicle): string => {
  if (vehicle.type === TrainTypeLocomotive) {
    return 'mdi:train-car-caboose';
  }
  // Freight cart
  if (!vehicle.inventory || vehicle.inventory.length === 0) {
    return 'mdi:train-car-centerbeam'; // Empty
  }
  return 'mdi:train-car-centerbeam-full'; // Has items
};

// Get color for train vehicle based on load
const getVehicleColor = (vehicle: TrainVehicle): string => {
  if (vehicle.type === TrainTypeLocomotive) {
    return '#6b7280'; // Gray for locomotive
  }
  if (!vehicle.inventory || vehicle.inventory.length === 0) {
    return '#9ca3af'; // Light gray for empty
  }
  return '#f59e0b'; // Amber for loaded
};

function TrainRouteOverlayInner({
  train,
  trainStations,
  onHide,
  onClose,
  animatedPosition,
  showPopover = true,
}: TrainRouteOverlayProps) {
  const map = useMap();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate screen position from map position
  const updateScreenPosition = useCallback(() => {
    if (!train || !animatedPosition) return;
    const mapPos = ConvertToMapCoords2(animatedPosition.x, animatedPosition.y);
    const point = map.latLngToContainerPoint(mapPos);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, train, animatedPosition]);

  // Update position when animated position changes
  useEffect(() => {
    updateScreenPosition();
  }, [updateScreenPosition]);

  // Update position when map moves/zooms
  useMapEvents({
    move: updateScreenPosition,
    zoom: updateScreenPosition,
  });

  if (!train || train.timetable.length === 0) return null;

  // Use passed animated position, or fall back to train's raw position
  const animatedPos = animatedPosition ?? { x: train.x, y: train.y, rotation: train.rotation };
  if (!animatedPos) return null;

  // Get current train position in map coordinates
  const trainMapPos = ConvertToMapCoords2(animatedPos.x, animatedPos.y);

  // Get previous and next stations from timetable
  const timetableLength = train.timetable.length;
  const currentIndex = train.timetableIndex;
  const prevIndex = currentIndex === 0 ? timetableLength - 1 : currentIndex - 1;

  const prevStationName = train.timetable[prevIndex]?.station;
  const nextStationName = train.timetable[currentIndex]?.station;

  const prevStation = prevStationName
    ? findStationByName(prevStationName, trainStations)
    : undefined;
  const nextStation = nextStationName
    ? findStationByName(nextStationName, trainStations)
    : undefined;

  // Get station positions
  const prevStationPos: LatLngExpression | null = prevStation
    ? ConvertToMapCoords2(prevStation.x, prevStation.y)
    : null;
  const nextStationPos: LatLngExpression | null = nextStation
    ? ConvertToMapCoords2(nextStation.x, nextStation.y)
    : null;

  // Check if docking
  const isDocking = train.status === TrainStatusDocking;
  const dockingStationName = isDocking ? nextStationName : null;

  // Reverse vehicles array so locomotive is on the right (front of train)
  const vehiclesReversed = [...(train.vehicles || [])].reverse();

  return (
    <>
      {/* Line FROM previous station (static) - not shown when docking */}
      {!isDocking && prevStationPos && (
        <Polyline
          positions={[prevStationPos, trainMapPos]}
          pathOptions={{
            color: '#4b5563',
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}

      {/* Line TO next station (animated dashed) - not shown when docking */}
      {!isDocking && nextStationPos && (
        <Polyline
          positions={[trainMapPos, nextStationPos]}
          pathOptions={{
            color: '#15803d',
            weight: 5,
            opacity: 0.9,
            dashArray: '12, 16',
          }}
          className="animated-route-line"
        />
      )}

      {/* Popover follows train position */}
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
            <span className="text-xs text-muted-foreground">Train</span>
            <p className="text-sm font-medium">{train.name}</p>
          </div>

          {/* Docking status OR route info */}
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
                {prevStation && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                    <span className="text-xs text-muted-foreground">From: {prevStation.name}</span>
                  </div>
                )}
                {nextStation && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-700" />
                    <span className="text-xs text-muted-foreground">To: {nextStation.name}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Train composition with inventory */}
          {vehiclesReversed.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border max-w-full overflow-x-auto">
              <div className="flex gap-0 items-start min-w-min">
                {vehiclesReversed.map((vehicle, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[50px] max-w-[90px]">
                    {/* Vehicle icon */}
                    <Iconify
                      icon={getVehicleIcon(vehicle)}
                      width={42}
                      className="-mx-0.5"
                      style={{ color: getVehicleColor(vehicle) }}
                    />
                    {/* Inventory items */}
                    {vehicle.inventory && vehicle.inventory.length > 0 && (
                      <div className="flex flex-col items-center gap-0.5 mt-1 max-h-[70px] overflow-y-auto">
                        {vehicle.inventory.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-0.5">
                            <img
                              src={`assets/images/satisfactory/64x64/${item.name}.png`}
                              alt={item.name}
                              className="w-3.5 h-3.5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="text-[0.6rem] leading-none text-foreground whitespace-nowrap">
                              {fShortenNumber(item.count, [], { decimals: 1 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Front indicator */}
                <span className="text-[0.6rem] text-muted-foreground/50 self-center ml-1">→</span>
              </div>
            </div>
          )}

          {/* Speed info */}
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Speed: {train.speed.toFixed(0)} km/h
            </span>
          </div>

          <LocationInfo x={train.x} y={train.y} z={train.z} />
        </Card>
      )}

      {/* CSS for animated dashed line and docking indicator */}
      <style>
        {`
          .animated-route-line path {
            animation: dash-animation 0.8s linear infinite;
          }
          @keyframes dash-animation {
            from {
              stroke-dashoffset: 56;
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

export const TrainRouteOverlay = memo(TrainRouteOverlayInner);
