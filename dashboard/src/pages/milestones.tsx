import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { MilestonesView } from '@/sections/milestones/view';

/**
 * Milestones page component displaying all HUB milestones grouped by tier.
 * Shows progress for the active milestone and completion status for each tier.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Milestones - ${CONFIG.appName}`}</title>
        <meta name="description" content="View HUB milestones and progress by tier" />
        <meta name="keywords" content="satisfactory,factory,milestones,tiers,hub,progress" />
      </Helmet>

      <MilestonesView />
    </>
  );
}
