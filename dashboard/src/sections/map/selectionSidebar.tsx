import { useEffect, useMemo, useState } from 'react';
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
import { SelectedMapItem, Selection } from 'src/types';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CircleHelp } from 'lucide-react';

type SidebarView = 'items' | 'buildings' | 'power' | 'vehicles';

/** Formats remaining milliseconds as MM:SS or HH:MM:SS */
const formatCountdown = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  if (!items || items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleImageError = (itemName: string) => {
    setFailedImages((prev) => new Set(prev).add(itemName));
  };

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
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 h-9 px-2 text-[0.6rem] bg-accent rounded-full cursor-default">
                <span>{item.amount}x</span>
                {failedImages.has(item.name) ? (
                  <CircleHelp className="w-7 h-7 text-muted-foreground" />
                ) : (
                  <img
                    src={`assets/images/satisfactory/64x64/${item.name}.png`}
                    alt={item.name}
                    className="w-7 h-7 object-contain"
                    onError={() => handleImageError(item.name)}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

/** Gets tab icon and label for a selection type */
const getTabInfo = (item: SelectedMapItem): { icon: string; label: string } => {
  switch (item.type) {
    case 'selection':
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
  const [shipCountdown, setShipCountdown] = useState<number | null>(null);

  const selectedItem = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const safeIndex = Math.min(activeTabIndex, selectedItems.length - 1);
    return selectedItems[safeIndex] ?? null;
  }, [selectedItems, activeTabIndex]);

  const trains = useContextSelector(ApiContext, (v) => v.trains) || [];
  const drones = useContextSelector(ApiContext, (v) => v.drones) || [];
  const liveHub = useContextSelector(ApiContext, (v) => v.hub);

  // Use live hub data when a hub is selected (so it updates in real-time)
  const hubData = selectedItem?.type === 'hub' ? (liveHub ?? selectedItem.data) : null;

  // Manage ship return countdown timer
  const hubReturnTime = hubData?.shipReturnTime;

  useEffect(() => {
    if (!hubReturnTime) {
      setShipCountdown(null);
      return;
    }

    // Calculate initial remaining time
    const updateCountdown = () => {
      const remaining = hubReturnTime - Date.now();
      setShipCountdown(remaining > 0 ? remaining : 0);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [hubReturnTime]);

  /**
   * Auto-select a valid sub-tab when the selection changes.
   * Falls back to 'buildings' if the current view is not available for the selection.
   *
   * Edge case: Infrastructure-only selections (belts, pipes, cables, rails, hypertubes)
   * will have hasItems=false, hasPower=false, hasVehicles=false, so only the Buildings
   * sub-tab is valid. The Buildings tab always shows entity counts including infrastructure.
   */
  useEffect(() => {
    if (selectedItem?.type === 'selection') {
      const { hasItems, hasPower, hasVehicles } = selectedItem.data;
      const validViews: SidebarView[] = ['buildings'];
      if (hasItems) validViews.push('items');
      if (hasPower) validViews.push('power');
      if (hasVehicles) validViews.push('vehicles');

      if (!validViews.includes(activeView)) {
        setActiveView(hasItems ? 'items' : 'buildings');
      }
    }
  }, [selectedItem, activeView]);

  /**
   * View tabs component for universal Selection that only shows relevant sub-tabs.
   * Buildings tab is always visible (shows machines, special structures, and infrastructure).
   * For infrastructure-only selections, only the Buildings tab appears.
   */
  const renderSelectionViewTabs = (
    showItems: boolean,
    showPower: boolean,
    showVehicles: boolean
  ) => (
    <div className="flex gap-1 mb-4 flex-wrap">
      {showItems && (
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
      )}
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
      {showPower && (
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
      )}
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

  /** Renders the universal Selection view with sub-tabs for items, buildings, power, and vehicles */
  const renderSelection = () => {
    if (selectedItem?.type !== 'selection') return null;
    const selection = selectedItem.data;

    const { entities, totalCount, power, items, buildingCounts, hasItems, hasPower, hasVehicles } =
      selection;

    const dockedTrainsForStations = entities.trainStations.flatMap((station) =>
      getDockedTrains(station, trains)
    );
    const dockedDronesForStations = entities.droneStations.flatMap((station) =>
      getDockedDrones(station, drones)
    );

    const totalVehicles = dockedTrainsForStations.length + dockedDronesForStations.length;

    const buildingCountsEntries = Object.entries(buildingCounts).sort((a, b) => b[1] - a[1]);

    const getPowerSourcesFromSelection = (sel: Selection) => {
      const generators = sel.entities.machines.filter(
        (m) => m.category === MachineCategoryGenerator
      );
      const powerByType: Record<string, { count: number; production: number }> =
        Object.create(null);
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

    const powerSourcesEntries = getPowerSourcesFromSelection(selection);

    return (
      <>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Selection</span>
          <span className="text-muted-foreground text-xs">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {entities.machines.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Machines</span>
            <span className="font-bold">{entities.machines.length}</span>
          </div>
        )}
        {entities.trainStations.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Train Stations</span>
            <span className="font-bold">{entities.trainStations.length}</span>
          </div>
        )}
        {entities.droneStations.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Drone Stations</span>
            <span className="font-bold">{entities.droneStations.length}</span>
          </div>
        )}
        {entities.radarTowers.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Radar Towers</span>
            <span className="font-bold">{entities.radarTowers.length}</span>
          </div>
        )}
        {entities.hubs.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">HUBs</span>
            <span className="font-bold">{entities.hubs.length}</span>
          </div>
        )}
        {entities.spaceElevators.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Space Elevators</span>
            <span className="font-bold">{entities.spaceElevators.length}</span>
          </div>
        )}
        {entities.trains.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Trains</span>
            <span className="font-bold">{entities.trains.length}</span>
          </div>
        )}
        {entities.drones.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Drones</span>
            <span className="font-bold">{entities.drones.length}</span>
          </div>
        )}
        {entities.trucks.length + entities.tractors.length + entities.explorers.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Ground Vehicles</span>
            <span className="font-bold">
              {entities.trucks.length + entities.tractors.length + entities.explorers.length}
            </span>
          </div>
        )}
        {entities.players.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Players</span>
            <span className="font-bold">{entities.players.length}</span>
          </div>
        )}
        {entities.belts.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Belts</span>
            <span className="font-bold">{entities.belts.length}</span>
          </div>
        )}
        {entities.pipes.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Pipes</span>
            <span className="font-bold">{entities.pipes.length}</span>
          </div>
        )}
        {entities.cables.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Power Cables</span>
            <span className="font-bold">{entities.cables.length}</span>
          </div>
        )}
        {entities.rails.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Train Rails</span>
            <span className="font-bold">{entities.rails.length}</span>
          </div>
        )}
        {entities.hypertubes.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-xs">Hypertubes</span>
            <span className="font-bold">{entities.hypertubes.length}</span>
          </div>
        )}

        {hasVehicles && totalVehicles > 0 && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-muted-foreground text-xs">Docked Vehicles</span>
            <span className="font-bold">{totalVehicles}</span>
          </div>
        )}

        {renderSelectionViewTabs(hasItems, hasPower, hasVehicles)}

        {activeView === 'items' && (
          <>
            {hasItems ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-xs">Power Consumption</span>
                  <span className="font-bold">
                    {power.consumption ? fShortenNumber(power.consumption, WattUnits) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-xs">Power Production</span>
                  <span className="font-bold">
                    {power.production ? fShortenNumber(power.production, WattUnits) : '-'}
                  </span>
                </div>

                {Object.entries(items.production).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="mt-4">
                      <span className="font-bold block mb-2">Production</span>
                      {Object.entries(items.production)
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

                {Object.entries(items.consumption).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="mt-4">
                      <span className="font-bold block mb-2">Consumption</span>
                      {Object.entries(items.consumption)
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
            ) : (
              <p className="text-sm text-muted-foreground">
                No item production or consumption data in selection
              </p>
            )}
          </>
        )}

        {activeView === 'buildings' && (
          <>
            {buildingCountsEntries.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground mb-2 block">Machines</span>
                {buildingCountsEntries.map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">{formatMachineType(type)}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </>
            )}

            {(entities.trainStations.length > 0 ||
              entities.droneStations.length > 0 ||
              entities.radarTowers.length > 0 ||
              entities.hubs.length > 0 ||
              entities.spaceElevators.length > 0) && (
              <>
                {buildingCountsEntries.length > 0 && <Separator className="my-2" />}
                <span className="text-xs text-muted-foreground mb-2 block">Special Structures</span>
                {entities.trainStations.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Train Stations</span>
                    <span className="font-bold">{entities.trainStations.length}</span>
                  </div>
                )}
                {entities.droneStations.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Drone Stations</span>
                    <span className="font-bold">{entities.droneStations.length}</span>
                  </div>
                )}
                {entities.radarTowers.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Radar Towers</span>
                    <span className="font-bold">{entities.radarTowers.length}</span>
                  </div>
                )}
                {entities.hubs.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">HUBs</span>
                    <span className="font-bold">{entities.hubs.length}</span>
                  </div>
                )}
                {entities.spaceElevators.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Space Elevators</span>
                    <span className="font-bold">{entities.spaceElevators.length}</span>
                  </div>
                )}
              </>
            )}

            {(entities.belts.length > 0 ||
              entities.pipes.length > 0 ||
              entities.cables.length > 0 ||
              entities.rails.length > 0 ||
              entities.hypertubes.length > 0) && (
              <>
                {(buildingCountsEntries.length > 0 ||
                  entities.trainStations.length > 0 ||
                  entities.droneStations.length > 0 ||
                  entities.radarTowers.length > 0 ||
                  entities.hubs.length > 0 ||
                  entities.spaceElevators.length > 0) && <Separator className="my-2" />}
                <span className="text-xs text-muted-foreground mb-2 block">Infrastructure</span>
                {entities.belts.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Belts</span>
                    <span className="font-bold">{entities.belts.length}</span>
                  </div>
                )}
                {entities.pipes.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Pipes</span>
                    <span className="font-bold">{entities.pipes.length}</span>
                  </div>
                )}
                {entities.cables.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Power Cables</span>
                    <span className="font-bold">{entities.cables.length}</span>
                  </div>
                )}
                {entities.rails.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Train Rails</span>
                    <span className="font-bold">{entities.rails.length}</span>
                  </div>
                )}
                {entities.hypertubes.length > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">Hypertubes</span>
                    <span className="font-bold">{entities.hypertubes.length}</span>
                  </div>
                )}
              </>
            )}

            {buildingCountsEntries.length === 0 &&
              entities.trainStations.length === 0 &&
              entities.droneStations.length === 0 &&
              entities.radarTowers.length === 0 &&
              entities.hubs.length === 0 &&
              entities.spaceElevators.length === 0 &&
              entities.belts.length === 0 &&
              entities.pipes.length === 0 &&
              entities.cables.length === 0 &&
              entities.rails.length === 0 &&
              entities.hypertubes.length === 0 && (
                <p className="text-sm text-muted-foreground">No buildings in selection</p>
              )}
          </>
        )}

        {activeView === 'power' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Production</span>
              <span className="font-bold">
                {power.production ? fShortenNumber(power.production, WattUnits) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs">Total Consumption</span>
              <span className="font-bold">
                {power.consumption ? fShortenNumber(power.consumption, WattUnits) : '-'}
              </span>
            </div>

            {powerSourcesEntries.length > 0 && (
              <>
                <Separator className="my-2" />
                <span className="font-bold block mb-2">Power Sources</span>
                {powerSourcesEntries.map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs">
                      {formatMachineType(type)} ({data.count})
                    </span>
                    <span className="font-bold">{fShortenNumber(data.production, WattUnits)}</span>
                  </div>
                ))}
              </>
            )}

            {powerSourcesEntries.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No power generators in selection</p>
            )}
          </>
        )}

        {activeView === 'vehicles' && hasVehicles && (
          <>
            {entities.trainStations.length > 0 && (
              <>
                <span className="font-bold block mb-2">
                  Train Stations ({entities.trainStations.length})
                </span>
                {entities.trainStations.map((station, idx) => {
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

            {entities.droneStations.length > 0 && (
              <>
                {entities.trainStations.length > 0 && <Separator className="my-4" />}
                <span className="font-bold block mb-2">
                  Drone Stations ({entities.droneStations.length})
                </span>
                {entities.droneStations.map((station, idx) => {
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

            {entities.trains.length > 0 && (
              <>
                {(entities.trainStations.length > 0 || entities.droneStations.length > 0) && (
                  <Separator className="my-4" />
                )}
                <span className="font-bold block mb-2">Trains ({entities.trains.length})</span>
                {entities.trains.map((train, idx) => (
                  <div key={idx} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{train.name}</p>
                      <Badge variant="secondary">{formatMachineType(train.status)}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {train.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
              </>
            )}

            {entities.drones.length > 0 && (
              <>
                {(entities.trainStations.length > 0 ||
                  entities.droneStations.length > 0 ||
                  entities.trains.length > 0) && <Separator className="my-4" />}
                <span className="font-bold block mb-2">Drones ({entities.drones.length})</span>
                {entities.drones.map((drone, idx) => (
                  <div key={idx} className="p-2 mb-2 rounded bg-card">
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

            {(entities.trucks.length > 0 ||
              entities.tractors.length > 0 ||
              entities.explorers.length > 0) && (
              <>
                {(entities.trainStations.length > 0 ||
                  entities.droneStations.length > 0 ||
                  entities.trains.length > 0 ||
                  entities.drones.length > 0) && <Separator className="my-4" />}
                <span className="font-bold block mb-2">
                  Ground Vehicles (
                  {entities.trucks.length + entities.tractors.length + entities.explorers.length})
                </span>
                {entities.trucks.map((truck, idx) => (
                  <div key={`truck-${idx}`} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{truck.name}</p>
                      <Badge variant="secondary">Truck</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {truck.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
                {entities.tractors.map((tractor, idx) => (
                  <div key={`tractor-${idx}`} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{tractor.name}</p>
                      <Badge variant="secondary">Tractor</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {tractor.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
                {entities.explorers.map((explorer, idx) => (
                  <div key={`explorer-${idx}`} className="p-2 mb-2 rounded bg-card">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold">{explorer.name}</p>
                      <Badge variant="secondary">Explorer</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Speed: {explorer.speed.toFixed(0)} km/h
                    </span>
                  </div>
                ))}
              </>
            )}

            {dockedTrainsForStations.length === 0 &&
              dockedDronesForStations.length === 0 &&
              entities.trains.length === 0 &&
              entities.drones.length === 0 &&
              entities.trucks.length === 0 &&
              entities.tractors.length === 0 &&
              entities.explorers.length === 0 && (
                <p className="text-sm text-muted-foreground">No vehicles in selection</p>
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
    if (selectedItem?.type !== 'hub' || !hubData) return null;
    const milestone = hubData.activeMilestone;

    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <Iconify icon="material-symbols:house-rounded" width={20} className="text-amber-500" />
          <p className="text-base font-medium">{hubData.name || 'HUB Terminal'}</p>
        </div>

        {/* Ship Status */}
        <div className="mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Ship Status</span>
            {hubData.shipDocked ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">
                Docked
              </span>
            ) : shipCountdown !== null && shipCountdown > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                Returns in {formatCountdown(shipCountdown)}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                Returning...
              </span>
            )}
          </div>
        </div>

        {/* Active Milestone */}
        {hubData.hasActiveMilestone && milestone ? (
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Active Milestone</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                Tier {milestone.techTier}
              </span>
            </div>
            <p className="text-sm font-medium mb-3">{milestone.name}</p>

            {/* Cost Progress */}
            <span className="text-xs text-muted-foreground block mb-2">Requirements</span>
            {milestone.cost.map((item, idx) => {
              const progress =
                item.totalCost > 0
                  ? ((item.totalCost - item.remainingCost) / item.totalCost) * 100
                  : 0;
              const isComplete = progress >= 100;
              return (
                <div key={idx} className={cn(idx < milestone.cost.length - 1 ? 'mb-3' : '')}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        src={`assets/images/satisfactory/32x32/${item.name}.png`}
                        alt={item.name}
                        className="w-5 h-5 object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.name}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'text-sm shrink-0',
                        isComplete ? 'text-green-500' : 'text-foreground'
                      )}
                    >
                      {fShortenNumber(item.totalCost - item.remainingCost, MetricUnits, {
                        decimals: 0,
                      })}{' '}
                      / {fShortenNumber(item.totalCost, MetricUnits, { decimals: 0 })}
                    </p>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        isComplete ? 'bg-green-500' : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground italic">No active milestone</span>
          </div>
        )}

        {/* Location */}
        <div className="pt-2 mt-2 border-t border-border">
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
      {selectedItem?.type === 'selection' && renderSelection()}
      {selectedItem?.type === 'trainStation' && renderTrainStation()}
      {selectedItem?.type === 'droneStation' && renderDroneStation()}
      {selectedItem?.type === 'radarTower' && renderRadarTower()}
      {selectedItem?.type === 'hub' && renderHub()}
      {selectedItem?.type === 'spaceElevator' && renderSpaceElevator()}
    </MapSidebar>
  );
};
