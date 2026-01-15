import {
  Bug,
  Factory,
  LayoutDashboard,
  Map,
  Network,
  Plane,
  Server,
  Settings,
  TrainFront,
  Users,
  Zap,
} from 'lucide-react';

type NavItem = {
  title: string;
  path?: string;
  icon: React.ReactNode;
  group: 'main' | 'sub' | 'debug';
  children?: NavItem[];
};

const baseNavData: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard size={24} />,
    group: 'main',
  },
  {
    title: 'Map',
    path: '/map',
    icon: <Map size={24} />,
    group: 'main',
  },
  {
    title: 'Production',
    path: '/production',
    icon: <Factory size={24} />,
    group: 'main',
  },
  {
    title: 'Power',
    path: '/power',
    icon: <Zap size={24} />,
    group: 'main',
  },
  {
    title: 'Trains',
    path: '/trains',
    icon: <TrainFront size={24} />,
    group: 'main',
  },
  {
    title: 'Drones',
    path: '/drones',
    icon: <Plane size={24} />,
    group: 'main',
  },
  {
    title: 'Players',
    path: '/players',
    icon: <Users size={24} />,
    group: 'main',
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <Settings size={24} />,
    group: 'main',
  },
];

const debugNavItem: NavItem = {
  title: 'Debug',
  icon: <Bug size={24} />,
  group: 'debug',
  children: [
    {
      title: 'Endpoints',
      path: '/debug',
      icon: <Network size={20} />,
      group: 'debug',
    },
    {
      title: 'Nodes',
      path: '/debug/nodes',
      icon: <Server size={20} />,
      group: 'debug',
    },
  ],
};

/**
 * Returns navigation data for the dashboard sidebar based on debug mode setting.
 * Includes main navigation items and conditionally adds debug items.
 */
export function getNavData(isDebugMode: boolean): NavItem[] {
  if (isDebugMode) {
    return [...baseNavData, debugNavItem];
  }
  return baseNavData;
}
