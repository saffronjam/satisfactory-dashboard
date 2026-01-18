import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '@/services/authApi';
import { createContext } from 'use-context-selector';

/**
 * Authentication state and actions exposed by AuthContext.
 */
export interface AuthContextType {
  /** Whether the user is currently authenticated */
  authenticated: boolean;
  /** Whether the user authenticated using the default password */
  usedDefaultPassword: boolean;
  /** Whether the user just logged in (vs. already authenticated on page load) */
  justLoggedIn: boolean;
  /** Whether authentication status is being checked */
  isLoading: boolean;
  /** Error message if authentication check failed */
  error: string | null;
  /** Whether the session has expired (for showing notification) */
  sessionExpired: boolean;
  /** Authenticate with the access key */
  login: (password: string) => Promise<void>;
  /** Clear authentication state (called on logout or session expiration) */
  clearAuth: () => void;
  /** Re-check authentication status with the server */
  checkAuthStatus: () => Promise<void>;
  /** Clear the session expired flag after showing notification */
  clearSessionExpired: () => void;
  /** Clear the just logged in flag after showing notification */
  clearJustLoggedIn: () => void;
}

const defaultAuthContext: AuthContextType = {
  authenticated: false,
  usedDefaultPassword: false,
  justLoggedIn: false,
  isLoading: true,
  error: null,
  sessionExpired: false,
  login: async () => {
    throw new Error('AuthProvider not initialized');
  },
  clearAuth: () => {},
  checkAuthStatus: async () => {},
  clearSessionExpired: () => {},
  clearJustLoggedIn: () => {},
};

/**
 * React context for authentication state and actions.
 * Use the useAuth hook to access this context with optimized re-renders.
 */
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

/** Custom event name for 401 unauthorized responses */
const AUTH_EXPIRED_EVENT = 'auth:expired';

/**
 * Dispatch an authentication expired event.
 * Call this from API services when a 401 response is received.
 */
export function dispatchAuthExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/**
 * Provides authentication state and actions to the application.
 * Handles login, logout, and session status checking.
 * Listens for 401 responses and handles session expiration.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [usedDefaultPassword, setUsedDefaultPassword] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const wasAuthenticatedRef = useRef(false);

  const checkAuthStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await authApi.getStatus();
      setAuthenticated(status.authenticated);
      setUsedDefaultPassword(status.usedDefaultPassword ?? false);
    } catch (err) {
      setAuthenticated(false);
      setUsedDefaultPassword(false);
      setError(err instanceof Error ? err.message : 'Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setError(null);
    setSessionExpired(false);
    const response = await authApi.login(password);
    setAuthenticated(response.success);
    setUsedDefaultPassword(response.usedDefaultPassword);
    if (response.success) {
      setJustLoggedIn(true);
    }
  }, []);

  const clearAuth = useCallback(() => {
    setAuthenticated(false);
    setUsedDefaultPassword(false);
    setJustLoggedIn(false);
    setError(null);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const clearJustLoggedIn = useCallback(() => {
    setJustLoggedIn(false);
  }, []);

  const handleAuthExpired = useCallback(() => {
    if (wasAuthenticatedRef.current) {
      setSessionExpired(true);
    }
    setAuthenticated(false);
    setUsedDefaultPassword(false);
    setJustLoggedIn(false);
  }, []);

  useEffect(() => {
    wasAuthenticatedRef.current = authenticated;
  }, [authenticated]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [handleAuthExpired]);

  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus]);

  const contextValue: AuthContextType = useMemo(
    () => ({
      authenticated,
      usedDefaultPassword,
      justLoggedIn,
      isLoading,
      error,
      sessionExpired,
      login,
      clearAuth,
      checkAuthStatus,
      clearSessionExpired,
      clearJustLoggedIn,
    }),
    [
      authenticated,
      usedDefaultPassword,
      justLoggedIn,
      isLoading,
      error,
      sessionExpired,
      login,
      clearAuth,
      checkAuthStatus,
      clearSessionExpired,
      clearJustLoggedIn,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
