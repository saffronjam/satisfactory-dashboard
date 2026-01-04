import Box from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { SpaceElevator } from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, MetricUnits } from 'src/utils/format-number';

import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  spaceElevator?: SpaceElevator;
};

export function AnalyticsSpaceElevatorProgress({
  title = 'Space Elevator',
  subheader,
  spaceElevator,
  ...other
}: Props) {
  const theme = useTheme();

  const phases = spaceElevator?.currentPhase || [];
  const isFullyUpgraded = spaceElevator?.fullyUpgraded ?? false;
  const isUpgradeReady = spaceElevator?.upgradeReady ?? false;

  // Calculate overall progress for the current phase
  const overallProgress =
    phases.length > 0
      ? phases.reduce((acc, obj) => {
          const itemProgress = obj.totalCost > 0 ? obj.amount / obj.totalCost : 0;
          return acc + itemProgress;
        }, 0) / phases.length
      : 0;

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
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isFullyUpgraded ? (
              <Typography
                variant="caption"
                sx={{
                  color: '#22c55e',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                Fully Upgraded
              </Typography>
            ) : isUpgradeReady ? (
              <Typography
                variant="caption"
                sx={{
                  color: '#f59e0b',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                Upgrade Ready
              </Typography>
            ) : (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              >
                In Progress
              </Typography>
            )}
          </Box>
        }
      />

      <Box
        sx={{
          flex: 1,
          px: 3,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {!spaceElevator ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Iconify
              icon="pepicons-pencil:building-off"
              width={80}
              sx={{
                color: 'text.disabled',
                opacity: 0.5,
                mb: 2,
              }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Space Elevator is not built
            </Typography>
          </Box>
        ) : isFullyUpgraded ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" sx={{ color: '#22c55e', mb: 1 }}>
              Project Complete
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All phases delivered
            </Typography>
          </Box>
        ) : (
          <>
            {/* Overall progress bar */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Overall Progress
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {(overallProgress * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallProgress * 100}
                sx={{
                  height: 24,
                  borderRadius: 2,
                  backgroundColor: varAlpha(theme.palette.grey['500Channel'], 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#9333EA',
                    borderRadius: 2,
                  },
                }}
              />
            </Box>

            {/* Phase requirements */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {phases.map((obj, idx) => {
                const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
                const isComplete = progress >= 100;

                return (
                  <Box key={idx}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Box
                          component="img"
                          src={`assets/images/satisfactory/64x64/${obj.name}.png`}
                          alt={obj.name}
                          sx={{
                            width: 24,
                            height: 24,
                            objectFit: 'contain',
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {obj.name}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          flexShrink: 0,
                          fontWeight: 500,
                          color: isComplete ? '#22c55e' : 'text.primary',
                        }}
                      >
                        {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                        {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(progress, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        backgroundColor: varAlpha(theme.palette.grey['500Channel'], 0.2),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: isComplete ? '#22c55e' : '#9333EA',
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
}
