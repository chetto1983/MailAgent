import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleProviderCard } from '@/components/providers/GoogleProviderCard';
import { MicrosoftProviderCard } from '@/components/providers/MicrosoftProviderCard';
import { GenericProviderDialog } from '@/components/providers/GenericProviderDialog';
import { ProvidersList } from '@/components/providers/ProvidersList';
import { providersApi, ProviderConfig } from '@/lib/api/providers';

export default function ProvidersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle OAuth callback
  useEffect(() => {
    const { code, provider: providerType, error: oauthError } = router.query;

    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      // Remove error from URL
      router.replace('/dashboard/providers', undefined, { shallow: true });
      return;
    }

    if (code && providerType) {
      handleOAuthCallback(code as string, providerType as string);
    }
  }, [router.query]);

  const handleOAuthCallback = async (authorizationCode: string, providerType: string) => {
    try {
      setLoading(true);
      setError('');

      // Connect provider (email will be obtained from OAuth2 automatically)
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

      // Remove code from URL
      router.replace('/dashboard/providers', undefined, { shallow: true });
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to connect ${providerType} account`);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providersApi.getProviders();
      setProviders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleProviderSuccess = () => {
    setSuccess('Provider connected successfully!');
    loadProviders();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleProviderDelete = () => {
    setSuccess('Provider disconnected successfully!');
    loadProviders();
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300/80">
              Providers Control Center
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Email & Calendar Providers</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Connect and manage secure access to your workspace mailboxes, calendars, and synced
              sources{user ? ` for ${user.email}` : ''}.
            </p>
          </div>
          <Link href="/dashboard" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
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
                  <div className="py-10 text-center text-slate-400">
                    Loading providers...
                  </div>
                ) : (
                  <ProvidersList providers={providers} onDelete={handleProviderDelete} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Google Provider */}
              <GoogleProviderCard onSuccess={handleProviderSuccess} />

              {/* Microsoft Provider */}
              <MicrosoftProviderCard onSuccess={handleProviderSuccess} />
            </div>

            {/* Generic Provider */}
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

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-300">
                  <strong>Google:</strong> Click "Connect Google Account" and sign in with your
                  Google credentials. Grant access to Gmail, Calendar, and Contacts when prompted.
                </p>
                <p className="text-sm text-slate-300">
                  <strong>Microsoft:</strong> Use "Connect Microsoft Account" and sign in with your
                  Outlook/Microsoft 365 credentials.
                </p>
                <p className="text-sm text-slate-300">
                  <strong>Generic IMAP:</strong> Provide IMAP (incoming) and SMTP (outgoing) server
                  details from your provider&rsquo;s documentation. CalDAV enables calendar sync.
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="mb-2 font-semibold text-slate-100">Common IMAP/SMTP Settings:</p>
                  <ul className="space-y-1 text-slate-300">
                    <li>
                      <strong>Gmail:</strong> imap.gmail.com:993, smtp.gmail.com:587 (requires app
                      password)
                    </li>
                    <li>
                      <strong>Outlook.com:</strong> outlook.office365.com:993,
                      smtp.office365.com:587
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
      </main>
    </div>
  );
}
