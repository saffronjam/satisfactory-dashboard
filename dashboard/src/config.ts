/**
 * Runtime configuration that can be set via environment variables at container startup.
 * This allows the same Docker image to be deployed to different environments
 * without rebuilding.
 */

interface RuntimeConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

const DEFAULT_API_URL = 'http://localhost:8081/v1';

/**
 * Get the runtime configuration.
 * Priority:
 * 1. window.__RUNTIME_CONFIG__ (set by runtime-config.js at container startup)
 * 2. import.meta.env.VITE_API_URL (build-time env var, for development)
 * 3. Default fallback
 */
function getConfig(): RuntimeConfig {
  const runtimeConfig = window.__RUNTIME_CONFIG__;

  return {
    apiUrl: runtimeConfig?.apiUrl || import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  };
}

export const config = getConfig();
