import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { authApi } from 'src/services/auth';

/**
 * Settings view component with password change functionality.
 * Allows authenticated users to change the dashboard access key.
 */
export const SettingsView = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      <Container sx={{ paddingTop: '50px' }}>
        <Typography variant="h4" sx={{ marginBottom: '30px' }}>
          Settings
        </Typography>

        <Card sx={{ maxWidth: 480 }}>
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
      </Container>
    </DashboardContent>
  );
};
