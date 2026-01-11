import 'src/global.css';

import CloseIcon from '@mui/icons-material/Close';
import { Alert, IconButton, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { Router } from 'src/routes/sections';

import { ThemeProvider } from 'src/theme/theme-provider';
import { ConnectionCheckerProvider } from './contexts/api/ConnectionChecker';
import { useAuth } from './contexts/auth/useAuth';

// ----------------------------------------------------------------------

/**
 * Root application component that handles routing and global notifications.
 * Shows a warning notification when authenticated with the default password.
 * Displays session expiration notification when the session times out.
 */
export default function App() {
  useScrollToTop();
  const {
    justLoggedIn,
    usedDefaultPassword,
    sessionExpired,
    clearSessionExpired,
    clearJustLoggedIn,
  } = useAuth();
  const [showDefaultPasswordWarning, setShowDefaultPasswordWarning] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    if (justLoggedIn && usedDefaultPassword) {
      setShowDefaultPasswordWarning(true);
      clearJustLoggedIn();
    }
  }, [justLoggedIn, usedDefaultPassword, clearJustLoggedIn]);

  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpired(true);
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  const handleCloseDefaultPasswordWarning = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason !== 'clickaway') {
      setShowDefaultPasswordWarning(false);
    }
  };

  const handleCloseSessionExpired = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason !== 'clickaway') {
      setShowSessionExpired(false);
    }
  };

  return (
    <ThemeProvider>
      <ConnectionCheckerProvider />
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showDefaultPasswordWarning}
        autoHideDuration={10000}
        onClose={handleCloseDefaultPasswordWarning}
      >
        <Alert
          severity="warning"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleCloseDefaultPasswordWarning}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          You are using the default password. Please change it in Settings for security.
        </Alert>
      </Snackbar>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showSessionExpired}
        autoHideDuration={5000}
        onClose={handleCloseSessionExpired}
      >
        <Alert
          severity="info"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleCloseSessionExpired}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          Session expired. Please log in again.
        </Alert>
      </Snackbar>
      <Router />
    </ThemeProvider>
  );
}
