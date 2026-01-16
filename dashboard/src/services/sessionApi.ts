import { CreateSessionRequest, SessionDTO, SessionInfo } from 'src/apiTypes';
import { config } from 'src/config';
import { dispatchAuthExpired } from 'src/contexts/auth/AuthContext';

const API_URL = config.apiUrl;

/**
 * Handle API response and dispatch auth expired event on 401.
 */
async function handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      dispatchAuthExpired();
    }
    const error = await response.json().catch(() => ({ message: errorMessage }));
    throw new Error(error.errors?.[0]?.msg || error.message || errorMessage);
  }
  return response.json();
}

export interface SessionPreviewResult {
  sessionInfo: SessionInfo;
}

export const sessionApi = {
  /**
   * List all sessions
   */
  list: async (): Promise<SessionDTO[]> => {
    const response = await fetch(`${API_URL}/sessions`, { credentials: 'include' });
    return handleResponse<SessionDTO[]>(response, 'Failed to fetch sessions');
  },

  /**
   * Get a specific session by ID
   */
  get: async (id: string): Promise<SessionDTO> => {
    const response = await fetch(`${API_URL}/sessions/${id}`, { credentials: 'include' });
    return handleResponse<SessionDTO>(response, 'Failed to fetch session');
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
      credentials: 'include',
    });
    return handleResponse<SessionDTO>(response, 'Failed to create session');
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
      credentials: 'include',
    });
    return handleResponse<SessionDTO>(response, 'Failed to create mock session');
  },

  /**
   * Delete a session
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        dispatchAuthExpired();
      }
      throw new Error('Failed to delete session');
    }
  },

  /**
   * Update a session (name, paused state, and/or address)
   */
  update: async (
    id: string,
    updates: { name?: string; isPaused?: boolean; address?: string }
  ): Promise<SessionDTO> => {
    const response = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    return handleResponse<SessionDTO>(response, 'Failed to update session');
  },

  /**
   * Validate a session (refresh connection status and session info)
   */
  validate: async (id: string): Promise<SessionInfo> => {
    const response = await fetch(`${API_URL}/sessions/${id}/validate`, { credentials: 'include' });
    return handleResponse<SessionInfo>(response, 'Failed to validate session');
  },

  /**
   * Preview a session (validate address before creating)
   */
  preview: async (address: string): Promise<SessionPreviewResult> => {
    const response = await fetch(
      `${API_URL}/sessions/preview?address=${encodeURIComponent(address)}`,
      { credentials: 'include' }
    );
    return handleResponse<SessionPreviewResult>(response, 'Failed to connect to server');
  },

  /**
   * Get client IP address as seen by the server
   */
  getClientIP: async (): Promise<string> => {
    const response = await fetch(`${API_URL}/client-ip`, { credentials: 'include' });
    const data = await handleResponse<{ ip: string }>(response, 'Failed to get client IP');
    return data.ip;
  },
};
