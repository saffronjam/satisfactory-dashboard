import type { Theme, SxProps, Breakpoint } from "@mui/material/styles";

import { useState } from "react";
import { useLocation } from "react-router-dom";

import Alert from "@mui/material/Alert";
import { useTheme } from "@mui/material/styles";

import { Main } from "./main";
import { layoutClasses } from "../classes";
import { NavMobile, NavDesktop } from "./nav";
import { navData } from "../config-nav-dashboard";
import { MenuButton } from "../components/menu-button";
import { LayoutSection } from "../core/layout-section";
import { HeaderSection } from "../core/header-section";
import { useNotifications } from "@toolpad/core";
import { useSession } from "src/contexts/sessions";
import { SessionSelector } from "src/components/session-selector";
import { AddSessionDialog } from "src/components/session-dialog";
import { WelcomeScreen } from "src/components/welcome";
import { SessionStatusBar } from "src/components/session-status-bar";

// ----------------------------------------------------------------------

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  type: string;
  postedAt: string;
  isUnRead: boolean;
};

export function DashboardLayout({ sx, children, header }: DashboardLayoutProps) {
  const theme = useTheme();
  const location = useLocation();
  const { show, close } = useNotifications();
  const { sessions, isLoading: sessionsLoading } = useSession();

  const [navOpen, setNavOpen] = useState(false);
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);

  const layoutQuery: Breakpoint = "lg";

  // Hide header on map page for full-screen experience
  const hideHeader = location.pathname === "/map";

  // Show welcome screen when no sessions exist
  if (!sessionsLoading && sessions.length === 0) {
    return (
      <>
        <WelcomeScreen onAddSession={() => setAddSessionDialogOpen(true)} />
        <AddSessionDialog
          open={addSessionDialogOpen}
          onClose={() => setAddSessionDialogOpen(false)}
        />
      </>
    );
  }

  const sessionSelectorSlot = (
    <SessionSelector onAddSession={() => setAddSessionDialogOpen(true)} />
  );

  return (
    <>
      <AddSessionDialog
        open={addSessionDialogOpen}
        onClose={() => setAddSessionDialogOpen(false)}
      />
      <LayoutSection
        /** **************************************
         * Header
         *************************************** */
        headerSection={
          hideHeader ? null : (
            <HeaderSection
              layoutQuery={layoutQuery}
              slotProps={{
                container: {
                  maxWidth: false,
                  sx: { px: { [layoutQuery]: 5 } },
                },
              }}
              sx={header?.sx}
              slots={{
                topArea: (
                  <Alert
                    severity="warning"
                    sx={{
                      display: "none",
                      borderRadius: 4,
                      m: 2,
                      position: "fixed",
                      zIndex: 9999,
                      width: "calc(100% - 32px)",
                      [theme.breakpoints.up(layoutQuery)]: { width: "calc(100% - 230px - 32px)" },
                    }}
                  >
                    This is an info Alert.
                  </Alert>
                ),
                leftArea: (
                  <>
                    <MenuButton
                      onClick={() => setNavOpen(true)}
                      sx={{
                        ml: -1,
                        [theme.breakpoints.up(layoutQuery)]: { display: "none" },
                      }}
                    />
                    <NavMobile
                      data={navData}
                      open={navOpen}
                      onClose={() => setNavOpen(false)}
                      slots={{ topArea: sessionSelectorSlot }}
                    />
                  </>
                ),
              }}
            />
          )
        }
        /** **************************************
         * Sidebar
         *************************************** */
        sidebarSection={
          <NavDesktop
            data={navData}
            layoutQuery={layoutQuery}
            slots={{ topArea: sessionSelectorSlot }}
          />
        }
        /** **************************************
         * Footer
         *************************************** */
        footerSection={null}
        /** **************************************
         * Style
         *************************************** */
        cssVars={{
          "--layout-nav-vertical-width": "230px",
          "--layout-dashboard-content-pt": theme.spacing(1),
          "--layout-dashboard-content-pb": theme.spacing(8),
          "--layout-dashboard-content-px": theme.spacing(5),
        }}
        sx={{
          [`& .${layoutClasses.hasSidebar}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: "var(--layout-nav-vertical-width)",
            },
          },
          ...sx,
        }}
      >
        <Main>{children}</Main>
      </LayoutSection>
      <SessionStatusBar />
    </>
  );
}
