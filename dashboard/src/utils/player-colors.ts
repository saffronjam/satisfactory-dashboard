import { Player } from 'src/apiTypes';

/**
 * Color palette for players - indexed by sorted name position for consistent colors.
 */
export const PLAYER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Mint
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Sea green
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light blue
];

/**
 * Creates a map of player names to colors based on alphabetically sorted order.
 * This ensures consistent color assignment across the application.
 */
export function getPlayerColorMap(players: Player[]): Map<string, string> {
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  const colors = new Map<string, string>();
  sortedPlayers.forEach((player, index) => {
    colors.set(player.name, PLAYER_COLORS[index % PLAYER_COLORS.length]);
  });
  return colors;
}

/**
 * Gets the color for a specific player given the full player list.
 */
export function getPlayerColor(players: Player[], playerName: string): string {
  const colorMap = getPlayerColorMap(players);
  return colorMap.get(playerName) || PLAYER_COLORS[0];
}
