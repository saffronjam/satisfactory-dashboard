import { CheckCircle, Eye, EyeOff, Lock, Palette, Terminal } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useTheme } from '@/components/theme-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { Settings } from 'src/apiTypes';
import { authApi } from 'src/services/auth';
import { settingsApi } from 'src/services/settingsApi';

/**
 * Settings view component with password change functionality.
 * Allows authenticated users to change the dashboard access key.
 */
export const SettingsView = () => {
  // Theme state
  const { theme, setTheme } = useTheme();

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Change Access Key - Left Side */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              Change Access Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                <CheckCircle className="size-4 text-green-500" />
                <AlertDescription className="text-green-500">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    disabled={isSubmitting}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    <span className="sr-only">
                      {showCurrentPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    disabled={isSubmitting}
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    <span className="sr-only">
                      {showNewPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting && <Spinner className="mr-2" />}
                {isSubmitting ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Log Level - Right Side */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="size-5" />
              Log Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settingsError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{settingsError}</AlertDescription>
              </Alert>
            )}

            {settingsSuccess && (
              <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                <CheckCircle className="size-4 text-green-500" />
                <AlertDescription className="text-green-500">{settingsSuccess}</AlertDescription>
              </Alert>
            )}

            {isLoadingSettings ? (
              <div className="flex justify-center py-6">
                <Spinner className="size-6" />
              </div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select
                    value={logLevel}
                    onValueChange={setLogLevel}
                    disabled={isUpdatingSettings}
                  >
                    <SelectTrigger id="log-level" className="w-full">
                      <SelectValue placeholder="Select log level" />
                    </SelectTrigger>
                    <SelectContent>
                      {logLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-muted-foreground">
                  Changes apply immediately to all API and worker instances.
                </p>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isUpdatingSettings || logLevel === settings?.logLevel}
                >
                  {isUpdatingSettings && <Spinner className="mr-2" />}
                  {isUpdatingSettings ? 'Updating...' : 'Update Settings'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Appearance - Third Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme" className="w-full">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme. System follows your device settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
