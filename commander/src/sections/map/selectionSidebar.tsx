import { Box, Chip, Divider, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import {
  Drone,
  DroneStation,
  DroneStatusDocking,
  DroneStatusIdle,
  MachineCategoryGenerator,
  Train,
  TrainStation,
  TrainStatusDocking,
} from 'src/apiTypes';
import { ApiContext } from 'src/contexts/api/useApi';
import { varAlpha } from 'src/theme/styles';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { fShortenNumber, MetricUnits, WattUnits } from 'src/utils/format-number';
import { useContextSelector } from 'use-context-selector';

type SidebarView = 'items' | 'buildings' | 'power' | 'vehicles';

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

export const SelectionSidebar = ({ selectedItem }: { selectedItem: SelectedMapItem | null }) => {
  const theme = useTheme();
  const [activeView, setActiveView] = useState<SidebarView>('items');

  // Get trains and drones from API context
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
    const counts: Record<string, number> = {};
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
    const powerByType: Record<string, { count: number; production: number }> = {};
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
            <Box sx={{ fontWeight: 'bold' }}>{machineGroup.machines[0].type}</Box>
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
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{type}</Box>
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
                      {type} ({data.count})
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
                      {station.fuelName && (
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: 'block' }}
                        >
                          Fuel: {station.fuelName}
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
                            <Chip label={drone.status} size="small" color="info" />
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
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{type}</Box>
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
                      {type} ({data.count})
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
                      <Chip label={drone.status} size="small" color="info" />
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
        {station.fuelName && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 1,
            }}
          >
            <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>Fuel</Box>
            <Box sx={{ fontWeight: 'bold' }}>{station.fuelName}</Box>
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
                  label={drone.status}
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
                  <Box sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>{type}</Box>
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
                      {type} ({data.count})
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
                        {station.fuelName && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: 'block' }}
                          >
                            Fuel: {station.fuelName}
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
                              <Chip label={drone.status} size="small" color="info" />
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

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width: 300,
        backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.95),
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        overflow: 'auto',
      }}
    >
      <Box sx={{ padding: 2 }}>
        {!selectedItem && renderEmpty()}
        {selectedItem?.type === 'machineGroup' && renderMachineGroup()}
        {selectedItem?.type === 'machineGroups' && renderMachineGroups()}
        {selectedItem?.type === 'multiSelection' && renderMultiSelection()}
        {selectedItem?.type === 'trainStation' && renderTrainStation()}
        {selectedItem?.type === 'droneStation' && renderDroneStation()}
      </Box>
    </Box>
  );
};
