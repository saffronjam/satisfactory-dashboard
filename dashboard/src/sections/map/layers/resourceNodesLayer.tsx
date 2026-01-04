import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';
import { RadarTower, ResourceNode } from 'src/apiTypes';
import { ConvertToMapCoords2 } from '../bounds';
import { createResourceNodeIcon, isNodeVisibleByRadar } from '../utils/resourceNodeUtils';
import { ResourceNodeFilter, ResourceSubLayer } from '../view/map-view';

type ResourceNodeHoverEvent = {
  node: ResourceNode | null;
  position: { x: number; y: number } | null;
};

type ResourceNodesLayerProps = {
  resourceNodes: ResourceNode[];
  radarTowers: RadarTower[];
  resourceSubLayers: Set<ResourceSubLayer>;
  filter: ResourceNodeFilter;
  enabled: boolean;
  onNodeHover?: (event: ResourceNodeHoverEvent) => void;
};

function ResourceNodesLayerInner({
  resourceNodes,
  radarTowers,
  resourceSubLayers,
  filter,
  enabled,
  onNodeHover,
}: ResourceNodesLayerProps) {
  // Filter resource nodes based on filter settings
  const filteredNodes = useMemo(() => {
    if (!resourceSubLayers.has('nodes')) {
      return [];
    }

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
        const isVisible = isNodeVisibleByRadar(node, radarTowers);
        if (filter.radarVisibilityFilter === 'visible' && !isVisible) {
          return false;
        }
        if (filter.radarVisibilityFilter === 'notVisible' && isVisible) {
          return false;
        }
      }

      return true;
    });
  }, [resourceNodes, radarTowers, resourceSubLayers, filter]);

  if (!enabled || !resourceSubLayers.has('nodes')) {
    return null;
  }

  return (
    <>
      {filteredNodes.map((node) => {
        const nodeCenter = ConvertToMapCoords2(node.x, node.y);
        const icon = createResourceNodeIcon(node, node.id);

        return (
          <Marker
            key={`resource-node-${node.id}`}
            position={nodeCenter}
            icon={icon}
            eventHandlers={{
              mouseover: (e) => {
                e.originalEvent.stopPropagation();
                onNodeHover?.({
                  node,
                  position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
                });
              },
              mouseout: () => {
                onNodeHover?.({ node: null, position: null });
              },
              add: (e) => {
                const element = e.target.getElement();
                if (element) {
                  element.addEventListener('mouseleave', () => {
                    onNodeHover?.({ node: null, position: null });
                  });
                }
              },
            }}
          />
        );
      })}
    </>
  );
}

export const ResourceNodesLayer = memo(ResourceNodesLayerInner);
