import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Iconify } from "src/components/iconify";
import { useSession } from "src/contexts/sessions";
import { varAlpha } from "src/theme/styles";
import { Session } from "src/apiTypes";
import { useContextSelector } from "use-context-selector";
import { ApiContext } from "src/contexts/api/useApi";

interface SessionSelectorProps {
  onAddSession: () => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({ onAddSession }) => {
  const theme = useTheme();
  const { sessions, selectedSession, selectSession, updateSession, deleteSession } = useSession();
  const api = useContextSelector(ApiContext, (v) => ({
    isOnline: v.isOnline,
    isLoading: v.isLoading,
  }));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editName, setEditName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [pausingSessionId, setPausingSessionId] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setDeleteConfirm(null);
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    handleClose();
  };

  const handleEditClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setEditingSession(session);
    setEditName(session.name);
  };

  const handleEditClose = () => {
    setEditingSession(null);
    setEditName("");
    setIsUpdating(false);
  };

  const handleEditSave = async () => {
    if (!editingSession || !editName.trim()) return;

    setIsUpdating(true);
    try {
      await updateSession(editingSession.id, { name: editName.trim() });
      handleEditClose();
    } catch {
      // Error handling could be added here
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      void deleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  const handlePauseClick = async (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setPausingSessionId(session.id);
    try {
      await updateSession(session.id, { isPaused: !session.isPaused });
    } finally {
      setPausingSessionId(null);
    }
  };

  const handleAddSession = () => {
    handleClose();
    onAddSession();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Button
        fullWidth
        onClick={handleClick}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          justifyContent: "flex-start",
          bgcolor: varAlpha(theme.palette.grey["500Channel"], 0.08),
          "&:hover": {
            bgcolor: varAlpha(theme.palette.grey["500Channel"], 0.16),
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: selectedSession?.isPaused
                ? "warning.main"
                : api.isOnline
                  ? "success.main"
                  : "error.main",
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{
                color: "text.primary",
                fontWeight: 600,
              }}
            >
              {selectedSession?.name || "Select Session"}
            </Typography>
            {selectedSession?.sessionName && (
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: "text.secondary",
                  display: "block",
                }}
              >
                {selectedSession.sessionName}
              </Typography>
            )}
          </Box>
          <Iconify
            icon={open ? "mdi:chevron-up" : "mdi:chevron-down"}
            sx={{ color: "text.secondary", flexShrink: 0 }}
          />
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              width: Math.max(anchorEl?.offsetWidth ?? 0, 280),
              mt: 0.5,
            },
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {sessions.map((session) => (
          <MenuItem
            key={session.id}
            onClick={() => handleSelectSession(session.id)}
            selected={session.id === selectedSession?.id}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: session.isPaused
                    ? "warning.main"
                    : session.isOnline
                      ? "success.main"
                      : "error.main",
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={session.name}
              secondary={session.sessionName}
              primaryTypographyProps={{ variant: "body2", noWrap: true }}
              secondaryTypographyProps={{ variant: "caption", noWrap: true }}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Box
              component="span"
              onClick={(e) => handleEditClick(e, session)}
              sx={{
                ml: 1,
                p: 0.5,
                borderRadius: 1,
                display: "flex",
                cursor: "pointer",
                color: "text.secondary",
                "&:hover": {
                  bgcolor: varAlpha(theme.palette.primary.mainChannel, 0.08),
                  color: "primary.main",
                },
              }}
            >
              <Iconify icon="mdi:pencil-outline" width={18} />
            </Box>
            <Box
              component="span"
              onClick={(e) => handlePauseClick(e, session)}
              sx={{
                p: 0.5,
                borderRadius: 1,
                display: "flex",
                cursor: pausingSessionId === session.id ? "wait" : "pointer",
                color: session.isPaused ? "warning.main" : "text.secondary",
                "&:hover": {
                  bgcolor: varAlpha(theme.palette.warning.mainChannel, 0.08),
                  color: "warning.main",
                },
              }}
            >
              <Iconify
                icon={session.isPaused ? "mdi:play-outline" : "mdi:pause"}
                width={18}
              />
            </Box>
            <Box
              component="span"
              onClick={(e) => handleDeleteClick(e, session.id)}
              sx={{
                p: 0.5,
                borderRadius: 1,
                display: "flex",
                cursor: "pointer",
                color: deleteConfirm === session.id ? "error.main" : "text.secondary",
                "&:hover": {
                  bgcolor: varAlpha(theme.palette.error.mainChannel, 0.08),
                  color: "error.main",
                },
              }}
            >
              <Iconify icon="mdi:delete-outline" width={18} />
            </Box>
          </MenuItem>
        ))}

        {sessions.length > 0 && <Divider sx={{ my: 1 }} />}

        <MenuItem onClick={handleAddSession} sx={{ py: 1 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Iconify icon="mdi:plus" width={20} />
          </ListItemIcon>
          <ListItemText primary="Add Session" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
      </Menu>

      <Dialog open={!!editingSession} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Session Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editName.trim()) {
                void handleEditSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={isUpdating || !editName.trim()}
          >
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
