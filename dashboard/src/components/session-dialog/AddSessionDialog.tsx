import React, { useState } from 'react';
import { AlertCircle, Loader2, Network, Plus, TestTube } from 'lucide-react';
import { SessionInfo } from '@/apiTypes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/sessions';

interface AddSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * AddSessionDialog provides a modal form for adding new sessions to the dashboard.
 * Users can connect to a real Satisfactory FRM server or create a demo session with mock data.
 */
export const AddSessionDialog: React.FC<AddSessionDialogProps> = ({ open, onClose }) => {
  const { createSession, createMockSession, previewSession, mockExists } = useSession();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; info?: SessionInfo } | null>(
    null
  );

  const resetForm = () => {
    setName('');
    setAddress('');
    setError(null);
    setTestResult(null);
    setIsTesting(false);
    setIsCreating(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTest = async () => {
    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const info = await previewSession(address.trim());
      setTestResult({ success: true, info });

      if (!name.trim() && info.sessionName) {
        setName(info.sessionName);
      }
    } catch (err) {
      setTestResult({ success: false });
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createSession(name.trim(), address.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateMock = async () => {
    setIsCreating(true);
    setError(null);

    try {
      await createMockSession('Demo Session');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mock session');
    } finally {
      setIsCreating(false);
    }
  };

  const formatPlayTime = (info: SessionInfo) => {
    const hours = Math.floor(info.totalPlayDuration / 3600);
    const minutes = Math.floor((info.totalPlayDuration % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Factory"
            />
            <p className="text-xs text-muted-foreground">A friendly name for this session</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="server-address">Server Address</Label>
            <Input
              id="server-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setTestResult(null);
              }}
              placeholder="192.168.1.100:8080"
            />
            <p className="text-xs text-muted-foreground">
              IP address and port of the Ficsit Remote Monitoring server
            </p>
          </div>

          <div
            className={cn(
              'grid transition-all duration-300',
              testResult?.success && testResult?.info
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <Card className="border py-3">
                <CardContent className="space-y-2 px-4 py-0">
                  <p className="text-sm font-medium text-green-500">Connection Successful</p>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Save Name</span>
                      <span className="text-sm">{testResult?.info?.sessionName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Play Time</span>
                      <span className="text-sm">
                        {testResult?.info?.totalPlayDurationText ||
                          (testResult?.info && formatPlayTime(testResult.info))}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">In-Game Days</span>
                      <span className="text-sm">{testResult?.info?.passedDays}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {!mockExists && (
            <>
              <div className="relative my-1">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              <Button
                variant="outline"
                onClick={handleCreateMock}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <TestTube className="size-4" />
                )}
                Add Demo Session
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Try Satisfactory Dashboard with simulated data
              </p>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={isTesting || !address.trim()}>
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Network className="size-4" />
            )}
            {isTesting ? 'Testing...' : 'Test'}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !address.trim()}>
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isCreating ? 'Adding...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
