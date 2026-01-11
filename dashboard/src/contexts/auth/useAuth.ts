import { useContextSelector } from 'use-context-selector';
import { AuthContext, AuthContextType } from './AuthContext';

/**
 * Hook for accessing authentication state and actions.
 * Uses context selectors for optimized re-renders.
 */
export function useAuth(): AuthContextType {
  const authenticated = useContextSelector(AuthContext, (ctx) => ctx.authenticated);
  const usedDefaultPassword = useContextSelector(AuthContext, (ctx) => ctx.usedDefaultPassword);
  const justLoggedIn = useContextSelector(AuthContext, (ctx) => ctx.justLoggedIn);
  const isLoading = useContextSelector(AuthContext, (ctx) => ctx.isLoading);
  const error = useContextSelector(AuthContext, (ctx) => ctx.error);
  const sessionExpired = useContextSelector(AuthContext, (ctx) => ctx.sessionExpired);
  const login = useContextSelector(AuthContext, (ctx) => ctx.login);
  const clearAuth = useContextSelector(AuthContext, (ctx) => ctx.clearAuth);
  const checkAuthStatus = useContextSelector(AuthContext, (ctx) => ctx.checkAuthStatus);
  const clearSessionExpired = useContextSelector(AuthContext, (ctx) => ctx.clearSessionExpired);
  const clearJustLoggedIn = useContextSelector(AuthContext, (ctx) => ctx.clearJustLoggedIn);

  return {
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
  };
}
