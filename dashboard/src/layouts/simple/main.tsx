import { cn } from '@/lib/utils';

export type MainProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Main content wrapper for simple layout.
 * Provides flex container for page content.
 */
export function Main({ children, className }: MainProps) {
  return <main className={cn('flex flex-1 flex-col', className)}>{children}</main>;
}

export type CompactContentProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Compact content container for centered, narrow content.
 * Used for login forms, error messages, and similar focused content.
 */
export function CompactContent({ children, className }: CompactContentProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 text-center md:px-0 md:py-10',
        className
      )}
    >
      {children}
    </div>
  );
}
