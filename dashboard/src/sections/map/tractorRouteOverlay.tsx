import { Box, IconButton, Paper, Typography } from '@mui/material';
import { memo, useEffect, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import {
  Tractor,
  TractorStatusManualDriving,
  TractorStatusParked,
  TractorStatusSelfDriving,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';
import { ConvertToMapCoords2 } from './bounds';

interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface TractorRouteOverlayProps {
  tractor: Tractor | null;
  onHide: () => void;
  onClose: () => void;
  animatedPosition?: AnimatedPosition | null;
  showPopover?: boolean;
}

// Get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case TractorStatusSelfDriving:
    case TractorStatusManualDriving:
      return '#22C55E'; // Green - driving
    case TractorStatusParked:
      return '#6b7280'; // Gray - parked
    default:
      return '#6b7280'; // Gray - unknown
  }
};

// Get status label
const getStatusLabel = (status: string): string => {
  switch (status) {
    case TractorStatusSelfDriving:
      return 'Self-Driving';
    case TractorStatusManualDriving:
      return 'Manual Driving';
    case TractorStatusParked:
      return 'Parked';
    default:
      return 'Unknown';
  }
};

function TractorRouteOverlayInner({
  tractor,
  onHide,
  onClose,
  animatedPosition,
  showPopover = true,
}: TractorRouteOverlayProps) {
  const map = useMap();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate screen position from map position
  const updateScreenPosition = useCallback(() => {
    if (!tractor || !animatedPosition) return;
    const mapPos = ConvertToMapCoords2(animatedPosition.x, animatedPosition.y);
    const point = map.latLngToContainerPoint(mapPos);
    setScreenPos({ x: point.x, y: point.y });
  }, [map, tractor, animatedPosition]);

  // Update position when animated position changes
  useEffect(() => {
    updateScreenPosition();
  }, [updateScreenPosition]);

  // Update position when map moves/zooms
  useMapEvents({
    move: updateScreenPosition,
    zoom: updateScreenPosition,
  });

  if (!tractor) return null;

  const isMoving =
    tractor.status === TractorStatusSelfDriving || tractor.status === TractorStatusManualDriving;

  return (
    <>
      {/* Popover follows tractor position */}
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
              Tractor
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {tractor.name}
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
                  backgroundColor: getStatusColor(tractor.status),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Status: {getStatusLabel(tractor.status)}
              </Typography>
            </Box>
          </Box>

          {/* Fuel info */}
          {tractor.fuel && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="mdi:gas-station" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Fuel: {fShortenNumber(tractor.fuel.amount, MetricUnits, { decimals: 1 })}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Inventory */}
          {tractor.inventory && tractor.inventory.length > 0 && (
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
                {tractor.inventory.map((item, idx) => (
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
                Speed: {tractor.speed.toFixed(0)} km/h
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}

export const TractorRouteOverlay = memo(TractorRouteOverlayInner);
