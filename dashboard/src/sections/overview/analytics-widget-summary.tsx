import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fShortenNumber } from 'src/utils/format-number';

type Props = {
  title: string;
  total: number | string | number[];
  units?: string[] | [string[], string[]];
  icon: React.ReactNode;
  chart: {
    series: number[] | [number[], number[]];
    categories?: string[];
  };
  className?: string;
  color?: '1' | '2' | '3' | '4' | '5'; // Chart color variable (e.g., "1" for --chart-1)
};

/**
 * Summary widget card with sparkline chart for displaying key metrics.
 * Supports single values, dual values with separator, and string content.
 */
export function AnalyticsWidgetSummary({
  icon,
  title,
  total,
  chart,
  units,
  className,
  color = '1',
}: Props) {
  const gradientId = `sparklineGradient-${color}`;
  const gradientId2 = `sparklineGradient-${color}-2`;
  const chartColor = `var(--chart-${color})`;
  const chartColor2 = `var(--chart-5)`; // Use chart-5 for the second line (consumption)

  // Detect if we have dual series (tuple of two arrays)
  const isDualSeries =
    Array.isArray(chart.series) &&
    chart.series.length === 2 &&
    Array.isArray(chart.series[0]) &&
    Array.isArray(chart.series[1]);

  const formatNumber = (value: number, options?: { decimals?: number; index?: number }) => {
    if (units) {
      if (Array.isArray(units[0]) && options?.index !== undefined) {
        const unitArray = (units as [string[], string[]])[options.index];
        return fShortenNumber(value, unitArray, options);
      }
      return fShortenNumber(value, units as string[], options);
    }
    return Math.round(value);
  };

  const chartData = isDualSeries
    ? (chart.series as [number[], number[]])[0].map((value, index) => ({
        name: chart.categories?.[index] ?? index.toString(),
        value,
        value2: (chart.series as [number[], number[]])[1][index],
      }))
    : (chart.series as number[]).map((value, index) => ({
        name: chart.categories?.[index] ?? index.toString(),
        value,
      }));

  const genContent = (value: number | string | number[]) => {
    if (Array.isArray(value)) {
      if (Array.isArray(value) && value.length === 2) {
        const leftNumber = formatNumber(value[0], { decimals: 1, index: 0 });
        const rightNumber = formatNumber(value[1], { decimals: 1, index: 1 });

        return (
          <div className="relative flex min-w-28 grow items-center justify-between">
            <div className="flex-1 text-center">
              <span className="mr-2 text-right text-xl font-semibold text-card-foreground">
                {leftNumber}
              </span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2">
              <span className="text-2xl text-muted-foreground">|</span>
            </div>
            <div className="flex-1 text-center">
              <span className="ml-2 text-left text-xl font-semibold text-card-foreground">
                {rightNumber}
              </span>
            </div>
          </div>
        );
      }
    }

    if (typeof value === 'number') {
      return (
        <div className="min-w-28 grow text-center">
          <span className="text-2xl font-bold text-card-foreground">
            {formatNumber(value, { decimals: 1 })}
          </span>
        </div>
      );
    }

    if (typeof value === 'string') {
      const newLineSplit = value.split('\n');
      return (
        <div className="min-w-28 grow text-card-foreground">
          {newLineSplit.map((line, index) => (
            <div key={index} className="font-mono text-2xl font-bold">
              {line}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <Card
      className={cn('relative flex flex-col justify-between border-0 p-6 shadow-none', className)}
    >
      <CardContent className="flex flex-col p-0">
        <div className="mx-auto my-2 mb-5 h-[38px] w-[38px]">{icon}</div>

        <div className="flex min-h-[100px] grow flex-col items-center">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </div>

          <div className="flex w-full justify-center text-3xl">{genContent(total)}</div>
        </div>

        <div className="mt-0 w-full">
          <ResponsiveContainer width="100%" height={66}>
            <AreaChart data={chartData} margin={{ top: 10, bottom: 10, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
                {isDualSeries && (
                  <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor2} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor2} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <Area
                type="natural"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
              {isDualSeries && (
                <Area
                  type="natural"
                  dataKey="value2"
                  stroke={chartColor2}
                  strokeWidth={2}
                  fill={`url(#${gradientId2})`}
                  isAnimationActive={false}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const value = payload[0].value as number;
                  const value2 = isDualSeries ? (payload[1]?.value as number) : undefined;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground">
                      <p className="text-sm font-semibold">
                        {formatNumber(value, { decimals: 1, index: 0 })}
                        {value2 !== undefined && (
                          <span className="text-muted-foreground">
                            {' '}
                            | {formatNumber(value2, { decimals: 1, index: 1 })}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
