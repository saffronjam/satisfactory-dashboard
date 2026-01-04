// Building color mode options for the map
export type BuildingColorMode = 'type' | 'status' | 'grid';

// Color result type
export interface GridColor {
  stroke: string;
  fill: string;
}

// Default color for entities without a circuit group (undefined circuitGroupId)
const UNCONNECTED_COLOR: GridColor = {
  stroke: '#4b5563',
  fill: '#6b7280',
};

/**
 * Generate a consistent color for a circuit group ID.
 * Uses the golden ratio (137.508°) to distribute hues evenly across the color wheel.
 * Entities with undefined circuitGroupId get a gray "unconnected" color.
 */
export function getGridColor(circuitGroupId: number | undefined): GridColor {
  if (circuitGroupId === undefined) {
    return UNCONNECTED_COLOR;
  }

  // Use golden ratio for visually distinct color distribution
  const hue = (circuitGroupId * 137.508) % 360;

  return {
    stroke: `hsl(${hue}, 70%, 40%)`,
    fill: `hsl(${hue}, 70%, 50%)`,
  };
}

/**
 * Get just the fill color as a hex-like string for use in SVG icons.
 * For vehicle icons that need a single color value.
 */
export function getGridFillColor(circuitGroupId: number | undefined): string {
  if (circuitGroupId === undefined) {
    return '#6b7280'; // Gray
  }
  const hue = (circuitGroupId * 137.508) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
