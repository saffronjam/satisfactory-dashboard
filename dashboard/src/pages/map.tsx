import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { MapView } from '@/sections/map/view';

/**
 * Map page component displaying the interactive factory map with Leaflet integration.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Map - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="Interactive map view of your Satisfactory factory with drone routes, train routes, and markers"
        />
      </Helmet>

      <MapView />
    </>
  );
}
