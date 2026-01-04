import L from 'leaflet';
import { memo, useEffect, useMemo } from 'react';
import { Marker } from 'react-leaflet';
import { Player } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { AnimatedPosition, useVehicleAnimation } from '../hooks/useVehicleAnimation';

type PlayerVehicleLayerProps = {
  players: Player[];
  enabled: boolean;
  onPlayerClick?: (player: Player) => void;
  onPositionsUpdate?: (positions: Map<string, AnimatedPosition>) => void;
  selectedName?: string | null;
  showNames?: boolean;
};

// Player colors - indexed by sorted name position for consistent colors
const PLAYER_COLORS = [
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

// Player icon SVG (mdi:account-circle)
const playerIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 19.2c-2.5 0-4.71-1.28-6-3.2c.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1a7.23 7.23 0 0 1-6 3.2M12 5a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-3A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>
</svg>`;

const createPlayerIcon = (color: string, isSelected: boolean, showName: boolean, name: string) => {
  const size = 28;
  const containerSize = size + 12; // Extra space for selection circle
  const labelHeight = showName && name ? 18 : 0;
  const totalHeight = containerSize + labelHeight;

  return L.divIcon({
    className: 'player-marker',
    html: `
      <div style="
        width: ${containerSize}px;
        height: ${totalHeight}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: auto;
      ">
        <div style="
          width: ${containerSize}px;
          height: ${containerSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          ${
            isSelected
              ? `
            <div style="
              position: absolute;
              width: ${containerSize}px;
              height: ${containerSize}px;
              background-color: ${color}33;
              border: 2px solid ${color};
              border-radius: 50%;
            "></div>
          `
              : ''
          }
          <div style="
            width: ${size}px;
            height: ${size}px;
            color: ${color};
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.6));
          ">
            ${playerIconSvg}
          </div>
        </div>
        ${
          showName && name
            ? `
          <div style="
            background-color: rgba(55, 65, 81, 0.9);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 8px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
          ">
            ${name}
          </div>
        `
            : ''
        }
      </div>
    `,
    iconSize: [containerSize, totalHeight],
    iconAnchor: [containerSize / 2, containerSize / 2],
  });
};

function PlayerVehicleLayerInner({
  players,
  enabled,
  onPlayerClick,
  onPositionsUpdate,
  selectedName,
  showNames = true,
}: PlayerVehicleLayerProps) {
  // Sort players by name to get consistent color assignment
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  // Create color map based on sorted position
  const playerColors = useMemo(() => {
    const colors = new Map<string, string>();
    sortedPlayers.forEach((player, index) => {
      colors.set(player.name, PLAYER_COLORS[index % PLAYER_COLORS.length]);
    });
    return colors;
  }, [sortedPlayers]);

  const animatedPositions = useVehicleAnimation(players, enabled);

  // Pass animated positions to parent
  useEffect(() => {
    if (onPositionsUpdate) {
      onPositionsUpdate(animatedPositions);
    }
  }, [animatedPositions, onPositionsUpdate]);

  return (
    <>
      {players.map((player, index) => {
        const animatedPos = animatedPositions.get(player.name);
        if (!animatedPos) return null;

        const mapPosition = ConvertToMapCoords2(animatedPos.x, animatedPos.y);
        const isSelected = selectedName === player.name;
        const color = playerColors.get(player.name) || PLAYER_COLORS[0];
        const icon = createPlayerIcon(color, isSelected, showNames, player.name);

        return (
          <Marker
            key={`player-${index}-${player.name}`}
            position={mapPosition}
            icon={icon}
            interactive={true}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                onPlayerClick?.(player);
              },
              mouseover: (e) => {
                e.originalEvent.stopPropagation();
              },
              mouseout: (e) => {
                e.originalEvent.stopPropagation();
              },
            }}
          />
        );
      })}
    </>
  );
}

export const PlayerVehicleLayer = memo(PlayerVehicleLayerInner);
