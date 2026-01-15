import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type FlagIconProps = React.HTMLAttributes<HTMLSpanElement> & {
  code?: string;
};

/**
 * Flag icon component that displays country flags using an external flag icon service.
 */
export const FlagIcon = forwardRef<HTMLSpanElement, FlagIconProps>(
  ({ code, className, ...other }, ref) => {
    if (!code) {
      return null;
    }

    return (
      <span
        ref={ref}
        className={cn(
          'w-[26px] h-5 shrink-0 overflow-hidden rounded-[5px]',
          'inline-flex items-center justify-center bg-muted',
          className
        )}
        {...other}
      >
        <img
          loading="lazy"
          alt={code}
          src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${code?.toUpperCase()}.svg`}
          className="w-full h-full max-w-none object-cover"
        />
      </span>
    );
  }
);

FlagIcon.displayName = 'FlagIcon';
