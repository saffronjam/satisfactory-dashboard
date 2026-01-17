import { Icon } from '@iconify/react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Hub } from 'src/apiTypes';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';

type Props = {
  title?: string;
  subheader?: string;
  hub?: Hub;
  className?: string;
};

/**
 * Card component displaying HUB milestone progress.
 * Shows overall progress bar and individual item requirements with completion status.
 */
export function AnalyticsMilestoneProgress({
  title = 'HUB Milestone',
  subheader,
  hub,
  className,
}: Props) {
  const hasActiveMilestone = hub?.hasActiveMilestone ?? false;
  const activeMilestone = hub?.activeMilestone;
  const costs = activeMilestone?.cost || [];

  const overallProgress =
    costs.length > 0
      ? costs.reduce((acc, obj) => {
          const itemProgress = obj.totalCost > 0 ? obj.amount / obj.totalCost : 0;
          return acc + itemProgress;
        }, 0) / costs.length
      : 0;

  return (
    <Card className={cn('flex h-full flex-col border-0 shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">{title}</CardTitle>
        {subheader && <p className="text-sm text-muted-foreground">{subheader}</p>}
        <CardAction>
          {hasActiveMilestone && activeMilestone ? (
            <span className="text-xs font-medium text-accent-foreground">
              Tier {activeMilestone.techTier}
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">No Active</span>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center">
        {!hub || !hasActiveMilestone || !activeMilestone ? (
          <div className="py-8 text-center">
            <Icon
              icon="mdi:flag-checkered"
              className="mx-auto mb-2 h-20 w-20 text-muted-foreground opacity-50"
            />
            <p className="text-sm text-muted-foreground">No active milestone</p>
          </div>
        ) : (
          <>
            {/* Milestone name */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold">{activeMilestone.name}</h4>
            </div>

            {/* Overall progress bar */}
            <div className="mb-6">
              <div className="mb-1 flex justify-between">
                <span className="text-xs text-muted-foreground">Overall Progress</span>
                <span className="text-xs font-semibold">{(overallProgress * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={overallProgress * 100}
                className={cn(
                  'h-6 rounded-lg bg-muted [&>div]:rounded-lg',
                  overallProgress >= 1 ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'
                )}
              />
            </div>

            {/* Item requirements */}
            <div className="flex flex-col gap-3">
              {costs.map((obj, idx) => {
                const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
                const isComplete = progress >= 100;

                return (
                  <div key={idx}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <img
                          src={`assets/images/satisfactory/64x64/${obj.name}.png`}
                          alt={obj.name}
                          className="h-6 w-6 shrink-0 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="truncate font-medium">{obj.name}</span>
                      </div>
                      <span className={cn('shrink-0 font-medium', isComplete && 'text-green-500')}>
                        {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                        {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={cn(
                        'h-1.5 rounded bg-muted [&>div]:rounded',
                        isComplete ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
