import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { LoginView } from 'src/sections/auth';

/**
 * Login page for dashboard access key authentication.
 * Displays password input form for unauthenticated users.
 */
export default function LoginPage() {
  return (
    <>
      <Helmet>
        <title>{`Login - ${CONFIG.appName}`}</title>
      </Helmet>

      <LoginView />
    </>
  );
}
