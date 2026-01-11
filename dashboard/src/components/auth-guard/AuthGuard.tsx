import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/auth/useAuth';
import { varAlpha } from 'src/theme/styles';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Protects routes by requiring authentication.
 * Redirects unauthenticated users to the login page.
 * Shows a loading indicator while checking auth status.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        flex="1 1 auto"
        minHeight="100vh"
      >
        <LinearProgress
          sx={{
            width: 1,
            maxWidth: 320,
            bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
            [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
          }}
        />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
