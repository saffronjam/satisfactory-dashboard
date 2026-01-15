import { Iconify } from '@/components/iconify';
import { useSession } from '@/contexts/sessions';

/**
 * Status bar displayed at the bottom of the screen when a session is offline.
 * Shows an alert with error styling to inform users the FRM server is not responding.
 */
export const SessionStatusBar = () => {
  const { selectedSession, isLoading } = useSession();

  if (isLoading || !selectedSession || selectedSession.isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-9 bg-destructive flex items-center justify-center gap-2 z-50 px-2">
      <Iconify icon="mdi:alert-circle" width={18} className="text-white" />
      <span className="text-sm text-white font-medium">
        Session is offline. Make sure the FRM server is running.
      </span>
    </div>
  );
};
