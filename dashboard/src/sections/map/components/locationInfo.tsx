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
    <div className="mt-1 pt-1 border-t border-border">
      <div className="flex gap-2 justify-between items-center">
        <span className="text-[0.6rem] text-muted-foreground">Coordinates</span>
        <span className="text-[0.6rem] text-foreground">
          {fShortenNumber(x / 100, [], { decimals: 0 })} /{' '}
          {fShortenNumber(y / 100, [], { decimals: 0 })}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[0.6rem] text-muted-foreground">Altitude</span>
        <span className="text-[0.6rem] text-foreground">
          {fShortenNumber(z / 100, LengthUnits, { decimals: 0 })}
        </span>
      </div>
    </div>
  );
}

export const LocationInfo = memo(LocationInfoInner);
