import GaugeComponent from 'react-gauge-component';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  subheader?: string;
  available: number;
  progress: number;
  className?: string;
};

/**
 * Gauge component displaying coupon collection progress.
 * Shows percentage completion and available coupon count.
 */
export function AnalyticsCouponsProgress({
  title = 'Coupon Progress',
  subheader,
  available,
  progress,
  className,
}: Props) {
  const progressPercent = progress * 100;

  return (
    <Card className={cn('flex h-full flex-col border-0 shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">{title}</CardTitle>
        {subheader && (
          <CardDescription className="text-sm text-muted-foreground">{subheader}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="relative mx-auto flex flex-1 flex-col items-center justify-center">
        <GaugeComponent
          type="semicircle"
          arc={{
            width: 0.2,
            padding: 0.005,
            cornerRadius: 10,
            subArcs: [
              {
                limit: progressPercent,
                color: 'hsl(var(--chart-1))',
                showTick: false,
              },
              {
                color: 'hsl(var(--muted))',
                showTick: false,
              },
            ],
          }}
          pointer={{
            type: 'needle',
            color: 'hsl(var(--foreground))',
            length: 0.7,
            width: 12,
          }}
          labels={{
            valueLabel: {
              formatTextValue: (value) => `${value.toFixed(1)}%`,
              style: {
                fontSize: '36px',
                fill: 'hsl(var(--foreground))',
                textShadow: 'none',
              },
            },
            tickLabels: {
              type: 'outer',
              ticks: [{ value: 0 }, { value: 50 }, { value: 100 }],
              defaultTickValueConfig: {
                style: {
                  fontSize: '10px',
                  fill: 'hsl(var(--muted-foreground))',
                },
              },
            },
          }}
          value={progressPercent}
          minValue={0}
          maxValue={100}
          style={{ width: '260px', height: '200px' }}
        />
        <p className="-mt-2 text-sm text-muted-foreground">
          {Math.round(available)} Coupons Available
        </p>
      </CardContent>
    </Card>
  );
}
