import { Box, Card, CardContent, Chip, Typography, useTheme } from "@mui/material";
import {
  Drone,
  DroneStation,
  DroneStatusDocking,
  DroneStatusFlying,
  DroneStatusIdle,
} from "src/apiTypes";
import { Iconify } from "src/components/iconify";
import { varAlpha } from "src/theme/styles";
import { fNumber } from "src/utils/format-number";

const DroneCard = ({ drone }: { drone: Drone }) => {
  const theme = useTheme();

  const statusToStyle = (status: string) => {
    switch (status) {
      case DroneStatusFlying:
        return {
          icon: <Iconify icon="mdi:airplane" />,
          label: "Flying",
          backgroundColor: theme.palette.success.darkChannel,
          color: theme.palette.primary.contrastTextChannel,
          pulse: false,
        };
      case DroneStatusDocking:
        return {
          icon: <Iconify icon="game-icons:cargo-crate" />,
          label: "Docking",
          backgroundColor: theme.palette.info.darkChannel,
          color: theme.palette.info.contrastTextChannel,
          pulse: true,
        };
      case DroneStatusIdle:
        return {
          icon: <Iconify icon="mdi:pause" />,
          label: "Idle",
          backgroundColor: theme.palette.warning.darkChannel,
          color: theme.palette.warning.contrastTextChannel,
          pulse: false,
        };
      default:
        return {
          icon: <Iconify icon="ri:question-line" />,
          label: status,
          backgroundColor: theme.palette.info.darkChannel,
          color: theme.palette.info.contrastTextChannel,
          pulse: false,
        };
    }
  };

  const style = statusToStyle(drone.status);

  // Get display name for home station
  const getHomeName = () => {
    if (!drone.home) return "No Home";
    return drone.home.name || "Unnamed";
  };

  // Get display name for paired station
  const getPairedName = () => {
    if (!drone.paired) return "No Pair";
    return drone.paired.name || "Unnamed";
  };

  // Determine if drone is at home or flying to/from paired
  const isAtHome =
    drone.status !== DroneStatusFlying &&
    (drone.destination?.name === drone.home?.name || !drone.destination);
  const isFlyingToPaired =
    drone.status === DroneStatusFlying && drone.destination?.name === drone.paired?.name;
  const isFlyingToHome =
    drone.status === DroneStatusFlying && drone.destination?.name === drone.home?.name;

  return (
    <Card
      variant="outlined"
      sx={{
        marginBottom: "15px",
        padding: "20px",
      }}
    >
      <CardContent>
        {/* Header: Name and Status */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h4">{drone.name}</Typography>
          <Chip
            label={style.label}
            icon={style.icon}
            sx={{
              backgroundColor: varAlpha(style.backgroundColor),
              color: varAlpha(style.color),
              pl: 0.6,
              ...(style.pulse && {
                animation: "pulse-animation 2s infinite ease-in-out",
                "@keyframes pulse-animation": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.6 },
                  "100%": { opacity: 1 },
                },
              }),
            }}
          />
        </Box>

        {/* Route Visualization - Ellipse with bidirectional arrows */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            my: 3,
            position: "relative",
          }}
        >
          {/* Home Station */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 1,
              minWidth: 80,
            }}
          >
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: isAtHome ? theme.palette.primary.main : theme.palette.grey[600],
                border: `2px solid ${isAtHome ? theme.palette.primary.main : theme.palette.grey[500]}`,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                fontWeight: isAtHome ? "bold" : "normal",
                color: isAtHome ? theme.palette.primary.main : theme.palette.text.secondary,
              }}
            >
              {getHomeName()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Home
            </Typography>
          </Box>

          {/* Ellipse Route with SVG */}
          <Box sx={{ position: "relative", width: 180, height: 80, mx: 1 }}>
            <svg
              width="180"
              height="80"
              viewBox="0 0 180 80"
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <defs>
                {/* Animated dash pattern for forward path (home → paired) */}
                <linearGradient id={`flow-forward-${drone.name}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={theme.palette.primary.main} />
                  <stop offset="100%" stopColor={theme.palette.primary.main} />
                </linearGradient>
                {/* Animated dash pattern for backward path (paired → home) */}
                <linearGradient
                  id={`flow-backward-${drone.name}`}
                  x1="100%"
                  y1="0%"
                  x2="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={theme.palette.primary.main} />
                  <stop offset="100%" stopColor={theme.palette.primary.main} />
                </linearGradient>
              </defs>

              {/* Top arc (Home → Paired) */}
              <path
                d="M 10 40 Q 90 0 170 40"
                fill="none"
                stroke={isFlyingToPaired ? theme.palette.primary.main : theme.palette.grey[600]}
                strokeWidth="2"
                strokeDasharray={isFlyingToPaired ? "8 4" : "none"}
                style={
                  isFlyingToPaired
                    ? {
                        animation: "dash-flow-forward 0.8s linear infinite",
                      }
                    : undefined
                }
              />
              {/* Arrow head for top arc (pointing right) */}
              <polygon
                points="165,35 175,40 165,45"
                fill={isFlyingToPaired ? theme.palette.primary.main : theme.palette.grey[600]}
              />

              {/* Bottom arc (Paired → Home) */}
              <path
                d="M 170 40 Q 90 80 10 40"
                fill="none"
                stroke={isFlyingToHome ? theme.palette.primary.main : theme.palette.grey[600]}
                strokeWidth="2"
                strokeDasharray={isFlyingToHome ? "8 4" : "none"}
                style={
                  isFlyingToHome
                    ? {
                        animation: "dash-flow-backward 0.8s linear infinite",
                      }
                    : undefined
                }
              />
              {/* Arrow head for bottom arc (pointing left) */}
              <polygon
                points="15,35 5,40 15,45"
                fill={isFlyingToHome ? theme.palette.primary.main : theme.palette.grey[600]}
              />
            </svg>

            {/* CSS animation keyframes */}
            <style>
              {`
                @keyframes dash-flow-forward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes dash-flow-backward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
              `}
            </style>
          </Box>

          {/* Paired Station */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 1,
              minWidth: 80,
            }}
          >
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: !isAtHome ? theme.palette.primary.main : theme.palette.grey[600],
                border: `2px solid ${!isAtHome ? theme.palette.primary.main : theme.palette.grey[500]}`,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                fontWeight: !isAtHome ? "bold" : "normal",
                color: !isAtHome ? theme.palette.primary.main : theme.palette.text.secondary,
              }}
            >
              {getPairedName()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Paired
            </Typography>
          </Box>
        </Box>

        {/* Footer: Speed and Fuel */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2">Speed:</Typography>
            <Typography variant="h6" sx={{ pl: 0.5, fontWeight: "bold" }}>
              {fNumber(drone.speed, { decimals: 0 })} km/h
            </Typography>
          </Box>
          {drone.home?.fuelName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Iconify icon="mdi:fuel" sx={{ color: theme.palette.text.secondary }} />
              <Typography variant="body2" color="textSecondary">
                {drone.home.fuelName}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export function DroneList({
  drones,
  droneStations,
}: {
  drones: Drone[];
  droneStations: DroneStation[];
}) {
  return (
    <>
      {drones.map((drone, index) => (
        <DroneCard key={index} drone={drone} />
      ))}
    </>
  );
}
