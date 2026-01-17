import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { DronesView } from '@/sections/drones/view';
import { LockedFeature } from '@/components/locked-feature/locked-feature';
import { useUnlockables } from '@/hooks/use-unlockables';

/**
 * Drones page component displaying drone statistics, routes, and station information.
 * Shows a locked state screen if the Drone Transport milestone is not purchased.
 */
export default function Page() {
  const { getLockStatus } = useUnlockables();
  const lockStatus = getLockStatus('/drones');

  return (
    <>
      <Helmet>
        <title>{`Drones - ${CONFIG.appName}`}</title>
        <meta name="description" content="View drone statistics, routes, and station information" />
        <meta name="keywords" content="satisfactory,factory,drones,routes,stations,logistics" />
      </Helmet>

      {lockStatus.isLocked && lockStatus.lockInfo ? (
        <LockedFeature lockInfo={lockStatus.lockInfo} />
      ) : (
        <DronesView />
      )}
    </>
  );
}
