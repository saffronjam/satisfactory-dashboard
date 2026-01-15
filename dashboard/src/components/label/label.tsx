import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold leading-none transition-colors cursor-default min-w-6 h-6',
  {
    variants: {
      variant: {
        filled: '',
        outlined: 'bg-transparent border-2',
        soft: '',
        inverted: '',
      },
      color: {
        default: '',
        primary: '',
        secondary: '',
        info: '',
        success: '',
        warning: '',
        error: '',
      },
    },
    compoundVariants: [
      // Default color variants
      {
        variant: 'filled',
        color: 'default',
        className: 'bg-foreground text-background',
      },
      {
        variant: 'outlined',
        color: 'default',
        className: 'border-foreground text-foreground',
      },
      {
        variant: 'soft',
        color: 'default',
        className: 'bg-muted text-muted-foreground',
      },
      {
        variant: 'inverted',
        color: 'default',
        className: 'bg-muted-foreground/30 text-foreground',
      },
      // Primary color variants
      {
        variant: 'filled',
        color: 'primary',
        className: 'bg-primary text-primary-foreground',
      },
      {
        variant: 'outlined',
        color: 'primary',
        className: 'border-primary text-primary',
      },
      {
        variant: 'soft',
        color: 'primary',
        className: 'bg-primary/15 text-primary',
      },
      {
        variant: 'inverted',
        color: 'primary',
        className: 'bg-primary/20 text-primary',
      },
      // Secondary color variants
      {
        variant: 'filled',
        color: 'secondary',
        className: 'bg-secondary text-secondary-foreground',
      },
      {
        variant: 'outlined',
        color: 'secondary',
        className: 'border-secondary text-secondary-foreground',
      },
      {
        variant: 'soft',
        color: 'secondary',
        className: 'bg-secondary/50 text-secondary-foreground',
      },
      {
        variant: 'inverted',
        color: 'secondary',
        className: 'bg-secondary/30 text-secondary-foreground',
      },
      // Info color variants
      {
        variant: 'filled',
        color: 'info',
        className: 'bg-blue-500 text-white',
      },
      {
        variant: 'outlined',
        color: 'info',
        className: 'border-blue-500 text-blue-500',
      },
      {
        variant: 'soft',
        color: 'info',
        className: 'bg-blue-500/15 text-blue-400',
      },
      {
        variant: 'inverted',
        color: 'info',
        className: 'bg-blue-200 text-blue-800',
      },
      // Success color variants
      {
        variant: 'filled',
        color: 'success',
        className: 'bg-green-500 text-white',
      },
      {
        variant: 'outlined',
        color: 'success',
        className: 'border-green-500 text-green-500',
      },
      {
        variant: 'soft',
        color: 'success',
        className: 'bg-green-500/15 text-green-400',
      },
      {
        variant: 'inverted',
        color: 'success',
        className: 'bg-green-200 text-green-800',
      },
      // Warning color variants
      {
        variant: 'filled',
        color: 'warning',
        className: 'bg-yellow-500 text-white',
      },
      {
        variant: 'outlined',
        color: 'warning',
        className: 'border-yellow-500 text-yellow-500',
      },
      {
        variant: 'soft',
        color: 'warning',
        className: 'bg-yellow-500/15 text-yellow-400',
      },
      {
        variant: 'inverted',
        color: 'warning',
        className: 'bg-yellow-200 text-yellow-800',
      },
      // Error color variants
      {
        variant: 'filled',
        color: 'error',
        className: 'bg-red-500 text-white',
      },
      {
        variant: 'outlined',
        color: 'error',
        className: 'border-red-500 text-red-500',
      },
      {
        variant: 'soft',
        color: 'error',
        className: 'bg-red-500/15 text-red-400',
      },
      {
        variant: 'inverted',
        color: 'error',
        className: 'bg-red-200 text-red-800',
      },
    ],
    defaultVariants: {
      variant: 'soft',
      color: 'default',
    },
  }
);

export interface LabelProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>, VariantProps<typeof labelVariants> {
  startIcon?: React.ReactElement | null;
  endIcon?: React.ReactElement | null;
}

/**
 * Label component for displaying status badges and tags with color variants.
 * Supports filled, outlined, soft, and inverted styles with multiple color options.
 */
export const Label = forwardRef<HTMLSpanElement, LabelProps>(
  (
    { children, color = 'default', variant = 'soft', startIcon, endIcon, className, ...props },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          labelVariants({ variant, color }),
          startIcon && 'pl-1.5',
          endIcon && 'pr-1.5',
          className
        )}
        {...props}
      >
        {startIcon && (
          <span className="mr-1.5 size-4 [&_svg]:size-full [&_img]:size-full [&_img]:object-cover">
            {startIcon}
          </span>
        )}
        {typeof children === 'string' ? sentenceCase(children) : children}
        {endIcon && (
          <span className="ml-1.5 size-4 [&_svg]:size-full [&_img]:size-full [&_img]:object-cover">
            {endIcon}
          </span>
        )}
      </span>
    );
  }
);

Label.displayName = 'Label';

function sentenceCase(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
