import { Check } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Schematic, HubMilestone } from 'src/apiTypes';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';

type Props = {
  milestone: Schematic;
  isActive: boolean;
  activeMilestoneData?: HubMilestone;
  tierComplete: boolean;
};

export function MilestoneCard({ milestone, isActive, activeMilestoneData, tierComplete }: Props) {
  const isPurchased = milestone.purchased;
  const costItems = isActive && activeMilestoneData ? activeMilestoneData.cost : milestone.cost;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border p-3 transition-colors',
        tierComplete && 'border-border bg-muted/30',
        !tierComplete && isPurchased && 'border-green-500/40 bg-muted/30 opacity-70',
        !tierComplete && isActive && !isPurchased && 'border-amber-500 bg-amber-500/5',
        !tierComplete && !isPurchased && !isActive && 'border-border bg-muted/20'
      )}
    >
      {isActive && !isPurchased && (
        <Chip variant="warning" className="absolute -top-2 right-2">
          In progress
        </Chip>
      )}
      <div className="flex items-center gap-2">
        {isPurchased && (
          <Check
            className={cn(
              'size-4 shrink-0',
              tierComplete ? 'text-muted-foreground' : 'text-green-500'
            )}
          />
        )}
        <span
          className={cn(
            'text-sm font-medium',
            tierComplete && 'text-muted-foreground',
            !tierComplete && isPurchased && 'text-foreground',
            !tierComplete && !isPurchased && !isActive && 'text-muted-foreground'
          )}
        >
          {milestone.name}
        </span>
      </div>

      {costItems && costItems.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {costItems.map((item, idx) => {
            const progress = item.totalCost > 0 ? (item.amount / item.totalCost) * 100 : 0;
            const isItemComplete = progress >= 100;
            const showProgressBar = isActive || isPurchased;

            const chartColors = [
              '[&>div]:bg-chart-1',
              '[&>div]:bg-chart-2',
              '[&>div]:bg-chart-3',
              '[&>div]:bg-chart-4',
              '[&>div]:bg-chart-5',
            ];
            const colorClass = chartColors[idx % chartColors.length];

            let progressColorClass = colorClass;
            if (tierComplete) {
              progressColorClass = '[&>div]:bg-muted-foreground/50';
            } else if (isPurchased && isItemComplete) {
              progressColorClass = '[&>div]:bg-green-500';
            } else if (isActive) {
              progressColorClass = '[&>div]:bg-amber-500';
            }

            return (
              <div key={item.name}>
                <div
                  className={cn(
                    'flex items-center justify-between gap-2',
                    showProgressBar && 'mb-1'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <img
                      src={`assets/images/satisfactory/64x64/${item.name}.png`}
                      alt={item.name}
                      className="size-4 shrink-0 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="truncate text-xs text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {showProgressBar
                      ? `${fShortenNumber(item.amount, MetricUnits, { decimals: 0 })} / ${fShortenNumber(item.totalCost, MetricUnits, { decimals: 0 })}`
                      : fShortenNumber(item.totalCost, MetricUnits, { decimals: 0 })}
                  </span>
                </div>
                {showProgressBar && (
                  <Progress
                    value={Math.min(progress, 100)}
                    className={cn('h-1.5 rounded bg-muted [&>div]:rounded', progressColorClass)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
