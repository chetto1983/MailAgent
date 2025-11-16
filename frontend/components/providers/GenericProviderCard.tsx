import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
} from '@mui/material';
import { Mail } from 'lucide-react';
import { providersApi, ConnectGenericDto } from '@/lib/api/providers';

interface GenericProviderCardProps {
  onSuccess: () => void;
}

export function GenericProviderCard({ onSuccess }: GenericProviderCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCalDAV, setShowCalDAV] = useState(false);

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
      const submitData = {
        ...formData,
        smtpUsername: formData.smtpUsername || formData.imapUsername,
        smtpPassword: formData.smtpPassword || formData.imapPassword,
        supportsCalendar: showCalDAV && !!formData.caldavUrl,
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
      setShowCalDAV(false);
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
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Mail size={24} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              IMAP & CalDAV
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect custom IMAP/SMTP and CalDAV providers
          </Typography>

          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Bring any compatible mailbox or calendar by entering your server credentials.
            </Typography>

            <Box
              component="ul"
              sx={{
                pl: 3,
                m: 0,
                listStyle: 'disc',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              <li>IMAP/SMTP support for inbound/outbound email</li>
              <li>Optional CalDAV sync for calendars</li>
              <li>Perfect for Fastmail, Yahoo, iCloud, and custom servers</li>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => setOpen(true)}
            sx={{ mt: 2 }}
          >
            Configure IMAP / CalDAV
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Connect IMAP/SMTP & CalDAV Provider
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure your email and calendar server settings
            </Typography>
          </DialogTitle>

          <DialogContent dividers sx={{ pt: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Basic Info */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Basic Information
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Display Name"
                value={formData.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* IMAP Settings */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              IMAP Settings (Incoming Mail)
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="IMAP Host"
                  placeholder="imap.example.com"
                  value={formData.imapHost}
                  onChange={(e) => updateField('imapHost', e.target.value)}
                  required
                  sx={{ flex: 2 }}
                />
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={formData.imapPort}
                  onChange={(e) => updateField('imapPort', parseInt(e.target.value))}
                  required
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.imapUsername}
                  onChange={(e) => updateField('imapUsername', e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.imapPassword}
                  onChange={(e) => updateField('imapPassword', e.target.value)}
                  required
                />
              </Stack>
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* SMTP Settings */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              SMTP Settings (Outgoing Mail)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Leave empty to use IMAP credentials
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="SMTP Host"
                placeholder="smtp.example.com"
                value={formData.smtpHost}
                onChange={(e) => updateField('smtpHost', e.target.value)}
                sx={{ flex: 2 }}
              />
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={formData.smtpPort}
                onChange={(e) => updateField('smtpPort', parseInt(e.target.value))}
                sx={{ flex: 1 }}
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* CalDAV Settings */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                CalDAV Settings (Calendar Sync)
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCalDAV}
                    onChange={(e) => setShowCalDAV(e.target.checked)}
                  />
                }
                label="Enable Calendar"
              />
            </Box>

            {showCalDAV && (
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="CalDAV URL"
                  placeholder="https://caldav.example.com/calendars/user"
                  value={formData.caldavUrl}
                  onChange={(e) => updateField('caldavUrl', e.target.value)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={formData.caldavUsername}
                    onChange={(e) => updateField('caldavUsername', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={formData.caldavPassword}
                    onChange={(e) => updateField('caldavPassword', e.target.value)}
                  />
                </Stack>
              </Stack>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Provider'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
