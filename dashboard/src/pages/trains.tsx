import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { TrainsView } from '@/sections/trains/view';
import { LockedFeature } from '@/components/locked-feature/locked-feature';
import { useUnlockables } from '@/hooks/use-unlockables';

/**
 * Trains page component displaying train statistics, routes, and timetables.
 * Shows a locked state screen if the Monorail Train Technology milestone is not purchased.
 */
export default function Page() {
  const { getLockStatus } = useUnlockables();
  const lockStatus = getLockStatus('/trains');

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

      {lockStatus.isLocked && lockStatus.lockInfo ? (
        <LockedFeature lockInfo={lockStatus.lockInfo} />
      ) : (
        <TrainsView />
      )}
    </>
  );
}
