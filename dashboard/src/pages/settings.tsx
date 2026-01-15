import { Helmet } from 'react-helmet-async';

import { CONFIG } from '@/config-global';

import { SettingsView } from '@/sections/settings/view';

/**
 * Settings page component for configuring dashboard options.
 * Includes access key management and log level configuration.
 */
export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Settings - ${CONFIG.appName}`}</title>
        <meta
          name="description"
          content="Configure dashboard settings including access key and log level"
        />
        <meta name="keywords" content="satisfactory,factory,dashboard,settings,configuration" />
      </Helmet>

      <SettingsView />
    </>
  );
}
