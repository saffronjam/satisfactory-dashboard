import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type LogoProps = React.HTMLAttributes<HTMLDivElement> & {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
};

/**
 * Logo component that displays the application logo.
 * Supports both single and full logo variants with optional link wrapping.
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ isSingle = false, disableLink = false, className, ...other }, ref) => {
    const logoImage = (
      <img
        alt={isSingle ? 'Single logo' : 'Full logo'}
        src="/logo/vector/default.svg"
        className="h-full w-full object-cover"
      />
    );

    return (
      <div
        ref={ref}
        aria-label="Logo"
        className={cn(
          'inline-flex shrink-0 w-auto align-middle',
          disableLink && 'pointer-events-none',
          className
        )}
        {...other}
      >
        {logoImage}
      </div>
    );
  }
);

Logo.displayName = 'Logo';
