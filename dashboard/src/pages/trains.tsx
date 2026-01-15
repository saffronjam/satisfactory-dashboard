import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { TrainsView } from '@/sections/trains/view';

/**
 * Trains page component displaying train statistics, routes, and timetables.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Trains - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="View train statistics, routes, timetables, and power consumption metrics"
        />
        <meta name="keywords" content="satisfactory,factory,trains,routes,timetables,logistics" />
      </Helmet>

      <TrainsView />
    </>
  );
}
