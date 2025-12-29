import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Session, SessionInfo } from 'src/apiTypes';
import { sessionApi } from 'src/services/sessionApi';
import { SessionContext, SessionContextType } from './SessionContext';

const SELECTED_SESSION_KEY = 'commander-selected-session';
const SESSION_POLL_INTERVAL = 10000; // Poll session status every 10 seconds

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_SESSION_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const mockExists = useMemo(() => sessions.some((s) => s.isMock), [sessions]);

  const refreshSessions = useCallback(async () => {
    try {
      setError(null);
      const fetchedSessions = await sessionApi.list();
      setSessions(fetchedSessions);

      // If we have a selected session ID but it's not in the list, clear it
      if (selectedSessionId && !fetchedSessions.find((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(null);
        localStorage.removeItem(SELECTED_SESSION_KEY);
      }

      // Auto-select first session if none selected and sessions exist
      if (!selectedSessionId && fetchedSessions.length > 0) {
        const firstSession = fetchedSessions[0];
        setSelectedSessionId(firstSession.id);
        localStorage.setItem(SELECTED_SESSION_KEY, firstSession.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId]);

  // Silently refresh session statuses without affecting loading state or selection
  const refreshSessionStatuses = useCallback(async () => {
    try {
      const fetchedSessions = await sessionApi.list();
      setSessions((prev) => {
        // Update only the isOnline status for each session
        return prev.map((session) => {
          const updated = fetchedSessions.find((s) => s.id === session.id);
          if (updated) {
            return { ...session, isOnline: updated.isOnline, sessionName: updated.sessionName };
          }
          return session;
        });
      });
    } catch {
      // Silently fail - don't update error state for background polling
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refreshSessions();
  }, []);

  // Periodic polling for session statuses
  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshSessionStatuses();
    }, SESSION_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [refreshSessionStatuses]);

  const selectSession = useCallback((id: string) => {
    setSelectedSessionId(id);
    localStorage.setItem(SELECTED_SESSION_KEY, id);
  }, []);

  const createSession = useCallback(
    async (name: string, address: string): Promise<Session> => {
      const newSession = await sessionApi.create(name, address);
      setSessions((prev) => [...prev, newSession]);

      // Auto-select if first session
      if (!selectedSessionId) {
        setSelectedSessionId(newSession.id);
        localStorage.setItem(SELECTED_SESSION_KEY, newSession.id);
      }

      return newSession;
    },
    [selectedSessionId]
  );

  const createMockSession = useCallback(
    async (name: string): Promise<Session> => {
      const newSession = await sessionApi.createMock(name);
      setSessions((prev) => [...prev, newSession]);

      // Auto-select if first session
      if (!selectedSessionId) {
        setSelectedSessionId(newSession.id);
        localStorage.setItem(SELECTED_SESSION_KEY, newSession.id);
      }

      return newSession;
    },
    [selectedSessionId]
  );

  const updateSession = useCallback(
    async (id: string, updates: { name?: string; isPaused?: boolean }): Promise<Session> => {
      const updatedSession = await sessionApi.update(id, updates);
      setSessions((prev) => prev.map((s) => (s.id === id ? updatedSession : s)));
      return updatedSession;
    },
    []
  );

  const updateSessionFromEvent = useCallback((session: Session) => {
    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
  }, []);

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      await sessionApi.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));

      // If deleted session was selected, select another
      if (selectedSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          setSelectedSessionId(remaining[0].id);
          localStorage.setItem(SELECTED_SESSION_KEY, remaining[0].id);
        } else {
          setSelectedSessionId(null);
          localStorage.removeItem(SELECTED_SESSION_KEY);
        }
      }
    },
    [selectedSessionId, sessions]
  );

  const previewSession = useCallback(async (address: string): Promise<SessionInfo> => {
    const result = await sessionApi.preview(address);
    return result.sessionInfo;
  }, []);

  const contextValue: SessionContextType = useMemo(
    () => ({
      sessions,
      selectedSession,
      isLoading,
      error,
      mockExists,
      selectSession,
      createSession,
      createMockSession,
      updateSession,
      updateSessionFromEvent,
      deleteSession,
      refreshSessions,
      previewSession,
    }),
    [
      sessions,
      selectedSession,
      isLoading,
      error,
      mockExists,
      selectSession,
      createSession,
      createMockSession,
      updateSession,
      updateSessionFromEvent,
      deleteSession,
      refreshSessions,
      previewSession,
    ]
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
};
