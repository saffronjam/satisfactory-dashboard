import { Box, IconButton, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Iconify } from 'src/components/iconify';
import { useRef, useState } from 'react';
import { varAlpha } from 'src/theme/styles';

interface MapSidebarProps {
  open: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export const MapSidebar = ({ open, isMobile = false, onClose, children }: MapSidebarProps) => {
  const theme = useTheme();
  const [dragOffset, setDragOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Animated close function
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsExpanded(false);
      onClose?.();
    }, 250); // Match transition duration
  };

  // Touch handlers for drag-to-close/expand
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY.current;
    // Positive diff = dragging down, negative diff = dragging up
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    const threshold = 60;
    const closeThreshold = 150; // Need to drag much further to close

    if (isExpanded) {
      // From expanded state: drag down to collapse
      if (dragOffset > threshold) {
        // Dragged down - collapse to default
        setIsExpanded(false);
      }
      // Otherwise stay expanded
    } else {
      // From default state: drag up to expand, drag down far to close
      if (dragOffset < -threshold) {
        // Dragged up - expand
        setIsExpanded(true);
      } else if (dragOffset > closeThreshold) {
        // Dragged down a lot - close with animation
        handleClose();
      }
      // Otherwise stay at default
    }

    setDragOffset(0);
    dragStartY.current = null;
  };

  // On mobile, don't render if not open (but allow closing animation)
  if (isMobile && !open && !isClosing) {
    return null;
  }

  // Desktop styles
  const desktopStyles = {
    position: 'absolute',
    top: 16,
    right: 16,
    bottom: 16,
    width: 300,
    borderRadius: '10px',
  };

  // Mobile styles - bottom sheet with snap points
  const defaultHeight = 33; // vh
  const expandedHeight = 75; // vh

  // Calculate visual height during drag
  const dragHeightAdjust =
    dragOffset < 0
      ? Math.min(expandedHeight - defaultHeight, (Math.abs(dragOffset) / window.innerHeight) * 100)
      : 0;
  const visualHeight = isExpanded
    ? expandedHeight -
      (dragOffset > 0
        ? Math.min((dragOffset / window.innerHeight) * 100, expandedHeight - defaultHeight)
        : 0)
    : defaultHeight + dragHeightAdjust;

  const mobileStyles = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${visualHeight}vh`,
    borderRadius: '16px 16px 0 0',
  };

  return (
    <Box
      sx={{
        ...(isMobile ? mobileStyles : desktopStyles),
        backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.95),
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.8)',
        overflow: 'auto',
        // Apply drag offset transform when dragging down from default state (closing)
        ...(isMobile &&
          !isExpanded &&
          dragOffset > 0 &&
          !isClosing && {
            transform: `translateY(${dragOffset}px)`,
          }),
        // Closing animation - slide down off screen
        ...(isMobile &&
          isClosing && {
            transform: 'translateY(100%)',
            transition: 'transform 0.25s ease-in',
          }),
        // No transition during drag
        ...(isMobile &&
          dragOffset !== 0 &&
          !isClosing && {
            transition: 'none',
          }),
        // Smooth transition when snapping
        ...(isMobile &&
          dragOffset === 0 &&
          !isClosing && {
            transition: 'height 0.25s ease-out, transform 0.25s ease-out',
          }),
      }}
    >
      {/* Mobile drag handle area - sticky at top */}
      {isMobile && (
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          sx={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 36,
            cursor: 'grab',
            touchAction: 'none',
            backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.95),
            backdropFilter: 'blur(8px)',
            zIndex: 1,
            borderRadius: '16px 16px 0 0',
          }}
        >
          {/* Drag handle */}
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: theme.palette.grey[500],
              borderRadius: 2,
            }}
          />
          {/* Close button */}
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              padding: 0.5,
              color: theme.palette.grey[500],
              '&:hover': {
                color: theme.palette.grey[300],
              },
            }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
        </Box>
      )}
      {/* Desktop close button */}
      {!isMobile && open && (
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 0.5,
            color: theme.palette.grey[500],
            '&:hover': {
              color: theme.palette.grey[300],
              backgroundColor: alpha(theme.palette.grey[500], 0.1),
            },
          }}
        >
          <Iconify icon="mdi:close" width={20} />
        </IconButton>
      )}
      <Box sx={{ padding: 2, pt: isMobile ? 1 : 2 }}>{children}</Box>
    </Box>
  );
};
