import { CreateSessionRequest, SessionDTO, SessionInfo } from 'src/apiTypes';
import { config } from 'src/config';

const API_URL = config.apiUrl;

export interface SessionPreviewResult {
  sessionInfo: SessionInfo;
}

export const sessionApi = {
  /**
   * List all sessions
   */
  list: async (): Promise<SessionDTO[]> => {
    const response = await fetch(`${API_URL}/sessions`);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return response.json();
  },

  /**
   * Get a specific session by ID
   */
  get: async (id: string): Promise<SessionDTO> => {
    const response = await fetch(`${API_URL}/sessions/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }
    return response.json();
  },

  /**
   * Create a new session (real server)
   */
  create: async (name: string, address: string): Promise<SessionDTO> => {
    const body: CreateSessionRequest = { name, address, isMock: false };
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create session' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to create session');
    }
    return response.json();
  },

  /**
   * Create a mock session
   */
  createMock: async (name: string): Promise<SessionDTO> => {
    const body: CreateSessionRequest = { name, address: '', isMock: true };
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'Failed to create mock session' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to create mock session');
    }
    return response.json();
  },

  /**
   * Delete a session
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  },

  /**
   * Update a session (name and/or paused state)
   */
  update: async (
    id: string,
    updates: { name?: string; isPaused?: boolean }
  ): Promise<SessionDTO> => {
    const response = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update session' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to update session');
    }
    return response.json();
  },

  /**
   * Validate a session (refresh connection status and session info)
   */
  validate: async (id: string): Promise<SessionInfo> => {
    const response = await fetch(`${API_URL}/sessions/${id}/validate`);
    if (!response.ok) {
      throw new Error('Failed to validate session');
    }
    return response.json();
  },

  /**
   * Preview a session (validate address before creating)
   */
  preview: async (address: string): Promise<SessionPreviewResult> => {
    const response = await fetch(
      `${API_URL}/sessions/preview?address=${encodeURIComponent(address)}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to connect to server' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to connect to server');
    }
    return response.json();
  },

  /**
   * Get client IP address as seen by the server
   */
  getClientIP: async (): Promise<string> => {
    const response = await fetch(`${API_URL}/client-ip`);
    if (!response.ok) {
      throw new Error('Failed to get client IP');
    }
    const data = await response.json();
    return data.ip;
  },
};
