import { Box, IconButton, Paper, Typography } from '@mui/material';
import { LatLngExpression } from 'leaflet';
import { memo, useCallback, useEffect, useState } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Drone, DroneStation, DroneStatusDocking, DroneStatusFlying } from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';

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
        <Paper
          elevation={8}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseOver={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            left: screenPos.x + 20,
            top: screenPos.y + 10,
            zIndex: 1500,
            p: 2,
            pr: 6,
            minWidth: 200,
            maxWidth: 350,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            pointerEvents: 'auto',
          }}
        >
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={onHide} title="Hide popover">
              <Iconify icon="mdi:eye-off" width={18} />
            </IconButton>
            <IconButton size="small" onClick={onClose} title="Deselect">
              <Iconify icon="mdi:close" width={18} />
            </IconButton>
          </Box>
          <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
            Drone
          </Typography>

          {/* Status and route info */}
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
                {/* Status indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(drone.status),
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Status: {getStatusLabel(drone.status)}
                  </Typography>
                </Box>

                {/* Route info (only when flying) */}
                {isFlying && (
                  <>
                    {sourceStation && (
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
                          From: {sourceStation.name}
                        </Typography>
                      </Box>
                    )}
                    {destinationStation && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#8B5CF6',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          To: {destinationStation.name}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* Home station (when idle) */}
                {!isFlying && drone.home && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify icon="mdi:home" width={14} sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      Home: {drone.home.name}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Destination station fuel info */}
          {destinationStation?.fuel && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="mdi:gas-station" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Dest. Fuel:{' '}
                  {fShortenNumber(destinationStation.fuel.amount, MetricUnits, { decimals: 1 })}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Speed info */}
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Speed: {drone.speed.toFixed(0)} km/h
            </Typography>
          </Box>
        </Paper>
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
