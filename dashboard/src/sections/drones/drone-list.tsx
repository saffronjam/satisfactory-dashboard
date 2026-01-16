import { Icon } from '@iconify/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PopoverMap } from '@/components/popover-map';
import { cn } from '@/lib/utils';
import {
  Drone,
  DroneStation,
  DroneStatusDocking,
  DroneStatusFlying,
  DroneStatusIdle,
} from 'src/apiTypes';
import { fNumber } from 'src/utils/format-number';

/**
 * Returns status styling configuration for a drone based on its current status.
 */
const getStatusConfig = (status: string) => {
  switch (status) {
    case DroneStatusFlying:
      return {
        icon: <Icon icon="mdi:airplane" className="size-3" />,
        label: 'Flying',
        className: 'bg-green-600 text-white border-green-600',
        pulse: false,
      };
    case DroneStatusDocking:
      return {
        icon: <Icon icon="game-icons:cargo-crate" className="size-3" />,
        label: 'Docking',
        className: 'bg-blue-600 text-white border-blue-600',
        pulse: true,
      };
    case DroneStatusIdle:
      return {
        icon: <Icon icon="mdi:pause" className="size-3" />,
        label: 'Idle',
        className: 'bg-yellow-600 text-white border-yellow-600',
        pulse: false,
      };
    default:
      return {
        icon: <Icon icon="ri:question-line" className="size-3" />,
        label: status,
        className: 'bg-blue-600 text-white border-blue-600',
        pulse: false,
      };
  }
};

/**
 * Displays a single drone card with route visualization, status, and statistics.
 */
const DroneCard = ({ drone }: { drone: Drone }) => {
  const config = getStatusConfig(drone.status);

  const getHomeName = () => {
    if (!drone.home) return 'No Home';
    return drone.home.name || 'Unnamed';
  };

  const getPairedName = () => {
    if (!drone.paired) return 'No Pair';
    return drone.paired.name || 'Unnamed';
  };

  const isAtHome =
    drone.status !== DroneStatusFlying &&
    (drone.destination?.name === drone.home?.name || !drone.destination);
  const isFlyingToPaired =
    drone.status === DroneStatusFlying && drone.destination?.name === drone.paired?.name;
  const isFlyingToHome =
    drone.status === DroneStatusFlying && drone.destination?.name === drone.home?.name;

  return (
    <Card className="mb-4 p-5">
      <CardContent className="p-0">
        {/* Header: Name and Status */}
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-2xl font-bold">{drone.name}</h4>
          <Badge className={cn(config.className, 'pl-1.5', config.pulse && 'animate-pulse')}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        {/* Route Visualization - Ellipse with bidirectional arrows */}
        <div className="relative my-6 flex items-center justify-center overflow-x-auto pb-2">
          {/* Home Station */}
          <div className="z-10 flex min-w-20 shrink-0 flex-col items-center">
            <div
              className={cn(
                'size-3.5 rounded-full border-2',
                isAtHome
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50 bg-muted-foreground'
              )}
            />
            <span
              className={cn(
                'mt-1 whitespace-nowrap text-sm',
                isAtHome ? 'font-bold text-primary' : 'text-muted-foreground'
              )}
            >
              {getHomeName()}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">Home</span>
          </div>

          {/* Ellipse Route with SVG */}
          <div className="relative mx-2 h-20 w-44 shrink-0">
            <svg width="180" height="80" viewBox="0 0 180 80" className="absolute left-0 top-0">
              {/* Top arc (Home → Paired) */}
              <path
                d="M 10 40 Q 90 0 170 40"
                fill="none"
                className={isFlyingToPaired ? 'stroke-primary' : 'stroke-muted-foreground'}
                strokeWidth="2"
                strokeDasharray={isFlyingToPaired ? '8 4' : 'none'}
                style={
                  isFlyingToPaired
                    ? { animation: 'dash-flow-forward 0.8s linear infinite' }
                    : undefined
                }
              />
              {/* Arrow head for top arc (pointing right) */}
              <polygon
                points="165,35 175,40 165,45"
                className={isFlyingToPaired ? 'fill-primary' : 'fill-muted-foreground'}
              />

              {/* Bottom arc (Paired → Home) */}
              <path
                d="M 170 40 Q 90 80 10 40"
                fill="none"
                className={isFlyingToHome ? 'stroke-primary' : 'stroke-muted-foreground'}
                strokeWidth="2"
                strokeDasharray={isFlyingToHome ? '8 4' : 'none'}
                style={
                  isFlyingToHome
                    ? { animation: 'dash-flow-backward 0.8s linear infinite' }
                    : undefined
                }
              />
              {/* Arrow head for bottom arc (pointing left) */}
              <polygon
                points="15,35 5,40 15,45"
                className={isFlyingToHome ? 'fill-primary' : 'fill-muted-foreground'}
              />
            </svg>

            {/* CSS animation keyframes */}
            <style>
              {`
                @keyframes dash-flow-forward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes dash-flow-backward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
              `}
            </style>
          </div>

          {/* Paired Station */}
          <div className="z-10 flex min-w-20 shrink-0 flex-col items-center">
            <div
              className={cn(
                'size-3.5 rounded-full border-2',
                !isAtHome
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50 bg-muted-foreground'
              )}
            />
            <span
              className={cn(
                'mt-1 whitespace-nowrap text-sm',
                !isAtHome ? 'font-bold text-primary' : 'text-muted-foreground'
              )}
            >
              {getPairedName()}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">Paired</span>
          </div>
        </div>

        {/* Footer: Speed, Fuel, and Map */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <span className="text-sm">Speed:</span>
              <span className="pl-1 text-lg font-bold">
                {fNumber(drone.speed, { decimals: 0 })} km/h
              </span>
            </div>
            {drone.home?.fuel?.Name && (
              <div className="flex items-center gap-2">
                <Icon icon="mdi:fuel" className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{drone.home.fuel.Name}</span>
              </div>
            )}
          </div>
          <PopoverMap entity={drone} entityType="drone">
            <Icon icon="mdi:map-marker" className="size-4" />
          </PopoverMap>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Renders a list of drone cards.
 */
export function DroneList({ drones }: { drones: Drone[]; droneStations: DroneStation[] }) {
  return (
    <>
      {drones.map((drone, index) => (
        <DroneCard key={index} drone={drone} />
      ))}
    </>
  );
}
