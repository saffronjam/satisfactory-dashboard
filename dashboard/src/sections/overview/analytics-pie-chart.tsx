import Box from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { PieChart } from '@mui/x-charts/PieChart';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    series: {
      label: string;
      value: number;
    }[];
  };
};

export function AnalyticsPieChart({ title, subheader, chart, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.primary.main,
    theme.palette.secondary.dark,
    theme.palette.primary.dark,
    theme.palette.secondary.main,
  ];

  const pieData = chart.series.map((item, index) => ({
    id: index,
    value: item.value,
    label: item.label,
    color: chartColors[index % chartColors.length],
  }));

  return (
    <Card
      {...other}
      sx={{
        boxShadow: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        mb: 0,
      }}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        titleTypographyProps={{ variant: 'overline', fontSize: '16px' }}
      />

      <Box sx={{ my: 6, mx: 'auto', display: 'flex', justifyContent: 'center' }}>
        <PieChart
          series={[
            {
              data: pieData,
              innerRadius: 30,
              paddingAngle: 3,
              cornerRadius: 6,
              highlightScope: { fade: 'global', highlight: 'item' },
              valueFormatter: (item) => fNumber(item.value, { decimals: 0 }),
            },
          ]}
          width={260}
          height={260}
          skipAnimation={false}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
          hideLegend
        />
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        {pieData.map((item) => (
          <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: item.color,
              }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
