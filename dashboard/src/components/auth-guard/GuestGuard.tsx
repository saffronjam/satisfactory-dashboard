import { Navigate } from 'react-router-dom';
import { useAuth } from 'src/contexts/auth/useAuth';

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Protects guest-only routes (like login) from authenticated users.
 * Redirects authenticated users to the home page.
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (authenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
