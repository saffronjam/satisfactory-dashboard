import { cn } from '@/lib/utils';

type ChipVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

type Props = {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
};

const variantStyles: Record<ChipVariant, string> = {
  success: 'bg-green-600 text-white',
  warning: 'bg-amber-500 text-black',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  default: 'bg-muted text-muted-foreground',
};

export function Chip({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
