import {
  ResourceNodePurityImpure,
  ResourceNodePurityNormal,
  ResourceNodePurityPure,
} from 'src/apiTypes';

// Radar tower color
export const RADAR_TOWER_COLOR = '#3B82F6'; // Blue

// Purity colors
export const PURITY_COLORS = {
  [ResourceNodePurityImpure]: '#EF4444', // Red
  [ResourceNodePurityNormal]: '#EAB308', // Yellow
  [ResourceNodePurityPure]: '#22C55E', // Green
  default: '#6B7280', // Gray
};

// Get purity label
export const getPurityLabel = (purity: string): string => {
  switch (purity) {
    case ResourceNodePurityImpure:
      return 'Impure';
    case ResourceNodePurityNormal:
      return 'Normal';
    case ResourceNodePurityPure:
      return 'Pure';
    default:
      return 'Unknown';
  }
};
