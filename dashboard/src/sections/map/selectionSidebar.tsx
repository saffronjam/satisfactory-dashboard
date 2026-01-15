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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SidebarView = 'items' | 'buildings' | 'power' | 'vehicles';

/** Formats camelCase machine type to readable name (e.g., "coalGenerator" → "Coal Generator") */
const formatMachineType = (type: string): string => {
  return type
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, (str) => str.toUpperCase());
};

/** Returns trains that are docked at a given station */
const getDockedTrains = (station: TrainStation, trains: Train[]): Train[] => {
  return trains.filter(
    (t) =>
      t.status === TrainStatusDocking && t.timetable[t.timetableIndex]?.station === station.name
  );
};

/** Returns drones that are docked or idle at a given station */
const getDockedDrones = (station: DroneStation, drones: Drone[]): Drone[] => {
  return drones.filter(
    (d) =>
      (d.status === DroneStatusDocking || d.status === DroneStatusIdle) &&
      (d.home?.name === station.name || d.destination?.name === station.name)
  );
};

/** Scanned section component for fauna, flora, and signals (for radar tower) */
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
    <div className="mt-2 pt-2 border-t border-border">
      <div className="flex items-center gap-1 mb-1">
        <Iconify icon={icon} width={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {title}: {totalCount}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1 h-5 px-2 text-[0.6rem] bg-secondary rounded-full"
          >
            <span>
              {item.amount}x {item.name}
            </span>
            <img
              src={`assets/images/satisfactory/64x64/${item.name}.png`}
              alt={item.name}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gets tab icon and label for a selection type */
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
  const [activeView, setActiveView] = useState<SidebarView>('items');

  const selectedItem = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const safeIndex = Math.min(activeTabIndex, selectedItems.length - 1);
    return selectedItems[safeIndex] ?? null;
  }, [selectedItems, activeTabIndex]);

  const trains = useContextSelector(ApiContext, (v) => v.trains) || [];
  const drones = useContextSelector(ApiContext, (v) => v.drones) || [];

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

  const hasStations = (group: MachineGroup) => {
    return (group.trainStations?.length || 0) > 0 || (group.droneStations?.length || 0) > 0;
  };

  /** View tabs component for machine group selections */
  const renderViewTabs = (showVehicles: boolean) => (
    <div className="flex gap-1 mb-4 flex-wrap">
      <button
        onClick={() => setActiveView('items')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'items'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Items
      </button>
      <button
        onClick={() => setActiveView('buildings')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'buildings'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Buildings
      </button>
      <button
        onClick={() => setActiveView('power')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'power'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Power
      </button>
      {showVehicles && (
        <button
          onClick={() => setActiveView('vehicles')}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            activeView === 'vehicles'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent border-border hover:bg-accent'
          )}
        >
          Vehicles
        </button>
      )}
    </div>
  );

  /** Aggregates building types from machine groups */
  const getBuildingCounts = (groups: MachineGroup[]) => {
    const counts: Record<string, number> = Object.create(null);
    groups.forEach((g) => {
      g.machines.forEach((m) => {
        counts[m.type] = (counts[m.type] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  /** Gets power sources from machine groups (generators only) */
  const getPowerSources = (groups: MachineGroup[]) => {
    const generators = groups.flatMap((g) =>
      g.machines.filter((m) => m.category === MachineCategoryGenerator)
    );
    const powerByType: Record<string, { count: number; production: number }> = Object.create(null);
    generators.forEach((gen) => {
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

    const dockedTrains = (machineGroup.trainStations || []).flatMap((station) =>
      getDockedTrains(station, trains)
    );
    const dockedDrones = (machineGroup.droneStations || []).flatMap((station) =>
      getDockedDrones(station, drones)
    );

    const totalItems =
      machineGroup.machines.length +
      (machineGroup.trainStations?.length || 0) +
      (machineGroup.droneStations?.length || 0);

    return (
      <>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Selected Group</span>
          <span className="text-muted-foreground text-xs">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>

        {totalItems === 1 && machineGroup.machines.length === 1 ? (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Building</span>
            <span className="font-bold">{formatMachineType(machineGroup.machines[0].type)}</span>
          </div>
        ) : (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Machines</span>
            <span className="font-bold">{machineGroup.machines.length}</span>
          </div>
        )}
        {showVehicles && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-muted-foreground text-xs">Total Vehicles</span>
            <span className="font-bold">{totalVehicles}</span>
          </div>
        )}

        {renderViewTabs(showVehicles)}

        {activeView === 'items' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Consumption</span>
              <span className="font-bold">
                {machineGroup.powerConsumption
                  ? fShortenNumber(machineGroup.powerConsumption, WattUnits)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Production</span>
              <span className="font-bold">
                {machineGroup.powerProduction
                  ? fShortenNumber(machineGroup.powerProduction, WattUnits)
                  : '-'}
              </span>
            </div>

            {Object.entries(machineGroup.itemProduction).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Production</span>
                  {Object.entries(machineGroup.itemProduction).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          className="w-6 h-6"
                        />
                        <span className="text-muted-foreground text-xs">{name}</span>
                      </div>
                      <span className="font-bold">
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {Object.entries(machineGroup.itemConsumption).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Consumption</span>
                  {Object.entries(machineGroup.itemConsumption).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          className="w-6 h-6"
                        />
                        <span className="text-muted-foreground text-xs">{name}</span>
                      </div>
                      <span className="font-bold">
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeView === 'buildings' && (
          <>
            {buildingCounts.length > 0 ? (
              buildingCounts.map(([type, count]) => (
                <div key={type} className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-xs">{formatMachineType(type)}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No buildings in selection</p>
            )}
          </>
        )}

        {activeView === 'power' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Production</span>
              <span className="font-bold">
                {machineGroup.powerProduction
                  ? fShortenNumber(machineGroup.powerProduction, WattUnits)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Consumption</span>
              <span className="font-bold">
                {machineGroup.powerConsumption
                  ? fShortenNumber(machineGroup.powerConsumption, WattUnits)
                  : '-'}
              </span>
            </div>

            {powerSources.length > 0 && (
              <>
                <Separator className="my-2" />
                <span className="font-bold block mb-2">Power Sources</span>
                {powerSources.map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">
                      {formatMachineType(type)} ({data.count})
                    </span>
                    <span className="font-bold">{fShortenNumber(data.production, WattUnits)}</span>
                  </div>
                ))}
              </>
            )}

            {powerSources.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No power generators in selection</p>
            )}
          </>
        )}

        {activeView === 'vehicles' && showVehicles && (
          <>
            {(machineGroup.trainStations?.length || 0) > 0 && (
              <>
                <span className="font-bold block mb-2">
                  Train Stations ({machineGroup.trainStations.length})
                </span>
                {machineGroup.trainStations.map((station, idx) => {
                  const stationDockedTrains = getDockedTrains(station, trains);
                  return (
                    <div key={idx} className="mb-4 p-2 rounded bg-card">
                      <p className="text-sm font-bold">{station.name}</p>
                      {stationDockedTrains.length > 0 ? (
                        stationDockedTrains.map((train, tidx) => (
                          <div key={tidx} className="flex justify-between items-center mt-1">
                            <span className="text-xs">{train.name}</span>
                            <Badge variant="secondary">Docking</Badge>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No trains docked</span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {(machineGroup.droneStations?.length || 0) > 0 && (
              <>
                {(machineGroup.trainStations?.length || 0) > 0 && <Separator className="my-4" />}
                <span className="font-bold block mb-2">
                  Drone Stations ({machineGroup.droneStations.length})
                </span>
                {machineGroup.droneStations.map((station, idx) => {
                  const stationDockedDrones = getDockedDrones(station, drones);
                  return (
                    <div key={idx} className="mb-4 p-2 rounded bg-card">
                      <p className="text-sm font-bold">{station.name}</p>
                      {station.fuel?.Name && (
                        <span className="text-xs text-muted-foreground block">
                          Fuel: {station.fuel.Name}
                        </span>
                      )}
                      {stationDockedDrones.length > 0 ? (
                        stationDockedDrones.map((drone, didx) => (
                          <div key={didx} className="flex justify-between items-center mt-1">
                            <span className="text-xs">{drone.name}</span>
                            <Badge variant="secondary">{formatMachineType(drone.status)}</Badge>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No drones at station</span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {dockedTrains.length === 0 && dockedDrones.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No vehicles docked at stations in this group
              </p>
            )}
          </>
        )}
      </>
    );
  };

  const renderMultiViewTabs = (hasVehicles: boolean) => (
    <div className="flex gap-1 mb-4 flex-wrap">
      <button
        onClick={() => setActiveView('items')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'items'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Items
      </button>
      <button
        onClick={() => setActiveView('buildings')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'buildings'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Buildings
      </button>
      <button
        onClick={() => setActiveView('power')}
        className={cn(
          'px-3 py-1 text-xs rounded-full border transition-colors',
          activeView === 'power'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent border-border hover:bg-accent'
        )}
      >
        Power
      </button>
      {hasVehicles && (
        <button
          onClick={() => setActiveView('vehicles')}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            activeView === 'vehicles'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent border-border hover:bg-accent'
          )}
        >
          Vehicles
        </button>
      )}
    </div>
  );

  const renderMultiSelection = () => {
    if (selectedItem?.type !== 'multiSelection') return null;
    const { machineGroups, trainStations, droneStations } = selectedItem.data;

    const totalItems = machineGroups.length + trainStations.length + droneStations.length;
    const hasVehicles = trainStations.length > 0 || droneStations.length > 0;

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

    const allTrains = trainStations.flatMap((ts) => ts.dockedTrains);
    const allDrones = droneStations.flatMap((ds) => ds.dockedDrones);

    return (
      <>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Multi-Selection</span>
          <span className="text-muted-foreground text-xs">{totalItems} items</span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-xs">Machine Groups</span>
          <span className="font-bold">{machineGroups.length}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground text-xs">Total Machines</span>
          <span className="font-bold">{totalMachines}</span>
        </div>

        {renderMultiViewTabs(hasVehicles)}

        {activeView === 'items' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Consumption</span>
              <span className="font-bold">
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Production</span>
              <span className="font-bold">
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </span>
            </div>

            {Object.entries(totalItemProduction).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Production</span>
                  {Object.entries(totalItemProduction).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          className="w-6 h-6"
                        />
                        <span className="text-muted-foreground text-xs">{name}</span>
                      </div>
                      <span className="font-bold">
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {Object.entries(totalItemConsumption).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Consumption</span>
                  {Object.entries(totalItemConsumption).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`assets/images/satisfactory/64x64/${name}.png`}
                          alt={name}
                          className="w-6 h-6"
                        />
                        <span className="text-muted-foreground text-xs">{name}</span>
                      </div>
                      <span className="font-bold">
                        {fShortenNumber(value, MetricUnits, {
                          ensureConstantDecimals: true,
                          onlyDecimalsWhenDivisible: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeView === 'buildings' && (
          <>
            {getBuildingCounts(machineGroups).length > 0 ? (
              getBuildingCounts(machineGroups).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-xs">{formatMachineType(type)}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No buildings in selection</p>
            )}
          </>
        )}

        {activeView === 'power' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Production</span>
              <span className="font-bold">
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Consumption</span>
              <span className="font-bold">
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </span>
            </div>

            {getPowerSources(machineGroups).length > 0 && (
              <>
                <Separator className="my-2" />
                <span className="font-bold block mb-2">Power Sources</span>
                {getPowerSources(machineGroups).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">
                      {formatMachineType(type)} ({data.count})
                    </span>
                    <span className="font-bold">{fShortenNumber(data.production, WattUnits)}</span>
                  </div>
                ))}
              </>
            )}

            {getPowerSources(machineGroups).length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No power generators in selection</p>
            )}
          </>
        )}

        {activeView === 'vehicles' && hasVehicles && (
          <>
            {allTrains.length > 0 && (
              <>
                <span className="font-bold block mb-2">Docked Trains ({allTrains.length})</span>
                {allTrains.map((train, index) => (
                  <div key={index} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{train.name}</p>
                      <Badge variant="secondary">
                        {train.status === TrainStatusDocking ? 'Docking' : train.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {train.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
              </>
            )}

            {allDrones.length > 0 && (
              <>
                {allTrains.length > 0 && <Separator className="my-4" />}
                <span className="font-bold block mb-2">Docked Drones ({allDrones.length})</span>
                {allDrones.map((drone, index) => (
                  <div key={index} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{drone.name}</p>
                      <Badge variant="secondary">{formatMachineType(drone.status)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {drone.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
              </>
            )}

            {allTrains.length === 0 && allDrones.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No vehicles docked at selected stations
              </p>
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
        <span className="font-bold block mb-4">Train Station</span>
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-xs">Name</span>
          <span className="font-bold">{station.name}</span>
        </div>

        <Separator className="my-2" />

        <span className="font-bold block mb-2">Docked Trains ({dockedTrains.length})</span>
        {dockedTrains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trains currently docked</p>
        ) : (
          dockedTrains.map((train, index) => (
            <div key={index} className="p-2 mb-2 rounded bg-card">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold">{train.name}</p>
                <Badge variant="secondary">
                  {train.status === TrainStatusDocking ? 'Docking' : train.status}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Speed: {train.speed.toFixed(0)} km/h
              </span>
            </div>
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
        <span className="font-bold block mb-4">Drone Station</span>
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-xs">Name</span>
          <span className="font-bold">{station.name}</span>
        </div>
        {station.fuel?.Name && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Fuel</span>
            <span className="font-bold">{station.fuel.Name}</span>
          </div>
        )}

        <Separator className="my-2" />

        <span className="font-bold block mb-2">Drones at Station ({dockedDrones.length})</span>
        {dockedDrones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drones currently at this station</p>
        ) : (
          dockedDrones.map((drone, index) => (
            <div key={index} className="p-2 mb-2 rounded bg-card">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold">{drone.name}</p>
                <Badge variant={drone.status === 'flying' ? 'default' : 'secondary'}>
                  {formatMachineType(drone.status)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Speed: {drone.speed.toFixed(0)} km/h
              </span>
            </div>
          ))
        )}
      </>
    );
  };

  const renderMachineGroups = () => {
    if (selectedItem?.type !== 'machineGroups') return null;
    const groups = selectedItem.data;

    const totalMachines = groups.reduce((sum, g) => sum + g.machines.length, 0);
    const totalTrainStations = groups.reduce((sum, g) => sum + (g.trainStations?.length || 0), 0);
    const totalDroneStations = groups.reduce((sum, g) => sum + (g.droneStations?.length || 0), 0);
    const totalItems = totalMachines + totalTrainStations + totalDroneStations;

    const totalVehicles = groups.reduce((sum, g) => sum + getTotalVehicles(g), 0);
    const showVehicles = totalTrainStations > 0 || totalDroneStations > 0;

    const totalPowerConsumption = groups.reduce((sum, g) => sum + g.powerConsumption, 0);
    const totalPowerProduction = groups.reduce((sum, g) => sum + g.powerProduction, 0);

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

    const allDockedTrains = groups.flatMap((g) =>
      (g.trainStations || []).flatMap((station) => getDockedTrains(station, trains))
    );
    const allDockedDrones = groups.flatMap((g) =>
      (g.droneStations || []).flatMap((station) => getDockedDrones(station, drones))
    );

    return (
      <>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Multi-Selection</span>
          <span className="text-muted-foreground text-xs">{groups.length} groups</span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-xs">Total Items</span>
          <span className="font-bold">{totalItems}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-xs">Machines</span>
          <span className="font-bold">{totalMachines}</span>
        </div>
        {showVehicles && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-muted-foreground text-xs">Total Vehicles</span>
            <span className="font-bold">{totalVehicles}</span>
          </div>
        )}

        {renderViewTabs(showVehicles)}

        {activeView === 'items' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Consumption</span>
              <span className="font-bold">
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Power Production</span>
              <span className="font-bold">
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </span>
            </div>

            {Object.entries(totalItemProduction).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Production</span>
                  {Object.entries(totalItemProduction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <div key={name} className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={`assets/images/satisfactory/64x64/${name}.png`}
                            alt={name}
                            className="w-6 h-6"
                          />
                          <span className="text-muted-foreground text-xs">{name}</span>
                        </div>
                        <span className="font-bold">
                          {fShortenNumber(value, MetricUnits, {
                            ensureConstantDecimals: true,
                            onlyDecimalsWhenDivisible: true,
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}

            {Object.entries(totalItemConsumption).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="mt-4">
                  <span className="font-bold block mb-2">Consumption</span>
                  {Object.entries(totalItemConsumption)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, value]) => (
                      <div key={name} className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={`assets/images/satisfactory/64x64/${name}.png`}
                            alt={name}
                            className="w-6 h-6"
                          />
                          <span className="text-muted-foreground text-xs">{name}</span>
                        </div>
                        <span className="font-bold">
                          {fShortenNumber(value, MetricUnits, {
                            ensureConstantDecimals: true,
                            onlyDecimalsWhenDivisible: true,
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </>
        )}

        {activeView === 'buildings' && (
          <>
            {getBuildingCounts(groups).length > 0 ? (
              getBuildingCounts(groups).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-xs">{formatMachineType(type)}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No buildings in selection</p>
            )}
          </>
        )}

        {activeView === 'power' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Production</span>
              <span className="font-bold">
                {totalPowerProduction ? fShortenNumber(totalPowerProduction, WattUnits) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Consumption</span>
              <span className="font-bold">
                {totalPowerConsumption ? fShortenNumber(totalPowerConsumption, WattUnits) : '-'}
              </span>
            </div>

            {getPowerSources(groups).length > 0 && (
              <>
                <Separator className="my-2" />
                <span className="font-bold block mb-2">Power Sources</span>
                {getPowerSources(groups).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">
                      {formatMachineType(type)} ({data.count})
                    </span>
                    <span className="font-bold">{fShortenNumber(data.production, WattUnits)}</span>
                  </div>
                ))}
              </>
            )}

            {getPowerSources(groups).length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No power generators in selection</p>
            )}
          </>
        )}

        {activeView === 'vehicles' && showVehicles && (
          <>
            {totalTrainStations > 0 && (
              <>
                <span className="font-bold block mb-2">Train Stations ({totalTrainStations})</span>
                {groups
                  .flatMap((g) => g.trainStations || [])
                  .map((station, idx) => {
                    const stationDockedTrains = getDockedTrains(station, trains);
                    return (
                      <div key={idx} className="mb-4 p-2 rounded bg-card">
                        <p className="text-sm font-bold">{station.name}</p>
                        {stationDockedTrains.length > 0 ? (
                          stationDockedTrains.map((train, tidx) => (
                            <div key={tidx} className="flex justify-between items-center mt-1">
                              <span className="text-xs">{train.name}</span>
                              <Badge variant="secondary">Docking</Badge>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No trains docked</span>
                        )}
                      </div>
                    );
                  })}
              </>
            )}

            {totalDroneStations > 0 && (
              <>
                {totalTrainStations > 0 && <Separator className="my-4" />}
                <span className="font-bold block mb-2">Drone Stations ({totalDroneStations})</span>
                {groups
                  .flatMap((g) => g.droneStations || [])
                  .map((station, idx) => {
                    const stationDockedDrones = getDockedDrones(station, drones);
                    return (
                      <div key={idx} className="mb-4 p-2 rounded bg-card">
                        <p className="text-sm font-bold">{station.name}</p>
                        {station.fuel?.Name && (
                          <span className="text-xs text-muted-foreground block">
                            Fuel: {station.fuel.Name}
                          </span>
                        )}
                        {stationDockedDrones.length > 0 ? (
                          stationDockedDrones.map((drone, didx) => (
                            <div key={didx} className="flex justify-between items-center mt-1">
                              <span className="text-xs">{drone.name}</span>
                              <Badge variant="secondary">{formatMachineType(drone.status)}</Badge>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No drones at station
                          </span>
                        )}
                      </div>
                    );
                  })}
              </>
            )}

            {allDockedTrains.length === 0 && allDockedDrones.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No vehicles docked at stations in selection
              </p>
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
        <div className="flex items-center gap-2 mb-1">
          <Iconify icon="mdi:radar" width={18} className="text-blue-500" />
          <div>
            <p className="text-sm font-medium">Radar Tower</p>
          </div>
        </div>

        <span className="text-xs text-muted-foreground block mb-2">
          Reveal Radius: {fShortenNumber(tower.revealRadius, LengthUnits)}
        </span>

        {hasNodes && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Iconify icon="tabler:pick" width={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground block">
                Resource Nodes: {tower.nodes.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(nodesByPurity || {}).map(([purity, nodes]) => {
                const exploitedCount = nodes.filter((n) => n.exploited).length;
                const totalCount = nodes.length;
                const purityColor =
                  PURITY_COLORS[purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;
                const purityLabel = getPurityLabel(purity);

                return (
                  <div
                    key={purity}
                    className="h-auto px-2 py-1 bg-black/60 rounded-2xl flex flex-col items-center"
                    style={{ border: `2px solid ${purityColor}` }}
                  >
                    <span className="text-[0.7rem] text-foreground leading-tight">
                      {totalCount}x {purityLabel}
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground leading-tight">
                      {exploitedCount} exploited
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ScannedSection title="Fauna" items={tower.fauna || []} icon="mdi:paw" />
        <ScannedSection title="Flora" items={tower.flora || []} icon="mdi:flower" />
        <ScannedSection title="Signals" items={tower.signal || []} icon="mdi:signal-variant" />

        {!hasNodes && !hasFauna && !hasFlora && !hasSignals && (
          <span className="text-xs text-muted-foreground italic">No items scanned</span>
        )}

        <div className="pt-2 mt-2 border-t border-border">
          <span className="text-xs text-muted-foreground block mb-1">Location</span>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Coordinates</span>
            <span className="text-xs">
              {fNumber(tower.x / 100, { decimals: 0 })} / {fNumber(tower.y / 100, { decimals: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Altitude</span>
            <span className="text-xs">{fNumber(tower.z / 100, { decimals: 0 })}</span>
          </div>
        </div>
      </>
    );
  };

  const renderHub = () => {
    if (selectedItem?.type !== 'hub') return null;
    const hubData = selectedItem.data;

    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <Iconify icon="material-symbols:house-rounded" width={20} className="text-amber-500" />
          <p className="text-base font-medium">HUB</p>
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Level</span>
            <p className="text-sm font-medium">{hubData.hubLevel}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground block mb-1">Location</span>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Coordinates</span>
            <span className="text-xs">
              {fNumber(hubData.x / 100, { decimals: 0 })} /{' '}
              {fNumber(hubData.y / 100, { decimals: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Altitude</span>
            <span className="text-xs">{fNumber(hubData.z / 100, { decimals: 0 })}</span>
          </div>
        </div>
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
        <div className="flex items-center gap-2 mb-2">
          <Iconify icon="tdesign:tower-filled" width={20} className="text-purple-500" />
          <p className="text-base font-medium">{elevatorData.name || 'Space Elevator'}</p>
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Status</span>
            {isFullyUpgraded ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">
                Fully Upgraded
              </span>
            ) : isUpgradeReady ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                Upgrade Ready
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                In Progress
              </span>
            )}
          </div>
        </div>

        {phases.length > 0 && !isFullyUpgraded && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground block mb-2">Phase Requirements</span>
            {phases.map((obj, idx) => {
              const progress = obj.totalCost > 0 ? (obj.amount / obj.totalCost) * 100 : 0;
              const isComplete = progress >= 100;
              return (
                <div key={idx} className={cn(idx < phases.length - 1 ? 'mb-3' : '')}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        src={`assets/images/satisfactory/32x32/${obj.name}.png`}
                        alt={obj.name}
                        className="w-5 h-5 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                        {obj.name}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'text-sm flex-shrink-0',
                        isComplete ? 'text-green-500' : 'text-foreground'
                      )}
                    >
                      {fShortenNumber(obj.amount, MetricUnits, { decimals: 0 })} /{' '}
                      {fShortenNumber(obj.totalCost, MetricUnits, { decimals: 0 })}
                    </p>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        isComplete ? 'bg-green-500' : 'bg-purple-500'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 mt-2 border-t border-border">
          <span className="text-xs text-muted-foreground block mb-1">Location</span>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Coordinates</span>
            <span className="text-xs">
              {fNumber(elevatorData.x / 100, { decimals: 0 })} /{' '}
              {fNumber(elevatorData.y / 100, { decimals: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Altitude</span>
            <span className="text-xs">{fNumber(elevatorData.z / 100, { decimals: 0 })}</span>
          </div>
        </div>
      </>
    );
  };

  const renderEmpty = () => (
    <div>
      <h3 className="text-2xl text-muted-foreground">No selection</h3>
      <p className="text-sm text-muted-foreground">Click on a marker to see details</p>
    </div>
  );

  const renderTabBar = () => {
    if (selectedItems.length <= 1) return null;

    return (
      <div className="flex gap-1 mb-4 pb-3 border-b border-border overflow-x-auto flex-nowrap scrollbar-thin scrollbar-thumb-accent">
        {selectedItems.map((item, index) => {
          const { icon, label } = getTabInfo(item);
          const isActive = index === activeTabIndex;

          return (
            <div
              key={index}
              onClick={() => onTabChange(index)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded cursor-pointer flex-shrink-0',
                isActive
                  ? 'bg-accent border border-primary'
                  : 'bg-muted/50 border border-transparent hover:bg-accent'
              )}
            >
              <Iconify icon={icon} width={14} />
              <span className="text-xs whitespace-nowrap">{label}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(index);
                }}
                className="ml-1 p-0 w-3.5 h-3.5 hover:bg-muted"
              >
                <Iconify icon="mdi:close" width={12} />
              </Button>
            </div>
          );
        })}
      </div>
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
