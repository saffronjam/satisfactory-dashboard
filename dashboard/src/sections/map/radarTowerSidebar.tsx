import { Box, Chip, Typography } from '@mui/material';
import { memo } from 'react';
import {
  RadarTower,
  ResourceNode,
  ScannedFauna,
  ScannedFlora,
  ScannedSignal,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { fShortenNumber, LengthUnits } from '../../utils/format-number';
import { MapSidebar } from './mapSidebar';
import { getPurityLabel, PURITY_COLORS } from './utils/radarTowerUtils';

// Scanned section component for fauna, flora, and signals
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
            onDelete={() => {}}
            deleteIcon={
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
              '& .MuiChip-deleteIcon': {
                cursor: 'default',
                pointerEvents: 'none',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

interface RadarTowerSidebarProps {
  tower: RadarTower | null;
  isMobile?: boolean;
  onClose?: () => void;
}

function RadarTowerSidebarContent({ tower }: { tower: RadarTower }) {
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
    {} as Record<string, ResourceNode[]>
  );

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Iconify icon="mdi:radar" width={18} sx={{ color: '#3B82F6' }} />
        <Box>
          <Typography variant="body2" fontWeight="medium">
            Radar Tower
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
                <Box
                  key={purity}
                  sx={{
                    height: 'auto',
                    px: 1,
                    py: 0.5,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid',
                    borderColor: purityColor,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.primary', lineHeight: 1.2 }}>
                    {totalCount}x {purityLabel}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.2 }}>
                    {exploitedCount} exploited
                  </Typography>
                </Box>
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
    </>
  );
}

function RadarTowerSidebarInner({ tower, isMobile = false, onClose }: RadarTowerSidebarProps) {
  return (
    <MapSidebar open={Boolean(tower)} isMobile={isMobile} onClose={onClose}>
      {tower && <RadarTowerSidebarContent tower={tower} />}
    </MapSidebar>
  );
}

export const RadarTowerSidebar = memo(RadarTowerSidebarInner);
