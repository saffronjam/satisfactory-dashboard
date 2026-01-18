import * as React from 'react';
import { Icon } from '@iconify/react';
import { useContextSelector } from 'use-context-selector';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ProdStats } from 'src/apiTypes';
import { ApiContext } from 'src/contexts/api/useApi';
import { useSession } from 'src/contexts/sessions';
import { useHistoryData } from 'src/hooks/useHistoryData';
import { useSettings } from 'src/hooks/use-settings';
import { fShortenNumber, MetricUnits, PerMinuteMetricUnits } from 'src/utils/format-number';

type Column = {
  id:
    | 'icon'
    | 'name'
    | 'inventory'
    | 'cloudInventory'
    | 'production'
    | 'consumption'
    | 'production efficiency'
    | 'consumption efficiency';
  label: string;
  labelIcon?: string;
  widthClass: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: number) => string;
  severity?: (value: number | string) => Severity;
  trend?: (row: RowData, history: ProdStats[]) => number;
};

type RowData = {
  id: string;
  name: string;
  inventory: number;
  cloudInventory: number;
  production: number;
  consumption: number;
  'production efficiency': number;
  'consumption efficiency': number;
};

enum Severity {
  none = 'none',
  awesome = 'awesome',
  ok = 'ok',
  unsatisfactory = 'unsatisfactory',
  poor = 'poor',
}

function calculateTrend(data: number[]): number {
  if (data.length < 2) {
    throw new Error('At least two data points are required to calculate a trend.');
  }

  const n = data.length;
  const xSum = data.reduce((sum, _, index) => sum + index, 0);
  const ySum = data.reduce((sum, value) => sum + value, 0);
  const xySum = data.reduce((sum, value, index) => sum + index * value, 0);
  const xSquaredSum = data.reduce((sum, _, index) => sum + index ** 2, 0);

  const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum ** 2);

  return slope;
}

const columns: readonly Column[] = [
  { id: 'icon', label: '', widthClass: 'w-[44px]', align: 'center' },
  { id: 'name', label: 'Name', widthClass: 'w-auto', align: 'left' },

  {
    id: 'inventory',
    label: 'Inventory',
    labelIcon: 'mdi:earth',
    widthClass: 'w-[150px]',
    align: 'center',
    format: (value) => fShortenNumber(value, MetricUnits, { decimals: 2 }),
    severity: () => Severity.none,
    trend: (row: RowData, history: ProdStats[]) => {
      if (history.length < 10) {
        return 0;
      }

      const itemProdHistory = history.map((prodStats) =>
        prodStats.items?.find((i) => i.name === row.name)
      );

      const itemProdHistoryCount = itemProdHistory
        .filter((item) => item !== undefined)
        .map((item) => item.count);

      return calculateTrend(itemProdHistoryCount) * itemProdHistory.length;
    },
  },
  {
    id: 'cloudInventory',
    label: 'Cloud',
    labelIcon: 'mdi:cloud',
    widthClass: 'w-[120px]',
    align: 'center',
    format: (value) => fShortenNumber(value, MetricUnits, { decimals: 2 }),
    severity: () => Severity.none,
  },
  {
    id: 'production',
    label: 'Production',
    widthClass: 'w-[150px]',
    align: 'center',
    format: (value: number) => `${fShortenNumber(value, PerMinuteMetricUnits, { decimals: 2 })}`,
    severity: () => Severity.none,
    trend: (row: RowData, history: ProdStats[]) => {
      if (history.length < 10) {
        return 0;
      }

      const itemProdHistory = history.map((prodStats) =>
        prodStats.items?.find((i) => i.name === row.name)
      );

      const itemValues = itemProdHistory
        .map((item) => item?.producedPerMinute)
        .filter((item) => item !== undefined);

      return calculateTrend(itemValues) * itemProdHistory.length;
    },
  },
  {
    id: 'consumption',
    label: 'Consumption',
    widthClass: 'w-[150px]',
    align: 'center',
    format: (value: number) => `${fShortenNumber(value, PerMinuteMetricUnits, { decimals: 2 })}`,
    severity: () => Severity.none,
    trend: (row: RowData, history: ProdStats[]) => {
      if (history.length < 10) {
        return 0;
      }

      const itemProdHistory = history.map((prodStats) =>
        prodStats.items?.find((i) => i.name === row.name)
      );

      const itemValues = itemProdHistory
        .map((item) => item?.consumedPerMinute)
        .filter((item) => item !== undefined);

      return calculateTrend(itemValues) * itemProdHistory.length;
    },
  },
  {
    id: 'production efficiency',
    label: 'Prod Eff',
    widthClass: 'w-[100px]',
    align: 'center',
    format: (value: number) => `${Math.round(value * 100)}%`,
    severity: (value: number | string) => {
      if (typeof value === 'string') {
        return Severity.none;
      }

      if (value >= 0.9) {
        return Severity.awesome;
      }

      if (value >= 0.75) {
        return Severity.ok;
      }
      if (value >= 0.5) {
        return Severity.unsatisfactory;
      }
      return Severity.poor;
    },
  },
  {
    id: 'consumption efficiency',
    label: 'Cons Eff',
    widthClass: 'w-[100px]',
    align: 'center',
    format: (value: number) => `${Math.round(value * 100)}%`,
    severity: (value: number | string) => {
      if (typeof value === 'string') {
        return Severity.none;
      }

      if (value >= 0.9) {
        return Severity.awesome;
      }

      if (value >= 0.75) {
        return Severity.ok;
      }
      if (value >= 0.5) {
        return Severity.unsatisfactory;
      }
      return Severity.poor;
    },
  },
];

const severityToStyle = (severity: Severity) => {
  switch (severity) {
    case Severity.awesome:
      return { label: 'Awesome', color: 'bg-green-500' };
    case Severity.ok:
      return { label: 'OK', color: 'bg-yellow-500' };
    case Severity.unsatisfactory:
      return { label: 'Unsatisfactory', color: 'bg-orange-500' };
    case Severity.poor:
      return { label: 'Poor', color: 'bg-red-500' };
    default:
      return { label: '', color: 'bg-transparent' };
  }
};

const alignmentClasses = {
  left: 'text-left justify-start',
  center: 'text-center justify-center',
  right: 'text-right justify-end',
};

/**
 * Production view component displaying a table of production statistics.
 * Shows item inventory, cloud inventory, production/consumption rates, and efficiency metrics.
 * Supports sorting, filtering, pagination, and trend indicators.
 */
export function ProductionView() {
  const api = useContextSelector(ApiContext, (v) => {
    return {
      prodStats: v.prodStats,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });

  const { selectedSession } = useSession();
  const { settings, saveSettings } = useSettings();

  // Fetch historical production stats using historyDataRange from settings
  const { data: prodStatsHistory } = useHistoryData<ProdStats>(
    selectedSession?.id ?? null,
    'prodStats',
    settings.historyDataRange,
    settings.historyWindowSize
  );

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortColumn, setSortColumn] = React.useState<Column['id'] | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (value: string) => {
    setRowsPerPage(+value);
    setPage(0);
  };

  const handleSort = (columnId: Column['id']) => {
    if (columnId === 'icon') return;
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedRows = React.useMemo(() => {
    if (api.isLoading || !api.prodStats?.items) {
      return [];
    }

    const rows: RowData[] = api.prodStats.items
      .filter((item) => settings.productionView.includeItems || item.minable)
      .filter((item) => settings.productionView.includeMinable || !item.minable)
      .map((item, idx) => ({
        id: `${item.name}-${item.minable}-${idx}`,
        name: item.name,
        inventory: item.count,
        cloudInventory: item.cloudCount,
        production: item.producedPerMinute,
        consumption: item.consumedPerMinute,
        'production efficiency': item.produceEfficiency,
        'consumption efficiency': item.consumeEfficiency,
      }));

    if (sortColumn == 'icon') {
      return rows;
    }

    if (sortColumn) {
      return [...rows].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        const compareResult =
          typeof aValue === 'number' && typeof bValue === 'number'
            ? aValue - bValue
            : String(aValue).localeCompare(String(bValue));

        if (compareResult === 0) {
          return a.name.localeCompare(b.name);
        }
        return sortDirection === 'asc' ? compareResult : -compareResult;
      });
    }
    return rows;
  }, [
    api.isLoading,
    api.prodStats?.items,
    sortColumn,
    sortDirection,
    settings.productionView.includeItems,
    settings.productionView.includeMinable,
  ]);

  const filteredRows = sortedRows.filter((row) => {
    return Object.values(row).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Pre-calculate all trend values to prevent flickering during render
  const trendValues = React.useMemo(() => {
    const trends = new Map<string, number>();
    if (!settings.productionView.showTrend) {
      return trends;
    }
    for (const row of sortedRows) {
      for (const column of columns) {
        if (column.trend) {
          const key = `${row.id}-${column.id}`;
          trends.set(key, column.trend(row, prodStatsHistory));
        }
      }
    }
    return trends;
  }, [sortedRows, prodStatsHistory, settings.productionView.showTrend]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const activeFiltersCount = [
    settings.productionView.includeMinable,
    settings.productionView.includeItems,
    settings.productionView.showTrend,
  ].filter(Boolean).length;

  if (api.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="flex-1"
        />

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <Icon icon="mdi:filter-variant" className="size-4" />
            {activeFiltersCount > 0
              ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''}`
              : 'Filters'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={settings.productionView.includeMinable}
              onCheckedChange={(checked) =>
                saveSettings({
                  ...settings,
                  productionView: {
                    ...settings.productionView,
                    includeMinable: checked,
                  },
                })
              }
            >
              Minable
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={settings.productionView.includeItems}
              onCheckedChange={(checked) =>
                saveSettings({
                  ...settings,
                  productionView: {
                    ...settings.productionView,
                    includeItems: checked,
                  },
                })
              }
            >
              Items
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={settings.productionView.showTrend}
              onCheckedChange={(checked) =>
                saveSettings({
                  ...settings,
                  productionView: {
                    ...settings.productionView,
                    showTrend: checked,
                  },
                })
              }
            >
              Show trends
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      'select-none',
                      column.widthClass,
                      column.id !== 'icon' && 'cursor-pointer hover:bg-muted/50',
                      alignmentClasses[column.align || 'left']
                    )}
                    onClick={() => handleSort(column.id)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium uppercase tracking-wider',
                        alignmentClasses[column.align || 'left']
                      )}
                    >
                      {column.labelIcon && (
                        <Icon icon={column.labelIcon} className="size-4 shrink-0" />
                      )}
                      {column.label}
                      {column.id !== 'icon' && (
                        <Icon
                          icon={sortDirection === 'asc' ? 'bi:caret-up-fill' : 'bi:caret-down-fill'}
                          className={cn(
                            'size-3 shrink-0 transition-opacity',
                            sortColumn === column.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, index) => (
                <TableRow key={row.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                  {columns.map((column) => {
                    if (column.id === 'icon') {
                      return (
                        <TableCell key={column.id} className="text-center">
                          <div className="flex size-9 items-center justify-center">
                            <img
                              src={`assets/images/satisfactory/64x64/${row.name}.png`}
                              alt={row.name}
                              className="size-9"
                            />
                          </div>
                        </TableCell>
                      );
                    }

                    const value = row[column.id];
                    const severity = column.severity ? column.severity(value) : Severity.none;
                    const severityStyle = severityToStyle(severity);

                    const EndDecorator = () => {
                      if (severity !== Severity.none) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  'ml-2 inline-block size-2.5 shrink-0 rounded-full',
                                  severityStyle.color
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>{severityStyle.label}</TooltipContent>
                          </Tooltip>
                        );
                      }

                      if (settings.productionView.showTrend && typeof value === 'number') {
                        const trendKey = `${row.id}-${column.id}`;
                        const trendValue = trendValues.get(trendKey) ?? 0;

                        const colorClass =
                          trendValue === 0
                            ? 'text-transparent'
                            : trendValue > 0
                              ? 'text-green-500'
                              : 'text-red-500';

                        return (
                          <div className={cn('ml-2 flex items-center gap-0.5', colorClass)}>
                            <Icon
                              icon={trendValue > 0 ? 'bi:caret-up-fill' : 'bi:caret-down-fill'}
                              className="size-3"
                            />
                            <span className="text-xs">
                              {fShortenNumber(trendValue, MetricUnits, { decimals: 0 })}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <span
                          className={cn(
                            'ml-2 inline-block size-2.5 shrink-0 rounded-full',
                            severityStyle.color
                          )}
                        />
                      );
                    };

                    return (
                      <TableCell
                        key={column.id}
                        className={cn(alignmentClasses[column.align || 'left'])}
                      >
                        <div
                          className={cn(
                            'flex items-center',
                            alignmentClasses[column.align || 'left']
                          )}
                        >
                          <span className="text-foreground">
                            {column.format && typeof value === 'number'
                              ? column.format(value)
                              : value}
                          </span>
                          <EndDecorator />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <div className="text-sm text-muted-foreground">{filteredRows.length} total items</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={rowsPerPage.toString()} onValueChange={handleChangeRowsPerPage}>
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages || 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                <Icon icon="mdi:chevron-left" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleChangePage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <Icon icon="mdi:chevron-right" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
