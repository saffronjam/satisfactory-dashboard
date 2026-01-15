import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Timeline component that displays a vertical list of events with connecting lines.
 * Replaces MUI Lab Timeline components with a Tailwind-based implementation.
 */
const Timeline = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative space-y-0', className)} {...props} />
  )
);
Timeline.displayName = 'Timeline';

/**
 * Individual item within a Timeline containing separator and content.
 */
const TimelineItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative flex gap-4', className)} {...props} />
  )
);
TimelineItem.displayName = 'TimelineItem';

/**
 * Container for the dot and connector line in a timeline item.
 */
const TimelineSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col items-center', className)} {...props} />
  )
);
TimelineSeparator.displayName = 'TimelineSeparator';

const timelineDotVariants = cva('h-3 w-3 rounded-full shrink-0', {
  variants: {
    color: {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      success: 'bg-green-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    },
  },
  defaultVariants: {
    color: 'primary',
  },
});

export interface TimelineDotProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof timelineDotVariants> {}

/**
 * Circular dot indicator for a timeline event. Supports color variants for different event types.
 */
const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, color, ...props }, ref) => (
    <div ref={ref} className={cn(timelineDotVariants({ color }), className)} {...props} />
  )
);
TimelineDot.displayName = 'TimelineDot';

/**
 * Vertical line connecting timeline items. Omit for the last item in the list.
 */
const TimelineConnector = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('w-px grow bg-border', className)} {...props} />
  )
);
TimelineConnector.displayName = 'TimelineConnector';

/**
 * Container for the content displayed next to a timeline dot.
 */
const TimelineContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 pb-4', className)} {...props} />
  )
);
TimelineContent.displayName = 'TimelineContent';

export {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
};
