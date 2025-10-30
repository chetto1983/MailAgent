import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { providersApi, ConnectGenericDto } from '@/lib/api/providers';

interface GenericProviderDialogProps {
  onSuccess: () => void;
}

export function GenericProviderDialog({ onSuccess }: GenericProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<ConnectGenericDto>({
    email: '',
    displayName: '',
    imapHost: '',
    imapPort: 993,
    imapUsername: '',
    imapPassword: '',
    imapUseTls: true,
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpUseTls: true,
    caldavUrl: '',
    caldavUsername: '',
    caldavPassword: '',
    supportsCalendar: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await providersApi.connectGeneric(formData);
      setOpen(false);
      onSuccess();
      // Reset form
      setFormData({
        email: '',
        displayName: '',
        imapHost: '',
        imapPort: 993,
        imapUsername: '',
        imapPassword: '',
        imapUseTls: true,
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        smtpUseTls: true,
        caldavUrl: '',
        caldavUsername: '',
        caldavPassword: '',
        supportsCalendar: false,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect provider');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ConnectGenericDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Connect Generic Provider (IMAP/CalDAV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Generic Email/Calendar Provider</DialogTitle>
          <DialogDescription>
            Configure IMAP/SMTP for email and CalDAV for calendar sync
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <Input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* IMAP Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">IMAP Settings (Incoming Mail)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">IMAP Host *</label>
                <Input
                  type="text"
                  placeholder="imap.example.com"
                  value={formData.imapHost}
                  onChange={(e) => updateField('imapHost', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IMAP Port *</label>
                <Input
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => updateField('imapPort', parseInt(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <Input
                  type="text"
                  value={formData.imapUsername}
                  onChange={(e) => updateField('imapUsername', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <Input
                  type="password"
                  value={formData.imapPassword}
                  onChange={(e) => updateField('imapPassword', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">SMTP Settings (Outgoing Mail)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Host</label>
                <Input
                  type="text"
                  placeholder="smtp.example.com"
                  value={formData.smtpHost}
                  onChange={(e) => updateField('smtpHost', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Port</label>
                <Input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => updateField('smtpPort', parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <Input
                  type="text"
                  value={formData.smtpUsername}
                  onChange={(e) => updateField('smtpUsername', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => updateField('smtpPassword', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* CalDAV Settings */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">CalDAV Settings (Calendar Sync)</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                />
                Enable Calendar Sync
              </label>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CalDAV URL</label>
                  <Input
                    type="url"
                    placeholder="https://caldav.example.com/calendars/user"
                    value={formData.caldavUrl}
                    onChange={(e) => {
                      updateField('caldavUrl', e.target.value);
                      updateField('supportsCalendar', !!e.target.value);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <Input
                      type="text"
                      value={formData.caldavUsername}
                      onChange={(e) => updateField('caldavUsername', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input
                      type="password"
                      value={formData.caldavPassword}
                      onChange={(e) => updateField('caldavPassword', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Provider'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
