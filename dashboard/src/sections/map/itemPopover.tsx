import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Belt, Cable, Pipe, PipeJunction, SplitterMerger, TrainRail } from 'src/apiTypes';
import { Button } from '@/components/ui/button';

// Clicked infrastructure item types (stations now use hover tooltips)
export type ClickedItem =
  | { type: 'belt'; data: Belt }
  | { type: 'pipe'; data: Pipe }
  | { type: 'pipeJunction'; data: PipeJunction }
  | { type: 'splitterMerger'; data: SplitterMerger }
  | { type: 'cable'; data: Cable }
  | { type: 'trainRail'; data: TrainRail };

interface ItemPopoverProps {
  item: ClickedItem | null;
  onClose: () => void;
}

// Format length for display
const formatLength = (length: number): string => {
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}km`;
  }
  return `${Math.round(length)}m`;
};

// Format items per minute
const formatItemsPerMin = (rate: number): string => {
  return `${rate.toFixed(1)}/min`;
};

export function ItemPopover({ item, onClose }: ItemPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!item) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate close from the click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [item, onClose]);

  if (!item) return null;

  // Render content based on item type
  const renderContent = () => {
    switch (item.type) {
      case 'belt':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">Belt</span>
            <span className="text-sm font-medium block">{item.data.name || 'Conveyor Belt'}</span>
            <div className="flex gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                Length: {formatLength(item.data.length)}
              </span>
              {item.data.itemsPerMinute > 0 && (
                <span className="text-xs text-muted-foreground">
                  Rate: {formatItemsPerMin(item.data.itemsPerMinute)}
                </span>
              )}
            </div>
          </>
        );

      case 'pipe':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">Pipe</span>
            <span className="text-sm font-medium block">{item.data.name || 'Pipeline'}</span>
            <div className="flex gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                Length: {formatLength(item.data.length)}
              </span>
              {item.data.itemsPerMinute > 0 && (
                <span className="text-xs text-muted-foreground">
                  Flow: {formatItemsPerMin(item.data.itemsPerMinute)}
                </span>
              )}
            </div>
          </>
        );

      case 'pipeJunction':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">Pipe Junction</span>
            <span className="text-sm font-medium block">
              {item.data.name || 'Pipeline Junction'}
            </span>
          </>
        );

      case 'splitterMerger':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">
              {item.data.type.toLowerCase().includes('merger') ? 'Merger' : 'Splitter'}
            </span>
            <span className="text-sm font-medium block">{item.data.type}</span>
          </>
        );

      case 'cable':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">Power Cable</span>
            <span className="text-sm font-medium block">{item.data.name || 'Power Line'}</span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Length: {formatLength(item.data.length)}
            </span>
          </>
        );

      case 'trainRail':
        return (
          <>
            <span className="text-xs text-muted-foreground mb-0.5 block">Train Rail</span>
            <span className="text-sm font-medium block">{item.data.type || 'Railway'}</span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Length: {formatLength(item.data.length)}
            </span>
          </>
        );
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-4 z-[1500] p-2 pr-9 min-w-[140px] max-w-[220px] bg-card rounded shadow-lg pointer-events-auto border border-border"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
      {renderContent()}
    </div>
  );
}
