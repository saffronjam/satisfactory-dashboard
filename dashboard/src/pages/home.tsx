import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { OverviewAnalyticsView } from '@/sections/overview/view';

/**
 * Home page component displaying the main dashboard analytics view.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Dashboard - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="Satisfactory factory dashboard for monitoring and managing your game factory"
        />
        <meta name="keywords" content="satisfactory,factory,dashboard,monitoring,game" />
      </Helmet>

      <OverviewAnalyticsView />
    </>
  );
}
