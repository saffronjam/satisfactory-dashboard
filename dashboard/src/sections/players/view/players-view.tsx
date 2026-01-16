import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, MapPin } from 'lucide-react';
import { useContextSelector } from 'use-context-selector';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PopoverMap } from '@/components/popover-map';
import { cn } from '@/lib/utils';
import { ApiContext } from 'src/contexts/api/useApi';
import { getPlayerColorMap } from 'src/utils/player-colors';

type SortField = 'name' | 'health';
type SortDirection = 'asc' | 'desc';

/**
 * Health bar component showing player health with color-coded progress.
 */
const HealthBar = ({ health }: { health: number }) => {
  const displayHealth = Math.round(health);

  const getColorClass = () => {
    if (displayHealth > 80) return 'bg-green-500';
    if (displayHealth > 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', getColorClass())}
          style={{ width: `${displayHealth}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
        {displayHealth}
      </span>
    </div>
  );
};

/**
 * Sortable column header component.
 */
const SortableHeader = ({
  label,
  field,
  currentField,
  direction,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) => {
  const isActive = currentField === field;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(field)}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="size-4" />
          ) : (
            <ArrowDown className="size-4" />
          )
        ) : (
          <ArrowUpDown className="size-4 opacity-50" />
        )}
      </button>
    </TableHead>
  );
};

/**
 * Players page view component displaying player information and health in a table.
 */
export function PlayersView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const api = useContextSelector(ApiContext, (v) => {
    return { players: v.players };
  });

  const playerColors = useMemo(() => getPlayerColorMap(api.players), [api.players]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredPlayers = api.players
    .filter((player) => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'health') {
        comparison = a.health - b.health;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="mx-auto max-w-7xl pt-12">
      <div className="mb-4">
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Player"
                field="name"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
                className="w-5/12"
              />
              <SortableHeader
                label="Health"
                field="health"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
                className="w-5/12"
              />
              <TableHead className="w-2/12">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: playerColors.get(player.name) }}
                    />
                    {player.name}
                  </div>
                </TableCell>
                <TableCell>
                  <HealthBar health={player.health} />
                </TableCell>
                <TableCell>
                  <PopoverMap
                    entity={player}
                    entityType="player"
                    playerColor={playerColors.get(player.name)}
                  >
                    <Button variant="ghost" size="icon" className="size-8">
                      <MapPin className="size-4" />
                    </Button>
                  </PopoverMap>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
