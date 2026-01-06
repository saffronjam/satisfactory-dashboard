import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Iconify } from 'src/components/iconify';
import { CONFIG } from 'src/config-global';
import { ApiContext } from 'src/contexts/api/useApi';
import { useSession } from 'src/contexts/sessions';
import { useContextSelector } from 'use-context-selector';

const ARRAY_PAGE_SIZE = 100;

// ----------------------------------------------------------------------

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ChangedPaths = Set<string>;

// Recursive JSON tree node component
function JsonNode({
  name,
  value,
  path,
  changedPaths,
  defaultExpanded = false,
}: {
  name: string;
  value: JsonValue;
  path: string;
  changedPaths: ChangedPaths;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [visibleCount, setVisibleCount] = useState(ARRAY_PAGE_SIZE);
  const isChanged = changedPaths.has(path);

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const renderValue = () => {
    if (value === null) return <span style={{ color: '#808080' }}>null</span>;
    if (typeof value === 'boolean')
      return <span style={{ color: '#569cd6' }}>{value ? 'true' : 'false'}</span>;
    if (typeof value === 'number') return <span style={{ color: '#b5cea8' }}>{value}</span>;
    if (typeof value === 'string') return <span style={{ color: '#ce9178' }}>"{value}"</span>;
    return null;
  };

  const getPreview = () => {
    if (isArray) return `Array(${value.length})`;
    if (isObject) {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      if (keys.length <= 3) return `{ ${keys.join(', ')} }`;
      return `{ ${keys.slice(0, 3).join(', ')}, ... }`;
    }
    return '';
  };

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleCount((prev) => prev + ARRAY_PAGE_SIZE);
  };

  const arrayValue = isArray ? (value as JsonValue[]) : [];
  const hasMoreItems = isArray && arrayValue.length > visibleCount;
  const remainingItems = isArray ? arrayValue.length - visibleCount : 0;

  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.25,
          px: 0.5,
          borderRadius: 0.5,
          cursor: isExpandable ? 'pointer' : 'default',
          transition: 'background-color 0.3s ease',
          bgcolor: isChanged ? 'warning.dark' : 'transparent',
          '&:hover': {
            bgcolor: isExpandable ? 'action.hover' : isChanged ? 'warning.dark' : 'transparent',
          },
        }}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        {isExpandable && (
          <Iconify
            icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
            width={16}
            sx={{ mr: 0.5, color: 'text.secondary' }}
          />
        )}
        {!isExpandable && <Box sx={{ width: 20 }} />}
        <Typography
          component="span"
          sx={{ color: 'primary.main', fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          {name}
        </Typography>
        <Typography
          component="span"
          sx={{ color: 'text.secondary', mx: 0.5, fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          :
        </Typography>
        {isExpandable ? (
          <Typography
            component="span"
            sx={{ color: 'text.disabled', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {getPreview()}
          </Typography>
        ) : (
          renderValue()
        )}
      </Box>

      {isExpandable && expanded && (
        <Box sx={{ pl: 2, borderLeft: '1px solid', borderColor: 'divider', ml: 1 }}>
          {isArray
            ? arrayValue
                .slice(0, visibleCount)
                .map((item, index) => (
                  <JsonNode
                    key={index}
                    name={`[${index}]`}
                    value={item}
                    path={`${path}[${index}]`}
                    changedPaths={changedPaths}
                  />
                ))
            : Object.entries(value as Record<string, JsonValue>).map(([key, val]) => (
                <JsonNode
                  key={key}
                  name={key}
                  value={val}
                  path={`${path}.${key}`}
                  changedPaths={changedPaths}
                />
              ))}
          {hasMoreItems && (
            <Button
              size="small"
              onClick={handleShowMore}
              sx={{
                mt: 0.5,
                py: 0.25,
                px: 1,
                fontSize: '0.75rem',
                textTransform: 'none',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              startIcon={<Iconify icon="mdi:plus" width={14} />}
            >
              Show {Math.min(ARRAY_PAGE_SIZE, remainingItems)} more ({remainingItems} remaining)
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

// Root data tree component
function DataRoot({
  name,
  data,
  prevData,
  paused,
}: {
  name: string;
  data: JsonValue;
  prevData: JsonValue | undefined;
  paused: boolean;
}) {
  const [changedPaths, setChangedPaths] = useState<ChangedPaths>(new Set());
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find changed paths between prev and current data
  const findChangedPaths = useCallback(
    (
      prev: JsonValue | undefined,
      curr: JsonValue,
      path: string,
      changes: Set<string>
    ): Set<string> => {
      if (prev === undefined) return changes;

      if (typeof prev !== typeof curr) {
        changes.add(path);
        return changes;
      }

      if (prev === null || curr === null) {
        if (prev !== curr) changes.add(path);
        return changes;
      }

      if (typeof curr !== 'object') {
        if (prev !== curr) changes.add(path);
        return changes;
      }

      if (Array.isArray(curr)) {
        const prevArr = prev as JsonValue[];
        if (prevArr.length !== curr.length) {
          changes.add(path);
        }
        curr.forEach((item, idx) => {
          findChangedPaths(prevArr[idx], item, `${path}[${idx}]`, changes);
        });
        return changes;
      }

      const prevObj = prev as Record<string, JsonValue>;
      const currObj = curr as Record<string, JsonValue>;
      const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);

      allKeys.forEach((key) => {
        if (!(key in prevObj) || !(key in currObj)) {
          changes.add(`${path}.${key}`);
        } else {
          findChangedPaths(prevObj[key], currObj[key], `${path}.${key}`, changes);
        }
      });

      return changes;
    },
    []
  );

  // Detect changes and set timeout to clear all highlights at once
  useEffect(() => {
    if (paused) return;

    const newChanges = findChangedPaths(prevData, data, name, new Set());

    if (newChanges.size > 0) {
      setChangedPaths((prev) => {
        const combined = new Set(prev);
        newChanges.forEach((p) => combined.add(p));
        return combined;
      });

      // Clear existing timeout and set new one to clear all changes after 1 second
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }

      clearTimeoutRef.current = setTimeout(() => {
        setChangedPaths(new Set());
        clearTimeoutRef.current = null;
      }, 1000);
    }

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [data, prevData, paused, name, findChangedPaths]);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Iconify icon="mdi:database" width={20} sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            {name}
          </Typography>
          {changedPaths.size > 0 && (
            <Chip
              label={`${changedPaths.size} changes`}
              size="small"
              color="warning"
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Box
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            // Overlay scrollbar styling - doesn't take up layout space
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: 6,
              position: 'absolute',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <JsonNode
            name={name}
            value={data}
            path={name}
            changedPaths={changedPaths}
            defaultExpanded
          />
        </Box>
      </CardContent>
    </Card>
  );
}

// Main debug view
export function DebugView() {
  const [paused, setPaused] = useState(false);
  const [pausedData, setPausedData] = useState<Record<string, JsonValue> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedSession } = useSession();

  // Get all API data
  const api = useContextSelector(ApiContext, (v) => ({
    circuits: v.circuits,
    factoryStats: v.factoryStats,
    prodStats: v.prodStats,
    sinkStats: v.sinkStats,
    players: v.players,
    generatorStats: v.generatorStats,
    machines: v.machines,
    trains: v.trains,
    trainStations: v.trainStations,
    drones: v.drones,
    droneStations: v.droneStations,
    belts: v.belts,
    pipes: v.pipes,
    pipeJunctions: v.pipeJunctions,
    trainRails: v.trainRails,
    hypertubes: v.hypertubes,
    hypertubeEntrances: v.hypertubeEntrances,
    tractors: v.tractors,
    explorers: v.explorers,
    vehiclePaths: v.vehiclePaths,
    spaceElevator: v.spaceElevator,
    radarTowers: v.radarTowers,
    resourceNodes: v.resourceNodes,
    isLoading: v.isLoading,
  }));

  // Store previous data for change detection
  const prevDataRef = useRef<Record<string, JsonValue>>({});

  // Current data sources
  const currentData = useMemo(
    () => ({
      circuits: api.circuits as unknown as JsonValue,
      factoryStats: api.factoryStats as unknown as JsonValue,
      prodStats: api.prodStats as unknown as JsonValue,
      sinkStats: api.sinkStats as unknown as JsonValue,
      players: api.players as unknown as JsonValue,
      generatorStats: api.generatorStats as unknown as JsonValue,
      machines: api.machines as unknown as JsonValue,
      trains: api.trains as unknown as JsonValue,
      trainStations: api.trainStations as unknown as JsonValue,
      drones: api.drones as unknown as JsonValue,
      droneStations: api.droneStations as unknown as JsonValue,
      belts: api.belts as unknown as JsonValue,
      pipes: api.pipes as unknown as JsonValue,
      pipeJunctions: api.pipeJunctions as unknown as JsonValue,
      trainRails: api.trainRails as unknown as JsonValue,
      hypertubes: api.hypertubes as unknown as JsonValue,
      hypertubeEntrances: api.hypertubeEntrances as unknown as JsonValue,
      tractors: api.tractors as unknown as JsonValue,
      explorers: api.explorers as unknown as JsonValue,
      vehiclePaths: api.vehiclePaths as unknown as JsonValue,
      spaceElevator: api.spaceElevator as unknown as JsonValue,
      radarTowers: api.radarTowers as unknown as JsonValue,
      resourceNodes: api.resourceNodes as unknown as JsonValue,
    }),
    [api]
  );

  // Display data (paused or current)
  const displayData = paused && pausedData ? pausedData : currentData;

  // Toggle pause
  const handlePauseToggle = useCallback(() => {
    if (!paused) {
      // Pausing - store current data
      setPausedData(currentData);
    } else {
      // Unpausing - clear stored data
      setPausedData(null);
    }
    setPaused(!paused);
  }, [paused, currentData]);

  // Update prev data ref when not paused
  useEffect(() => {
    if (!paused) {
      const timer = setTimeout(() => {
        prevDataRef.current = { ...currentData };
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentData, paused]);

  const dataRoots = [
    { name: 'circuits', icon: 'mdi:flash' },
    { name: 'factoryStats', icon: 'material-symbols:factory' },
    { name: 'prodStats', icon: 'mdi:chart-line' },
    { name: 'sinkStats', icon: 'mdi:inbox' },
    { name: 'players', icon: 'mdi:account-group' },
    { name: 'generatorStats', icon: 'mdi:lightning-bolt' },
    { name: 'machines', icon: 'mdi:factory' },
    { name: 'trains', icon: 'mdi:train' },
    { name: 'trainStations', icon: 'mdi:train-car' },
    { name: 'drones', icon: 'mdi:drone' },
    { name: 'droneStations', icon: 'mdi:drone' },
    { name: 'belts', icon: 'mdi:conveyor-belt' },
    { name: 'pipes', icon: 'mdi:pipe' },
    { name: 'pipeJunctions', icon: 'mdi:pipe-valve' },
    { name: 'trainRails', icon: 'mdi:railroad-light' },
    { name: 'hypertubes', icon: 'mdi:transit-connection-variant' },
    { name: 'hypertubeEntrances', icon: 'mdi:transit-transfer' },
    { name: 'tractors', icon: 'mdi:tractor' },
    { name: 'explorers', icon: 'mdi:car-outline' },
    { name: 'vehiclePaths', icon: 'mdi:road-variant' },
    { name: 'spaceElevator', icon: 'mdi:rocket-launch' },
    { name: 'radarTowers', icon: 'mdi:radar' },
    { name: 'resourceNodes', icon: 'tabler:pick' },
  ];

  // Filter data roots by search term
  const filteredDataRoots = useMemo(() => {
    if (!searchTerm.trim()) return dataRoots;
    const term = searchTerm.toLowerCase();
    return dataRoots.filter(({ name }) => name.toLowerCase().includes(term));
  }, [searchTerm]);

  return (
    <>
      <Helmet>
        <title> {`Debug - ${CONFIG.appName}`}</title>
      </Helmet>

      <Container maxWidth="xl">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h4">Debug Data Viewer</Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect live API data with change highlighting
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Filter boxes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="mdi:magnify" width={20} sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                        <Iconify icon="mdi:close" width={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 200 }}
            />
            <Chip
              label={selectedSession?.isOnline ? 'Online' : 'Offline'}
              color={selectedSession?.isOnline ? 'success' : 'error'}
              size="small"
            />
            <Tooltip title={paused ? 'Resume updates' : 'Pause updates'}>
              <IconButton
                onClick={handlePauseToggle}
                color={paused ? 'warning' : 'default'}
                sx={{
                  bgcolor: paused ? 'warning.dark' : 'action.hover',
                  '&:hover': { bgcolor: paused ? 'warning.main' : 'action.selected' },
                }}
              >
                <Iconify icon={paused ? 'mdi:play' : 'mdi:pause'} width={24} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {paused && (
          <Card sx={{ mb: 2, bgcolor: 'warning.dark' }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="mdi:pause-circle" width={20} />
                <Typography variant="body2">Updates paused - viewing frozen snapshot</Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          {filteredDataRoots.map(({ name }) => (
            <DataRoot
              key={name}
              name={name}
              data={displayData[name as keyof typeof displayData]}
              prevData={prevDataRef.current[name]}
              paused={paused}
            />
          ))}
        </Box>
        {filteredDataRoots.length === 0 && searchTerm && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Iconify icon="mdi:database-off" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No data sources match "{searchTerm}"</Typography>
          </Box>
        )}
      </Container>
    </>
  );
}
