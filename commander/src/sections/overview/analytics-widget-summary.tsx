import type { CardProps } from "@mui/material/Card";
import type { ColorType } from "src/theme/core/palette";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

import { fNumber, fShortenNumber } from "src/utils/format-number";
import { varAlpha } from "src/theme/styles";

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  total: number | string | number[];
  units?: string[] | [string[], string[]]; // Single unit array or [leftUnits, rightUnits] for dual values
  color?: ColorType;
  icon: React.ReactNode;
  chart: {
    series: number[];
    // If not provided, a [0, 1 ... n] will be used, where n is the length of the series
    categories?: string[];
  };
};

export function AnalyticsWidgetSummary({
  icon,
  title,
  total,
  chart,
  units,
  color = "primary",
  sx,
  ...other
}: Props) {
  const theme = useTheme();

  const chartColor = varAlpha(theme.palette[color].mainChannel, 0.48);

  const formatNumber = (value: number, options?: { decimals?: number; index?: number }) => {
    if (units) {
      // Check if units is a tuple of two unit arrays (for different units per value)
      if (Array.isArray(units[0]) && options?.index !== undefined) {
        const unitArray = (units as [string[], string[]])[options.index];
        return fShortenNumber(value, unitArray, options);
      }
      // Single unit array for all values
      return fShortenNumber(value, units as string[], options);
    }
    return Math.round(value);
  };

  const genContent = (value: number | string | number[]) => {
    if (Array.isArray(value)) {
      // Return a box that has a | in between the two values
      if (Array.isArray(value) && value.length === 2) {
        // Format numbers with their respective unit arrays (index 0 for left, 1 for right)
        const leftNumber = formatNumber(value[0], { decimals: 1, index: 0 });
        const rightNumber = formatNumber(value[1], { decimals: 1, index: 1 });

        return (
          <Box
            sx={{
              flexGrow: 1,
              minWidth: 112,
              display: "flex",
              position: "relative",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Left number */}
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography
                sx={{ color: theme.palette.primary.contrastText, textAlign: "right", mr: 2 }}
                variant="h5"
              >
                {leftNumber}
              </Typography>
            </Box>

            {/* Separator in the center */}
            <Box
              sx={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 25 }}>
                |
              </Typography>
            </Box>

            {/* Right number */}
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography
                sx={{ color: theme.palette.primary.contrastText, textAlign: "left", ml: 2 }}
                variant="h5"
              >
                {rightNumber}
              </Typography>
            </Box>
          </Box>
        );
      }
    }

    if (typeof value === "number") {
      return (
        <Box sx={{ flexGrow: 1, minWidth: 112, textAlign: "center" }}>
          <Typography sx={{ color: theme.palette.primary.contrastText }} variant="h4">
            {formatNumber(value, { decimals: 1 })}
          </Typography>
        </Box>
      );
    }

    if (typeof value === "string") {
      const newLineSplit = value.split("\n");
      return (
        <Box sx={{ flexGrow: 1, minWidth: 112, color: theme.palette.primary.contrastText }}>
          {newLineSplit.map((line, index) => (
            <Box
              key={index}
              sx={{ typography: "h4", fontFamily: "'DM Mono', 'Roboto Mono', monospace" }}
            >
              {line}
            </Box>
          ))}
        </Box>
      );
    }

    return <></>;
  };

  return (
    <Card
      sx={{
        boxShadow: 0,
        p: 3,
        mt: 0,
        mb: 0,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        ...sx,
      }}
      {...other}
    >
      <Box sx={{ width: 38, height: 38, my: 2, mb: 5, mx: "auto" }}>{icon}</Box>

      {/* Main content area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexGrow: 1,
          minHeight: 100,
        }}
      >
        <Box sx={{ mb: 1, typography: "overline" }}>{title}</Box>

        {/* Bigger numbers and centered */}
        <Box
          sx={{
            typography: "h2",
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {genContent(total)}
        </Box>
      </Box>

      {/* Wider chart at the bottom */}
      <Box sx={{ mt: 0, width: "100%" }}>
        <SparkLineChart
          data={chart.series}
          height={56}
          curve="natural"
          color={chartColor}
          showTooltip
          showHighlight
          valueFormatter={(value) => (value !== null ? fNumber(value) : "")}
        />
      </Box>
    </Card>
  );
}
