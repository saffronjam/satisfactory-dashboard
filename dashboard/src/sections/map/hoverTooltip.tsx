import { Box, IconButton, Paper, Typography } from '@mui/material';
import { memo, useEffect, useRef } from 'react';
import {
  Belt,
  Cable,
  DroneStation,
  Machine,
  MachineStatusIdle,
  MachineStatusOperating,
  MachineStatusPaused,
  Pipe,
  PipeJunction,
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
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, MetricUnits, WattUnits } from 'src/utils/format-number';

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
  | { type: 'spaceElevator'; data: SpaceElevator };

interface HoverTooltipProps {
  item: HoveredItem;
  position: { x: number; y: number };
  isPinned?: boolean;
  onClose?: () => void;
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

function HoverTooltipInner({ item, position, isPinned = false, onClose }: HoverTooltipProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-outside detection
  useEffect(() => {
    if (!isPinned || !onClose) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 100ms delay prevents the click that pins from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned, onClose]);

  const renderContent = () => {
    switch (item.type) {
      case 'belt':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Belt
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Conveyor Belt'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {formatLength(item.data.length)}
              </Typography>
              {item.data.itemsPerMinute > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {formatRate(item.data.itemsPerMinute)}
                </Typography>
              )}
            </Box>
          </>
        );

      case 'pipe':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Pipe
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Pipeline'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {formatLength(item.data.length)}
              </Typography>
              {item.data.itemsPerMinute > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {formatRate(item.data.itemsPerMinute)}
                </Typography>
              )}
            </Box>
          </>
        );

      case 'pipeJunction':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Pipe Junction
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Junction'}
            </Typography>
          </>
        );

      case 'splitterMerger':
        const isMerger = item.data.type.toLowerCase().includes('merger');
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {isMerger ? 'Merger' : 'Splitter'}
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.type}
            </Typography>
          </>
        );

      case 'cable':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Power Cable
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Power Line'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.65rem', mt: 0.25 }}
            >
              {formatLength(item.data.length)}
            </Typography>
          </>
        );

      case 'trainRail':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Train Rail
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.type || 'Railway'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.65rem', mt: 0.25 }}
            >
              {formatLength(item.data.length)}
            </Typography>
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
              {/* Category heading */}
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Generator
              </Typography>
              {/* Generator type with status LED */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(item.data.status),
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                  {formatMachineType(item.data.type)}
                </Typography>
              </Box>
              {/* Power production */}
              <Box
                sx={{
                  mt: 0.5,
                  pt: 0.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.6rem' }}>
                  {fShortenNumber(currentMW, WattUnits, { decimals: 1 })}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Max {fShortenNumber(maxMW, WattUnits, { decimals: 1 })}
                </Typography>
              </Box>
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
            {/* Machine type with status LED */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(item.data.status),
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                {formatMachineType(item.data.type)}
              </Typography>
            </Box>
            {/* Recipe (output item) */}
            {recipe && (
              <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.65rem' }}>
                {recipe}
              </Typography>
            )}
            {/* Efficiency section */}
            {avgEfficiency !== null && (
              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.6rem' }}>
                  Efficiency: {(avgEfficiency * 100).toFixed(0)}%
                </Typography>
              </Box>
            )}
          </>
        );
      }

      case 'storage': {
        const inventoryItems = item.data.inventory?.slice(0, 4) ?? [];
        const hasMoreItems = (item.data.inventory?.length ?? 0) > 4;

        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Storage
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.type}
            </Typography>
            {inventoryItems.length > 0 ? (
              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                {inventoryItems.map((invItem, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 0.75,
                      mt: idx > 0 ? 0.5 : 0,
                    }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}
                    >
                      <Box
                        component="img"
                        src={`assets/images/satisfactory/64x64/${invItem.name}.png`}
                        alt={invItem.name}
                        sx={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.6rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {invItem.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.primary"
                      sx={{ fontSize: '0.6rem', fontWeight: 500, flexShrink: 0 }}
                    >
                      {fShortenNumber(invItem.count, MetricUnits, { decimals: 0 })}
                    </Typography>
                  </Box>
                ))}
                {hasMoreItems && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: '0.55rem', mt: 0.5, display: 'block' }}
                  >
                    +{(item.data.inventory?.length ?? 0) - 4} more items
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.6rem' }}
              >
                Empty
              </Typography>
            )}
          </>
        );
      }

      case 'trainStation': {
        const platforms = item.data.platforms || [];

        return (
          <>
            <style>{dockingPulseStyles}</style>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Train Station
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Train Station'}
            </Typography>

            {platforms.length > 0 && (
              <Box
                sx={{
                  mt: 0.75,
                  pt: 0.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                {/* Horizontal platform layout */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {platforms.map((platform, idx) => {
                    const isExport = platform.mode === TrainStationPlatformModeExport;
                    const isFluid = platform.type === TrainStationPlatformTypeFluidFreight;
                    const isDocking = platform.status === TrainStationPlatformStatusDocking;

                    // Arrow direction: down for import, up for export
                    const arrowIcon = isExport ? 'mdi:arrow-up-bold' : 'mdi:arrow-down-bold';
                    const arrowColor = '#9ca3af'; // Neutral gray for both

                    return (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: 40,
                        }}
                      >
                        {/* Arrow above container - animated when docking */}
                        <Iconify
                          icon={arrowIcon}
                          width={16}
                          className={isDocking ? 'docking-arrow' : undefined}
                          sx={{ color: arrowColor }}
                        />

                        {/* Transfer rate between arrow and container icon */}
                        {isFluid ? (
                          <>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.5rem',
                                lineHeight: 1.1,
                                color: 'text.secondary',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              In:{' '}
                              {fShortenNumber(platform.inflowRate, MetricUnits, { decimals: 0 })}
                              /min
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.5rem',
                                lineHeight: 1.1,
                                color: 'text.secondary',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Out:{' '}
                              {fShortenNumber(platform.outflowRate, MetricUnits, { decimals: 0 })}
                              /min
                            </Typography>
                          </>
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.5rem',
                              lineHeight: 1.1,
                              color: 'text.secondary',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fShortenNumber(platform.transferRate, MetricUnits, { decimals: 1 })}
                            /min
                          </Typography>
                        )}

                        {/* Container icon */}
                        <Iconify
                          icon="eos-icons:container"
                          width={20}
                          sx={{ color: isFluid ? '#06b6d4' : '#f59e0b', mt: 0.25 }} // Cyan for fluid, amber for freight
                        />

                        {/* Inventory items below */}
                        {platform.inventory && platform.inventory.length > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.25,
                              mt: 0.5,
                              maxHeight: 50,
                              overflowY: 'auto',
                            }}
                          >
                            {platform.inventory.slice(0, 3).map((invItem, itemIdx) => (
                              <Box
                                key={itemIdx}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.25,
                                }}
                              >
                                <Box
                                  component="img"
                                  src={`assets/images/satisfactory/64x64/${invItem.name}.png`}
                                  alt={invItem.name}
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    objectFit: 'contain',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: '0.5rem',
                                    lineHeight: 1,
                                    color: 'text.primary',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {fShortenNumber(invItem.count, MetricUnits, { decimals: 0 })}
                                </Typography>
                              </Box>
                            ))}
                            {platform.inventory.length > 3 && (
                              <Typography
                                variant="caption"
                                sx={{ fontSize: '0.45rem', color: 'text.disabled' }}
                              >
                                +{platform.inventory.length - 3}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Show platform count if no platforms */}
            {platforms.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.6rem', mt: 0.25, display: 'block' }}
              >
                No platforms
              </Typography>
            )}
          </>
        );
      }

      case 'droneStation':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Drone Station
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Drone Port'}
            </Typography>
            {
              <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
                {item.data.incomingRate > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    ▲ {fShortenNumber(item.data.incomingRate, MetricUnits, { decimals: 1 })}/min
                  </Typography>
                )}
                {item.data.outgoingRate > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    ▼ {fShortenNumber(item.data.outgoingRate, MetricUnits, { decimals: 1 })}/min
                  </Typography>
                )}
              </Box>
            }
          </>
        );

      case 'truckStation':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Truck Station
            </Typography>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Truck Station'}
            </Typography>
            {item.data.transferRate > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.6rem', mt: 0.25, display: 'block' }}
              >
                Transfer: {fShortenNumber(item.data.transferRate, MetricUnits, { decimals: 1 })}/s
              </Typography>
            )}
          </>
        );

      case 'spaceElevator': {
        const phases = item.data.currentPhase || [];
        const isFullyUpgraded = item.data.fullyUpgraded;
        const isUpgradeReady = item.data.upgradeReady;

        return (
          <>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
              {item.data.name || 'Space Elevator'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Phase: {isFullyUpgraded ? 'Maxed Out' : ''}
            </Typography>

            {/* Status indicators */}
            <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
              {isFullyUpgraded && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 500 }}
                >
                  ✓ Fully Upgraded
                </Typography>
              )}
              {isUpgradeReady && !isFullyUpgraded && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 500 }}
                >
                  ⬆ Upgrade Ready
                </Typography>
              )}
            </Box>

            {/* Current phase objectives */}
            {phases.length > 0 && !isFullyUpgraded && (
              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.55rem', mb: 0.25, display: 'block' }}
                >
                  Phase Requirements
                </Typography>
                {phases.map((obj, idx) => {
                  const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
                  return (
                    <Box key={idx} sx={{ mb: idx < phases.length - 1 ? 0.5 : 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.75,
                          mb: 0.25,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Box
                            component="img"
                            src={`assets/images/satisfactory/64x64/${obj.name}.png`}
                            alt={obj.name}
                            sx={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.55rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {obj.name}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.55rem', flexShrink: 0, color: 'text.primary' }}
                        >
                          {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                          {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                        </Typography>
                      </Box>
                      {/* Progress bar */}
                      <Box
                        sx={{
                          height: 3,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: progress >= 100 ? '#22c55e' : '#9333EA',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        );
      }
    }
  };

  return (
    <Paper
      ref={popoverRef}
      elevation={isPinned ? 8 : 4}
      sx={{
        position: 'fixed',
        left: position.x + 8,
        top: position.y + 8,
        zIndex: isPinned ? 1600 : 1400,
        p: 1,
        pr: isPinned ? 3.5 : 1,
        minWidth: 80,
        maxWidth: 280,
        backgroundColor: 'background.paper',
        borderRadius: 0.5,
        pointerEvents: isPinned ? 'auto' : 'none',
        border: isPinned ? '2px solid' : undefined,
        borderColor: isPinned ? 'primary.main' : undefined,
      }}
    >
      {/* Close button */}
      {isPinned && onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
        >
          <Iconify icon="mdi:close" width={16} />
        </IconButton>
      )}
      {renderContent()}
    </Paper>
  );
}

export const HoverTooltip = memo(HoverTooltipInner);
