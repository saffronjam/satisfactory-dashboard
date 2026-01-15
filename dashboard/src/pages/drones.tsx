import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { DronesView } from '@/sections/drones/view';

/**
 * Drones page component displaying drone statistics, routes, and station information.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Drones - ${CONFIG.appName}`}</title>
        <meta name="description" content="View drone statistics, routes, and station information" />
        <meta name="keywords" content="satisfactory,factory,drones,routes,stations,logistics" />
      </Helmet>

      <DronesView />
    </>
  );
}
