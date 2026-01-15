import { ArrowDown, ArrowUp, Container } from 'lucide-react';
import { memo } from 'react';
import {
  Belt,
  Cable,
  DroneStation,
  Hypertube,
  HypertubeEntrance,
  Machine,
  MachineStatusIdle,
  MachineStatusOperating,
  MachineStatusPaused,
  Pipe,
  PipeJunction,
  ResourceNode,
  SpaceElevator,
  SplitterMerger,
  Storage,
  TrainRail,
  TrainStation,
  TrainStationPlatformModeExport,
  TrainStationPlatformStatusDocking,
  TrainStationPlatformTypeFluidFreight,
  TruckStation,
} from 'src/apiTypes';
import { getPurityLabel, PURITY_COLORS } from './utils/radarTowerUtils';
import { fShortenNumber, MetricUnits, WattUnits } from 'src/utils/format-number';
import { LocationInfo } from './components/locationInfo';
import { cn } from '@/lib/utils';

// CSS animation for docking pulse on platform arrows
const dockingPulseStyles = `
  @keyframes docking-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .docking-arrow {
    animation: docking-pulse 1.5s ease-in-out infinite;
  }
`;

// Hovered infrastructure item types
export type HoveredItem =
  | { type: 'belt'; data: Belt }
  | { type: 'pipe'; data: Pipe }
  | { type: 'pipeJunction'; data: PipeJunction }
  | { type: 'splitterMerger'; data: SplitterMerger }
  | { type: 'cable'; data: Cable }
  | { type: 'trainRail'; data: TrainRail }
  | { type: 'machine'; data: Machine }
  | { type: 'storage'; data: Storage }
  | { type: 'trainStation'; data: TrainStation }
  | { type: 'droneStation'; data: DroneStation }
  | { type: 'truckStation'; data: TruckStation }
  | { type: 'spaceElevator'; data: SpaceElevator }
  | { type: 'resourceNode'; data: ResourceNode }
  | { type: 'hypertube'; data: Hypertube }
  | { type: 'hypertubeEntrance'; data: HypertubeEntrance };

interface HoverTooltipProps {
  item: HoveredItem;
  position: { x: number; y: number };
}

// Format length for display
const formatLength = (length: number): string => {
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}km`;
  }
  return `${Math.round(length)}m`;
};

// Format items per minute
const formatRate = (rate: number): string => {
  return `${fShortenNumber(rate, MetricUnits, { decimals: 1 })}/min`;
};

// Format machine type to readable name
const formatMachineType = (type: string): string => {
  return type
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (str) => str.toUpperCase());
};

function HoverTooltipInner({ item, position }: HoverTooltipProps) {
  const renderContent = () => {
    switch (item.type) {
      case 'belt':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Belt</span>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Conveyor Belt'}
            </span>
            <div className="flex gap-1.5 mt-0.5">
              <span className="text-[0.65rem] text-muted-foreground">
                {formatLength(item.data.length)}
              </span>
              {item.data.itemsPerMinute > 0 && (
                <span className="text-[0.65rem] text-muted-foreground">
                  {formatRate(item.data.itemsPerMinute)}
                </span>
              )}
            </div>
            <LocationInfo
              x={item.data.location0.x}
              y={item.data.location0.y}
              z={item.data.location0.z}
            />
          </>
        );

      case 'pipe':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Pipe</span>
            <span className="text-[0.75rem] font-medium block">{item.data.name || 'Pipeline'}</span>
            <div className="flex gap-1.5 mt-0.5">
              <span className="text-[0.65rem] text-muted-foreground">
                {formatLength(item.data.length)}
              </span>
              {item.data.itemsPerMinute > 0 && (
                <span className="text-[0.65rem] text-muted-foreground">
                  {formatRate(item.data.itemsPerMinute)}
                </span>
              )}
            </div>
            <LocationInfo
              x={item.data.location0.x}
              y={item.data.location0.y}
              z={item.data.location0.z}
            />
          </>
        );

      case 'pipeJunction':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Pipe Junction</span>
            <span className="text-[0.75rem] font-medium block">{item.data.name || 'Junction'}</span>
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );

      case 'splitterMerger': {
        const isMerger = item.data.type.toLowerCase().includes('merger');
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">
              {isMerger ? 'Merger' : 'Splitter'}
            </span>
            <span className="text-[0.75rem] font-medium block">{item.data.type}</span>
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'cable':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Power Cable</span>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Power Line'}
            </span>
            <span className="text-[0.65rem] text-muted-foreground mt-0.5 block">
              {formatLength(item.data.length)}
            </span>
            <LocationInfo
              x={item.data.location0.x}
              y={item.data.location0.y}
              z={item.data.location0.z}
            />
          </>
        );

      case 'trainRail':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Train Rail</span>
            <span className="text-[0.75rem] font-medium block">{item.data.type || 'Railway'}</span>
            <span className="text-[0.65rem] text-muted-foreground mt-0.5 block">
              {formatLength(item.data.length)}
            </span>
            <LocationInfo
              x={item.data.location0.x}
              y={item.data.location0.y}
              z={item.data.location0.z}
            />
          </>
        );

      case 'machine': {
        // Get status color for LED indicator
        const getStatusColor = (status: string): string => {
          switch (status) {
            case MachineStatusOperating:
              return '#22c55e'; // Green - running
            case MachineStatusIdle:
              return '#eab308'; // Yellow - waiting for resources
            case MachineStatusPaused:
              return '#f97316'; // Orange - manually paused
            default:
              return '#6b7280'; // Gray - unconfigured/unknown
          }
        };

        // Check if this is a generator
        const isGenerator = item.data.category === 'generator';

        if (isGenerator) {
          // Get power output from first output stat
          const powerOutput = item.data.output?.[0];
          const currentMW = powerOutput?.current ?? 0;
          const maxMW = powerOutput?.max ?? 0;

          return (
            <>
              <span className="text-[0.65rem] text-muted-foreground block">Generator</span>
              <div className="flex items-center gap-[3px]">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getStatusColor(item.data.status) }}
                />
                <span className="text-[0.75rem] font-medium">
                  {formatMachineType(item.data.type)}
                </span>
              </div>
              <div className="mt-1 pt-1 border-t border-border flex justify-between items-center">
                <span className="text-[0.6rem] text-foreground">
                  {fShortenNumber(currentMW, WattUnits, { decimals: 1 })}
                </span>
                <span className="text-[0.6rem] text-muted-foreground">
                  Max {fShortenNumber(maxMW, WattUnits, { decimals: 1 })}
                </span>
              </div>
              <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
            </>
          );
        }

        // Factory/Extractor machines
        // Get recipe from first output item
        const recipe = item.data.output?.[0]?.name;

        // Calculate average efficiency from output stats
        const outputEfficiencies = item.data.output?.filter((o) => o.efficiency > 0) ?? [];
        const avgEfficiency =
          outputEfficiencies.length > 0
            ? outputEfficiencies.reduce((sum, o) => sum + o.efficiency, 0) /
              outputEfficiencies.length
            : null;

        return (
          <>
            <div className="flex items-center gap-[3px]">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getStatusColor(item.data.status) }}
              />
              <span className="text-[0.75rem] font-medium">
                {formatMachineType(item.data.type)}
              </span>
            </div>
            {recipe && (
              <div className="flex items-center gap-1">
                <img
                  src={`assets/images/satisfactory/32x32/${recipe}.png`}
                  alt={recipe}
                  className="w-3.5 h-3.5 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[0.65rem] text-foreground">{recipe}</span>
              </div>
            )}
            {avgEfficiency !== null && (
              <div className="mt-1 pt-1 border-t border-border">
                <span className="text-[0.6rem] text-foreground">
                  Efficiency: {(avgEfficiency * 100).toFixed(0)}%
                </span>
              </div>
            )}
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'storage': {
        const inventoryItems = item.data.inventory?.slice(0, 4) ?? [];
        const hasMoreItems = (item.data.inventory?.length ?? 0) > 4;

        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Storage</span>
            <span className="text-[0.75rem] font-medium block">{item.data.type}</span>
            {inventoryItems.length > 0 ? (
              <div className="mt-1 pt-1 border-t border-border">
                {inventoryItems.map((invItem, idx) => (
                  <div
                    key={idx}
                    className={cn('flex items-center justify-between gap-[3px]', idx > 0 && 'mt-1')}
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <img
                        src={`assets/images/satisfactory/32x32/${invItem.name}.png`}
                        alt={invItem.name}
                        className="w-3.5 h-3.5 object-contain shrink-0"
                      />
                      <span className="text-[0.6rem] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        {invItem.name}
                      </span>
                    </div>
                    <span className="text-[0.6rem] text-foreground font-medium shrink-0">
                      {fShortenNumber(invItem.count, MetricUnits, { decimals: 0 })}
                    </span>
                  </div>
                ))}
                {hasMoreItems && (
                  <span className="text-[0.55rem] text-muted-foreground mt-1 block">
                    +{(item.data.inventory?.length ?? 0) - 4} more items
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[0.6rem] text-muted-foreground mt-1 italic block">Empty</span>
            )}
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'trainStation': {
        const platforms = item.data.platforms || [];

        return (
          <>
            <style>{dockingPulseStyles}</style>
            <span className="text-[0.65rem] text-muted-foreground block">Train Station</span>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Train Station'}
            </span>

            {platforms.length > 0 && (
              <div className="mt-1.5 pt-1 border-t border-border overflow-hidden">
                <div className="flex gap-1 flex-wrap">
                  {platforms.map((platform, idx) => {
                    const isExport = platform.mode === TrainStationPlatformModeExport;
                    const isFluid = platform.type === TrainStationPlatformTypeFluidFreight;
                    const isDocking = platform.status === TrainStationPlatformStatusDocking;
                    const ArrowIcon = isExport ? ArrowUp : ArrowDown;

                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[40px]">
                        <ArrowIcon
                          className={cn('w-4 h-4 text-gray-400', isDocking && 'docking-arrow')}
                        />

                        {isFluid ? (
                          <>
                            <span className="text-[0.5rem] leading-tight text-muted-foreground text-center whitespace-nowrap">
                              In:{' '}
                              {fShortenNumber(platform.inflowRate, MetricUnits, { decimals: 0 })}
                              /min
                            </span>
                            <span className="text-[0.5rem] leading-tight text-muted-foreground text-center whitespace-nowrap">
                              Out:{' '}
                              {fShortenNumber(platform.outflowRate, MetricUnits, { decimals: 0 })}
                              /min
                            </span>
                          </>
                        ) : (
                          <span className="text-[0.5rem] leading-tight text-muted-foreground text-center whitespace-nowrap">
                            {fShortenNumber(platform.transferRate, MetricUnits, { decimals: 1 })}
                            /min
                          </span>
                        )}

                        <Container
                          className="w-5 h-5 mt-0.5"
                          style={{ color: isFluid ? '#06b6d4' : '#f59e0b' }}
                        />

                        {platform.inventory && platform.inventory.length > 0 && (
                          <div className="flex flex-col items-center gap-0.5 mt-1 max-h-[50px] overflow-y-auto">
                            {platform.inventory.slice(0, 3).map((invItem, itemIdx) => (
                              <div key={itemIdx} className="flex items-center gap-0.5">
                                <img
                                  src={`assets/images/satisfactory/32x32/${invItem.name}.png`}
                                  alt={invItem.name}
                                  className="w-3 h-3 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <span className="text-[0.5rem] leading-none text-foreground whitespace-nowrap">
                                  {fShortenNumber(invItem.count, MetricUnits, { decimals: 0 })}
                                </span>
                              </div>
                            ))}
                            {platform.inventory.length > 3 && (
                              <span className="text-[0.45rem] text-muted-foreground/60">
                                +{platform.inventory.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {platforms.length === 0 && (
              <span className="text-[0.6rem] text-muted-foreground mt-0.5 block">No platforms</span>
            )}
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'droneStation':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Drone Station</span>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Drone Port'}
            </span>
            <div className="flex gap-1 mt-0.5">
              {item.data.incomingRate > 0 && (
                <span className="text-[0.6rem]">
                  ▲ {fShortenNumber(item.data.incomingRate, MetricUnits, { decimals: 1 })}/min
                </span>
              )}
              {item.data.outgoingRate > 0 && (
                <span className="text-[0.6rem]">
                  ▼ {fShortenNumber(item.data.outgoingRate, MetricUnits, { decimals: 1 })}/min
                </span>
              )}
            </div>
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );

      case 'truckStation':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Truck Station</span>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Truck Station'}
            </span>
            {item.data.transferRate > 0 && (
              <span className="text-[0.6rem] text-muted-foreground mt-0.5 block">
                Transfer: {fShortenNumber(item.data.transferRate, MetricUnits, { decimals: 1 })}/s
              </span>
            )}
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );

      case 'spaceElevator': {
        const phases = item.data.currentPhase || [];
        const isFullyUpgraded = item.data.fullyUpgraded;
        const isUpgradeReady = item.data.upgradeReady;

        return (
          <>
            <span className="text-[0.75rem] font-medium block">
              {item.data.name || 'Space Elevator'}
            </span>
            <span className="text-[0.65rem] text-muted-foreground block">
              Phase: {isFullyUpgraded ? 'Maxed Out' : ''}
            </span>

            <div className="mt-1 flex gap-1">
              {isFullyUpgraded && (
                <span className="text-[0.6rem] text-green-500 font-medium">✓ Fully Upgraded</span>
              )}
              {isUpgradeReady && !isFullyUpgraded && (
                <span className="text-[0.6rem] text-amber-500 font-medium">⬆ Upgrade Ready</span>
              )}
            </div>

            {phases.length > 0 && !isFullyUpgraded && (
              <div className="mt-1 pt-1 border-t border-border">
                <span className="text-[0.55rem] text-muted-foreground mb-0.5 block">
                  Phase Requirements
                </span>
                {phases.map((obj, idx) => {
                  const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
                  return (
                    <div key={idx} className={cn(idx < phases.length - 1 && 'mb-1')}>
                      <div className="flex items-center justify-between gap-[3px] mb-0.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <img
                            src={`assets/images/satisfactory/32x32/${obj.name}.png`}
                            alt={obj.name}
                            className="w-3.5 h-3.5 object-contain shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <span className="text-[0.55rem] overflow-hidden text-ellipsis whitespace-nowrap">
                            {obj.name}
                          </span>
                        </div>
                        <span className="text-[0.55rem] shrink-0 text-foreground">
                          {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                          {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                        </span>
                      </div>
                      <div className="h-[3px] bg-white/10 rounded overflow-hidden">
                        <div
                          className="h-full transition-[width] duration-300"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: progress >= 100 ? '#22c55e' : '#9333EA',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'resourceNode': {
        const purityColor =
          PURITY_COLORS[item.data.purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;
        const purityLabel = getPurityLabel(item.data.purity);

        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Resource Node</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <div className="flex items-center gap-1">
                <img
                  src={`assets/images/satisfactory/32x32/${item.data.name}.png`}
                  alt={item.data.name}
                  className="w-4 h-4 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[0.75rem] font-medium leading-tight">{item.data.name}</span>
              </div>
              <span
                className="text-[0.65rem] leading-tight font-medium opacity-85"
                style={{ color: purityColor }}
              >
                {purityLabel}
              </span>
            </div>
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
      }

      case 'hypertube':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Hypertube</span>
            <span className="text-[0.75rem] font-medium block">Hypertube Segment</span>
            <LocationInfo
              x={item.data.location0.x}
              y={item.data.location0.y}
              z={item.data.location0.z}
            />
          </>
        );

      case 'hypertubeEntrance':
        return (
          <>
            <span className="text-[0.65rem] text-muted-foreground block">Hypertube Entrance</span>
            <span className="text-[0.75rem] font-medium block">Entrance</span>
            <LocationInfo x={item.data.x} y={item.data.y} z={item.data.z} />
          </>
        );
    }
  };

  return (
    <div
      className="fixed z-[1400] p-2 min-w-[80px] max-w-[280px] bg-card rounded shadow-md pointer-events-none border border-border"
      style={{
        left: position.x + 8,
        top: position.y + 8,
      }}
    >
      {renderContent()}
    </div>
  );
}

export const HoverTooltip = memo(HoverTooltipInner);
