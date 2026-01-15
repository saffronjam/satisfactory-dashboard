import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fNumber } from 'src/utils/format-number';

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
  className?: string;
};

/**
 * Pie chart component for displaying distribution data.
 * Shows a donut chart with customizable colors and a legend below.
 */
export function AnalyticsPieChart({ title, subheader, chart, className }: Props) {
  const chartColors = chart.colors ?? [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
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
        <ResponsiveContainer width={260} height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={100}
              paddingAngle={3}
              cornerRadius={6}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => [fNumber(value, { decimals: 0 }), '']}
            />
          </PieChart>
        </ResponsiveContainer>
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
