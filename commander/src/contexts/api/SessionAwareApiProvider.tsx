import React, { useCallback, useEffect, useRef } from "react";
import { useNotifications } from "@toolpad/core";
import { useSession } from "src/contexts/sessions";
import { ApiProvider } from "./ApiProvider";
import { Session } from "src/apiTypes";

interface SessionAwareApiProviderProps {
  children: React.ReactNode;
}

export const SessionAwareApiProvider: React.FC<SessionAwareApiProviderProps> = ({ children }) => {
  const { selectedSession, updateSessionFromEvent } = useSession();
  const { show } = useNotifications();
  const prevSessionRef = useRef<Session | null>(null);

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
    (session: Session) => {
      // Check if save game name changed
      if (
        prevSessionRef.current &&
        prevSessionRef.current.id === session.id &&
        prevSessionRef.current.sessionName !== session.sessionName
      ) {
        show(`Save changed: ${prevSessionRef.current.sessionName} → ${session.sessionName}`, {
          severity: "info",
          autoHideDuration: 5000,
        });
      }
      prevSessionRef.current = session;
      updateSessionFromEvent(session);
    },
    [updateSessionFromEvent, show],
  );

  return (
    <ApiProvider sessionId={selectedSession?.id || null} onSessionUpdate={handleSessionUpdate}>
      {children}
    </ApiProvider>
  );
};
