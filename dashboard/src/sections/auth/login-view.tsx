import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Iconify } from 'src/components/iconify';
import { useAuth } from 'src/contexts/auth/useAuth';
import { varAlpha } from 'src/theme/styles';

/**
 * Login view component for access key authentication.
 * Displays a password input form with error handling.
 */
export function LoginView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: varAlpha(theme.palette.grey['500Channel'], 0.16),
        }}
      >
        <CardContent sx={{ py: 5, px: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Welcome Back
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Enter your access key to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Access Key"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        disabled={isSubmitting}
                      >
                        <Iconify icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} />
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
              disabled={isSubmitting || !password}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
