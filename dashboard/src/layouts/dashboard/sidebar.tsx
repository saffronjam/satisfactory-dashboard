'use client';

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Lock } from 'lucide-react';
import { RouterLink } from 'src/routes/components';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from 'src/components/ui/sidebar';
import { ScrollArea } from 'src/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/ui/collapsible';
import { cn } from '@/lib/utils';

import type { NavItem } from '../config-nav-dashboard';

export type AppSidebarProps = {
  data: NavItem[];
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
};

/**
 * Renders a single navigation item using shadcn SidebarMenuButton.
 * For items with children, renders as a collapsible instead of a link.
 * Locked items display with faded styling and a padlock icon.
 */
function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path === pathname;
  const isLocked = item.locked ?? false;

  if (hasChildren) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title}>
              {item.icon}
              <span>{item.title}</span>
              <ChevronDown
                className={cn(
                  'ml-auto size-4 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((child) => (
                <SidebarMenuSubItem key={child.path}>
                  <SidebarMenuSubButton asChild isActive={child.path === pathname}>
                    <RouterLink href={child.path || '#'}>
                      {child.icon}
                      <span>{child.title}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={isLocked ? `${item.title} (Locked)` : item.title}
        className={cn(isLocked && 'opacity-50')}
      >
        <RouterLink href={item.path || '#'}>
          <span className={cn('relative', isLocked && 'text-muted-foreground')}>
            {item.icon}
            {isLocked && (
              <Lock size={12} className="absolute -right-1 -top-1 text-muted-foreground" />
            )}
          </span>
          <span className={cn(isLocked && 'text-muted-foreground')}>{item.title}</span>
        </RouterLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Dashboard sidebar navigation using shadcn Sidebar components.
 * Displays navigation items grouped by type (main, sub, debug) with support
 * for nested items and active state highlighting.
 */
export function AppSidebar({ data, slots }: AppSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const mainItems = data.filter((item) => item.group === 'main');
  const subItems = data.filter((item) => item.group === 'sub');
  const debugItems = data.filter((item) => item.group === 'debug');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">{slots?.topArea}</SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <NavItemComponent key={item.path || item.title} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {subItems.length > 0 && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {subItems.map((item) => (
                      <NavItemComponent
                        key={item.path || item.title}
                        item={item}
                        pathname={pathname}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}

          {debugItems.length > 0 && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {debugItems.map((item) => (
                      <NavItemComponent
                        key={item.path || item.title}
                        item={item}
                        pathname={pathname}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4">{slots?.bottomArea}</SidebarFooter>
    </Sidebar>
  );
}
