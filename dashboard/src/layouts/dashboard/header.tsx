'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type DashboardHeaderProps = {
  className?: string;
  slots?: {
    leftArea?: React.ReactNode;
    rightArea?: React.ReactNode;
  };
};

/**
 * Dashboard header component using Tailwind sticky positioning.
 * Displays a mobile-friendly header with sidebar toggle and optional slot areas.
 * Hidden on desktop (md and above) where the sidebar is always visible.
 */
export function DashboardHeader({ className, slots }: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden',
        className
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {slots?.leftArea}
      <div className="flex flex-1 justify-center">{/* Center area reserved for future use */}</div>
      {slots?.rightArea}
    </header>
  );
}
