import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories?: string[];
    series: {
      name: string;
      data: number[];
    }[];
  };
  className?: string;
};

/**
 * Bar chart component for displaying comparison data across categories.
 * Supports multiple data series with customizable colors.
 */
export function AnalyticsWebsiteVisits({ title, subheader, chart, className }: Props) {
  const chartColors = chart.colors ?? [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
  ];

  const chartData = (chart.categories ?? []).map((category, index) => {
    const dataPoint: Record<string, string | number> = { name: category };
    chart.series.forEach((s) => {
      dataPoint[s.name] = s.data[index] ?? 0;
    });
    return dataPoint;
  });

  return (
    <Card className={cn('border-0 shadow-none', className)}>
      <CardHeader className="pb-2">
        {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
        {subheader && (
          <CardDescription className="text-sm text-muted-foreground">{subheader}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={364}>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))',
              }}
              cursor={{ fill: 'hsl(var(--accent))' }}
            />
            <Legend
              wrapperStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value) => (
                <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
              )}
            />
            {chart.series.map((s, index) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={chartColors[index % chartColors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
