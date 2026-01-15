import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  /** Additional CSS classes */
  className?: string;
  /** Number of card skeletons to show (default: 4) */
  cardCount?: number;
  /** Show a header skeleton at the top */
  showHeader?: boolean;
  /** Variant for different page layouts */
  variant?: 'default' | 'grid' | 'list';
}

/**
 * PageLoading displays a skeleton layout for full-page loading states.
 * Provides consistent loading UI across all dashboard pages.
 */
export function PageLoading({
  className,
  cardCount = 4,
  showHeader = true,
  variant = 'default',
}: PageLoadingProps) {
  return (
    <div className={cn('container pt-12 animate-in fade-in duration-300', className)}>
      {showHeader && (
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {variant === 'default' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
