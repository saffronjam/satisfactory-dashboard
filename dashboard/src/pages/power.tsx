import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { PowerView } from '@/sections/power/view';

/**
 * Power page component displaying power circuit statistics and generator information.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Power - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="View power circuit statistics, generator status, and electricity consumption metrics"
        />
        <meta
          name="keywords"
          content="satisfactory,factory,power,circuits,generators,electricity"
        />
      </Helmet>

      <PowerView />
    </>
  );
}
