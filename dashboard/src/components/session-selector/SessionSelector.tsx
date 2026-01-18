import { useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { SessionDTO } from '@/apiTypes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/sessions';

interface SessionSelectorProps {
  onAddSession: () => void;
}

/**
 * SessionSelector provides a dropdown menu for selecting, editing, pausing, and deleting sessions.
 * It displays the currently selected session with status indicator and provides session management actions.
 */
export const SessionSelector: React.FC<SessionSelectorProps> = ({ onAddSession }) => {
  const { sessions, selectedSession, selectSession, updateSession, deleteSession } = useSession();
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<SessionDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pausingSessionId, setPausingSessionId] = useState<string | null>(null);

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    setOpen(false);
    setDeleteConfirm(null);
  };

  const handleEditClick = (e: React.MouseEvent, session: SessionDTO) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingSession(session);
    setEditName(session.name);
    setEditAddress(session.address);
  };

  const handleEditClose = () => {
    setEditingSession(null);
    setEditName('');
    setEditAddress('');
    setIsUpdating(false);
  };

  const handleEditSave = async () => {
    if (!editingSession || !editName.trim() || !editAddress.trim()) return;

    setIsUpdating(true);
    try {
      const updates = { name: editName.trim(), address: editAddress.trim() };
      await updateSession(editingSession.id, updates);
      handleEditClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteConfirm === sessionId) {
      void deleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  const handlePauseClick = async (e: React.MouseEvent, session: SessionDTO) => {
    e.stopPropagation();
    e.preventDefault();
    setPausingSessionId(session.id);
    try {
      await updateSession(session.id, { isPaused: !session.isPaused });
    } finally {
      setPausingSessionId(null);
    }
  };

  const handleAddSession = () => {
    setOpen(false);
    onAddSession();
  };

  const getStatusColor = (session: SessionDTO | null | undefined) => {
    if (!session) return 'bg-muted';
    if (session.isPaused) return 'bg-yellow-500';
    if (session.isOnline) return 'bg-green-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <DropdownMenu open={open} onOpenChange={setOpen} modal={true}>
        <DropdownMenuTrigger className="flex h-auto w-full items-center justify-start gap-3 rounded-md bg-sidebar-accent/30 px-3 py-2.5 text-left hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-ring">
          <div className={cn('size-2 shrink-0 rounded-full', getStatusColor(selectedSession))} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedSession?.name || 'Select Session'}
            </p>
            {selectedSession?.sessionName && (
              <p className="truncate text-xs text-muted-foreground">
                {selectedSession.sessionName}
              </p>
            )}
          </div>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[--radix-dropdown-menu-trigger-width] min-w-[280px]"
        >
          {sessions.map((session) => (
            <DropdownMenuItem
              key={session.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 py-2',
                session.id === selectedSession?.id && 'bg-accent'
              )}
              onSelect={() => handleSelectSession(session.id)}
            >
              <div className={cn('size-2 shrink-0 rounded-full', getStatusColor(session))} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{session.name}</p>
                {session.sessionName && (
                  <p className="truncate text-xs text-muted-foreground">{session.sessionName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => handleEditClick(e, session)}
                className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={(e) => handlePauseClick(e, session)}
                className={cn(
                  'rounded p-1 hover:bg-yellow-500/10 hover:text-yellow-500',
                  session.isPaused ? 'text-yellow-500' : 'text-muted-foreground',
                  pausingSessionId === session.id && 'cursor-wait'
                )}
              >
                {session.isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, session.id)}
                className={cn(
                  'rounded p-1 hover:bg-red-500/10 hover:text-red-500',
                  deleteConfirm === session.id ? 'text-red-500' : 'text-muted-foreground'
                )}
              >
                <Trash2 className="size-4" />
              </button>
            </DropdownMenuItem>
          ))}

          {sessions.length > 0 && <DropdownMenuSeparator />}

          <DropdownMenuItem onSelect={handleAddSession} className="cursor-pointer py-2">
            <Plus className="mr-2 size-4" />
            <span>Add Session</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!editingSession} onOpenChange={(isOpen) => !isOpen && handleEditClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim() && editAddress.trim()) {
                    void handleEditSave();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-address">Server URL</Label>
              <Input
                id="session-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim() && editAddress.trim()) {
                    void handleEditSave();
                  }
                }}
                placeholder="192.168.1.100:8080"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditClose}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isUpdating || !editName.trim() || !editAddress.trim()}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
