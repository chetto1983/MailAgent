import React, { ReactElement, useState } from 'react';
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
  trigger?: ReactElement;
}

export function GenericProviderDialog({ onSuccess, trigger }: GenericProviderDialogProps) {
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
      // Use IMAP credentials for SMTP if SMTP username is not provided
      const submitData = {
        ...formData,
        smtpUsername: formData.smtpUsername || formData.imapUsername,
        smtpPassword: formData.smtpPassword || formData.imapPassword,
        supportsCalendar: showAdvanced && !!formData.caldavUrl,
      };

      await providersApi.connectGeneric(submitData);
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
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to connect provider');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ConnectGenericDto, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full">
            Connect Generic Provider (IMAP/CalDAV)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-2xl shadow-slate-950/60">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Connect Generic Email/Calendar Provider
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
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
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Display Name</label>
                <Input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* IMAP Settings */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">IMAP Settings (Incoming Mail)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">IMAP Host *</label>
                <Input
                  type="text"
                  placeholder="imap.example.com"
                  value={formData.imapHost}
                  onChange={(e) => updateField('imapHost', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">IMAP Port *</label>
                <Input
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => updateField('imapPort', parseInt(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Username *</label>
                <Input
                  type="text"
                  value={formData.imapUsername}
                  onChange={(e) => updateField('imapUsername', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password *</label>
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
          <div className="space-y-4 border-t border-white/10 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">SMTP Settings (Outgoing Mail)</h3>
            <p className="text-sm text-slate-400">SMTP will use the same credentials as IMAP</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">SMTP Host</label>
                <Input
                  type="text"
                  placeholder="smtp.example.com"
                  value={formData.smtpHost}
                  onChange={(e) => updateField('smtpHost', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">SMTP Port</label>
                <Input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => updateField('smtpPort', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* CalDAV Settings */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">CalDAV Settings (Calendar Sync)</h3>
              <label className="flex items-center gap-2 text-sm text-slate-300">
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
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">CalDAV URL</label>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Username</label>
                    <Input
                      type="text"
                      value={formData.caldavUsername}
                      onChange={(e) => updateField('caldavUsername', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
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

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
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


