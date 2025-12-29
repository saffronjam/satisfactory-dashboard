import { DashboardContent } from "src/layouts/dashboard";
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
} from "@mui/material";
import { Gauge } from "src/sections/trains/gauge";
import { DroneList } from "../drone-list";
import { useContextSelector } from "use-context-selector";
import { ApiContext } from "src/contexts/api/useApi";
import { varAlpha } from "src/theme/styles";
import { fNumber } from "src/utils/format-number";
import { DroneStatus, DroneStatusFlying, DroneStatusIdle, DroneStatusDocking } from "src/apiTypes";
import { useState, useMemo } from "react";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// Status options for dropdown
const statusOptions: { value: DroneStatus; label: string }[] = [
  { value: DroneStatusFlying, label: "Flying" },
  { value: DroneStatusDocking, label: "Docking" },
  { value: DroneStatusIdle, label: "Idle" },
];

export function DronesView() {
  const api = useContextSelector(ApiContext, (v) => {
    return {
      drones: v.drones,
      droneStations: v.droneStations,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });
  const theme = useTheme();

  // Filter state
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<{ value: DroneStatus; label: string }[]>([]);

  // Filter drones based on name and status
  const filteredDrones = useMemo(() => {
    return api.drones.filter((drone) => {
      // Name filter (case-insensitive)
      const matchesName =
        nameFilter === "" || drone.name.toLowerCase().includes(nameFilter.toLowerCase());

      // Status filter (if any selected)
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.some((s) => s.value === drone.status);

      return matchesName && matchesStatus;
    });
  }, [api.drones, nameFilter, statusFilter]);

  const avgSpeed = () => {
    if (api.drones.length === 0) return 0;
    return api.drones.reduce((acc, drone) => acc + drone.speed, 0) / api.drones.length;
  };
  const maxSpeed = () => 252;

  // Count drones by status
  const countByStatus = (status: string) => api.drones.filter((d) => d.status === status).length;

  return (
    <>
      <Backdrop
        open={api.isLoading === true}
        sx={{
          color: theme.palette.primary.main,
          backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.5),
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {!api.isLoading && (
        <DashboardContent maxWidth="xl">
          <Container sx={{ paddingTop: "50px" }}>
            <Grid container spacing={2}>
              {/* Total Drones */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h3">{api.drones.length}</Typography>
                    <Typography variant="inherit">Total Drones</Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h3">{api.droneStations.length}</Typography>
                    <Typography variant="inherit">Total Stations</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status Breakdown */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Status
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="textSecondary">
                          Flying
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="success.main">
                          {countByStatus(DroneStatusFlying)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="textSecondary">
                          Docking
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="warning.main">
                          {countByStatus(DroneStatusDocking)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="textSecondary">
                          Idle
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="info.main">
                          {countByStatus(DroneStatusIdle)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Speed Gauge */}
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Drone Speed (Average)</Typography>

                    <Gauge value={(avgSpeed() / maxSpeed()) * 100} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body2">Current</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: "bold" }}>
                          {fNumber(avgSpeed(), { decimals: 0 })} km/h
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body2">Max</Typography>
                        <Typography variant="body1" sx={{ pl: 0.5, fontWeight: "bold" }}>
                          {fNumber(maxSpeed(), { decimals: 0 })} km/h
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ mb: "50px", mt: "35px" }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                mt: 4,
              }}
            >
              <Typography variant="h4">
                All Drones
                {filteredDrones.length !== api.drones.length && (
                  <Typography component="span" variant="body1" color="textSecondary" sx={{ ml: 1 }}>
                    ({filteredDrones.length} of {api.drones.length})
                  </Typography>
                )}
              </Typography>
            </Box>

            {/* Filters */}
            <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <TextField
                label="Search by name"
                variant="outlined"
                size="small"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                sx={{ minWidth: 200 }}
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
                sx={{ minWidth: 250 }}
              />
            </Box>

            <DroneList drones={filteredDrones} droneStations={api.droneStations} />
          </Container>
        </DashboardContent>
      )}
    </>
  );
}
