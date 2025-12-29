import { Session, SessionInfo } from 'src/apiTypes';
import { createContext } from 'use-context-selector';

export interface SessionContextType {
  sessions: Session[];
  selectedSession: Session | null;
  isLoading: boolean;
  error: string | null;
  mockExists: boolean;

  selectSession: (id: string) => void;
  createSession: (name: string, address: string) => Promise<Session>;
  createMockSession: (name: string) => Promise<Session>;
  updateSession: (id: string, updates: { name?: string; isPaused?: boolean }) => Promise<Session>;
  updateSessionFromEvent: (session: Session) => void;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  previewSession: (address: string) => Promise<SessionInfo>;
}

export const defaultSessionContext: SessionContextType = {
  sessions: [],
  selectedSession: null,
  isLoading: true,
  error: null,
  mockExists: false,

  selectSession: () => {},
  createSession: async () => {
    throw new Error('SessionProvider not initialized');
  },
  createMockSession: async () => {
    throw new Error('SessionProvider not initialized');
  },
  updateSession: async () => {
    throw new Error('SessionProvider not initialized');
  },
  updateSessionFromEvent: () => {},
  deleteSession: async () => {
    throw new Error('SessionProvider not initialized');
  },
  refreshSessions: async () => {},
  previewSession: async () => {
    throw new Error('SessionProvider not initialized');
  },
};

export const SessionContext = createContext<SessionContextType>(defaultSessionContext);
