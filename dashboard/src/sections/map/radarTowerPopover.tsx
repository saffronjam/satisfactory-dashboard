import { Box, Chip, IconButton, Paper, Typography } from '@mui/material';
import { memo, useEffect, useRef } from 'react';
import {
  RadarTower,
  ResourceNodePurityImpure,
  ResourceNodePurityNormal,
  ResourceNodePurityPure,
  ScannedFauna,
  ScannedFlora,
  ScannedResourceNode,
  ScannedSignal,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, LengthUnits } from '../../utils/format-number';

// Purity colors
const PURITY_COLORS = {
  [ResourceNodePurityImpure]: '#EF4444', // Red
  [ResourceNodePurityNormal]: '#EAB308', // Yellow
  [ResourceNodePurityPure]: '#22C55E', // Green
  default: '#6B7280', // Gray
};

// Get purity label
const getPurityLabel = (purity: string): string => {
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

interface RadarTowerPopoverProps {
  tower: RadarTower | null;
  position: { x: number; y: number } | null;
  isPinned?: boolean;
  onClose?: () => void;
}

// Fauna/Flora/Signal section
function ScannedSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: (ScannedFauna | ScannedFlora | ScannedSignal)[];
  icon: string;
}) {
  if (!items || items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Iconify icon={icon} width={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {title}: {totalCount}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {items.map((item, idx) => (
          <Chip
            key={idx}
            label={`${item.amount}x ${item.name}`}
            size="small"
            icon={
              <Box
                component="img"
                src={`assets/images/satisfactory/64x64/${item.name}.png`}
                alt={item.name}
                sx={{ width: 16, height: 16, objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            }
            sx={{
              height: 20,
              fontSize: '0.6rem',
              '& .MuiChip-label': { px: 1 },
              '& .MuiChip-icon': { ml: 0.5, mr: -0.5 },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function RadarTowerPopoverInner({
  tower,
  position,
  isPinned = false,
  onClose,
}: RadarTowerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-outside detection
  useEffect(() => {
    if (!isPinned || !onClose) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 100ms delay prevents the click that pins from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned, onClose]);

  if (!tower || !position) return null;

  const hasNodes = tower.nodes && tower.nodes.length > 0;
  const hasFauna = tower.fauna && tower.fauna.length > 0;
  const hasFlora = tower.flora && tower.flora.length > 0;
  const hasSignals = tower.signal && tower.signal.length > 0;

  // Group nodes by purity
  const nodesByPurity = tower.nodes?.reduce(
    (acc, node) => {
      const purity = node.purity || 'unknown';
      if (!acc[purity]) acc[purity] = [];
      acc[purity].push(node);
      return acc;
    },
    {} as Record<string, ScannedResourceNode[]>
  );

  return (
    <Paper
      ref={popoverRef}
      elevation={isPinned ? 12 : 8}
      sx={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y + 10,
        zIndex: isPinned ? 1650 : 1500,
        p: 1.5,
        pr: isPinned ? 4 : 1.5,
        minWidth: 200,
        maxWidth: 300,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        pointerEvents: isPinned ? 'auto' : 'none',
        border: isPinned ? '2px solid' : undefined,
        borderColor: isPinned ? 'primary.main' : undefined,
      }}
    >
      {/* Close button */}
      {isPinned && onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          <Iconify icon="mdi:close" width={16} />
        </IconButton>
      )}
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Iconify icon="mdi:radar" width={18} sx={{ color: '#3B82F6' }} />
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {tower.name}
          </Typography>
        </Box>
      </Box>

      {/* Reveal radius */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Reveal Radius: {fShortenNumber(tower.revealRadius, LengthUnits)}
      </Typography>

      {/* Resource Nodes */}
      {hasNodes && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Iconify icon={'tabler:pick'} width={14} sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Resource Nodes: {tower.nodes.length}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(nodesByPurity || {}).map(([purity, nodes]) => {
              const exploitedCount = nodes.filter((n) => n.exploited).length;
              const totalCount = nodes.length;
              const purityColor =
                PURITY_COLORS[purity as keyof typeof PURITY_COLORS] || PURITY_COLORS.default;
              const purityLabel = getPurityLabel(purity);

              return (
                <Chip
                  key={purity}
                  label={`${exploitedCount} of ${totalCount} ${purityLabel}`}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.65rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid',
                    borderColor: purityColor,
                    color: 'text.primary',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Fauna */}
      <ScannedSection title="Fauna" items={tower.fauna || []} icon="mdi:paw" />

      {/* Flora */}
      <ScannedSection title="Flora" items={tower.flora || []} icon="mdi:flower" />

      {/* Signals */}
      <ScannedSection title="Signals" items={tower.signal || []} icon="mdi:signal-variant" />

      {/* Empty state */}
      {!hasNodes && !hasFauna && !hasFlora && !hasSignals && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No items scanned
        </Typography>
      )}
    </Paper>
  );
}

export const RadarTowerPopover = memo(RadarTowerPopoverInner);
