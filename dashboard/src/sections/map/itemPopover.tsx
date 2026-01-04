import { Box, IconButton, Paper, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Belt, Cable, Pipe, PipeJunction, SplitterMerger, TrainRail } from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';

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
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Belt
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.name || 'Conveyor Belt'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Length: {formatLength(item.data.length)}
              </Typography>
              {item.data.itemsPerMinute > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Rate: {formatItemsPerMin(item.data.itemsPerMinute)}
                </Typography>
              )}
            </Box>
          </>
        );

      case 'pipe':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Pipe
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.name || 'Pipeline'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Length: {formatLength(item.data.length)}
              </Typography>
              {item.data.itemsPerMinute > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Flow: {formatItemsPerMin(item.data.itemsPerMinute)}
                </Typography>
              )}
            </Box>
          </>
        );

      case 'pipeJunction':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Pipe Junction
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.name || 'Pipeline Junction'}
            </Typography>
          </>
        );

      case 'splitterMerger':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              {item.data.type.toLowerCase().includes('merger') ? 'Merger' : 'Splitter'}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.type}
            </Typography>
          </>
        );

      case 'cable':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Power Cable
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.name || 'Power Line'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Length: {formatLength(item.data.length)}
            </Typography>
          </>
        );

      case 'trainRail':
        return (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Train Rail
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {item.data.type || 'Railway'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Length: {formatLength(item.data.length)}
            </Typography>
          </>
        );
    }
  };

  return (
    <Paper
      ref={popoverRef}
      elevation={8}
      sx={{
        position: 'absolute',
        right: 16,
        zIndex: 1500,
        p: 2,
        pr: 4.5,
        minWidth: 140,
        maxWidth: 220,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        pointerEvents: 'auto',
      }}
    >
      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
        }}
      >
        <Iconify icon="mdi:close" width={18} />
      </IconButton>
      {renderContent()}
    </Paper>
  );
}
