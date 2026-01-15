import { useContextSelector } from 'use-context-selector';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ApiContext } from 'src/contexts/api/useApi';
import { fNumber } from 'src/utils/format-number';

/**
 * Health bar component showing player health with color-coded progress.
 */
const HealthBar = ({ health }: { health: number }) => {
  const getColorClass = () => {
    if (health > 80) return 'bg-green-500';
    if (health > 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="mt-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', getColorClass())}
          style={{ width: `${health}%` }}
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{fNumber(health, { decimals: 0 })} / 100</p>
    </div>
  );
};

/**
 * Favorite item display showing the player's most used item.
 */
const FavoriteItem = ({ item }: { item: { name: string; count: number } }) => {
  return (
    <Card className="mt-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Favorite Item</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <Avatar className="size-12">
          <AvatarImage src={`assets/images/satisfactory/64x64/${item.name}.png`} alt={item.name} />
          <AvatarFallback>{item.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="mt-2 text-sm font-semibold">{fNumber(item.count)}</span>
      </CardContent>
    </Card>
  );
};

/**
 * Players page view component displaying player information, health, and favorite items.
 */
export function PlayersView() {
  const api = useContextSelector(ApiContext, (v) => {
    return { players: v.players };
  });

  return (
    <div className="mx-auto max-w-7xl pt-12">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {api.players.map((player) => (
          <Card key={player.id} className="min-w-[300px] p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{player.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthBar health={player.health} />
              <FavoriteItem item={player.items[0]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
