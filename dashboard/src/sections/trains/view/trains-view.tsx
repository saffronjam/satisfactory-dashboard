import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useContextSelector } from 'use-context-selector';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Gauge } from '@/components/gauge/gauge';
import {
  TrainStatus,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusParked,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { ApiContext } from 'src/contexts/api/useApi';
import { fNumber, fShortenNumber, MetricUnits, WattUnits } from 'src/utils/format-number';

import { TrainList } from '../train-list';

const statusOptions: { value: TrainStatus; label: string }[] = [
  { value: TrainStatusSelfDriving, label: 'Self Driving' },
  { value: TrainStatusManualDriving, label: 'Manual Driving' },
  { value: TrainStatusDocking, label: 'Docking' },
  { value: TrainStatusParked, label: 'Parked' },
  { value: TrainStatusDerailed, label: 'Derailed' },
];

/**
 * Trains page view component displaying train statistics, power consumption, speed gauges,
 * and a filterable list of all trains with their current status.
 */
export function TrainsView() {
  const api = useContextSelector(ApiContext, (v) => {
    return {
      trains: v.trains,
      trainStations: v.trainStations,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainStatus[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const filteredTrains = useMemo(() => {
    return api.trains.filter((train) => {
      const matchesName =
        nameFilter === '' || train.name.toLowerCase().includes(nameFilter.toLowerCase());

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(train.status);

      return matchesName && matchesStatus;
    });
  }, [api.trains, nameFilter, statusFilter]);

  const totalPowerConsumption = () =>
    api.trains.reduce((acc, train) => acc + train.powerConsumption, 0);
  const maxPowerConsumption = () => 110 * api.trains.length;
  const avgSpeed = () => {
    if (api.trains.length === 0) return 0;
    return api.trains.reduce((acc, train) => acc + train.speed, 0) / api.trains.length;
  };
  const maxSpeed = () => 120;

  const totalCarried = () =>
    api.trains.reduce((acc, train) => {
      return (
        acc +
        train.vehicles.reduce((acc, vehicle) => {
          return (
            acc +
            vehicle.inventory.reduce((acc, item) => {
              return acc + item.count;
            }, 0)
          );
        }, 0)
      );
    }, 0);

  const toggleStatus = (status: TrainStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  if (api.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pt-12">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card className="flex-1 p-4">
            <CardContent className="p-0">
              <h3 className="text-3xl font-bold">{api.trains.length}</h3>
              <p className="text-muted-foreground">Total Trains</p>
            </CardContent>
          </Card>

          <Card className="flex-1 p-4">
            <CardContent className="p-0">
              <h3 className="text-3xl font-bold">{fShortenNumber(totalCarried(), MetricUnits)}</h3>
              <p className="text-muted-foreground">Total Carried</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-full overflow-hidden p-4">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-0">
            <h6 className="text-sm font-semibold">Power Consumption</h6>
            <Gauge value={(totalPowerConsumption() / maxPowerConsumption()) * 100 || 0} size="sm" />
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Current</span>
                <span className="font-bold">
                  {fShortenNumber(totalPowerConsumption(), WattUnits, {
                    decimals: 1,
                    ensureConstantDecimals: true,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max</span>
                <span className="font-bold">
                  {fShortenNumber(maxPowerConsumption(), WattUnits, { decimals: 0 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full overflow-hidden p-4">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-0">
            <h6 className="text-sm font-semibold">Train Speed (Average)</h6>
            <Gauge value={(avgSpeed() / maxSpeed()) * 100} size="sm" />
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Current</span>
                <span className="font-bold">{fNumber(avgSpeed(), { decimals: 0 })} km/h</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Max</span>
                <span className="font-bold">{fNumber(maxSpeed(), { decimals: 0 })} km/h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="mb-12 mt-9" />

      <div className="mb-3 mt-4 flex items-center justify-between">
        <h4 className="text-2xl font-bold">
          All Trains
          {filteredTrains.length !== api.trains.length && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({filteredTrains.length} of {api.trains.length})
            </span>
          )}
        </h4>
      </div>

      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Search by name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="flex-1"
        />

        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger className="inline-flex h-9 min-w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {statusFilter.length === 0 ? (
              <span className="text-muted-foreground">Filter by status</span>
            ) : (
              <span>{statusFilter.length} status selected</span>
            )}
            <Icon icon="mdi:chevron-down" className="size-4" />
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2">
            <div className="flex flex-col gap-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={option.value}
                    checked={statusFilter.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <Label htmlFor={option.value} className="cursor-pointer text-sm font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <Separator className="my-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter([])}
                    className="justify-start"
                  >
                    Clear all
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <TrainList trains={filteredTrains} trainStations={api.trainStations} />
    </div>
  );
}
