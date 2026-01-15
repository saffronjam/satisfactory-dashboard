import { Icon } from '@iconify/react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

import type { IconifyProps } from './types';

/**
 * Iconify wrapper component that provides consistent styling and sizing for icons.
 * Uses @iconify/react under the hood with Tailwind styling support.
 */
export const Iconify = forwardRef<SVGSVGElement, IconifyProps>(
  ({ className, width = 20, style, ...other }, ref) => (
    <Icon
      ref={ref}
      className={cn('shrink-0 inline-flex', className)}
      style={{
        width,
        height: width,
        ...style,
      }}
      {...other}
    />
  )
);

Iconify.displayName = 'Iconify';
