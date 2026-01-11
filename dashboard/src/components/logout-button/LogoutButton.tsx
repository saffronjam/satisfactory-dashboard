import { Box, Button, CircularProgress } from '@mui/material';
import { useCallback, useState } from 'react';
import { Iconify } from 'src/components/iconify';
import { useAuth } from 'src/contexts/auth/useAuth';
import { authApi } from 'src/services/auth';

/**
 * Logout button component for the sidebar navigation.
 * Calls the logout API and clears authentication state.
 */
export function LogoutButton() {
  const { clearAuth } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore errors - we'll clear auth state anyway
    } finally {
      clearAuth();
      setIsLoggingOut(false);
    }
  }, [clearAuth]);

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        onClick={handleLogout}
        disabled={isLoggingOut}
        startIcon={
          isLoggingOut ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Iconify icon="mdi:logout" width={20} height={20} />
          )
        }
        sx={{
          justifyContent: 'flex-start',
          px: 2,
          py: 1,
          borderRadius: 2,
          typography: 'body2',
          fontWeight: 'fontWeightMedium',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'text.secondary',
            bgcolor: 'action.hover',
          },
        }}
      >
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </Button>
    </Box>
  );
}
