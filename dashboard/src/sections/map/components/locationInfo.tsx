import { Box, Typography } from '@mui/material';
import { memo } from 'react';
import { fShortenNumber, LengthUnits } from 'src/utils/format-number';

interface LocationInfoProps {
  x: number;
  y: number;
  z: number;
}

/**
 * Displays location coordinates and altitude in a consistent format.
 * In Satisfactory, Y is vertical (altitude), X and Z are horizontal.
 *
 * Layout:
 * - Coordinates (label dark, value bright right-aligned): X / Z
 * - Altitude (label dark, value bright right-aligned): Y
 */
function LocationInfoInner({ x, y, z }: LocationInfoProps) {
  return (
    <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
          Coordinates
        </Typography>
        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.6rem' }}>
          {fShortenNumber(x / 100, [], { decimals: 0 })} /{' '}
          {fShortenNumber(y / 100, [], { decimals: 0 })}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
          Altitude
        </Typography>
        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.6rem' }}>
          {fShortenNumber(z / 100, LengthUnits, { decimals: 0 })}
        </Typography>
      </Box>
    </Box>
  );
}

export const LocationInfo = memo(LocationInfoInner);
