import { HistoryChunk } from 'src/apiTypes';
import { config } from 'src/config';
import { dispatchAuthExpired } from 'src/contexts/auth/AuthContext';
import { HistoryDataRange } from 'src/types';

const API_URL = config.apiUrl;

/** Valid data types that support history storage */
export type HistoryDataType =
  | 'circuits'
  | 'generatorStats'
  | 'prodStats'
  | 'factoryStats'
  | 'sinkStats';

/** Parameters for fetching history data */
export interface FetchHistoryParams {
  sessionId: string;
  dataType: HistoryDataType;
  saveName?: string;
  since?: number;
  limit?: number;
  /** The configured history data range in seconds. -1 for all time. */
  historyDataRange?: HistoryDataRange;
  /** The current game time (latest known gameTimeId). Used with historyDataRange to calculate 'since'. */
  currentGameTime?: number;
}

/**
 * Calculate the 'since' parameter based on historyDataRange and currentGameTime.
 * Returns undefined if 'since' was explicitly provided, historyDataRange is -1 (all time),
 * or if currentGameTime is not available.
 */
function calculateSince(params: FetchHistoryParams): number | undefined {
  const { since, historyDataRange, currentGameTime } = params;

  // If 'since' was explicitly provided, use it directly
  if (since !== undefined) {
    return since;
  }

  // If no range limit (-1 means all time) or no current game time, don't limit
  if (historyDataRange === undefined || historyDataRange === -1 || currentGameTime === undefined) {
    return undefined;
  }

  // Calculate since = currentGameTime - historyDataRange
  const calculatedSince = currentGameTime - historyDataRange;

  // Don't return negative values
  return calculatedSince > 0 ? calculatedSince : undefined;
}

/** Response for listing available save names with history */
export interface ListHistorySavesResponse {
  saveNames: string[];
  currentSave: string;
}

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

export const historyApi = {
  /**
   * Fetch historical data points for a session and data type.
   * Returns a HistoryChunk containing data points ordered by gameTimeId ascending.
   * Use the latestId from the response as the 'since' parameter for subsequent requests.
   *
   * If historyDataRange and currentGameTime are provided, calculates 'since' as:
   * currentGameTime - historyDataRange (unless historyDataRange is -1 for all time).
   */
  fetchHistory: async (params: FetchHistoryParams): Promise<HistoryChunk> => {
    const { sessionId, dataType, saveName, limit } = params;

    // Calculate 'since' based on historyDataRange and currentGameTime if applicable
    const since = calculateSince(params);

    const queryParams = new URLSearchParams();
    if (saveName) {
      queryParams.set('saveName', saveName);
    }
    if (since !== undefined) {
      queryParams.set('since', since.toString());
    }
    if (limit !== undefined) {
      queryParams.set('limit', limit.toString());
    }

    const queryString = queryParams.toString();
    const url = `${API_URL}/sessions/${sessionId}/history/${dataType}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<HistoryChunk>(response, 'Failed to fetch history');
  },

  /**
   * List all save names that have historical data for a session.
   * Returns the list of save names and the currently active save.
   */
  listSaves: async (sessionId: string): Promise<ListHistorySavesResponse> => {
    const url = `${API_URL}/sessions/${sessionId}/history`;
    const response = await fetch(url, { credentials: 'include' });
    return handleResponse<ListHistorySavesResponse>(response, 'Failed to list history saves');
  },
};
