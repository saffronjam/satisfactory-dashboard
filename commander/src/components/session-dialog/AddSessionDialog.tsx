import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Iconify } from "src/components/iconify";
import { useSession } from "src/contexts/sessions";
import { SessionInfo } from "src/apiTypes";
import { sessionApi } from "src/services/sessionApi";

interface AddSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_FRM_PORT = "8080";

export const AddSessionDialog: React.FC<AddSessionDialogProps> = ({ open, onClose }) => {
  const { createSession, createMockSession, previewSession, mockExists } = useSession();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; info?: SessionInfo } | null>(
    null,
  );

  // Fetch client IP when dialog opens
  useEffect(() => {
    if (open) {
      sessionApi
        .getClientIP()
        .then((ip) => setClientIP(ip))
        .catch(() => setClientIP(null));
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setAddress("");
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
      setError("Address is required");
      return;
    }

    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const info = await previewSession(address.trim());
      setTestResult({ success: true, info });

      // Auto-fill name with session name if empty
      if (!name.trim() && info.sessionName) {
        setName(info.sessionName);
      }
    } catch (err) {
      setTestResult({ success: false });
      setError(err instanceof Error ? err.message : "Failed to connect to server");
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!address.trim()) {
      setError("Address is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createSession(name.trim(), address.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateMock = async () => {
    setIsCreating(true);
    setError(null);

    try {
      await createMockSession("Demo Session");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mock session");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUseThisComputer = () => {
    if (clientIP) {
      setAddress(`${clientIP}:${DEFAULT_FRM_PORT}`);
      setTestResult(null);
      setError(null);
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Session</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Session Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Factory"
            fullWidth
            helperText="A friendly name for this session"
          />

          <TextField
            label="Server Address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setTestResult(null);
            }}
            placeholder="192.168.1.100:8080"
            fullWidth
            helperText="IP address and port of the Ficsit Remote Monitoring server"
            InputProps={{
              endAdornment: clientIP && (
                <InputAdornment position="end">
                  <Tooltip title={`Use this computer (${clientIP}:${DEFAULT_FRM_PORT})`}>
                    <IconButton onClick={handleUseThisComputer} edge="end" size="small">
                      <Iconify icon="mdi:laptop" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          <Collapse in={testResult?.success && !!testResult?.info} timeout={300}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                  Connection Successful
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Save Name
                    </Typography>
                    <Typography variant="body2">{testResult?.info?.sessionName}</Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Play Time
                    </Typography>
                    <Typography variant="body2">
                      {testResult?.info?.totalPlayDurationText ||
                        (testResult?.info && formatPlayTime(testResult.info))}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      In-Game Days
                    </Typography>
                    <Typography variant="body2">{testResult?.info?.passedDays}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Collapse>

          {!mockExists && (
            <>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Button
                variant="outlined"
                onClick={handleCreateMock}
                disabled={isCreating}
                startIcon={
                  isCreating ? <CircularProgress size={20} /> : <Iconify icon="mdi:test-tube" />
                }
              >
                Add Demo Session
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                Try Commander with simulated data
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={isTesting || !address.trim()}
          startIcon={isTesting ? <CircularProgress size={20} /> : <Iconify icon="mdi:connection" />}
        >
          {isTesting ? "Testing..." : "Test"}
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={isCreating || !name.trim() || !address.trim()}
          startIcon={isCreating ? <CircularProgress size={20} /> : <Iconify icon="mdi:plus" />}
        >
          {isCreating ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
