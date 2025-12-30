import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import { forwardRef } from 'react';
import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = BoxProps & {
  href?: string;
  isSingle?: boolean;
  disableLink?: boolean;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ isSingle = false, disableLink = false, className, sx, ...other }, ref) => {
    const singleLogo = (
      <Box
        alt="Single logo"
        component="img"
        src="/logo/vector/default.svg"
        width="100%"
        height="100%"
        sx={{ objectFit: 'cover' }}
      />
    );
    const fullLogo = (
      <Box
        alt="Full logo"
        component="img"
        src="/logo/vector/default.svg"
        width="100%"
        height="100%"
        sx={{ objectFit: 'cover' }}
      />
    );

    return (
      <Box
        ref={ref}
        className={logoClasses.root.concat(className ? ` ${className}` : '')}
        aria-label="Logo"
        sx={{
          flexShrink: 0,
          width: 'auto',
          display: 'inline-flex',
          verticalAlign: 'middle',
          ...(disableLink && { pointerEvents: 'none' }),
          ...sx,
        }}
        {...other}
      >
        {isSingle ? singleLogo : fullLogo}
      </Box>
    );
  }
);
