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

  const currentSaveName = selectedSession?.sessionName;

  useEffect(() => {
    if (selectedSession && prevSessionRef.current) {
      if (
        prevSessionRef.current.id === selectedSession.id &&
        prevSessionRef.current.sessionName !== selectedSession.sessionName
      ) {
        toast.info(
          `Save changed: ${prevSessionRef.current.sessionName} → ${selectedSession.sessionName}`,
          {
            duration: 5000,
          }
        );
      }
    }
    prevSessionRef.current = selectedSession;
  }, [selectedSession]);

  const handleSessionUpdate = useCallback(
    (session: SessionDTO) => {
      updateSessionFromEvent(session);
    },
    [updateSessionFromEvent]
  );

  // Key changes on save name change → forces ApiProvider remount → clears state & refetches
  const apiKey = selectedSession ? `${selectedSession.id}:${currentSaveName}` : null;

  return (
    <ApiProvider
      key={apiKey}
      sessionId={selectedSession?.id || null}
      sessionStage={selectedSession?.stage || null}
      onSessionUpdate={handleSessionUpdate}
    >
      {children}
    </ApiProvider>
  );
};
