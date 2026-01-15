import { Navigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useAuth } from 'src/contexts/auth/useAuth';

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
      <div className="flex items-center justify-center flex-1 min-h-screen">
        <Progress className="w-full max-w-80" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
