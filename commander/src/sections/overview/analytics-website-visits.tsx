import Box from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { alpha as hexAlpha, useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';

// ----------------------------------------------------------------------

type Props = CardProps & {
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
};

export function AnalyticsWebsiteVisits({ title, subheader, chart, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.primary.dark,
    hexAlpha(theme.palette.primary.light, 0.64),
  ];

  const barSeries = chart.series.map((s, index) => ({
    data: s.data,
    label: s.name,
    color: chartColors[index % chartColors.length],
  }));

  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ py: 2.5, pl: 1, pr: 2.5 }}>
        <BarChart
          series={barSeries}
          xAxis={[
            {
              data: chart.categories ?? [],
              scaleType: 'band',
            },
          ]}
          height={364}
          slotProps={{
            legend: {
              direction: 'horizontal',
              position: { vertical: 'top', horizontal: 'end' },
            },
          }}
        />
      </Box>
    </Card>
  );
}
