import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/components/theme-provider';

/**
 * Toaster provides toast notifications using the Sonner library.
 * Integrates with the app's theme system to match the current theme.
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
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'border-border',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          success: 'border-green-500/50 [&>svg]:text-green-500',
          warning: 'border-amber-500/50 bg-amber-500/10 [&>svg]:text-amber-500',
          error: 'border-red-500/50 bg-red-500/10 [&>svg]:text-red-500',
          info: 'border-blue-500/50 [&>svg]:text-blue-500',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
