import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useRoutes } from 'react-router-dom';
import { DashboardLayout } from 'src/layouts/dashboard';
import DebugPage from 'src/pages/debug';
import DronesPage from 'src/pages/drones';

import MapPage from 'src/pages/map';
import PlayersPage from 'src/pages/players';
import PowerPage from 'src/pages/power';
import PoductionPage from 'src/pages/production';
import SettingsPage from 'src/pages/settings';
import TrainsPage from 'src/pages/trains';
import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

// ----------------------------------------------------------------------

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export function Router() {
  return useRoutes([
    {
      element: (
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        { element: <HomePage />, index: true },
        { path: 'map', element: <MapPage /> },
        { path: 'production', element: <PoductionPage /> },
        { path: 'power', element: <PowerPage /> },
        { path: 'trains', element: <TrainsPage /> },
        { path: 'drones', element: <DronesPage /> },
        { path: 'players', element: <PlayersPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'debug', element: <DebugPage /> },
      ],
    },
    {
      path: '404',
      element: <Page404 />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
