import { Moon, Sun, Monitor } from 'lucide-react';

import { useTheme } from '@/components/theme-provider';

/**
 * ModeToggle provides a button to cycle through dark, light, and system themes.
 * Uses the useTheme hook from ThemeProvider to get and set the current theme.
 */
export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const getIcon = () => {
    if (theme === 'dark') {
      return <Moon className="h-5 w-5" />;
    }
    if (theme === 'light') {
      return <Sun className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getLabel = () => {
    if (theme === 'dark') return 'Dark mode';
    if (theme === 'light') return 'Light mode';
    return 'System theme';
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      {getIcon()}
      <span className="sr-only">{getLabel()}</span>
    </button>
  );
}
