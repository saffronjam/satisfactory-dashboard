import { Spinner } from '@/components/ui/spinner';
import { Iconify } from '@/components/iconify';
import { ApiContext } from '@/contexts/api/useApi';
import { useContextSelector } from 'use-context-selector';
import { WattUnits } from 'src/utils/format-number';
import { AnalyticsPieChart } from '../analytics-pie-chart';
import { AnalyticsSpaceElevatorProgress } from '../analytics-space-elevator-progress';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

/**
 * Overview analytics view component that displays factory statistics dashboard.
 * Shows summary widgets, pie charts for energy sources and machine efficiency,
 * and space elevator progress.
 */
export function OverviewAnalyticsView() {
  const api = useContextSelector(ApiContext, (v) => {
    return {
      circuits: v.circuits,
      prodStats: v.prodStats,
      sinkStats: v.sinkStats,
      generatorStats: v.generatorStats,
      factoryStats: v.factoryStats,
      spaceElevator: v.spaceElevator,
      history: v.history,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });

  const mPerMinUnits = ['/min', 'k/min', 'M/min', 'B/min', 'T/min'];
  const wUnits = ['W', 'kW', 'MW', 'GW', 'TW', 'PW'];

  const totalEnergyProduced = () =>
    api.circuits.reduce((acc, circuit) => acc + circuit.production.total, 0) || 0;
  const totalEnergyConsumed = () =>
    api.circuits.reduce((acc, circuit) => acc + circuit.consumption.total, 0) || 0;

  const totalMinableProduced = () => api.prodStats?.minableProducedPerMinute || 0;
  const totalMinableConsumed = () => api.prodStats?.minableConsumedPerMinute || 0;

  const totalItemsProduced = () => api.prodStats?.itemsProducedPerMinute || 0;
  const totalItemsConsumed = () => api.prodStats?.itemsConsumedPerMinute || 0;

  if (!api || api.isLoading === true) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-6">
      {/* Summary widgets row - 4 cards */}
      <div className="col-span-12 sm:col-span-6 md:col-span-3">
        <AnalyticsWidgetSummary
          title="Energy Consumption (P/C)"
          total={[totalEnergyProduced(), totalEnergyConsumed()]}
          icon={<Iconify icon="bi:lightning-charge-fill" className="size-full" />}
          chart={{
            categories: api.history.map((data) => data.timestamp.toLocaleTimeString()) || [],
            series: api.history.map((data) => data.prodStats.itemsConsumedPerMinute) || [],
          }}
          units={wUnits}
          color="1"
        />
      </div>

      <div className="col-span-12 sm:col-span-6 md:col-span-3">
        <AnalyticsWidgetSummary
          title="Mined Resources (P/C)"
          total={[totalMinableProduced(), totalMinableConsumed()]}
          icon={<Iconify icon="bi:gem" className="size-full" />}
          chart={{
            categories: api.history.map((data) => data.timestamp.toLocaleTimeString()) || [],
            series: api.history.map((data) => data.prodStats.minableProducedPerMinute) || [],
          }}
          units={mPerMinUnits}
          color="2"
        />
      </div>

      <div className="col-span-12 sm:col-span-6 md:col-span-3">
        <AnalyticsWidgetSummary
          title="Produced Resources (P/C)"
          total={[totalItemsProduced(), totalItemsConsumed()]}
          icon={<Iconify icon="material-symbols:factory" className="size-full" />}
          chart={{
            categories: api.history.map((data) => data.timestamp.toLocaleTimeString()) || [],
            series: api.history.map((data) => data.prodStats.itemsProducedPerMinute) || [],
          }}
          units={mPerMinUnits}
          color="3"
        />
      </div>

      <div className="col-span-12 sm:col-span-6 md:col-span-3">
        <AnalyticsWidgetSummary
          title="Sink Points (Total/Rate)"
          total={[api.sinkStats?.totalPoints || 0, api.sinkStats?.pointsPerMinute || 0]}
          icon={<Iconify icon="hugeicons:black-hole-01" className="size-full" />}
          chart={{
            categories: api.history.map((data) => data.timestamp.toLocaleTimeString()) || [],
            series: api.history.map((data) => data.sinkStats.pointsPerMinute) || [],
          }}
          units={[
            ['', 'k', 'M', 'B', 'T'],
            ['/min', 'k/min', 'M/min', 'B/min', 'T/min'],
          ]}
          color="4"
        />
      </div>

      {/* Charts row - 3 cards */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <AnalyticsPieChart
          title="Energy Sources"
          units={WattUnits}
          chart={{
            series: (() => {
              const data = [
                {
                  label: 'Biomass',
                  value: api.generatorStats?.sources?.biomass?.totalProduction || 0,
                },
                {
                  label: 'Coal',
                  value: api.generatorStats?.sources?.coal?.totalProduction || 0,
                },
                {
                  label: 'Fuel',
                  value: api.generatorStats?.sources?.fuel?.totalProduction || 0,
                },
                {
                  label: 'Geothermal',
                  value: api.generatorStats?.sources?.geothermal?.totalProduction || 0,
                },
                {
                  label: 'Nuclear',
                  value: api.generatorStats?.sources?.nuclear?.totalProduction || 0,
                },
              ].filter((source) => source.value > 0);

              if (data.length === 0) {
                return [{ label: 'No data', value: 0 }];
              }

              return data;
            })(),
          }}
        />
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <AnalyticsPieChart
          title="Machine Efficiency"
          chart={{
            series: (() => {
              const data = [
                {
                  label: 'Operating',
                  value: api.factoryStats?.efficiency?.machinesOperating || 0,
                },
                {
                  label: 'Idle',
                  value: api.factoryStats?.efficiency?.machinesIdle || 0,
                },
                {
                  label: 'Paused',
                  value: api.factoryStats?.efficiency?.machinesPaused || 0,
                },
              ].filter((source) => source.value > 0);

              if (data.length === 0) {
                return [{ label: 'No data', value: 0 }];
              }

              return data;
            })(),
          }}
        />
      </div>

      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <AnalyticsSpaceElevatorProgress title="Space Elevator" spaceElevator={api.spaceElevator} />
      </div>
    </div>
  );
}
