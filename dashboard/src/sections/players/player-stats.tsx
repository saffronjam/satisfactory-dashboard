import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Player stats card showing basic player information.
 */
export default function PlayerStats({ player }: { player: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p>Player: {player.name}</p>
        <p>HP: {player.hp}</p>
        <p>Color: {player.color}</p>
      </CardContent>
    </Card>
  );
}
