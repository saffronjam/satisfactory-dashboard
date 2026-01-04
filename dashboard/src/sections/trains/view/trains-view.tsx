import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import {
  Autocomplete,
  Backdrop,
  Box,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  Grid2 as Grid,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import {
  TrainStatus,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusParked,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { ApiContext } from 'src/contexts/api/useApi';
import { DashboardContent } from 'src/layouts/dashboard';
import { varAlpha } from 'src/theme/styles';
import { fNumber, fShortenNumber, MetricUnits, WattUnits } from 'src/utils/format-number';
import { useContextSelector } from 'use-context-selector';
import { Gauge } from '../gauge';
import { TrainList } from '../train-list';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// Status options for dropdown
const statusOptions: { value: TrainStatus; label: string }[] = [
  { value: TrainStatusSelfDriving, label: 'Self Driving' },
  { value: TrainStatusManualDriving, label: 'Manual Driving' },
  { value: TrainStatusDocking, label: 'Docking' },
  { value: TrainStatusParked, label: 'Parked' },
  { value: TrainStatusDerailed, label: 'Derailed' },
];

export function TrainsView() {
  const api = useContextSelector(ApiContext, (v) => {
    return {
      trains: v.trains,
      trainStations: v.trainStations,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });
  const theme = useTheme();

  // Filter state
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<{ value: TrainStatus; label: string }[]>([]);

  // Filter trains based on name and status
  const filteredTrains = useMemo(() => {
    return api.trains.filter((train) => {
      // Name filter (case-insensitive)
      const matchesName =
        nameFilter === '' || train.name.toLowerCase().includes(nameFilter.toLowerCase());

      // Status filter (if any selected)
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.some((s) => s.value === train.status);

      return matchesName && matchesStatus;
    });
  }, [api.trains, nameFilter, statusFilter]);

  const totalPowerConsumption = () =>
    api.trains.reduce((acc, train) => acc + train.powerConsumption, 0);
  const maxPowerConsumption = () => 110 * api.trains.length;
  const avgSpeed = () => {
    if (api.trains.length === 0) return 0;
    return api.trains.reduce((acc, train) => acc + train.speed, 0) / api.trains.length;
  };
  const maxSpeed = () => 120;

  const totalCarried = () =>
    api.trains.reduce((acc, train) => {
      return (
        acc +
        train.vehicles.reduce((acc, vehicle) => {
          return (
            acc +
            vehicle.inventory.reduce((acc, item) => {
              return acc + item.count;
            }, 0)
          );
        }, 0)
      );
    }, 0);

  return (
    <>
      <Backdrop
        open={api.isLoading === true}
        sx={{
          position: 'absolute',
          color: theme.palette.primary.main,
          backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.5),
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {!api.isLoading && (
        <DashboardContent maxWidth="xl">
          <Container sx={{ paddingTop: '50px' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h3">{api.trains.length}</Typography>
                    <Typography variant="inherit">Total Trains</Typography>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h3">
                      {fShortenNumber(totalCarried(), MetricUnits)}
                    </Typography>
                    <Typography variant="inherit">Total Carried</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Power Consumption</Typography>

                    <Gauge value={(totalPowerConsumption() / maxPowerConsumption()) * 100} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">Current</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: 'bold' }}>
                          {fShortenNumber(totalPowerConsumption(), WattUnits, {
                            decimals: 1,
                            ensureConstantDecimals: true,
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">Max</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: 'bold' }}>
                          {fShortenNumber(maxPowerConsumption(), WattUnits, { decimals: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Train Speed (Average)</Typography>

                    <Gauge value={(avgSpeed() / maxSpeed()) * 100} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">Current</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: 'bold' }}>
                          {fNumber(avgSpeed(), { decimals: 0 })} km/h
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">Max</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: 'bold' }}>
                          {fNumber(maxSpeed(), { decimals: 0 })} km/h
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Divider sx={{ mb: '50px', mt: '35px' }} />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                mt: 4,
              }}
            >
              <Typography variant="h4">
                All Trains
                {filteredTrains.length !== api.trains.length && (
                  <Typography component="span" variant="body1" color="textSecondary" sx={{ ml: 1 }}>
                    ({filteredTrains.length} of {api.trains.length})
                  </Typography>
                )}
              </Typography>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Search by name"
                variant="outlined"
                size="small"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Autocomplete
                multiple
                size="small"
                options={statusOptions}
                disableCloseOnSelect
                getOptionLabel={(option) => option.label}
                value={statusFilter}
                onChange={(_, newValue) => setStatusFilter(newValue)}
                renderOption={(props, option, { selected }) => {
                  const { key, ...rest } = props as any;
                  return (
                    <li key={key} {...rest}>
                      <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option.label}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by status" placeholder="Status" />
                )}
                sx={{ flex: 1, minWidth: 0 }}
              />
            </Box>

            <TrainList trains={filteredTrains} trainStations={api.trainStations} />
          </Container>
        </DashboardContent>
      )}
    </>
  );
}
