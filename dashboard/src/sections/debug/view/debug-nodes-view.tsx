import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CONFIG } from 'src/config-global';
import { useSession } from 'src/contexts/sessions';
import { nodesApi } from 'src/services/nodes';
import type { NodesResponse, NodeInfo, SessionLease } from '../../../apiTypes';

const POLL_INTERVAL = 5000; // 5 seconds

export function DebugNodesView() {
  const { sessions } = useSession();
  const [nodesData, setNodesData] = useState<NodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch nodes data
  const fetchNodes = async () => {
    try {
      const data = await nodesApi.getNodes();
      setNodesData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5 seconds
  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'owned':
        return 'success';
      case 'uncertain':
        return 'warning';
      case 'other':
        return 'default';
      default:
        return 'error';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success.main';
      case 'init':
        return 'warning.main';
      case 'offline':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    // Check if it's a zero time value
    if (date.getFullYear() <= 1) return 'N/A';
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp: Date | string) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (date.getFullYear() <= 1) return 'N/A';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // Less than a week - show relative
    if (diffDay < 7) {
      let relative = '';
      if (diffDay > 0) relative = `${diffDay}d ago`;
      else if (diffHour > 0) relative = `${diffHour}h ago`;
      else if (diffMin > 0) relative = `${diffMin}m ago`;
      else relative = `${diffSec}s ago`;

      return (
        <Tooltip title={date.toISOString()} placement="top">
          <span>{relative}</span>
        </Tooltip>
      );
    }

    // Older than a week - show full date with ISO tooltip
    return (
      <Tooltip title={date.toISOString()} placement="top">
        <span>{date.toLocaleString()}</span>
      </Tooltip>
    );
  };

  const toggleNode = (instanceId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  const getSessionStatus = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    return {
      isPaused: session.isPaused,
      isOnline: session.isOnline,
    };
  };

  const getSessionAddress = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return 'Unknown';
    if (session.isMock) return 'Demo';
    return session.address || 'Unknown';
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Nodes - {CONFIG.appName}</title>
      </Helmet>

      <Container maxWidth="xl" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h4">Lease Ownership Nodes</Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time view of distributed polling coordination
            </Typography>
          </Box>

          <Chip
            label={`${nodesData?.liveNodes?.length || 0} Live`}
            color="success"
            icon={<Iconify icon="mdi:server-network" width={20} />}
          />
        </Stack>

        <Scrollbar sx={{ flexGrow: 1 }}>
          {nodesData?.liveNodes?.map((node: NodeInfo) => (
            <Card key={node.instanceId} sx={{ mb: 2 }}>
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  onClick={() => toggleNode(node.instanceId)}
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <IconButton size="small" sx={{ p: 0 }}>
                    <Iconify
                      icon={
                        expandedNodes.has(node.instanceId)
                          ? 'mdi:chevron-down'
                          : 'mdi:chevron-right'
                      }
                      width={24}
                    />
                  </IconButton>
                  <Iconify icon="mdi:server" width={32} color={getStatusColor(node.status)} />
                  <Box flexGrow={1}>
                    <Typography variant="h6">{node.instanceId}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {node.ownedSessions.length} session
                        {node.ownedSessions.length !== 1 ? 's' : ''}
                      </Typography>
                      <Chip
                        label={node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                        color={
                          node.status === 'online'
                            ? 'success'
                            : node.status === 'init'
                              ? 'warning'
                              : 'default'
                        }
                        size="small"
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Collapse in={expandedNodes.has(node.instanceId)} timeout="auto">
                  <Divider sx={{ mt: 2, mb: 2 }} />

                  {node.ownedSessions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No sessions owned
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {node.ownedSessions.map((lease: SessionLease) => (
                        <Card key={lease.sessionId} variant="outlined">
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: (() => {
                                    const status = getSessionStatus(lease.sessionId);
                                    if (!status) return 'text.disabled';
                                    return status.isPaused
                                      ? 'warning.main'
                                      : status.isOnline
                                        ? 'success.main'
                                        : 'error.main';
                                  })(),
                                  flexShrink: 0,
                                }}
                              />
                              <Box flexGrow={1}>
                                <Typography variant="subtitle2">{lease.sessionName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID {lease.sessionId}
                                </Typography>
                              </Box>

                              <Chip
                                label={lease.state.charAt(0).toUpperCase() + lease.state.slice(1)}
                                color={getStateColor(lease.state)}
                                size="small"
                              />

                              {lease.ownerId !== lease.preferredOwnerId && (
                                <Chip
                                  label="Non-Preferred"
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>

                            <Box
                              sx={{
                                mt: 1,
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                columnGap: 2,
                                rowGap: 0.5,
                                alignItems: 'baseline',
                              }}
                            >
                              {/* Server Address */}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ minWidth: 'max-content' }}
                              >
                                Server
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.primary"
                                sx={{ fontWeight: 500 }}
                              >
                                {getSessionAddress(lease.sessionId)}
                              </Typography>

                              {/* Acquired At */}
                              {lease.acquiredAt && (
                                <>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ minWidth: 'max-content' }}
                                  >
                                    Acquired
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.primary"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {formatRelativeTime(lease.acquiredAt)}
                                  </Typography>
                                </>
                              )}

                              {/* Last Renewed At */}
                              {lease.lastRenewedAt && (
                                <>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ minWidth: 'max-content' }}
                                  >
                                    Last Renewed
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.primary"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {formatRelativeTime(lease.lastRenewedAt)}
                                  </Typography>
                                </>
                              )}

                              {/* Uncertain Since */}
                              {lease.uncertainSince &&
                                formatTimestamp(lease.uncertainSince) !== 'N/A' && (
                                  <>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ minWidth: 'max-content' }}
                                    >
                                      Uncertain Since
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="warning.main"
                                      sx={{ fontWeight: 500 }}
                                    >
                                      {formatRelativeTime(lease.uncertainSince)}
                                    </Typography>
                                  </>
                                )}

                              {/* Preferred Owner */}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ minWidth: 'max-content' }}
                              >
                                Preferred Owner
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.primary"
                                sx={{ fontWeight: 500 }}
                              >
                                {lease.preferredOwnerId || 'Unknown'}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Collapse>
              </CardContent>
            </Card>
          ))}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Last updated: {nodesData?.timestamp ? formatTimestamp(nodesData.timestamp) : 'N/A'}
          </Typography>
        </Scrollbar>
      </Container>
    </>
  );
}
