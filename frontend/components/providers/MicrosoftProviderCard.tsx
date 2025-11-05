import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { providersApi } from '@/lib/api/providers';

interface MicrosoftProviderCardProps {
  onSuccess: () => void;
}

export function MicrosoftProviderCard({ onSuccess }: MicrosoftProviderCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      // Get OAuth URL
      const { authUrl } = await providersApi.getMicrosoftAuthUrl();

      onSuccess();

      // Redirect to Microsoft OAuth
      window.location.href = authUrl;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to connect Microsoft account');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-slate-100">
          <svg className="h-6 w-6" viewBox="0 0 23 23">
            <path fill="#f3f3f3" d="M0 0h23v23H0z" />
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          Microsoft
        </CardTitle>
        <CardDescription>Connect Outlook and Microsoft 365</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-slate-300">
          <p className="text-sm">
            Connect your Microsoft account to sync emails and calendar events.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Read and send emails via Outlook</li>
            <li>Access Microsoft Calendar events</li>
            <li>Sync contacts (optional)</li>
          </ul>
        </div>

        <Button onClick={handleConnect} disabled={loading} className="w-full">
          {loading ? 'Connecting...' : 'Connect Microsoft Account'}
        </Button>
      </CardContent>
    </Card>
  );
}
