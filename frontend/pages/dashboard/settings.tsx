import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Settings2, ShieldAlert, UserCircle } from 'lucide-react';
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
      className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
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
        <Card className="lg:col-span-7 border-white/10 bg-white/5">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-slate-300">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 shadow-inner shadow-sky-500/30">
                <UserCircle className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Keep your personal information up to date.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Email (read-only)
                </label>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="border-white/10 bg-white/5 text-slate-400"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-5 space-y-6">
          <Card className="border-white/10 bg-white/5">
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

          <Card className="border border-rose-500/40 bg-rose-500/10 text-rose-100 shadow-2xl shadow-rose-900/30">
            <CardHeader className="flex flex-row items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-100 shadow-inner shadow-rose-900/50">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-rose-100">Danger Zone</CardTitle>
                <CardDescription className="text-rose-100/70">
                  Delete your account and all associated data permanently.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-100/80">
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
