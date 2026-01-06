import L from 'leaflet';
import { memo, useMemo, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { ResourceNode } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import {
  getResourceNodeIcon,
  isNodeVisibleByRadarOptimized,
  TowerVisibilityData,
} from '../utils/resourceNodeUtils';
import { ResourceNodeFilter } from '../view/map-view';

type ResourceNodeHoverEvent = {
  node: ResourceNode | null;
  position: { x: number; y: number } | null;
};

type ResourceNodesLayerProps = {
  resourceNodes: ResourceNode[];
  towerVisibilityData: TowerVisibilityData[];
  filter: ResourceNodeFilter;
  enabled: boolean;
  onNodeHover?: (event: ResourceNodeHoverEvent) => void;
};

// Inner component that uses map hooks
function ResourceNodesLayerContent({
  filteredNodes,
  onNodeHover,
}: {
  filteredNodes: ResourceNode[];
  onNodeHover?: (event: ResourceNodeHoverEvent) => void;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(() => map.getBounds());

  // Track map bounds for viewport culling
  useMapEvents({
    moveend: () => setBounds(map.getBounds()),
    zoomend: () => setBounds(map.getBounds()),
  });

  // Cache event handlers per node ID to prevent re-binding on every render
  const eventHandlersMap = useMemo(() => {
    const handlerMap = new Map<string, L.LeafletEventHandlerFnMap>();
    for (const node of filteredNodes) {
      handlerMap.set(node.id, {
        mouseover: (e: L.LeafletMouseEvent) => {
          e.originalEvent.stopPropagation();
          onNodeHover?.({
            node,
            position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
          });
        },
        mouseout: () => {
          onNodeHover?.({ node: null, position: null });
        },
      });
    }
    return handlerMap;
  }, [filteredNodes, onNodeHover]);

  // Filter to only visible nodes in viewport (with buffer)
  const visibleNodes = useMemo(() => {
    if (!bounds) return filteredNodes;
    const paddedBounds = bounds.pad(0.1); // 10% buffer around viewport
    return filteredNodes.filter((node) => {
      const pos = ConvertToMapCoords2(node.x, node.y);
      return paddedBounds.contains(pos);
    });
  }, [filteredNodes, bounds]);

  return (
    <>
      {visibleNodes.map((node) => {
        const nodeCenter = ConvertToMapCoords2(node.x, node.y);
        const icon = getResourceNodeIcon(node);

        return (
          <Marker
            key={`resource-node-${node.id}`}
            position={nodeCenter}
            icon={icon}
            eventHandlers={eventHandlersMap.get(node.id)}
          />
        );
      })}
    </>
  );
}

function ResourceNodesLayerInner({
  resourceNodes,
  towerVisibilityData,
  filter,
  enabled,
  onNodeHover,
}: ResourceNodesLayerProps) {
  // Filter resource nodes based on filter settings
  const filteredNodes = useMemo(() => {
    return resourceNodes.filter((node) => {
      // Check cell-based filter (resource type + purity combination)
      const cellKey = `${node.resourceType}:${node.purity}`;
      if (!filter.enabledCells.has(cellKey)) {
        return false;
      }

      // Check exploitation filter
      if (filter.exploitedFilter === 'exploited' && !node.exploited) {
        return false;
      }
      if (filter.exploitedFilter === 'notExploited' && node.exploited) {
        return false;
      }

      // Check radar visibility filter
      if (filter.radarVisibilityFilter !== 'all') {
        const isVisible = isNodeVisibleByRadarOptimized(node, towerVisibilityData);
        if (filter.radarVisibilityFilter === 'visible' && !isVisible) {
          return false;
        }
        if (filter.radarVisibilityFilter === 'notVisible' && isVisible) {
          return false;
        }
      }

      return true;
    });
  }, [resourceNodes, towerVisibilityData, filter]);

  if (!enabled) {
    return null;
  }

  return <ResourceNodesLayerContent filteredNodes={filteredNodes} onNodeHover={onNodeHover} />;
}

export const ResourceNodesLayer = memo(ResourceNodesLayerInner);
