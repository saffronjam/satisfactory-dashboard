import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Settings } from 'src/apiTypes';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { authApi } from 'src/services/auth';
import { settingsApi } from 'src/services/settingsApi';

/**
 * Settings view component with password change functionality.
 * Allows authenticated users to change the dashboard access key.
 */
export const SettingsView = () => {
  // Settings state
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logLevel, setLogLevel] = useState<string>('Info');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const logLevels = ['Trace', 'Debug', 'Info', 'Warning', 'Error'];

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await settingsApi.get();
        setSettings(currentSettings);
        setLogLevel(currentSettings.logLevel);
      } catch (err) {
        setSettingsError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const handleSettingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);
    setIsUpdatingSettings(true);

    try {
      const updatedSettings = await settingsApi.update({ logLevel: logLevel as any });
      setSettings(updatedSettings);
      setSettingsSuccess('Settings updated successfully.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length === 0) {
      setError('New password cannot be empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      setSuccess(response.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Change Access Key - Left Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Iconify icon="mdi:lock-outline" sx={{ width: 24, height: 24 }} />
                <Typography variant="h6">Change Access Key</Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSubmitting}
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            <Iconify icon={showCurrentPassword ? 'mdi:eye-off' : 'mdi:eye'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            <Iconify icon={showNewPassword ? 'mdi:eye-off' : 'mdi:eye'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  sx={{ mb: 3 }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            <Iconify icon={showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || !isFormValid}
                  startIcon={
                    isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined
                  }
                >
                  {isSubmitting ? 'Changing Password...' : 'Change Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Log Level - Right Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Iconify icon="mdi:console-line" sx={{ width: 24, height: 24 }} />
                <Typography variant="h6">Log Level</Typography>
              </Box>

              {settingsError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {settingsError}
                </Alert>
              )}

              {settingsSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {settingsSuccess}
                </Alert>
              )}

              {isLoadingSettings ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box component="form" onSubmit={handleSettingsSubmit}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Log Level</InputLabel>
                    <Select
                      value={logLevel}
                      label="Log Level"
                      onChange={(e: SelectChangeEvent) => setLogLevel(e.target.value)}
                      disabled={isUpdatingSettings}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          boxShadow: 'none',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          boxShadow: 'none',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {logLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Changes apply immediately to all API and worker instances.
                  </Typography>

                  <Button
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                    disabled={isUpdatingSettings || logLevel === settings?.logLevel}
                    startIcon={
                      isUpdatingSettings ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : undefined
                    }
                  >
                    {isUpdatingSettings ? 'Updating...' : 'Update Settings'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
};
