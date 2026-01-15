import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { ProductionView } from '@/sections/production/view';

/**
 * Production page component displaying factory production statistics and item tracking.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Production - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="View factory production statistics, inventory levels, and item efficiency metrics"
        />
        <meta name="keywords" content="satisfactory,factory,production,statistics,inventory" />
      </Helmet>

      <ProductionView />
    </>
  );
}
