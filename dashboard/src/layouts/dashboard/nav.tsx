import { Divider } from '@mui/material';
import Box from '@mui/material/Box';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import type { Breakpoint, SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { useEffect } from 'react';
import { Logo } from 'src/components/logo';
import { Scrollbar } from 'src/components/scrollbar';
import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';
import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

type NavItem = {
  path: string;
  title: string;
  icon: React.ReactNode;
  group: 'main' | 'sub' | 'debug';
  info?: React.ReactNode;
  children?: NavItem[];
};

export type NavContentProps = {
  data: NavItem[];
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  slots,
  layoutQuery,
}: NavContentProps & { layoutQuery: Breakpoint }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pt: 2.5,
        px: 2.5,
        top: 0,
        left: 0,
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        bgcolor: 'var(--layout-nav-bg)',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid var(--layout-nav-border-color, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)})`,
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent data={data} slots={slots} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: 'unset',
          bgcolor: 'var(--layout-nav-bg)',
          width: 'var(--layout-nav-mobile-width)',
          boxShadow: 'none',
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, slots, sx }: NavContentProps) {
  const pathname = usePathname();
  const theme = useTheme();

  // Separate the data into main, sub, and debug groups
  const mainItems = data.filter((item) => item.group === 'main');
  const subItems = data.filter((item) => item.group === 'sub');
  const debugItems = data.filter((item) => item.group === 'debug');

  // Recursive function to render nav item with children support
  const renderNavItem = (item: NavItem, depth: number = 0): React.ReactNode => {
    const isActive = item.path === pathname;
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = hasChildren && item.children?.some((child) => child.path === pathname);
    const isChild = depth > 0;

    return (
      <Box key={item.title}>
        <ListItem disableGutters disablePadding>
          <ListItemButton
            disableRipple
            component={RouterLink}
            href={item.path}
            sx={{
              pl: 2 + depth * 2,
              py: isChild ? 0.5 : 1,
              gap: isChild ? 1.5 : 2,
              pr: 1.5,
              borderRadius: 2,
              typography: 'body2',
              fontWeight: 'fontWeightMedium',
              ...(isChild ? {} : { minHeight: 'var(--layout-nav-item-height)' }),
              // Child items: lighter text on active, no background
              ...(isChild && {
                ...(!isActive && {
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: 'action.hover',
                  },
                }),
                ...(isActive && {
                  color: theme.palette.primary.light,
                  fontWeight: 'fontWeightSemiBold',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }),
              }),
              // Parent items: purple background on active
              ...(!isChild && {
                ...(!isActive &&
                  !isChildActive && {
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }),
                ...((isActive || isChildActive) && {
                  fontWeight: 'fontWeightSemiBold',
                  bgcolor: varAlpha(theme.palette.primary.darkChannel, 0.66),
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    bgcolor: varAlpha(theme.palette.primary.darkChannel, 0.86),
                  },
                }),
              }),
            }}
          >
            <Box component="span" sx={{ width: isChild ? 20 : 24, height: isChild ? 20 : 24 }}>
              {item.icon}
            </Box>

            <Box component="span" flexGrow={1}>
              {item.title}
            </Box>

            {item.info ? item.info : null}
          </ListItemButton>
        </ListItem>

        {/* Render children if present (always expanded) */}
        {hasChildren && (
          <Box sx={{ mt: 0.5 }}>
            {item.children?.map((child) => renderNavItem(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Logo sx={{ display: 'none' }} />

      {slots?.topArea}

      <Scrollbar fillContent sx={{ mt: 2 }}>
        {/* Separator */}
        <Box sx={{ mb: 4 }} />

        <Box component="nav" display="flex" flex="1 1 auto" flexDirection="column" sx={sx}>
          <Box component="ul" gap={1.5} display="flex" flexDirection="column">
            {/* Render main items */}
            {mainItems.map((item) => renderNavItem(item))}

            {/* Divider between main and sub items */}
            {subItems.length > 0 && <Divider sx={{ my: 2 }} />}

            {/* Render sub items */}
            {subItems.map((item) => renderNavItem(item))}

            {/* Divider between sub and debug items */}
            {debugItems.length > 0 && <Divider sx={{ my: 2 }} />}

            {/* Render debug items */}
            {debugItems.map((item) => renderNavItem(item))}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}
    </>
  );
}
