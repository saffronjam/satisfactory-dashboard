import { Rectangle } from 'react-leaflet';
import { Selection } from 'src/types';

/**
 * Props for the SelectionHighlight component.
 */
interface SelectionHighlightProps {
  /** The current selection containing entities to highlight */
  selection: Selection;
  /** Whether the "Show Selection" setting is enabled in map settings */
  showSelection: boolean;
  /** Whether the Selection tab is currently active in the sidebar */
  isSelectionTabActive: boolean;
}

/** Default highlight color for selection rectangle */
const HIGHLIGHT_COLOR = '#3b82f6';

/**
 * Renders the selection rectangle on the map.
 * Shows the original selection box that was dragged to create the selection.
 * Only renders when both conditions are met:
 * 1. The "Show Selection" setting is enabled in map settings
 * 2. The Selection tab is currently active in the sidebar
 */
export function SelectionHighlight({
  selection,
  showSelection,
  isSelectionTabActive,
}: SelectionHighlightProps) {
  // Visibility requires both: showSelection setting enabled AND Selection tab active
  if (!showSelection || !isSelectionTabActive) {
    return null;
  }

  // If no bounds are stored, we can't render the selection rectangle
  if (!selection.bounds) {
    return null;
  }

  const { start, end } = selection.bounds;

  return (
    <Rectangle
      bounds={[
        [start.lat, start.lng],
        [end.lat, end.lng],
      ]}
      pathOptions={{
        color: HIGHLIGHT_COLOR,
        fillColor: HIGHLIGHT_COLOR,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  );
}
