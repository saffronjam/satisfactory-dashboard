// Injected at build time by Vite
declare const __BUILD_VERSION__: string;

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Satisfactory Dashboard',
  appVersion: __BUILD_VERSION__,
};
