import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useRouter } from 'next/router';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { emailApi } from '@/lib/api/email';
import { useTranslations } from '@/lib/hooks/use-translations';

type ComposeMode = 'new' | 'reply' | 'forward';

const parseRecipients = (value: string) =>
  value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

function EmailComposeInner() {
  const router = useRouter();
  const t = useTranslations();
  const composerCopy = t.dashboard.composer;
  const { replyTo, forwardFrom, to } = router.query;
  const [mode, setMode] = useState<ComposeMode>('new');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [providerId, setProviderId] = useState<string>('');
  const [form, setForm] = useState({
    to: typeof to === 'string' ? to : '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providerList = await providersApi.getProviders();
        setProviders(providerList);
        if (!providerId && providerList[0]) {
          setProviderId(providerList[0].id);
        }
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    };

    loadProviders();
  }, [providerId]);

  useEffect(() => {
    const loadReferenceEmail = async (id: string, nextMode: ComposeMode) => {
      try {
        setLoadingEmail(true);
        const response = await emailApi.getEmail(id);
        const email = response.data;
        setProviderId(email.providerId);
        setForm((prev) => ({
          ...prev,
          subject:
            nextMode === 'reply'
              ? prev.subject || `Re: ${email.subject}`
              : prev.subject || `Fwd: ${email.subject}`,
          to:
            nextMode === 'reply'
              ? email.from
              : prev.to,
          body:
            prev.body ||
            `\n\n----\n${email.from}\n${email.bodyText || email.snippet || ''}`,
        }));
      } catch (error) {
        console.error('Failed to load reference email:', error);
      } finally {
        setLoadingEmail(false);
      }
    };

    if (typeof replyTo === 'string') {
      setMode('reply');
      loadReferenceEmail(replyTo, 'reply');
    } else if (typeof forwardFrom === 'string') {
      setMode('forward');
      loadReferenceEmail(forwardFrom, 'forward');
    }
  }, [replyTo, forwardFrom]);

  const pageTitle = useMemo(() => {
    if (mode === 'reply') return composerCopy.titleReply;
    if (mode === 'forward') return composerCopy.titleForward;
    return composerCopy.title;
  }, [mode, composerCopy]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    if (!providerId) {
      alert(composerCopy.selectProvider);
      return;
    }

    const toRecipients = parseRecipients(form.to);
    if (toRecipients.length === 0) {
      alert(composerCopy.validationTo);
      return;
    }

    try {
      setSending(true);
      const basePayload = {
        to: toRecipients,
        cc: parseRecipients(form.cc),
        bcc: parseRecipients(form.bcc),
        subject: form.subject,
        bodyHtml: form.body.replace(/\n/g, '<br />'),
        bodyText: form.body,
      };

      if (mode === 'reply' && typeof replyTo === 'string') {
        await emailApi.replyToEmail(replyTo, basePayload);
      } else if (mode === 'forward' && typeof forwardFrom === 'string') {
        await emailApi.forwardEmail(forwardFrom, basePayload);
      } else {
        await emailApi.sendEmail({
          providerId,
          ...basePayload,
        });
      }

      router.push('/dashboard/email');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(composerCopy.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper
      sx={{
        maxWidth: 960,
        mx: 'auto',
        p: 4,
        mt: 4,
        borderRadius: 3,
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        {pageTitle}
      </Typography>

      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel>{composerCopy.from}</InputLabel>
          <Select
            value={providerId}
            label={composerCopy.from}
            onChange={(event) => setProviderId(event.target.value)}
            disabled={loadingEmail}
          >
            {providers.map((provider) => (
              <MenuItem key={provider.id} value={provider.id}>
                {provider.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label={composerCopy.to}
          value={form.to}
          onChange={(event) => handleFieldChange('to', event.target.value)}
          fullWidth
          disabled={sending}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={composerCopy.cc}
            value={form.cc}
            onChange={(event) => handleFieldChange('cc', event.target.value)}
            fullWidth
            disabled={sending}
          />
          <TextField
            label={composerCopy.bcc}
            value={form.bcc}
            onChange={(event) => handleFieldChange('bcc', event.target.value)}
            fullWidth
            disabled={sending}
          />
        </Stack>

        <TextField
          label={composerCopy.subject}
          value={form.subject}
          onChange={(event) => handleFieldChange('subject', event.target.value)}
          fullWidth
          disabled={sending}
        />

        <TextField
          label={composerCopy.bodyLabel}
          value={form.body}
          onChange={(event) => handleFieldChange('body', event.target.value)}
          fullWidth
          multiline
          minRows={8}
          disabled={sending}
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => router.back()} disabled={sending}>
            {t.common.cancel}
          </Button>
          <Button variant="contained" onClick={handleSend} disabled={sending}>
            {sending ? composerCopy.sending : composerCopy.send}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function EmailComposePage() {
  return (
    <PmSyncLayout>
      <EmailComposeInner />
    </PmSyncLayout>
  );
}
