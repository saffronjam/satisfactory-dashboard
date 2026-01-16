import { Circuit } from 'src/apiTypes';
import { ApiContext } from 'src/contexts/api/useApi';
import { fShortenNumber, WattHoursUnits, WattUnits } from 'src/utils/format-number';
import { useContextSelector } from 'use-context-selector';
import { CircuitCard } from '../circuit-card';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

/**
 * PowerView displays an overview of all power circuits in the factory
 */
export function PowerView() {
  const api = useContextSelector(ApiContext, (v) => {
    return { circuits: v.circuits, isLoading: v.isLoading, isOnline: v.isOnline };
  });

  const allCapacity = api.circuits.reduce((acc, circuit) => acc + circuit.capacity.total, 0);
  const allProduction = api.circuits.reduce((acc, circuit) => acc + circuit.production.total, 0);
  const allBatteryCapacity = api.circuits.reduce(
    (acc, circuit) => acc + circuit.battery.capacity,
    0
  );
  const anyFuseTriggered = api.circuits.some((circuit) => circuit.fuseTriggered);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 h-full">
          <div className="text-2xl font-bold">
            {api.isLoading ? (
              <Skeleton className="mb-2 h-8 w-20" />
            ) : (
              <>{fShortenNumber(allCapacity, WattUnits, { decimals: 2 })}</>
            )}
          </div>
          <div className="text-muted-foreground">Total Power Capacity</div>
        </Card>
        <Card className="p-4 h-full">
          <div className="text-2xl font-bold">
            {api.isLoading ? (
              <Skeleton className="mb-2 h-8 w-20" />
            ) : (
              <>{fShortenNumber(allProduction, WattUnits, { decimals: 2 })}</>
            )}
          </div>
          <div className="text-muted-foreground">Total Production</div>
        </Card>
        <Card className="p-4 h-full">
          <div className="text-2xl font-bold">
            {api.isLoading ? (
              <Skeleton className="mb-2 h-8 w-20" />
            ) : (
              <>{fShortenNumber(allBatteryCapacity, WattHoursUnits, { decimals: 2 })}</>
            )}
          </div>
          <div className="text-muted-foreground">Battery Capacity</div>
        </Card>
        <div className="h-full">
          {api.isLoading ? (
            <Skeleton className="w-full h-full rounded-xl min-h-[80px]" />
          ) : (
            <>
              {!anyFuseTriggered ? (
                <Card className="bg-green-100 dark:bg-green-900 p-4 h-full">
                  <div className="text-2xl font-bold text-green-800 dark:text-green-100">
                    No Problems
                  </div>
                  <div className="text-green-600 dark:text-green-300">Current Status</div>
                </Card>
              ) : (
                <Card className="bg-red-100 dark:bg-red-900 p-4 h-full">
                  <div className="text-2xl font-bold text-red-800 dark:text-red-100">
                    Fuse Triggered
                  </div>
                  <div className="text-red-600 dark:text-red-300">Status</div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
      <Separator className="mb-12" />
      <h4 className="text-xl font-semibold mt-8 mb-8">All Power Circuits</h4>
      {!api.isLoading && api.isOnline ? (
        <>
          {api.circuits.map((circuit: Circuit, index: number) => {
            return (
              <CircuitCard
                key={index}
                circuit={circuit}
                name={index == 0 ? 'Main' : `Power Circuit #${index}`}
              />
            );
          })}
        </>
      ) : (
        <>
          <Card className="mb-8 p-5 opacity-50">
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
                <div className="flex flex-row items-center">
                  <Skeleton className="w-20 h-4" />
                </div>
                <div>
                  <Skeleton className="w-30 h-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border p-4 h-full">
                  <div className="text-lg font-semibold">
                    <Skeleton className="w-28 h-5" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Power Capacity</div>
                </Card>
                <Card className="border p-4 h-full">
                  <div className="text-lg font-semibold">
                    <Skeleton className="w-20 h-5" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Power Production</div>
                </Card>
                <Card className="border p-4 h-full">
                  <div className="text-lg font-semibold">
                    <Skeleton className="w-24 h-5" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Current consumption</div>
                </Card>
                <Card className="border p-4 h-full">
                  <div className="text-lg font-semibold">
                    <Skeleton className="w-20 h-5" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Max. Consumed</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
                <div className="text-lg font-semibold">Battery</div>
                <div>
                  <Skeleton className="w-20 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
