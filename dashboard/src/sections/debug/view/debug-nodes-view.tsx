import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CONFIG } from 'src/config-global';
import { useSession } from 'src/contexts/sessions';
import { nodesApi } from 'src/services/nodes';
import type { NodesResponse, NodeInfo, SessionLease } from '../../../apiTypes';

const POLL_INTERVAL = 5000;

/**
 * Displays debug information about lease ownership nodes in the distributed polling system.
 */
export function DebugNodesView() {
  const { sessions } = useSession();
  const [nodesData, setNodesData] = useState<NodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const getStateVariant = (state: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (state) {
      case 'owned':
        return 'default';
      case 'uncertain':
        return 'secondary';
      case 'other':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'init':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
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

    let relative = '';
    if (diffDay > 0) relative = `${diffDay}d ago`;
    else if (diffHour > 0) relative = `${diffHour}h ago`;
    else if (diffMin > 0) relative = `${diffMin}m ago`;
    else relative = `${diffSec}s ago`;

    if (diffDay < 7) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">{relative}</span>
          </TooltipTrigger>
          <TooltipContent>{date.toISOString()}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{date.toLocaleString()}</span>
        </TooltipTrigger>
        <TooltipContent>{date.toISOString()}</TooltipContent>
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
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner className="size-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto px-4">
        <Alert variant="destructive">
          <Icon icon="mdi:alert-circle" className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Nodes - {CONFIG.appName}</title>
      </Helmet>

      <div className="container max-w-7xl mx-auto px-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Lease Ownership Nodes</h1>
            <p className="text-sm text-muted-foreground">
              Real-time view of distributed polling coordination
            </p>
          </div>

          <Badge variant="default" className="bg-green-600">
            <Icon icon="mdi:server-network" className="size-4 mr-1" />
            {nodesData?.liveNodes?.length || 0} Live
          </Badge>
        </div>

        <ScrollArea className="flex-grow">
          <div className="space-y-4 pr-4">
            {nodesData?.liveNodes?.map((node: NodeInfo) => (
              <Collapsible
                key={node.instanceId}
                open={expandedNodes.has(node.instanceId)}
                onOpenChange={() => toggleNode(node.instanceId)}
              >
                <Card className="py-0">
                  <CardContent className="p-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer select-none">
                        <Button variant="ghost" size="icon-sm" className="p-0 shrink-0">
                          <Icon
                            icon={
                              expandedNodes.has(node.instanceId)
                                ? 'mdi:chevron-down'
                                : 'mdi:chevron-right'
                            }
                            className="size-6"
                          />
                        </Button>
                        <Icon
                          icon="mdi:server"
                          className={`size-8 ${getStatusColor(node.status)}`}
                        />
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold">{node.instanceId}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {node.ownedSessions.length} session
                              {node.ownedSessions.length !== 1 ? 's' : ''}
                            </span>
                            <Badge
                              variant={
                                node.status === 'online'
                                  ? 'default'
                                  : node.status === 'init'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className={node.status === 'online' ? 'bg-green-600' : ''}
                            >
                              {node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Separator className="my-4" />

                      {node.ownedSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sessions owned</p>
                      ) : (
                        <div className="space-y-2">
                          {node.ownedSessions.map((lease: SessionLease) => (
                            <Card key={lease.sessionId} className="py-0 border">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`size-2 rounded-full shrink-0 ${(() => {
                                      const status = getSessionStatus(lease.sessionId);
                                      if (!status) return 'bg-muted-foreground';
                                      return status.isPaused
                                        ? 'bg-yellow-500'
                                        : status.isOnline
                                          ? 'bg-green-500'
                                          : 'bg-red-500';
                                    })()}`}
                                  />
                                  <div className="flex-grow">
                                    <p className="font-medium">{lease.sessionName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ID {lease.sessionId}
                                    </p>
                                  </div>

                                  <Badge variant={getStateVariant(lease.state)}>
                                    {lease.state.charAt(0).toUpperCase() + lease.state.slice(1)}
                                  </Badge>

                                  {lease.ownerId !== lease.preferredOwnerId && (
                                    <Badge
                                      variant="outline"
                                      className="text-yellow-600 border-yellow-600"
                                    >
                                      Non-Preferred
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                                  <span className="text-muted-foreground">Server</span>
                                  <span className="font-medium">
                                    {getSessionAddress(lease.sessionId)}
                                  </span>

                                  {lease.acquiredAt && (
                                    <>
                                      <span className="text-muted-foreground">Acquired</span>
                                      <span className="font-medium">
                                        {formatRelativeTime(lease.acquiredAt)}
                                      </span>
                                    </>
                                  )}

                                  {lease.lastRenewedAt && (
                                    <>
                                      <span className="text-muted-foreground">Last Renewed</span>
                                      <span className="font-medium">
                                        {formatRelativeTime(lease.lastRenewedAt)}
                                      </span>
                                    </>
                                  )}

                                  {lease.uncertainSince &&
                                    formatTimestamp(lease.uncertainSince) !== 'N/A' && (
                                      <>
                                        <span className="text-muted-foreground">
                                          Uncertain Since
                                        </span>
                                        <span className="font-medium text-yellow-500">
                                          {formatRelativeTime(lease.uncertainSince)}
                                        </span>
                                      </>
                                    )}

                                  <span className="text-muted-foreground">Preferred Owner</span>
                                  <span className="font-medium">
                                    {lease.preferredOwnerId || 'Unknown'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {nodesData?.timestamp ? formatTimestamp(nodesData.timestamp) : 'N/A'}
          </p>
        </ScrollArea>
      </div>
    </>
  );
}
