import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { PlayersView } from '@/sections/players/view';

/**
 * Players page component displaying player information, health, and favorite items.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Players - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="View player information, health status, and favorite items"
        />
        <meta name="keywords" content="satisfactory,factory,players,health,inventory" />
      </Helmet>

      <PlayersView />
    </>
  );
}
