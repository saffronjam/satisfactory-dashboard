import { PauseCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { SessionStageReady } from 'src/apiTypes';
import { Spinner } from '@/components/loading/spinner';
import { useSession } from 'src/contexts/sessions';

/**
 * Displays an overlay when a session is initializing or paused.
 * Shows a spinner during initialization and a pause icon when paused.
 */
export const SessionInitOverlay = () => {
  const location = useLocation();
  const { selectedSession } = useSession();

  // Don't show on debug pages
  if (location.pathname.startsWith('/debug')) {
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
    <div className="fixed inset-0 lg:left-[var(--sidebar-width,230px)] z-50 text-foreground bg-background flex flex-col items-center justify-center gap-4">
      {isPaused ? (
        <>
          <PauseCircle className="size-16 opacity-80" />
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Session is paused</h2>
            <p className="text-sm text-muted-foreground">Enable this session to view its data</p>
          </div>
        </>
      ) : (
        <>
          <Spinner size="xl" />
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Session is being initialized</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we fetch data from the Satisfactory server...
            </p>
          </div>
        </>
      )}
    </div>
  );
};
