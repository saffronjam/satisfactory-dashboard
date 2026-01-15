import { Spinner as ShadcnSpinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps extends Omit<React.ComponentProps<'svg'>, 'size'> {
  /** Size variant for the spinner */
  size?: SpinnerSize;
  /** Show spinner centered in a container */
  centered?: boolean;
  /** Custom label for screen readers (default: "Loading") */
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
  xl: 'size-12',
};

/**
 * Spinner displays an animated loading indicator.
 * Wraps shadcn Spinner with size variants and centering options.
 */
export function Spinner({
  size = 'md',
  centered = false,
  label,
  className,
  ...props
}: SpinnerProps) {
  const spinner = (
    <ShadcnSpinner className={cn(sizeClasses[size], className)} aria-label={label} {...props} />
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[100px]">{spinner}</div>
    );
  }

  return spinner;
}
