import { CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/components/theme-provider';

/**
 * Toaster provides toast notifications using the Sonner library.
 * Integrates with the app's theme system to match the current theme.
 * Uses richColors for semantic coloring: success/info=green, warning=amber, error=red.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      className="toaster group"
      richColors
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          // Info toast colors (green like success)
          '--info-bg': resolvedTheme === 'dark' ? 'hsl(143, 85%, 10%)' : 'hsl(143, 85%, 96%)',
          '--info-border': resolvedTheme === 'dark' ? 'hsl(143, 85%, 25%)' : 'hsl(143, 85%, 40%)',
          '--info-text': resolvedTheme === 'dark' ? 'hsl(143, 85%, 75%)' : 'hsl(143, 85%, 25%)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
