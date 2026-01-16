import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MapSidebarProps {
  open: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export const MapSidebar = ({ open, isMobile = false, onClose, children }: MapSidebarProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // Trigger opening animation when open changes to true
  useEffect(() => {
    if (open && !isMobile) {
      setIsOpening(true);
      // Remove opening state after animation completes
      const timer = setTimeout(() => setIsOpening(false), 50);
      return () => clearTimeout(timer);
    }
  }, [open, isMobile]);

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

  if (!open && !isClosing) {
    return null;
  }

  const defaultHeight = 33;
  const expandedHeight = 75;

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

  const getTransformStyle = () => {
    if (!isMobile) {
      if (isClosing) return 'translateX(20px)';
      if (isOpening) return 'translateX(20px)';
      return 'translateX(0)';
    }
    if (isClosing) return 'translateY(100%)';
    if (!isExpanded && dragOffset > 0) return `translateY(${dragOffset}px)`;
    return undefined;
  };

  const getTransitionStyle = () => {
    if (!isMobile) {
      if (isClosing) return 'transform 0.2s ease-in, opacity 0.2s ease-in';
      return 'transform 0.2s ease-out, opacity 0.2s ease-out';
    }
    if (isClosing) return 'transform 0.25s ease-in';
    if (dragOffset !== 0) return 'none';
    return 'height 0.25s ease-out, transform 0.25s ease-out';
  };

  return (
    <div
      className={cn(
        'bg-card/95 backdrop-blur-md z-[1000] shadow-[0_0_15px_rgba(0,0,0,0.8)] overflow-auto pointer-events-auto',
        isMobile
          ? 'fixed left-0 right-0 bottom-0 rounded-t-2xl'
          : 'absolute top-[60px] right-4 bottom-4 w-[300px] rounded-[10px]'
      )}
      style={{
        height: isMobile ? `${visualHeight}vh` : undefined,
        transform: getTransformStyle(),
        transition: getTransitionStyle(),
        opacity: !isMobile && (isOpening || isClosing) ? 0 : 1,
      }}
    >
      {isMobile && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="sticky top-0 flex justify-center items-center h-9 cursor-grab touch-none bg-card/95 backdrop-blur-md z-[1] rounded-t-2xl"
        >
          <div className="w-10 h-1 bg-gray-500 rounded-full" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            className="absolute right-2 h-6 w-6 text-gray-500 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!isMobile && open && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClose}
          className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
      <div className={cn('p-4', isMobile && 'pt-2')}>{children}</div>
    </div>
  );
};
