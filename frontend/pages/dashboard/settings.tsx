import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Settings2, ShieldAlert, UserCircle } from 'lucide-react';
import { Box } from '@mui/material';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { logout } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await apiClient.put('/users/me', profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone.',
      )
    ) {
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.delete('/users/me');
      logout();
      router.push('/');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Deletion failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  if (!user) {
    return null;
  }

  const description =
    'Update your personal profile, manage connected providers, and handle account actions.';

  const actions = (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      style={{
        borderColor: 'var(--mui-palette-divider)',
        backgroundColor: 'var(--mui-palette-action-hover)',
      }}
    >
      <Settings2 className="mr-2 h-4 w-4" />
      Preferences
    </Button>
  );

  return (
    <DashboardLayout
      title="Workspace Settings"
      description={description}
      actions={actions}
      onLogout={handleLogout}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Settings updated successfully</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                }}
              >
                <UserCircle className="h-5 w-5" />
              </Box>
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Keep your personal information up to date.</CardDescription>
              </div>
            </Box>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Box>
                  <Box
                    component="label"
                    sx={{
                      mb: 1,
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    First Name
                  </Box>
                  <Input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    style={{
                      borderColor: 'var(--mui-palette-divider)',
                      backgroundColor: 'var(--mui-palette-background-paper)',
                      color: 'var(--mui-palette-text-primary)',
                    }}
                  />
                </Box>
                <Box>
                  <Box
                    component="label"
                    sx={{
                      mb: 1,
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    Last Name
                  </Box>
                  <Input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    style={{
                      borderColor: 'var(--mui-palette-divider)',
                      backgroundColor: 'var(--mui-palette-background-paper)',
                      color: 'var(--mui-palette-text-primary)',
                    }}
                  />
                </Box>
              </div>
              <Box>
                <Box
                  component="label"
                  sx={{
                    mb: 1,
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                >
                  Email (read-only)
                </Box>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  style={{
                    borderColor: 'var(--mui-palette-divider)',
                    backgroundColor: 'var(--mui-palette-action-disabledBackground)',
                    color: 'var(--mui-palette-text-disabled)',
                  }}
                />
              </Box>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email & Calendar Providers</CardTitle>
              <CardDescription>
                Manage the accounts powering your inbox and calendar sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/providers')}
                className="rounded-full"
              >
                Manage Providers
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-500/40 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 shadow-lg shadow-red-900/20 dark:shadow-red-950/40">
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 3,
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                  }}
                >
                  <ShieldAlert className="h-5 w-5" />
                </Box>
                <div>
                  <CardTitle className="text-red-700 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription className="text-red-600/70 dark:text-red-400/70">
                    Delete your account and all associated data permanently.
                  </CardDescription>
                </div>
              </Box>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-700 dark:text-red-400/80">
                This action cannot be undone. Please make sure you have exported any important
                information before proceeding.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="rounded-full"
              >
                {deleteLoading ? 'Deleting...' : 'Delete account'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
