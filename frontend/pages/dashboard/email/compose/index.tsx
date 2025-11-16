import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { Paperclip, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { emailApi } from '@/lib/api/email';
import { useTranslations } from '@/lib/hooks/use-translations';

type ComposeMode = 'new' | 'reply' | 'forward';

type AttachmentDraft = {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
};

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
    bodyHtml: '',
  });
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sanitize HTML to prevent XSS attacks
  const sanitizedBodyHtml = useMemo(() => {
    return DOMPurify.sanitize(form.bodyHtml, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
      ALLOW_DATA_ATTR: false,
    });
  }, [form.bodyHtml]);

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

  // Load email for reply/forward modes
  useEffect(() => {
    const loadEmail = async () => {
      if ((!replyTo && !forwardFrom) || typeof replyTo !== 'string' && typeof forwardFrom !== 'string') {
        return;
      }

      try {
        const emailId = (replyTo as string) || (forwardFrom as string);
        const response = await emailApi.getEmail(emailId);
        const email = response.data;

        if (replyTo) {
          setMode('reply');
          setForm((prev) => ({
            ...prev,
            subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            bodyHtml: `<br><br>On ${email.receivedAt}, ${email.from} wrote:<br>${email.bodyHtml ?? ''}`,
            to: email.replyTo || email.from,
          }));
        } else if (forwardFrom) {
          setMode('forward');
          setForm((prev) => ({
            ...prev,
            subject: email.subject?.startsWith('Fw:') ? email.subject : `Fw: ${email.subject}`,
            bodyHtml: `<br><br>---------- Forwarded message ----------<br>From: ${email.from}<br>Date: ${email.receivedAt}<br>Subject: ${email.subject}<br><br>${email.bodyHtml ?? ''}`,
          }));
        }
      } catch (error) {
        console.error('Failed to load email for reply/forward:', error);
      }
    };

    loadEmail();
  }, [replyTo, forwardFrom]);

  const handleInputChange = (field: 'to' | 'cc' | 'bcc' | 'subject') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLInputElement> | any) => {
    setProviderId(event.target.value as string);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, bodyHtml: editorRef.current?.innerHTML || '' }));
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileReaders: Promise<AttachmentDraft>[] = Array.from(files).map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            base64,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(fileReaders)
      .then((newAttachments) => {
        setAttachments((prev) => [...prev, ...newAttachments]);
      })
      .catch((error) => {
        console.error('Failed to read attachments:', error);
      });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  // Validate and send email
  const handleSend = async () => {
    if (!providerId) {
      alert(composerCopy.selectProvider);
      return;
    }

    const toRecipients = parseRecipients(form.to);
    const ccRecipients = parseRecipients(form.cc);
    const bccRecipients = parseRecipients(form.bcc);

    if (toRecipients.length === 0) {
      alert(composerCopy.validationTo);
      return;
    }

    const payload = {
      providerId,
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: form.subject,
      bodyHtml: form.bodyHtml,
      bodyText: '',
      attachments: attachments.map((attachment) => ({
        filename: attachment.name,
        contentType: attachment.type,
        contentBase64: `data:${attachment.type};base64,${attachment.base64}`,
      })),
    };

    try {
      setSending(true);
      await emailApi.sendEmail(payload);
      router.push('/dashboard/email');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(composerCopy.sendError);
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (mode === 'reply') return composerCopy.titleReply;
    if (mode === 'forward') return composerCopy.titleForward;
    return composerCopy.title;
  }, [mode, composerCopy]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        maxWidth: 900,
        mx: 'auto',
        mt: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="h5" gutterBottom fontWeight={700}>
        {title}
      </Typography>

      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel>{composerCopy.from}</InputLabel>
          <Select
            value={providerId}
            label={composerCopy.from}
            onChange={handleProviderChange}
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
          onChange={handleInputChange('to')}
          fullWidth
        />

        <TextField
          label={composerCopy.cc}
          value={form.cc}
          onChange={handleInputChange('cc')}
          fullWidth
        />

        <TextField
          label={composerCopy.bcc}
          value={form.bcc}
          onChange={handleInputChange('bcc')}
          fullWidth
        />

        <TextField
          label={composerCopy.subject}
          value={form.subject}
          onChange={handleInputChange('subject')}
          fullWidth
        />

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {composerCopy.bodyLabel}
          </Typography>
          <Box
            ref={editorRef}
            contentEditable={!sending}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: 200,
              p: 2,
              bgcolor: 'background.paper',
              outline: 'none',
            }}
          />
        </Box>

        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Paperclip size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            {composerCopy.attachFiles}
          </Button>
          {attachments.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
            </Typography>
          )}
        </Stack>
        {attachments.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {attachments.map((attachment) => (
              <Chip
                key={attachment.id}
                label={`${attachment.name} (${Math.round(attachment.size / 1024)} KB)`}
                onDelete={() => handleRemoveAttachment(attachment.id)}
                deleteIcon={<Trash2 size={16} />}
              />
            ))}
          </Stack>
        )}

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

// Force SSR to avoid build-time router issues
export async function getServerSideProps() {
  return { props: {} };
}
