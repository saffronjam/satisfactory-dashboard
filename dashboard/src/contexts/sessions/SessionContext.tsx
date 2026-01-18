import { SessionDTO, SessionInfo } from 'src/apiTypes';
import { createContext } from 'use-context-selector';

export interface SessionContextType {
  sessions: SessionDTO[];
  selectedSession: SessionDTO | null;
  isLoading: boolean;
  error: string | null;

  selectSession: (id: string) => void;
  createSession: (name: string, address: string) => Promise<SessionDTO>;
  updateSession: (
    id: string,
    updates: { name?: string; isPaused?: boolean; address?: string }
  ) => Promise<SessionDTO>;
  updateSessionFromEvent: (session: SessionDTO) => void;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  previewSession: (address: string) => Promise<SessionInfo>;
}

export const defaultSessionContext: SessionContextType = {
  sessions: [],
  selectedSession: null,
  isLoading: true,
  error: null,

  selectSession: () => {},
  createSession: async () => {
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
