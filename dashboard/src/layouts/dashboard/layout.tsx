'use client';

import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { LogoutButton } from '@/components/logout-button';
import { AddSessionDialog } from '@/components/session-dialog';
import { SessionSelector } from '@/components/session-selector';
import { SessionInitOverlay } from '@/components/session-init-overlay';
import { SessionStatusBar } from '@/components/session-status-bar';
import { VersionDisplay } from '@/components/version-display/VersionDisplay';
import { WelcomeScreen } from '@/components/welcome';
import { useDebug } from '@/contexts/debug/DebugContext';
import { useSession } from '@/contexts/sessions';

import { useNavData } from '../config-nav-dashboard';
import { DashboardHeader } from './header';
import { AppSidebar } from './sidebar';

export type DashboardLayoutProps = {
  children: React.ReactNode;
};

/**
 * Dashboard layout component that composes the sidebar, header, and content area.
 * Uses shadcn SidebarProvider for collapsible sidebar functionality.
 * Handles welcome screen display when no sessions exist.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { sessions, selectedSession, isLoading: sessionsLoading } = useSession();
  const { isDebugMode } = useDebug();

  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);

  const navData = useNavData(isDebugMode);

  const hideHeader = location.pathname === '/map';

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

  const bottomSlot = (
    <>
      <VersionDisplay />
      <LogoutButton />
    </>
  );

  // Check if the status bar will be visible (session offline)
  const showStatusBar = !sessionsLoading && selectedSession && !selectedSession.isOnline;

  return (
    <>
      <AddSessionDialog
        open={addSessionDialogOpen}
        onClose={() => setAddSessionDialogOpen(false)}
      />
      <div
        className="min-h-screen flex flex-col"
        style={
          {
            '--status-bar-height': showStatusBar ? '2.5rem' : '0px',
          } as React.CSSProperties
        }
      >
        <SidebarProvider className="flex-1">
          <AppSidebar
            data={navData}
            slots={{ topArea: sessionSelectorSlot, bottomArea: bottomSlot }}
          />
          <SidebarInset>
            {!hideHeader && <DashboardHeader />}
            <main
              className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+var(--status-bar-height,0px))] md:p-6 md:pb-[calc(1.5rem+var(--status-bar-height,0px))]"
              data-scroll-container
            >
              {children}
            </main>
          </SidebarInset>
          <SessionInitOverlay />
        </SidebarProvider>
        <SessionStatusBar />
      </div>
    </>
  );
}
