import { Settings } from 'src/apiTypes';
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

/**
 * Settings API service for managing global application settings.
 */
export const settingsApi = {
  /**
   * Get current settings
   */
  get: async (): Promise<Settings> => {
    const response = await fetch(`${API_URL}/settings`, { credentials: 'include' });
    return handleResponse<Settings>(response, 'Failed to fetch settings');
  },

  /**
   * Update settings
   */
  update: async (settings: Settings): Promise<Settings> => {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include',
    });
    return handleResponse<Settings>(response, 'Failed to update settings');
  },
};
