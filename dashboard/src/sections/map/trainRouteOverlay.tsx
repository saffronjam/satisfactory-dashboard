import { Box, IconButton, Paper, Typography } from '@mui/material';
import { Iconify } from 'src/components/iconify';
import { LatLngExpression } from 'leaflet';
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import {
  Train,
  TrainStation,
  TrainStatusDocking,
  TrainTypeLocomotive,
  TrainVehicle,
} from 'src/apiTypes';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';

interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface TrainRouteOverlayProps {
  train: Train | null;
  trainStations: TrainStation[];
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
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
  onClose,
  animatedPosition,
}: TrainRouteOverlayProps) {
  const map = useMap();
  const popoverRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!train) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [train, onClose]);

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
      {screenPos && (
        <Paper
          ref={popoverRef}
          elevation={8}
          sx={{
            position: 'absolute',
            left: screenPos.x + 20,
            top: screenPos.y + 10,
            zIndex: 1500,
            p: 2,
            pr: 4.5,
            minWidth: 200,
            maxWidth: 350,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            pointerEvents: 'auto',
          }}
        >
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Train
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {train.name}
            </Typography>
          </Box>

          {/* Docking status OR route info */}
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {isDocking && dockingStationName ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  className="docking-indicator"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Docking at: {dockingStationName}
                </Typography>
              </Box>
            ) : (
              <>
                {prevStation && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#4b5563',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      From: {prevStation.name}
                    </Typography>
                  </Box>
                )}
                {nextStation && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#15803d',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      To: {nextStation.name}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Train composition with inventory */}
          {vehiclesReversed.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
                maxWidth: '100%',
                overflowX: 'auto',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 0,
                  alignItems: 'flex-start',
                  minWidth: 'min-content',
                }}
              >
                {vehiclesReversed.map((vehicle, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: 50,
                      maxWidth: 90,
                    }}
                  >
                    {/* Vehicle icon */}
                    <Iconify
                      icon={getVehicleIcon(vehicle)}
                      width={42}
                      sx={{ color: getVehicleColor(vehicle), mx: -0.25 }}
                    />
                    {/* Inventory items */}
                    {vehicle.inventory && vehicle.inventory.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.25,
                          mt: 0.5,
                          maxHeight: 70,
                          overflowY: 'auto',
                        }}
                      >
                        {vehicle.inventory.map((item, itemIdx) => (
                          <Box
                            key={itemIdx}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.25,
                            }}
                          >
                            <Box
                              component="img"
                              src={`assets/images/satisfactory/64x64/${item.name}.png`}
                              alt={item.name}
                              sx={{
                                width: 14,
                                height: 14,
                                objectFit: 'contain',
                              }}
                              onError={(e) => {
                                // Hide image if not found
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.6rem',
                                lineHeight: 1,
                                color: 'text.primary',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fShortenNumber(item.count, MetricUnits, { decimals: 1 })}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
                {/* Front indicator */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem',
                    color: 'text.disabled',
                    alignSelf: 'center',
                    ml: 0.5,
                  }}
                >
                  →
                </Typography>
              </Box>
            </Box>
          )}

          {/* Speed info */}
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Speed: {train.speed.toFixed(0)} km/h
            </Typography>
          </Box>
        </Paper>
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
