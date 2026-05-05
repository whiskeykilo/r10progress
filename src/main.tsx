import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { TrackingConsentDialog } from "./components/TrackingConsentDialog";
import "./index.scss";
import { SessionProvider } from "./provider/SessionContext.tsx";
import { SettingsProvider } from "./provider/SettingsContext.tsx";
import { TrackingConsentProvider } from "./provider/TrackingConsentContext";
import { UserProvider } from "./provider/UserContext.tsx";
import { router } from "./router.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UserProvider>
      <SettingsProvider>
        <SessionProvider>
          <TrackingConsentProvider>
            <RouterProvider router={router} />
            <TrackingConsentDialog />
          </TrackingConsentProvider>
        </SessionProvider>
      </SettingsProvider>
    </UserProvider>
  </React.StrictMode>,
);
