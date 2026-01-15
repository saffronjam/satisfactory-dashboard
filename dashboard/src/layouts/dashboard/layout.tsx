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

import { getNavData } from '../config-nav-dashboard';
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
  const { sessions, isLoading: sessionsLoading } = useSession();
  const { isDebugMode } = useDebug();

  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);

  const navData = getNavData(isDebugMode);

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

  return (
    <>
      <AddSessionDialog
        open={addSessionDialogOpen}
        onClose={() => setAddSessionDialogOpen(false)}
      />
      <SidebarProvider>
        <AppSidebar
          data={navData}
          slots={{ topArea: sessionSelectorSlot, bottomArea: bottomSlot }}
        />
        <SidebarInset>
          {!hideHeader && <DashboardHeader />}
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <SessionStatusBar />
      <SessionInitOverlay />
    </>
  );
}
