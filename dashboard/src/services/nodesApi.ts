import { NodesResponse } from 'src/apiTypes';
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
 * Nodes API service for fetching lease ownership information.
 */
export const nodesApi = {
  /**
   * Get all live API instances and their lease ownership information.
   * Returns information about which instances own which sessions.
   */
  getNodes: async (): Promise<NodesResponse> => {
    const response = await fetch(`${API_URL}/nodes`, {
      credentials: 'include',
    });
    return handleResponse<NodesResponse>(response, 'Failed to fetch nodes');
  },
};
