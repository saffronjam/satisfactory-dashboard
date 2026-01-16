import React, { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { SessionDTO } from 'src/apiTypes';
import { useSession } from 'src/contexts/sessions';
import { ApiProvider } from './ApiProvider';

interface SessionAwareApiProviderProps {
  children: React.ReactNode;
}

export const SessionAwareApiProvider: React.FC<SessionAwareApiProviderProps> = ({ children }) => {
  const { selectedSession, updateSessionFromEvent } = useSession();
  const prevSessionRef = useRef<SessionDTO | null>(null);

  // Initialize/update prevSessionRef when selected session changes
  useEffect(() => {
    if (selectedSession) {
      // If switching to a different session or initializing, update the ref
      if (!prevSessionRef.current || prevSessionRef.current.id !== selectedSession.id) {
        prevSessionRef.current = selectedSession;
      }
    }
  }, [selectedSession]);

  const handleSessionUpdate = useCallback(
    (session: SessionDTO) => {
      // Check if save game name changed
      if (
        prevSessionRef.current &&
        prevSessionRef.current.id === session.id &&
        prevSessionRef.current.sessionName !== session.sessionName
      ) {
        toast.info(`Save changed: ${prevSessionRef.current.sessionName} → ${session.sessionName}`, {
          duration: 5000,
        });
      }
      prevSessionRef.current = session;
      updateSessionFromEvent(session);
    },
    [updateSessionFromEvent]
  );

  return (
    <ApiProvider
      sessionId={selectedSession?.id || null}
      sessionStage={selectedSession?.stage || null}
      onSessionUpdate={handleSessionUpdate}
    >
      {children}
    </ApiProvider>
  );
};
