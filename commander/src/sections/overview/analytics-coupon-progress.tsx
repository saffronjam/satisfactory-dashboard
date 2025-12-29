import Box from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  available: number;
  progress: number;
  color?: string;
};

export function AnalyticsCouponsProgress({
  title = 'Coupon Progress',
  subheader,
  available,
  progress,
  color = 'primary',
  ...other
}: Props) {
  const theme = useTheme();

  const progressPercent = progress * 100;

  return (
    <Card
      {...other}
      sx={{
        boxShadow: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        titleTypographyProps={{ variant: 'overline', fontSize: '16px' }}
      />

      <Box
        sx={{
          flex: 1,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Gauge
          value={progressPercent}
          startAngle={-110}
          endAngle={110}
          width={260}
          height={200}
          cornerRadius="50%"
          sx={{
            [`& .${gaugeClasses.valueText}`]: {
              fontSize: 22,
              fontWeight: 'bold',
              transform: 'translate(0px, 0px)',
            },
            [`& .${gaugeClasses.valueArc}`]: {
              fill: theme.palette.primary.main,
            },
            [`& .${gaugeClasses.referenceArc}`]: {
              fill: varAlpha(theme.palette.grey['500Channel'], 0.2),
            },
          }}
          text={({ value }) => `${value?.toFixed(1)}%`}
        />
        <Typography
          variant="body2"
          sx={{
            color: varAlpha(theme.palette.text.primaryChannel, 0.6),
            mt: -2,
          }}
        >
          {Math.round(available)} Coupons Available
        </Typography>
      </Box>
    </Card>
  );
}
