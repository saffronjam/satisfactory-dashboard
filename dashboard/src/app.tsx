import 'src/index.css';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { Router } from 'src/routes/sections';

import { ConnectionCheckerProvider } from './contexts/api/ConnectionChecker';
import { useAuth } from './contexts/auth/useAuth';

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

  useEffect(() => {
    if (justLoggedIn && usedDefaultPassword) {
      toast.warning(
        'You are using the default password. Please change it in Settings for security.',
        { duration: 10000 }
      );
      clearJustLoggedIn();
    }
  }, [justLoggedIn, usedDefaultPassword, clearJustLoggedIn]);

  useEffect(() => {
    if (sessionExpired) {
      toast.info('Session expired. Please log in again.', { duration: 5000 });
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  return (
    <>
      <ConnectionCheckerProvider />
      <Router />
    </>
  );
}
