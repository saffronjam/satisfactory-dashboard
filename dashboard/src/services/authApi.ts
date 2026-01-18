import {
  AuthStatusResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
} from 'src/apiTypes';
import { config } from 'src/config';
import { dispatchAuthExpired } from 'src/contexts/auth/AuthContext';

const API_URL = config.apiUrl;

/**
 * Authentication API service for login and status operations.
 */
export const authApi = {
  /**
   * Authenticate with the dashboard access key.
   * On success, the server sets an HTTP-only cookie with the access token.
   */
  login: async (password: string): Promise<LoginResponse> => {
    const body: LoginRequest = { password };
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Authentication failed');
    }
    return response.json();
  },

  /**
   * Check if the current session is authenticated.
   * Uses the HTTP-only cookie to validate the access token.
   */
  getStatus: async (): Promise<AuthStatusResponse> => {
    const response = await fetch(`${API_URL}/auth/status`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to get authentication status');
    }
    return response.json();
  },

  /**
   * Change the dashboard access key.
   * Requires the current password for verification.
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponse> => {
    const body: ChangePasswordRequest = { currentPassword, newPassword };
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        dispatchAuthExpired();
      }
      const error = await response.json().catch(() => ({ message: 'Failed to change password' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to change password');
    }
    return response.json();
  },

  /**
   * Log out of the dashboard and invalidate the current session.
   * Clears the HTTP-only cookie and removes the token from the server.
   */
  logout: async (): Promise<LogoutResponse> => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to logout' }));
      throw new Error(error.errors?.[0]?.msg || error.message || 'Failed to logout');
    }
    return response.json();
  },
};
