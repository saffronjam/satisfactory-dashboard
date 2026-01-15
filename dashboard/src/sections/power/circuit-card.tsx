import { Icon } from '@iconify/react';
import { Circuit } from 'src/apiTypes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fPercent, fShortenNumber, WattHoursUnits, WattUnits } from 'src/utils/format-number';

/**
 * Displays power circuit statistics including production, consumption, and battery status.
 */
export function CircuitCard({ circuit, name }: { circuit: Circuit; name: string }) {
  const secondsToFullyCharge = circuit.battery.untilFull;
  const fullyChargedIn = new Date(0, 0, 0, 0, 0, secondsToFullyCharge);
  const formatted = `${String(fullyChargedIn.getHours()).padStart(2, '0')}:${String(fullyChargedIn.getMinutes()).padStart(2, '0')}:${String(fullyChargedIn.getSeconds()).padStart(2, '0')}`;

  const hasBattery = circuit.battery.capacity > 0 || circuit.battery.untilFull > 0;

  const getMaxConsumeColor = () => {
    const percentage = (circuit.consumption.max / circuit.production.total) * 100;
    if (percentage > 80) return 'border-yellow-500';
    return 'border-green-500';
  };

  const getConsumeColor = () => {
    const percentage = (circuit.consumption.total / circuit.production.total) * 100;
    if (percentage > 100) return 'border-red-500';
    if (percentage > 80) return 'border-yellow-500';
    return 'border-green-500';
  };

  const getProductionColor = () => {
    if (circuit.production.total === 0) return 'border-red-500';
    return 'border-green-500';
  };

  const getProductionCapacityColor = () => {
    if (circuit.capacity.total === 0) return 'border-red-500';
    return 'border-green-500';
  };

  const getBatteryPercentColor = () => {
    if (circuit.battery.percentage > 80) return 'border-green-500';
    if (circuit.battery.percentage > 50) return 'border-yellow-500';
    return 'border-red-500';
  };

  const getBatteryDifferentialColor = () => {
    if (circuit.battery.percentage === 100) return 'border-green-500';
    if (circuit.battery.differential > 0) return 'border-green-500';
    if (circuit.battery.differential < 0) return 'border-red-500';
    return 'border-yellow-500';
  };

  const getBatteryCapacityColor = () => {
    if (circuit.battery.capacity === 0) return 'border-red-500';

    const hoursCovered = circuit.battery.capacity / circuit.consumption.total;
    if (hoursCovered > 10) return 'border-green-500';
    if (hoursCovered > 5) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <Card className="mb-8 p-5">
      <CardContent className="p-0">
        <div className="mb-4 flex flex-row items-start justify-between">
          <div className="mr-2 flex flex-row items-center">
            <h2 className="text-xl font-semibold">{name}</h2>
          </div>
          <div className="flex flex-row gap-2">
            {circuit.fuseTriggered && (
              <Badge variant="destructive" className="gap-1.5 bg-red-900/80 px-3 py-1 text-red-200">
                <Icon icon="bi:exclamation-triangle" className="h-4 w-4" />
                Fuse Triggered
              </Badge>
            )}

            {!hasBattery && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <Icon icon="fluent:plug-disconnected-16-regular" className="h-4 w-4" />
                No Battery connected
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className={cn('h-full p-4', getProductionCapacityColor())}>
            <h3 className="text-lg font-semibold">
              {fShortenNumber(circuit.capacity.total, WattUnits, { decimals: 3 })}
            </h3>
            <p className="text-sm text-muted-foreground">Power Capacity</p>
          </Card>
          <Card className={cn('h-full p-4', getProductionColor())}>
            <h3 className="text-lg font-semibold">
              {fShortenNumber(circuit.production.total, WattUnits, { decimals: 3 })}
            </h3>
            <p className="text-sm text-muted-foreground">Power Production</p>
          </Card>
          <Card className={cn('h-full p-4', getConsumeColor())}>
            <h3 className="text-lg font-semibold">
              {fShortenNumber(circuit.consumption.total, WattUnits, { decimals: 3 })}
            </h3>
            <p className="text-sm text-muted-foreground">Current Consumption</p>
          </Card>
          <Card className={cn('h-full p-4', getMaxConsumeColor())}>
            <h3 className="text-lg font-semibold">
              {fShortenNumber(circuit.consumption.max, WattUnits, { decimals: 3 })}
            </h3>
            <p className="text-sm text-muted-foreground">Max Consumption</p>
          </Card>
        </div>

        {hasBattery && (
          <>
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Battery</h3>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className={cn('h-full p-4', hasBattery ? getBatteryCapacityColor() : '')}>
                <h3 className="text-lg font-semibold">
                  {fShortenNumber(circuit.battery.capacity, WattHoursUnits, { decimals: 3 })}
                </h3>
                <p className="text-sm text-muted-foreground">Battery Capacity</p>
              </Card>
              <Card className={cn('h-full p-4', hasBattery ? getBatteryPercentColor() : '')}>
                <h3 className="text-lg font-semibold">
                  {hasBattery ? `${fPercent(circuit.battery.percentage, { decimals: 0 })} %` : '-'}
                </h3>
                <p className="text-sm text-muted-foreground">Battery Percent</p>
              </Card>
              <Card className={cn('h-full p-4', hasBattery ? getBatteryDifferentialColor() : '')}>
                <h3 className="text-lg font-semibold">
                  {hasBattery
                    ? fShortenNumber(circuit.battery.differential, WattUnits, { decimals: 3 })
                    : '-'}
                </h3>
                <p className="text-sm text-muted-foreground">Battery Differential</p>
              </Card>
              <Card className="h-full p-4">
                <h3 className="text-lg font-semibold">{formatted}</h3>
                <p className="text-sm text-muted-foreground">Battery Until Time</p>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
