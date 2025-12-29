import ReactDOM from "react-dom/client";
import { Suspense, StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import App from "./app";
import { SessionProvider } from "./contexts/sessions";
import { SessionAwareApiProvider } from "./contexts/api/SessionAwareApiProvider";
import "@fontsource/roboto-mono";
import "@fontsource/dm-mono";
import { NotificationsProvider } from "@toolpad/core";

// ----------------------------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense>
          <SessionProvider>
            <SessionAwareApiProvider>
              <NotificationsProvider>
                <App />
              </NotificationsProvider>
            </SessionAwareApiProvider>
          </SessionProvider>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
