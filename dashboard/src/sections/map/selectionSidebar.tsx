import { Box, Chip, Divider, IconButton, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import {
  Drone,
  DroneStation,
  DroneStatusDocking,
  DroneStatusIdle,
  MachineCategoryGenerator,
  ResourceNode,
  ScannedFauna,
  ScannedFlora,
  ScannedSignal,
  Train,
  TrainStation,
  TrainStatusDocking,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { ApiContext } from 'src/contexts/api/useApi';
import { MachineGroup, SelectedMapItem } from 'src/types';
import {
  fNumber,
  fShortenNumber,
  LengthUnits,
  MetricUnits,
  WattUnits,
} from 'src/utils/format-number';
import { useContextSelector } from 'use-context-selector';
import { MapSidebar } from './mapSidebar';
import { getPurityLabel, PURITY_COLORS } from './utils/radarTowerUtils';

type SidebarView = 'items' | 'buildings' | 'power' | 'vehicles';

// Format camelCase machine type to readable name (e.g., "coalGenerator" → "Coal Generator")
const formatMachineType = (type: string): string => {
  return type
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (str) => str.toUpperCase());
};

// Helper functions to determine docked trains/drones
const getDockedTrains = (station: TrainStation, trains: Train[]): Train[] => {
  return trains.filter(
    (t) =>
      t.status === TrainStatusDocking && t.timetable[t.timetableIndex]?.station === station.name
  );
};

const getDockedDrones = (station: DroneStation, drones: Drone[]): Drone[] => {
  return drones.filter(
    (d) =>
      (d.status === DroneStatusDocking || d.status === DroneStatusIdle) &&
      (d.home?.name === station.name || d.destination?.name === station.name)
  );
};

// Scanned section component for fauna, flora, and signals (for radar tower)
function ScannedSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: (ScannedFauna | ScannedFlora | ScannedSignal)[];
  icon: string;
}) {
  if (!items || items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Iconify icon={icon} width={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {title}: {totalCount}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {items.map((item, idx) => (
          <Chip
            key={idx}
            label={`${item.amount}x ${item.name}`}
            size="small"
            onDelete={() => {}}
            deleteIcon={
              <Box
                component="img"
                src={`assets/images/satisfactory/64x64/${item.name}.png`}
                alt={item.name}
                sx={{ width: 16, height: 16, objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            }
            sx={{
              height: 20,
              fontSize: '0.6rem',
              '& .MuiChip-label': { px: 1 },
              '& .MuiChip-icon': { ml: 0.5, mr: -0.5 },
              '& .MuiChip-deleteIcon': {
                cursor: 'default',
                pointerEvents: 'none',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// Get tab icon and label for a selection type
const getTabInfo = (item: SelectedMapItem): { icon: string; label: string } => {
  switch (item.type) {
    case 'machineGroup':
      return { icon: 'mdi:factory', label: 'Group' };
    case 'machineGroups':
      return { icon: 'mdi:factory', label: `${item.data.length} Groups` };
    case 'multiSelection':
      return { icon: 'mdi:select-multiple', label: 'Selection' };
    case 'trainStation':
      return { icon: 'mdi:train', label: 'Station' };
    case 'droneStation':
      return { icon: 'mdi:drone', label: 'Station' };
    case 'radarTower':
      return { icon: 'material-symbols:radar', label: 'Radar' };
    case 'hub':
      return { icon: 'material-symbols:house-rounded', label: 'HUB' };
    case 'spaceElevator':
      return { icon: 'tdesign:tower-filled', label: 'Space Elevator' };
    default:
      return { icon: 'mdi:help', label: 'Unknown' };
  }
};

type SelectionSidebarProps = {
  selectedItems: SelectedMapItem[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  onTabClose: (index: number) => void;
  isMobile?: boolean;
  onClose?: () => void;
};

export const SelectionSidebar = ({
  selectedItems,
  activeTabIndex,
  onTabChange,
  onTabClose,
  isMobile = false,
  onClose,
}: SelectionSidebarProps) => {
  const theme = useTheme();
  const [activeView, setActiveView] = useState<SidebarView>('items');

  // Get the currently active selected item
  const selectedItem = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const safeIndex = Math.min(activeTabIndex, selectedItems.length - 1);
    return selectedItems[safeIndex] ?? null;
  }, [selectedItems, activeTabIndex]);

  // Get trains and drones from API context - MUST be before any conditional returns
  const trains = useContextSelector(ApiContext, (v) => v.trains) || [];
  const drones = useContextSelector(ApiContext, (v) => v.drones) || [];

  // Get total vehicles (docked trains + drones) for a group
  const getTotalVehicles = (group: MachineGroup) => {
    let total = 0;
    (group.trainStations || []).forEach((station) => {
      total += getDockedTrains(station, trains).length;
    });
    (group.droneStations || []).forEach((station) => {
      total += getDockedDrones(station, drones).length;
    });
    return total;
  };

  // Check if group has any stations
  const hasStations = (group: MachineGroup) => {
    return (group.trainStations?.length || 0) > 0 || (group.droneStations?.length || 0) > 0;
  };

  // View tabs component for machine group selections
  const renderViewTabs = (showVehicles: boolean) => (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
      <Chip
        label="Items"
        size="small"
        onClick={() => setActiveView('items')}
        color={activeView === 'items' ? 'primary' : 'default'}
        variant={activeView === 'items' ? 'filled' : 'outlined'}
      />
      <Chip
        label="Buildings"
        size="small"
        onClick={() => setActiveView('buildings')}
        color={activeView === 'buildings' ? 'primary' : 'default'}
        variant={activeView === 'buildings' ? 'filled' : 'outlined'}
      />
      <Chip
        label="Power"
        size="small"
        onClick={() => setActiveView('power')}
        color={activeView === 'power' ? 'primary' : 'default'}
        variant={activeView === 'power' ? 'filled' : 'outlined'}
      />
      {showVehicles && (
        <Chip
          label="Vehicles"
          size="small"
          onClick={() => setActiveView('vehicles')}
          color={activeView === 'vehicles' ? 'primary' : 'default'}
          variant={activeView === 'vehicles' ? 'filled' : 'outlined'}
        />
      )}
    </Box>
  );

  // Aggregate building types from machine groups
  const getBuildingCounts = (groups: MachineGroup[]) => {
    // Use Object.create(null) to avoid prototype pollution (e.g., "constructor" key)
    const counts: Record<string, number> = Object.create(null);
    groups.forEach((g) => {
      g.machines.forEach((m) => {
        counts[m.type] = (counts[m.type] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  // Get power sources from machine groups (generators only)
  const getPowerSources = (groups: MachineGroup[]) => {
    const generators = groups.flatMap((g) =>
      g.machines.filter((m) => m.category === MachineCategoryGenerator)
    );
    // Use Object.create(null) to avoid prototype pollution (e.g., "constructor" key)
    const powerByType: Record<string, { count: number; production: number }> = Object.create(null);
    generators.forEach((gen) => {
      // Power is stored as an output item with name "Power"
      const production = gen.output.find((o) => o.name === 'Power')?.current || 0;
      if (!powerByType[gen.type]) {
        powerByType[gen.type] = { count: 0, production: 0 };
      }
      powerByType[gen.type].count += 1;
      powerByType[gen.type].production += production;
    });
    return Object.entries(powerByType).sort((a, b) => b[1].production - a[1].production);
  };

  const renderMachineGroup = () => {
    if (selectedItem?.type !== 'machineGroup') return null;
    const machineGroup = selectedItem.data;
    const buildingCounts = getBuildingCounts([machineGroup]);
    const powerSources = getPowerSources([machineGroup]);
    const showVehicles = hasStations(machineGroup);
    const totalVehicles = getTotalVehicles(machineGroup);

    // Get all docked trains and drones
    const dockedTrains = (machineGroup.trainStations || []).flatMap((station) =>
      getDockedTrains(station, trains)
    );
    const dockedDrones = (machineGroup.droneStations || []).flatMap((station) =>
      getDockedDrones(station, drones)
    );

    // Calculate total items in group
    const totalItems =
      machineGroup.machines.length +
      (machineGroup.trainStations?.length || 0) +
      (machineGroup.droneStations?.length || 0);

    return (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ fontWeight: 'bold' }}>Selected Group</Box>
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Box>
        </Box>

        {/* Summary stats */}
        {totalItems === 1 && machineGroup.machines.length === 1 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 1,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Building</Box>
            <Box sx={{ fontWeight: 'bold' }}>
              {formatMachineType(machineGroup.machines[0].type)}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 1,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Machines</Box>
            <Box sx={{ fontWeight: 'bold' }}>{machineGroup.machines.length}</Box>
          </Box>
        )}
        {showVehicles && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Vehicles</Box>
            <Box sx={{ fontWeight: 'bold' }}>{totalVehicles}</Box>
          </Box>
        )}

        {renderViewTabs(showVehicles)}

        {/* Items View */}
        {activeView === 'items' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Power Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {machineGroup.powerConsumption
                  ? fShortenNumber(machineGroup.powerConsumption, WattUnits)
                  : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Power Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {machineGroup.powerProduction
                  ? fShortenNumber(machineGroup.powerProduction, WattUnits)
                  : '-'}
              </Box>
            </Box>

            {/* produced items */}
            {Object.entries(machineGroup.itemProduction).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Production</Box>
                  {Object.entries(machineGroup.itemProduction).map(([name, value]) => (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          style={{
                            width: '24px',
                            height: '24px',
                          }}
                        />
                        <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{name}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* consumed items */}
            {Object.entries(machineGroup.itemConsumption).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Consumption</Box>
                  {Object.entries(machineGroup.itemConsumption).map(([name, value]) => (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          style={{
                            width: '24px',
                            height: '24px',
                          }}
                        />
                        <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{name}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </>
        )}

        {/* Buildings View */}
        {activeView === 'buildings' && (
          <>
            {buildingCounts.length > 0 ? (
              buildingCounts.map(([type, count]) => (
                <Box
                  key={type}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 1,
                  }}
                >
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                    {formatMachineType(type)}
                  </Box>
                  <Box sx={{ fontWeight: 'bold' }}>{count}</Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No buildings in selection
              </Typography>
            )}
          </>
        )}

        {/* Power View */}
        {activeView === 'power' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {machineGroup.powerProduction
                  ? fShortenNumber(machineGroup.powerProduction, WattUnits)
                  : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Total Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {machineGroup.powerConsumption
                  ? fShortenNumber(machineGroup.powerConsumption, WattUnits)
                  : '-'}
              </Box>
            </Box>

            {powerSources.length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Power Sources</Box>
                {powerSources.map(([type, data]) => (
                  <Box
                    key={type}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 1,
                    }}
                  >
                    <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                      {formatMachineType(type)} ({data.count})
                    </Box>
                    <Box sx={{ fontWeight: 'bold' }}>
                      {fShortenNumber(data.production, WattUnits)}
                    </Box>
                  </Box>
                ))}
              </>
            )}

            {powerSources.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                No power generators in selection
              </Typography>
            )}
          </>
        )}

        {/* Vehicles View */}
        {activeView === 'vehicles' && showVehicles && (
          <>
            {/* Train Stations */}
            {(machineGroup.trainStations?.length || 0) > 0 && (
              <>
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>
                  Train Stations ({machineGroup.trainStations.length})
                </Box>
                {machineGroup.trainStations.map((station, idx) => {
                  const stationDockedTrains = getDockedTrains(station, trains);
                  return (
                    <Box
                      key={idx}
                      sx={{
                        mb: 2,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {station.name}
                      </Typography>
                      {stationDockedTrains.length > 0 ? (
                        stationDockedTrains.map((train, tidx) => (
                          <Box
                            key={tidx}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="caption">{train.name}</Typography>
                            <Chip label="Docking" size="small" color="info" />
                          </Box>
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          No trains docked
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </>
            )}

            {/* Drone Stations */}
            {(machineGroup.droneStations?.length || 0) > 0 && (
              <>
                {(machineGroup.trainStations?.length || 0) > 0 && <Divider sx={{ my: 2 }} />}
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>
                  Drone Stations ({machineGroup.droneStations.length})
                </Box>
                {machineGroup.droneStations.map((station, idx) => {
                  const stationDockedDrones = getDockedDrones(station, drones);
                  return (
                    <Box
                      key={idx}
                      sx={{
                        mb: 2,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {station.name}
                      </Typography>
                      {station.fuel?.Name && (
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: 'block' }}
                        >
                          Fuel: {station.fuel.Name}
                        </Typography>
                      )}
                      {stationDockedDrones.length > 0 ? (
                        stationDockedDrones.map((drone, didx) => (
                          <Box
                            key={didx}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="caption">{drone.name}</Typography>
                            <Chip
                              label={formatMachineType(drone.status)}
                              size="small"
                              color="info"
                            />
                          </Box>
                        ))
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          No drones at station
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </>
            )}

            {dockedTrains.length === 0 && dockedDrones.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No vehicles docked at stations in this group
              </Typography>
            )}
          </>
        )}
      </>
    );
  };

  // View tabs for multi-selection (includes Vehicles if any selected)
  const renderMultiViewTabs = (hasVehicles: boolean) => (
    <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
      <Chip
        label="Items"
        size="small"
        onClick={() => setActiveView('items')}
        color={activeView === 'items' ? 'primary' : 'default'}
        variant={activeView === 'items' ? 'filled' : 'outlined'}
      />
      <Chip
        label="Buildings"
        size="small"
        onClick={() => setActiveView('buildings')}
        color={activeView === 'buildings' ? 'primary' : 'default'}
        variant={activeView === 'buildings' ? 'filled' : 'outlined'}
      />
      <Chip
        label="Power"
        size="small"
        onClick={() => setActiveView('power')}
        color={activeView === 'power' ? 'primary' : 'default'}
        variant={activeView === 'power' ? 'filled' : 'outlined'}
      />
      {hasVehicles && (
        <Chip
          label="Vehicles"
          size="small"
          onClick={() => setActiveView('vehicles')}
          color={activeView === 'vehicles' ? 'primary' : 'default'}
          variant={activeView === 'vehicles' ? 'filled' : 'outlined'}
        />
      )}
    </Box>
  );

  const renderMultiSelection = () => {
    if (selectedItem?.type !== 'multiSelection') return null;
    const { machineGroups, trainStations, droneStations } = selectedItem.data;

    const totalItems = machineGroups.length + trainStations.length + droneStations.length;
    const hasVehicles = trainStations.length > 0 || droneStations.length > 0;

    // Aggregate stats from machine groups
    const aggregateItems = (
      groups: MachineGroup[],
      key: 'itemProduction' | 'itemConsumption'
    ): Record<string, number> => {
      const result: Record<string, number> = {};
      groups.forEach((g) => {
        Object.entries(g[key]).forEach(([name, value]) => {
          result[name] = (result[name] || 0) + value;
        });
      });
      return result;
    };

    const totalMachines = machineGroups.reduce((sum, g) => sum + g.machines.length, 0);
    const totalPowerConsumption = machineGroups.reduce((sum, g) => sum + g.powerConsumption, 0);
    const totalPowerProduction = machineGroups.reduce((sum, g) => sum + g.powerProduction, 0);
    const totalItemProduction = aggregateItems(machineGroups, 'itemProduction');
    const totalItemConsumption = aggregateItems(machineGroups, 'itemConsumption');

    // Get all trains and drones
    const allTrains = trainStations.flatMap((ts) => ts.dockedTrains);
    const allDrones = droneStations.flatMap((ds) => ds.dockedDrones);

    return (
      <>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ fontWeight: 'bold' }}>Multi-Selection</Box>
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{totalItems} items</Box>
        </Box>

        {/* Summary counts */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Machine Groups</Box>
          <Box sx={{ fontWeight: 'bold' }}>{machineGroups.length}</Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Machines</Box>
          <Box sx={{ fontWeight: 'bold' }}>{totalMachines}</Box>
        </Box>

        {renderMultiViewTabs(hasVehicles)}

        {/* Items View */}
        {activeView === 'items' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Power Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Power Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </Box>
            </Box>

            {/* Combined produced items */}
            {Object.entries(totalItemProduction).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Production</Box>
                  {Object.entries(totalItemProduction).map(([name, value]) => (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          style={{
                            width: '24px',
                            height: '24px',
                          }}
                        />
                        <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{name}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* Combined consumed items */}
            {Object.entries(totalItemConsumption).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Consumption</Box>
                  {Object.entries(totalItemConsumption).map(([name, value]) => (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          style={{
                            width: '24px',
                            height: '24px',
                          }}
                        />
                        <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{name}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </>
        )}

        {/* Buildings View */}
        {activeView === 'buildings' && (
          <>
            {getBuildingCounts(machineGroups).length > 0 ? (
              getBuildingCounts(machineGroups).map(([type, count]) => (
                <Box
                  key={type}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 1,
                  }}
                >
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                    {formatMachineType(type)}
                  </Box>
                  <Box sx={{ fontWeight: 'bold' }}>{count}</Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No buildings in selection
              </Typography>
            )}
          </>
        )}

        {/* Power View */}
        {activeView === 'power' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Total Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </Box>
            </Box>

            {getPowerSources(machineGroups).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Power Sources</Box>
                {getPowerSources(machineGroups).map(([type, data]) => (
                  <Box
                    key={type}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 1,
                    }}
                  >
                    <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                      {formatMachineType(type)} ({data.count})
                    </Box>
                    <Box sx={{ fontWeight: 'bold' }}>
                      {fShortenNumber(data.production, WattUnits)}
                    </Box>
                  </Box>
                ))}
              </>
            )}

            {getPowerSources(machineGroups).length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                No power generators in selection
              </Typography>
            )}
          </>
        )}

        {/* Vehicles View */}
        {activeView === 'vehicles' && hasVehicles && (
          <>
            {/* Docked Trains */}
            {allTrains.length > 0 && (
              <>
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Docked Trains ({allTrains.length})</Box>
                {allTrains.map((train, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      mb: 1,
                      borderRadius: 1,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {train.name}
                      </Typography>
                      <Chip
                        label={train.status === TrainStatusDocking ? 'Docking' : train.status}
                        size="small"
                        color="info"
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Speed: {train.speed.toFixed(0)} km/h
                    </Typography>
                  </Box>
                ))}
              </>
            )}

            {/* Docked Drones */}
            {allDrones.length > 0 && (
              <>
                {allTrains.length > 0 && <Divider sx={{ my: 2 }} />}
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Docked Drones ({allDrones.length})</Box>
                {allDrones.map((drone, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      mb: 1,
                      borderRadius: 1,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {drone.name}
                      </Typography>
                      <Chip label={formatMachineType(drone.status)} size="small" color="info" />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Speed: {drone.speed.toFixed(0)} km/h
                    </Typography>
                  </Box>
                ))}
              </>
            )}

            {allTrains.length === 0 && allDrones.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No vehicles docked at selected stations
              </Typography>
            )}
          </>
        )}
      </>
    );
  };

  const renderTrainStation = () => {
    if (selectedItem?.type !== 'trainStation') return null;
    const { station, dockedTrains } = selectedItem.data;

    return (
      <>
        <Box sx={{ fontWeight: 'bold', mb: 2 }}>Train Station</Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Name</Box>
          <Box sx={{ fontWeight: 'bold' }}>{station.name}</Box>
        </Box>

        <Divider sx={{ margin: '10px 0' }} />

        <Box sx={{ fontWeight: 'bold', mb: 1 }}>Docked Trains ({dockedTrains.length})</Box>
        {dockedTrains.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No trains currently docked
          </Typography>
        ) : (
          dockedTrains.map((train, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="bold">
                  {train.name}
                </Typography>
                <Chip
                  label={train.status === TrainStatusDocking ? 'Docking' : train.status}
                  size="small"
                  color="info"
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Speed: {train.speed.toFixed(0)} km/h
              </Typography>
            </Box>
          ))
        )}
      </>
    );
  };

  const renderDroneStation = () => {
    if (selectedItem?.type !== 'droneStation') return null;
    const { station, dockedDrones } = selectedItem.data;

    return (
      <>
        <Box sx={{ fontWeight: 'bold', mb: 2 }}>Drone Station</Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Name</Box>
          <Box sx={{ fontWeight: 'bold' }}>{station.name}</Box>
        </Box>
        {station.fuel?.Name && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 1,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Fuel</Box>
            <Box sx={{ fontWeight: 'bold' }}>{station.fuel.Name}</Box>
          </Box>
        )}

        <Divider sx={{ margin: '10px 0' }} />

        <Box sx={{ fontWeight: 'bold', mb: 1 }}>Drones at Station ({dockedDrones.length})</Box>
        {dockedDrones.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No drones currently at this station
          </Typography>
        ) : (
          dockedDrones.map((drone, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="bold">
                  {drone.name}
                </Typography>
                <Chip
                  label={formatMachineType(drone.status)}
                  size="small"
                  color={drone.status === 'flying' ? 'success' : 'info'}
                />
              </Box>
              <Typography variant="caption" color="textSecondary">
                Speed: {drone.speed.toFixed(0)} km/h
              </Typography>
            </Box>
          ))
        )}
      </>
    );
  };

  // Render multiple unified groups (CTRL+drag selection)
  const renderMachineGroups = () => {
    if (selectedItem?.type !== 'machineGroups') return null;
    const groups = selectedItem.data;

    // Aggregate stats from all groups
    const totalMachines = groups.reduce((sum, g) => sum + g.machines.length, 0);
    const totalTrainStations = groups.reduce((sum, g) => sum + (g.trainStations?.length || 0), 0);
    const totalDroneStations = groups.reduce((sum, g) => sum + (g.droneStations?.length || 0), 0);
    const totalItems = totalMachines + totalTrainStations + totalDroneStations;

    // Get total vehicles across all groups
    const totalVehicles = groups.reduce((sum, g) => sum + getTotalVehicles(g), 0);
    const showVehicles = totalTrainStations > 0 || totalDroneStations > 0;

    const totalPowerConsumption = groups.reduce((sum, g) => sum + g.powerConsumption, 0);
    const totalPowerProduction = groups.reduce((sum, g) => sum + g.powerProduction, 0);

    // Aggregate item production/consumption
    const aggregateItems = (key: 'itemProduction' | 'itemConsumption'): Record<string, number> => {
      const result: Record<string, number> = {};
      groups.forEach((g) => {
        Object.entries(g[key]).forEach(([name, value]) => {
          result[name] = (result[name] || 0) + value;
        });
      });
      return result;
    };
    const totalItemProduction = aggregateItems('itemProduction');
    const totalItemConsumption = aggregateItems('itemConsumption');

    // Get all docked trains and drones from all groups
    const allDockedTrains = groups.flatMap((g) =>
      (g.trainStations || []).flatMap((station) => getDockedTrains(station, trains))
    );
    const allDockedDrones = groups.flatMap((g) =>
      (g.droneStations || []).flatMap((station) => getDockedDrones(station, drones))
    );

    return (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ fontWeight: 'bold' }}>Multi-Selection</Box>
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
            {groups.length} groups
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Items</Box>
          <Box sx={{ fontWeight: 'bold' }}>{totalItems}</Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Machines</Box>
          <Box sx={{ fontWeight: 'bold' }}>{totalMachines}</Box>
        </Box>
        {showVehicles && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Vehicles</Box>
            <Box sx={{ fontWeight: 'bold' }}>{totalVehicles}</Box>
          </Box>
        )}

        {renderViewTabs(showVehicles)}

        {/* Items View */}
        {activeView === 'items' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Power Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Power Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </Box>
            </Box>

            {/* Combined produced items */}
            {Object.entries(totalItemProduction).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Production</Box>
                  {Object.entries(totalItemProduction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <Box
                        key={name}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <img
                            src={`assets/images/satisfactory/64x64/${name}.png`}
                            alt={name}
                            style={{ width: '24px', height: '24px' }}
                          />
                          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                            {name}
                          </Box>
                        </Box>
                        <Box sx={{ fontWeight: 'bold' }}>
                          {fShortenNumber(value, MetricUnits, {
                            ensureConstantDecimals: true,
                            onlyDecimalsWhenDivisible: true,
                          })}
                        </Box>
                      </Box>
                    ))}
                </Box>
              </>
            )}

            {/* Combined consumed items */}
            {Object.entries(totalItemConsumption).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ marginTop: 2 }}>
                  <Box sx={{ fontWeight: 'bold', mb: 1 }}>Consumption</Box>
                  {Object.entries(totalItemConsumption)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <Box
                        key={name}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <img
                            src={`assets/images/satisfactory/64x64/${name}.png`}
                            alt={name}
                            style={{ width: '24px', height: '24px' }}
                          />
                          <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                            {name}
                          </Box>
                        </Box>
                        <Box sx={{ fontWeight: 'bold' }}>
                          {fShortenNumber(value, MetricUnits, {
                            ensureConstantDecimals: true,
                            onlyDecimalsWhenDivisible: true,
                          })}
                        </Box>
                      </Box>
                    ))}
                </Box>
              </>
            )}
          </>
        )}

        {/* Buildings View */}
        {activeView === 'buildings' && (
          <>
            {getBuildingCounts(groups).length > 0 ? (
              getBuildingCounts(groups).map(([type, count]) => (
                <Box
                  key={type}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 1,
                  }}
                >
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                    {formatMachineType(type)}
                  </Box>
                  <Box sx={{ fontWeight: 'bold' }}>{count}</Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No buildings in selection
              </Typography>
            )}
          </>
        )}

        {/* Power View */}
        {activeView === 'power' && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Total Production</Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 1,
              }}
            >
              <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                Total Consumption
              </Box>
              <Box sx={{ fontWeight: 'bold' }}>
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </Box>
            </Box>

            {getPowerSources(groups).length > 0 && (
              <>
                <Divider sx={{ margin: '10px 0' }} />
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Power Sources</Box>
                {getPowerSources(groups).map(([type, data]) => (
                  <Box
                    key={type}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 1,
                    }}
                  >
                    <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
                      {formatMachineType(type)} ({data.count})
                    </Box>
                    <Box sx={{ fontWeight: 'bold' }}>
                      {fShortenNumber(data.production, WattUnits)}
                    </Box>
                  </Box>
                ))}
              </>
            )}

            {getPowerSources(groups).length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                No power generators in selection
              </Typography>
            )}
          </>
        )}

        {/* Vehicles View */}
        {activeView === 'vehicles' && showVehicles && (
          <>
            {/* Train Stations */}
            {totalTrainStations > 0 && (
              <>
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Train Stations ({totalTrainStations})</Box>
                {groups
                  .flatMap((g) => g.trainStations || [])
                  .map((station, idx) => {
                    const stationDockedTrains = getDockedTrains(station, trains);
                    return (
                      <Box
                        key={idx}
                        sx={{
                          mb: 2,
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: theme.palette.background.paper,
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {station.name}
                        </Typography>
                        {stationDockedTrains.length > 0 ? (
                          stationDockedTrains.map((train, tidx) => (
                            <Box
                              key={tidx}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mt: 0.5,
                              }}
                            >
                              <Typography variant="caption">{train.name}</Typography>
                              <Chip label="Docking" size="small" color="info" />
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            No trains docked
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
              </>
            )}

            {/* Drone Stations */}
            {totalDroneStations > 0 && (
              <>
                {totalTrainStations > 0 && <Divider sx={{ my: 2 }} />}
                <Box sx={{ fontWeight: 'bold', mb: 1 }}>Drone Stations ({totalDroneStations})</Box>
                {groups
                  .flatMap((g) => g.droneStations || [])
                  .map((station, idx) => {
                    const stationDockedDrones = getDockedDrones(station, drones);
                    return (
                      <Box
                        key={idx}
                        sx={{
                          mb: 2,
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: theme.palette.background.paper,
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {station.name}
                        </Typography>
                        {station.fuel?.Name && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: 'block' }}
                          >
                            Fuel: {station.fuel.Name}
                          </Typography>
                        )}
                        {stationDockedDrones.length > 0 ? (
                          stationDockedDrones.map((drone, didx) => (
                            <Box
                              key={didx}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mt: 0.5,
                              }}
                            >
                              <Typography variant="caption">{drone.name}</Typography>
                              <Chip
                                label={formatMachineType(drone.status)}
                                size="small"
                                color="info"
                              />
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            No drones at station
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
              </>
            )}

            {allDockedTrains.length === 0 && allDockedDrones.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No vehicles docked at stations in selection
              </Typography>
            )}
          </>
        )}
      </>
    );
  };

  const renderRadarTower = () => {
    if (selectedItem?.type !== 'radarTower') return null;
    const tower = selectedItem.data;

    const hasNodes = tower.nodes && tower.nodes.length > 0;
    const hasFauna = tower.fauna && tower.fauna.length > 0;
    const hasFlora = tower.flora && tower.flora.length > 0;
    const hasSignals = tower.signal && tower.signal.length > 0;

    // Group nodes by purity
    const nodesByPurity = tower.nodes?.reduce(
      (acc, node) => {
        const purity = node.purity || 'unknown';
        if (!acc[purity]) acc[purity] = [];
        acc[purity].push(node);
        return acc;
      },
      {} as Record<string, ResourceNode[]>
    );

    return (
      <>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Iconify icon="mdi:radar" width={18} sx={{ color: '#3B82F6' }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Radar Tower
            </Typography>
          </Box>
        </Box>

        {/* Reveal radius */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Reveal Radius: {fShortenNumber(tower.revealRadius, LengthUnits)}
        </Typography>

        {/* Resource Nodes */}
        {hasNodes && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Iconify icon={'tabler:pick'} width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Resource Nodes: {tower.nodes.length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Object.entries(nodesByPurity || {}).map(([purity, nodes]) => {
                const exploitedCount = nodes.filter((n) => n.exploited).length;
                const totalCount = nodes.length;
                const purityColor =
                  PURITY_COLORS[purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;
                const purityLabel = getPurityLabel(purity);

                return (
                  <Box
                    key={purity}
                    sx={{
                      height: 'auto',
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      border: '2px solid',
                      borderColor: purityColor,
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.2 }}>
                      {totalCount}x {purityLabel}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.2 }}
                    >
                      {exploitedCount} exploited
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Fauna */}
        <ScannedSection title="Fauna" items={tower.fauna || []} icon="mdi:paw" />

        {/* Flora */}
        <ScannedSection title="Flora" items={tower.flora || []} icon="mdi:flower" />

        {/* Signals */}
        <ScannedSection title="Signals" items={tower.signal || []} icon="mdi:signal-variant" />

        {/* Empty state */}
        {!hasNodes && !hasFauna && !hasFlora && !hasSignals && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No items scanned
          </Typography>
        )}

        {/* Location */}
        <Box sx={{ pt: 1, mt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Location
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Coordinates
            </Typography>
            <Typography variant="caption">
              {fNumber(tower.x / 100, { decimals: 0 })} / {fNumber(tower.y / 100, { decimals: 0 })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Altitude
            </Typography>
            <Typography variant="caption">{fNumber(tower.z / 100, { decimals: 0 })}</Typography>
          </Box>
        </Box>
      </>
    );
  };

  const renderHub = () => {
    if (selectedItem?.type !== 'hub') return null;
    const hubData = selectedItem.data;

    return (
      <>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Iconify icon="material-symbols:house-rounded" width={20} sx={{ color: '#F59E0B' }} />
          <Typography variant="body1" fontWeight="medium">
            HUB
          </Typography>
        </Box>

        {/* Level info */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Level
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {hubData.hubLevel}
            </Typography>
          </Box>
        </Box>

        {/* Location */}
        <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Location
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Coordinates
            </Typography>
            <Typography variant="caption">
              {fNumber(hubData.x / 100, { decimals: 0 })} /{' '}
              {fNumber(hubData.y / 100, { decimals: 0 })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Altitude
            </Typography>
            <Typography variant="caption">{fNumber(hubData.z / 100, { decimals: 0 })}</Typography>
          </Box>
        </Box>
      </>
    );
  };

  const renderSpaceElevator = () => {
    if (selectedItem?.type !== 'spaceElevator') return null;
    const elevatorData = selectedItem.data;
    const phases = elevatorData.currentPhase || [];
    const isFullyUpgraded = elevatorData.fullyUpgraded;
    const isUpgradeReady = elevatorData.upgradeReady;

    return (
      <>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Iconify icon="tdesign:tower-filled" width={20} sx={{ color: '#9333EA' }} />
          <Typography variant="body1" fontWeight="medium">
            {elevatorData.name || 'Space Elevator'}
          </Typography>
        </Box>

        {/* Status */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            {isFullyUpgraded ? (
              <Chip
                label="Fully Upgraded"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                }}
              />
            ) : isUpgradeReady ? (
              <Chip
                label="Upgrade Ready"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                }}
              />
            ) : (
              <Chip
                label="In Progress"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(147, 51, 234, 0.15)',
                  color: '#9333EA',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Phase Requirements */}
        {phases.length > 0 && !isFullyUpgraded && (
          <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Phase Requirements
            </Typography>
            {phases.map((obj, idx) => {
              const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
              const isComplete = progress >= 100;
              return (
                <Box key={idx} sx={{ mb: idx < phases.length - 1 ? 1.5 : 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Box
                        component="img"
                        src={`assets/images/satisfactory/32x32/${obj.name}.png`}
                        alt={obj.name}
                        sx={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {obj.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ flexShrink: 0, color: isComplete ? '#22c55e' : 'text.primary' }}
                    >
                      {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                      {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                    </Typography>
                  </Box>
                  {/* Progress bar */}
                  <Box
                    sx={{
                      height: 6,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: isComplete ? '#22c55e' : '#9333EA',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Location */}
        <Box sx={{ pt: 1, mt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Location
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Coordinates
            </Typography>
            <Typography variant="caption">
              {fNumber(elevatorData.x / 100, { decimals: 0 })} /{' '}
              {fNumber(elevatorData.y / 100, { decimals: 0 })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Altitude
            </Typography>
            <Typography variant="caption">
              {fNumber(elevatorData.z / 100, { decimals: 0 })}
            </Typography>
          </Box>
        </Box>
      </>
    );
  };

  const renderEmpty = () => (
    <Box>
      <Typography variant="h3" color="textSecondary">
        No selection
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Click on a marker to see details
      </Typography>
    </Box>
  );

  // Tab bar when multiple items are selected
  const renderTabBar = () => {
    if (selectedItems.length <= 1) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 2,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'action.hover', borderRadius: 2 },
        }}
      >
        {selectedItems.map((item, index) => {
          const { icon, label } = getTabInfo(item);
          const isActive = index === activeTabIndex;

          return (
            <Box
              key={index}
              onClick={() => onTabChange(index)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: isActive
                  ? theme.palette.action.selected
                  : theme.palette.action.hover,
                border: isActive
                  ? `1px solid ${theme.palette.primary.main}`
                  : '1px solid transparent',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: theme.palette.action.selected,
                },
              }}
            >
              <Iconify icon={icon} width={14} />
              <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                {label}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(index);
                }}
                sx={{
                  p: 0,
                  ml: 0.5,
                  width: 14,
                  height: 14,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Iconify icon="mdi:close" width={12} />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <MapSidebar open={selectedItems.length > 0} isMobile={isMobile} onClose={onClose}>
      {renderTabBar()}
      {!selectedItem && renderEmpty()}
      {selectedItem?.type === 'machineGroup' && renderMachineGroup()}
      {selectedItem?.type === 'machineGroups' && renderMachineGroups()}
      {selectedItem?.type === 'multiSelection' && renderMultiSelection()}
      {selectedItem?.type === 'trainStation' && renderTrainStation()}
      {selectedItem?.type === 'droneStation' && renderDroneStation()}
      {selectedItem?.type === 'radarTower' && renderRadarTower()}
      {selectedItem?.type === 'hub' && renderHub()}
      {selectedItem?.type === 'spaceElevator' && renderSpaceElevator()}
    </MapSidebar>
  );
};
