import { LogOut } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth/useAuth';
import { authApi } from '@/services/authApi';

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
    <div className="px-2 pb-1">
      <Button
        variant="ghost"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full justify-center gap-2 rounded-lg px-2 py-1 text-sm font-medium"
      >
        {isLoggingOut ? <Spinner className="size-5" /> : <LogOut className="size-5" />}
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </Button>
    </div>
  );
}
