import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Iconify } from 'src/components/iconify';
import { CONFIG } from 'src/config-global';
import { nodesApi } from 'src/services/nodes';
import type { NodesResponse, NodeInfo, SessionLease } from '../../../apiTypes';

const POLL_INTERVAL = 5000; // 5 seconds

export function DebugNodesView() {
  const [nodesData, setNodesData] = useState<NodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatTimestamp = (timestamp: Date | string) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    // Check if it's a zero time value
    if (date.getFullYear() <= 1) return 'N/A';
    return date.toLocaleString();
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

      <Container maxWidth="xl">
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

        {nodesData?.liveNodes?.map((node: NodeInfo) => (
          <Card key={node.instanceId} sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Iconify
                  icon={node.isThisInstance ? 'mdi:server' : 'mdi:server-outline'}
                  width={32}
                  color={node.isThisInstance ? 'primary.main' : 'text.secondary'}
                />
                <Box flexGrow={1}>
                  <Typography variant="h6">
                    {node.instanceId}
                    {node.isThisInstance && (
                      <Chip label="This Instance" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {node.ownedSessions.length} session{node.ownedSessions.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

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
                          <Box flexGrow={1}>
                            <Typography variant="subtitle2">{lease.sessionName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {lease.sessionId}
                            </Typography>
                          </Box>

                          <Chip
                            label={lease.state}
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

                        <Stack spacing={0.5} mt={1}>
                          {lease.acquiredAt && (
                            <Typography variant="caption" color="text.secondary">
                              Acquired: {formatTimestamp(lease.acquiredAt)}
                            </Typography>
                          )}
                          {lease.lastRenewedAt && (
                            <Typography variant="caption" color="text.secondary">
                              Last Renewed: {formatTimestamp(lease.lastRenewedAt)}
                            </Typography>
                          )}
                          {lease.uncertainSince &&
                            formatTimestamp(lease.uncertainSince) !== 'N/A' && (
                              <Typography variant="caption" color="warning.main">
                                Uncertain Since: {formatTimestamp(lease.uncertainSince)}
                              </Typography>
                            )}
                          <Typography variant="caption" color="text.secondary">
                            Preferred Owner: {lease.preferredOwnerId || 'Unknown'}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Last updated: {nodesData?.timestamp ? formatTimestamp(nodesData.timestamp) : 'N/A'}
        </Typography>
      </Container>
    </>
  );
}
