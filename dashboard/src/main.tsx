import { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

import App from './app';
import { SessionAwareApiProvider } from './contexts/api/SessionAwareApiProvider';
import { DebugProvider } from './contexts/debug/DebugContext';
import { SessionProvider } from './contexts/sessions';
import '@fontsource/roboto-mono';
import '@fontsource/dm-mono';
import { NotificationsProvider } from '@toolpad/core';

// ----------------------------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense>
          <DebugProvider>
            <SessionProvider>
              <SessionAwareApiProvider>
                <NotificationsProvider>
                  <App />
                </NotificationsProvider>
              </SessionAwareApiProvider>
            </SessionProvider>
          </DebugProvider>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
