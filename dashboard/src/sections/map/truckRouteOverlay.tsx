import { Box, IconButton, Paper, Typography } from '@mui/material';
import { memo, useEffect, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import {
  Truck,
  TruckStatusManualDriving,
  TruckStatusParked,
  TruckStatusSelfDriving,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';

interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface TruckRouteOverlayProps {
  truck: Truck | null;
  onHide: () => void;
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
  showPopover?: boolean;
}

// Get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case TruckStatusSelfDriving:
    case TruckStatusManualDriving:
      return '#F59E0B'; // Amber - driving
    case TruckStatusParked:
      return '#6b7280'; // Gray - parked
    default:
      return '#6b7280'; // Gray - unknown
  }
};

// Get status label
const getStatusLabel = (status: string): string => {
  switch (status) {
    case TruckStatusSelfDriving:
      return 'Self-Driving';
    case TruckStatusManualDriving:
      return 'Manual Driving';
    case TruckStatusParked:
      return 'Parked';
    default:
      return 'Unknown';
  }
};

function TruckRouteOverlayInner({ truck, onHide, onClose, animatedPosition, showPopover = true }: TruckRouteOverlayProps) {
  const map = useMap();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate screen position from map position
  const updateScreenPosition = useCallback(() => {
    if (!truck || !animatedPosition) return;
    const mapPos = ConvertToMapCoords2(animatedPosition.x, animatedPosition.y);
    const point = map.latLngToContainerPoint(mapPos);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, truck, animatedPosition]);

  // Update position when animated position changes
  useEffect(() => {
    updateScreenPosition();
  }, [updateScreenPosition]);

  // Update position when map moves/zooms
  useMapEvents({
    move: updateScreenPosition,
    zoom: updateScreenPosition,
  });

  if (!truck) return null;

  const isMoving =
    truck.status === TruckStatusSelfDriving || truck.status === TruckStatusManualDriving;

  return (
    <>
      {/* Popover follows truck position */}
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
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Truck
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {truck.name}
            </Typography>
          </Box>

          {/* Status info */}
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(truck.status),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Status: {getStatusLabel(truck.status)}
              </Typography>
            </Box>
          </Box>

          {/* Fuel info */}
          {truck.fuel && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="mdi:gas-station" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Fuel: {fShortenNumber(truck.fuel.amount, MetricUnits, { decimals: 1 })}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Inventory */}
          {truck.inventory && truck.inventory.length > 0 && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                Inventory:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  maxHeight: 100,
                  overflowY: 'auto',
                }}
              >
                {truck.inventory.map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      component="img"
                      src={`assets/images/satisfactory/64x64/${item.name}.png`}
                      alt={item.name}
                      sx={{
                        width: 16,
                        height: 16,
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Typography variant="caption" color="text.primary">
                      {fShortenNumber(item.count, MetricUnits, { decimals: 1 })}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.65rem' }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Speed info (only show when moving) */}
          {isMoving && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Speed: {truck.speed.toFixed(0)} km/h
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}

export const TruckRouteOverlay = memo(TruckRouteOverlayInner);
