import { Box, Typography, useTheme } from "@mui/material";
import { useContextSelector } from "use-context-selector";
import { ApiContext } from "src/contexts/api/useApi";
import { Iconify } from "src/components/iconify";
import { useSession } from "src/contexts/sessions";

export const SessionStatusBar = () => {
  const theme = useTheme();
  const { selectedSession } = useSession();
  const api = useContextSelector(ApiContext, (v) => ({
    isOnline: v.isOnline,
    isLoading: v.isLoading,
  }));

  // Don't show if loading, online, or no session selected
  if (api.isLoading || api.isOnline || !selectedSession) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 36,
        backgroundColor: theme.palette.error.dark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        zIndex: theme.zIndex.snackbar,
        px: 2,
      }}
    >
      <Iconify icon="mdi:alert-circle" sx={{ color: "white", width: 18, height: 18 }} />
      <Typography variant="body2" sx={{ color: "white", fontWeight: 500 }}>
        Session is offline. Make sure the FRM server is running.
      </Typography>
    </Box>
  );
};
