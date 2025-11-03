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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Email & Calendar Providers</h1>
            <p className="text-sm text-muted-foreground">
              Connect your email and calendar accounts
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
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

        <Tabs defaultValue="connected" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connected">Connected Providers</TabsTrigger>
            <TabsTrigger value="add">Add Provider</TabsTrigger>
          </TabsList>

          <TabsContent value="connected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Connected Providers</CardTitle>
                <CardDescription>
                  Manage your connected email and calendar accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading providers...</p>
                  </div>
                ) : (
                  <ProvidersList providers={providers} onDelete={handleProviderDelete} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
                  Connect any email account using IMAP/SMTP and CalDAV for calendar sync
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
                <p className="text-sm text-muted-foreground">
                  <strong>Google:</strong> Click "Connect Google Account" and sign in with your
                  Google credentials. Make sure to grant access to Gmail and Calendar.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Microsoft:</strong> Click "Connect Microsoft Account" and sign in with
                  your Microsoft/Outlook credentials.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Generic IMAP:</strong> Enter your email server details (IMAP for
                  incoming, SMTP for outgoing). You can find these settings from your email
                  provider's documentation.
                </p>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Common IMAP/SMTP Settings:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
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
      </div>
    </div>
  );
}
