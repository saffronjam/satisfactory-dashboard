import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Backdrop,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Slider,
  Typography,
  useTheme,
} from '@mui/material';
import { CRS } from 'leaflet';
import { useEffect, useState } from 'react';
import {
  MachineCategoryExtractor,
  MachineCategoryFactory,
  MachineCategoryGenerator,
} from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { ApiContext } from 'src/contexts/api/useApi';
import { DashboardContent } from 'src/layouts/dashboard';
import { varAlpha } from 'src/theme/styles';
import { MachineGroup, SelectedMapItem } from 'src/types';
import { useContextSelector } from 'use-context-selector';
import { MapBounds } from '../bounds';
import { FilterCategory, Overlay } from '../overlay';
import { SelectionSidebar } from '../selectionSidebar';
import { computeUnifiedGroups, zoomToGroupDistance } from '../utils';

// Predefined slider steps for grouping distance
const groupingMarks = [
  { value: 0, label: 'None' },
  { value: 100, label: '100' },
  { value: 1000, label: '1K' },
  { value: 4000, label: '4K' },
  { value: 8000, label: '8K' },
  { value: 12000, label: '12K' },
];

// Filter categories
const filterCategories: { key: FilterCategory; label: string }[] = [
  { key: 'production', label: 'Production' },
  { key: 'power', label: 'Power' },
  { key: 'resource', label: 'Resource' },
  { key: 'train', label: 'Trains' },
  { key: 'drone', label: 'Drones' },
];

export function MapView() {
  const theme = useTheme();
  const api = useContextSelector(ApiContext, (v) => {
    return {
      factoryStats: v.factoryStats,
      generatorStats: v.generatorStats,
      trainStations: v.trainStations,
      droneStations: v.droneStations,
      trains: v.trains,
      drones: v.drones,
      isLoading: v.isLoading,
      isOnline: v.isOnline,
    };
  });
  const [machineGroups, setMachineGroups] = useState<MachineGroup[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedMapItem | null>(null);
  const [zoom, setZoom] = useState(3);
  const [autoGroup, setAutoGroup] = useState(true);
  const [manualGroupDistance, setManualGroupDistance] = useState(4000);
  const [visibleCategories, setVisibleCategories] = useState<Set<FilterCategory>>(
    new Set(['production', 'power', 'resource', 'train', 'drone'])
  );
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);

  // Calculate effective group distance
  const groupDistance = autoGroup ? zoomToGroupDistance(zoom) : manualGroupDistance;

  // Toggle filter category
  const toggleCategory = (category: FilterCategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!api.isLoading && api.isOnline) {
      // Filter machines based on visible categories
      const allMachines = [
        ...(api.factoryStats?.machines || []),
        ...(api.generatorStats?.machines || []),
      ];
      const filteredMachines = allMachines.filter((m) => {
        if (m.category === MachineCategoryFactory && visibleCategories.has('production'))
          return true;
        if (m.category === MachineCategoryGenerator && visibleCategories.has('power')) return true;
        if (m.category === MachineCategoryExtractor && visibleCategories.has('resource'))
          return true;
        return false;
      });

      // Filter stations based on visible categories
      const filteredTrainStations = visibleCategories.has('train') ? api.trainStations || [] : [];
      const filteredDroneStations = visibleCategories.has('drone') ? api.droneStations || [] : [];

      // Use unified grouping for all entity types
      const groups = computeUnifiedGroups(
        filteredMachines,
        filteredTrainStations,
        filteredDroneStations,
        groupDistance
      );
      setMachineGroups(groups);

      // Update selection if it's a machine group (use functional update to avoid stale closure)
      setSelectedItem((prevSelected) => {
        if (prevSelected?.type === 'machineGroup') {
          const newActiveGroup = groups.find((g) => g.hash === prevSelected.data.hash);
          if (newActiveGroup) {
            return { type: 'machineGroup', data: newActiveGroup };
          }
          // Group no longer exists, keep the selection but with stale data
          // (better UX than clearing it unexpectedly)
          return prevSelected;
        }
        return prevSelected;
      });
    }
  }, [
    api.factoryStats,
    api.generatorStats,
    api.trainStations,
    api.droneStations,
    groupDistance,
    visibleCategories,
  ]);

  const handleSelectItem = (item: SelectedMapItem | null) => {
    setSelectedItem(item);
  };

  return (
    <DashboardContent
      maxWidth={false}
      disablePadding
      sx={{
        position: 'relative',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Backdrop
        open={api.isLoading}
        sx={{
          color: theme.palette.primary.main,
          backgroundColor: varAlpha(theme.palette.background.defaultChannel, 0.5),
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {!api.isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 'calc(var(--layout-nav-vertical-width) + 16px)',
            right: 16,
            bottom: 16,
            zIndex: 1,
          }}
        >
          {/* Map Controls Buttons */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 324, // 300px sidebar + 24px margin
              zIndex: 1000,
              display: 'flex',
              gap: 1,
            }}
          >
            {/* Help Button */}
            <IconButton
              onClick={(e) => setHelpAnchor(e.currentTarget)}
              size="small"
              sx={{
                backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.9),
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 1),
                },
              }}
            >
              <Iconify icon="mdi:help-circle-outline" />
            </IconButton>

            {/* Settings Menu Button */}
            <IconButton
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              size="small"
              sx={{
                backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.9),
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 1),
                },
              }}
            >
              <Iconify icon="mdi:menu" />
            </IconButton>
          </Box>

          {/* Help Popover */}
          <Popover
            open={Boolean(helpAnchor)}
            anchorEl={helpAnchor}
            onClose={() => setHelpAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.95),
                  backdropFilter: 'blur(8px)',
                  mt: 1,
                },
              },
            }}
          >
            <Box sx={{ p: 2, minWidth: 220 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Controls
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Ctrl"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Typography variant="body2">+ Drag</Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Multi-select items on the map
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Click"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Select a single item
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label="Scroll"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Zoom in/out
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Popover>

          {/* Settings Popover */}
          <Popover
            open={Boolean(settingsAnchor)}
            anchorEl={settingsAnchor}
            onClose={() => setSettingsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: varAlpha(theme.palette.background.paperChannel, 0.95),
                  backdropFilter: 'blur(8px)',
                  mt: 1,
                },
              },
            }}
          >
            <Box sx={{ p: 2, minWidth: 250 }}>
              {/* Filters Section */}
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Filters
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filterCategories.map((cat) => (
                  <Chip
                    key={cat.key}
                    label={cat.label}
                    onClick={() => toggleCategory(cat.key)}
                    color={visibleCategories.has(cat.key) ? 'primary' : 'default'}
                    variant={visibleCategories.has(cat.key) ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Grouping Section */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Grouping
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoGroup}
                    onChange={(e) => setAutoGroup(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Auto-group by zoom</Typography>}
              />
              <Box sx={{ px: 1, mt: 1 }}>
                <Slider
                  disabled={autoGroup}
                  value={manualGroupDistance}
                  onChange={(_, value) => setManualGroupDistance(value as number)}
                  step={null}
                  marks={groupingMarks}
                  min={0}
                  max={12000}
                  size="small"
                  valueLabelDisplay="auto"
                  sx={{
                    '& .MuiSlider-markLabel': {
                      fontSize: '0.65rem',
                    },
                  }}
                />
              </Box>
            </Box>
          </Popover>

          {/* MapContainer */}
          <MapContainer
            center={[-80, 80]}
            maxBounds={MapBounds}
            crs={CRS.Simple}
            preferCanvas={true}
            attributionControl={false}
            zoom={3}
            minZoom={3}
            maxZoom={8}
            zoomDelta={0.25}
            zoomSnap={0.25}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              backgroundColor: '#0e0e0e',
              border: '1px solid #1e1e1e',
              boxShadow: '0 0 15px rgba(0, 0, 0, 0.8)',
              zIndex: 0,
            }}
          >
            <TileLayer
              url="assets/images/satisfactory/map/1732184952/{z}/{x}/{y}.png"
              tileSize={256}
              minZoom={3}
              maxZoom={8}
              noWrap={true}
            />
            <Overlay
              machineGroups={machineGroups}
              trains={api.trains}
              drones={api.drones}
              onSelectItem={handleSelectItem}
              onZoomEnd={setZoom}
            />
          </MapContainer>

          <SelectionSidebar selectedItem={selectedItem} />
        </Box>
      )}
    </DashboardContent>
  );
}
