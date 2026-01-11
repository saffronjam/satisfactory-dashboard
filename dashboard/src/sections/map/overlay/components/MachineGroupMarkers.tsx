import { Marker } from 'react-leaflet';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { ConvertToMapCoords2 } from '../../bounds';
import { createUnifiedGroupIcon } from '../utils/groupIconCreation';

interface MachineGroupMarkersProps {
  machineGroups: MachineGroup[];
  selectedItems: SelectedMapItem[];
  onSelectItem: (item: SelectedMapItem | null) => void;
}

export function MachineGroupMarkers({
  machineGroups,
  selectedItems,
  onSelectItem,
}: MachineGroupMarkersProps) {
  return (
    <>
      {machineGroups.map((group, index) => {
        const position = ConvertToMapCoords2(group.center.x, group.center.y);
        const isSelected = selectedItems.some(
          (item) => item.type === 'machineGroup' && item.data.hash === group.hash
        );
        const icon = createUnifiedGroupIcon(group, isSelected);

        return (
          <Marker
            key={`group-${index}`}
            position={position}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                // Toggle selection - deselect if already selected
                if (isSelected) {
                  onSelectItem(null);
                } else {
                  onSelectItem({ type: 'machineGroup', data: group });
                }
              },
            }}
            icon={icon}
          />
        );
      })}
    </>
  );
}
