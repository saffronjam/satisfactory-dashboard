import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';

import { SessionStageReady } from 'src/apiTypes';
import { useSession } from 'src/contexts/sessions';

export const SessionInitOverlay = () => {
  const theme = useTheme();
  const location = useLocation();
  const { selectedSession } = useSession();

  // Don't show on debug page
  if (location.pathname === '/debug') {
    return null;
  }

  // Don't show if no session selected or session is ready and not paused
  if (!selectedSession) {
    return null;
  }

  const isReady = selectedSession.stage === SessionStageReady;
  const isPaused = selectedSession.isPaused;

  // Show overlay if session is not ready OR if session is paused
  if (isReady && !isPaused) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        // Offset by sidebar width on large screens
        [theme.breakpoints.up('lg')]: {
          left: 'var(--layout-nav-vertical-width, 230px)',
        },
        zIndex: theme.zIndex.drawer + 2,
        color: '#fff',
        backgroundColor: theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {isPaused ? (
        <>
          <PauseCircleOutlineIcon sx={{ fontSize: 64, opacity: 0.8 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Session is paused
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Enable this session to view its data
            </Typography>
          </Box>
        </>
      ) : (
        <>
          <CircularProgress color="inherit" size={48} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Session is being initialized
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Please wait while we fetch data from the Satisfactory server...
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};
