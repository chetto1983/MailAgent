import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleProviderCard } from '@/components/providers/GoogleProviderCard';
import { MicrosoftProviderCard } from '@/components/providers/MicrosoftProviderCard';
import { GenericProviderDialog } from '@/components/providers/GenericProviderDialog';
import { ProvidersList } from '@/components/providers/ProvidersList';
import { providersApi, ProviderConfig } from '@/lib/api/providers';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function ProvidersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { logout } = useAuthStore();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providersApi.getProviders();
      setProviders(data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOAuthCallback = useCallback(
    async (authorizationCode: string, providerType: string) => {
      try {
        setLoading(true);
        setError('');

        if (providerType === 'google') {
          await providersApi.connectGoogle({
            authorizationCode,
            supportsCalendar: true,
          });
        } else if (providerType === 'microsoft') {
          await providersApi.connectMicrosoft({
            authorizationCode,
            supportsCalendar: true,
          });
        }

        setSuccess(`Successfully connected ${providerType} account!`);
        loadProviders();
        router.replace('/dashboard/providers', undefined, { shallow: true });
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || `Failed to connect ${providerType} account`);
      } finally {
        setLoading(false);
      }
    },
    [loadProviders, router],
  );

  useEffect(() => {
    const { code, provider: providerType, error: oauthError } = router.query;

    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      router.replace('/dashboard/providers', undefined, { shallow: true });
      return;
    }

    if (code && providerType) {
      handleOAuthCallback(code as string, providerType as string);
    }
  }, [router, handleOAuthCallback]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleProviderSuccess = () => {
    setSuccess('Provider connected successfully!');
    loadProviders();
  };

  const handleProviderDelete = () => {
    setSuccess('Provider disconnected successfully!');
    loadProviders();
  };

  const handleLogout = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  const actions = (
    <Button
      variant="outline"
      size="sm"
      onClick={loadProviders}
      className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  );

  if (!user) {
    return null;
  }

  const description = `Connect mailboxes, calendars, and synced sources for ${user.email}`;

  return (
    <DashboardLayout
      title="Providers & Integrations"
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
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="connected" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
          <TabsTrigger value="connected" className="w-full">
            Connected Providers
          </TabsTrigger>
          <TabsTrigger value="add" className="w-full">
            Add Provider
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Your Connected Providers</CardTitle>
              <CardDescription>
                Manage linked inboxes, calendars, and automation sources for your tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-slate-400">Loading providers...</div>
              ) : (
                <ProvidersList providers={providers} onDelete={handleProviderDelete} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <GoogleProviderCard onSuccess={handleProviderSuccess} />
            <MicrosoftProviderCard onSuccess={handleProviderSuccess} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generic Email/Calendar Provider</CardTitle>
              <CardDescription>
                Connect any IMAP/SMTP or CalDAV provider to unify email and calendar data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenericProviderDialog onSuccess={handleProviderSuccess} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>
                <strong>Google:</strong> Click &quot;Connect Google Account&quot; and sign in with your Google
                credentials. Grant access to Gmail, Calendar, and Contacts.
              </p>
              <p>
                <strong>Microsoft:</strong> Use &quot;Connect Microsoft Account&quot; and sign in with your
                Outlook/Microsoft 365 credentials.
              </p>
              <p>
                <strong>Generic IMAP:</strong> Provide IMAP/SMTP server details from your provider.
                CalDAV enables calendar sync.
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="mb-2 font-semibold text-slate-100">Common IMAP/SMTP Settings:</p>
                <ul className="space-y-1 text-slate-300">
                  <li>
                    <strong>Gmail:</strong> imap.gmail.com:993, smtp.gmail.com:587 (requires app
                    password)
                  </li>
                  <li>
                    <strong>Outlook.com:</strong> outlook.office365.com:993, smtp.office365.com:587
                  </li>
                  <li>
                    <strong>Yahoo:</strong> imap.mail.yahoo.com:993, smtp.mail.yahoo.com:587
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
