import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';

type Props = {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    series: {
      label: string;
      value: number;
    }[];
  };
  units?: string[];
  className?: string;
};

/**
 * Pie chart component for displaying distribution data.
 * Shows a donut chart with customizable colors and a legend below.
 */
export function AnalyticsPieChart({
  title,
  subheader,
  chart,
  units = MetricUnits,
  className,
}: Props) {
  const chartColors = chart.colors ?? [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
  ];

  const pieData = chart.series.map((item, index) => ({
    id: index,
    name: item.label,
    value: item.value,
    color: chartColors[index % chartColors.length],
  }));

  return (
    <Card className={cn('mb-0 flex h-full flex-col border-0 shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold uppercase tracking-wider">{title}</CardTitle>
        {subheader && (
          <CardDescription className="text-sm text-muted-foreground">{subheader}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="my-6 flex flex-1 justify-center">
        <PieChart width={260} height={260}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={100}
            paddingAngle={5}
            cornerRadius={6}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground">
                  <p className="text-xs text-muted-foreground">{data.name}</p>
                  <p className="text-sm font-semibold">
                    {fShortenNumber(data.value, units, { decimals: 1 })}
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </CardContent>

      <Separator className="border-dashed" />

      <div className="flex flex-wrap justify-center gap-3 p-3">
        {pieData.map((item) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
