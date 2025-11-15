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
  const [loadingEmail, setLoadingEmail] = useState(false);
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
          to: nextMode === 'reply' ? email.from : prev.to,
          bodyHtml:
            prev.bodyHtml ||
            `<br /><br />----<br />${email.from}<br />${email.bodyHtml || email.bodyText || email.snippet || ''}`,
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

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML ?? '';
    setForm((prev) => ({ ...prev, bodyHtml: html }));
  };

  const applyFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;
    try {
      const items = await Promise.all(
        files.map(async (file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64: await fileToBase64(file),
        })),
      );
      setAttachments((prev) => [...prev, ...items]);
    } catch (error) {
      console.error('Failed to read attachment:', error);
      alert('Unable to read one of the attachments. Please try again.');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== form.bodyHtml) {
      editorRef.current.innerHTML = form.bodyHtml || '';
    }
  }, [form.bodyHtml]);

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
      const plainText = form.bodyHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      const basePayload = {
        to: toRecipients,
        cc: parseRecipients(form.cc),
        bcc: parseRecipients(form.bcc),
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        bodyText: plainText,
        attachments: attachments.map((item) => ({
          filename: item.name,
          contentType: item.type || 'application/octet-stream',
          contentBase64: item.base64,
        })),
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

      setAttachments([]);
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

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <TextField
              label={composerCopy.cc}
              value={form.cc}
              onChange={(event) => handleFieldChange('cc', event.target.value)}
              fullWidth
              disabled={sending}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <TextField
              label={composerCopy.bcc}
              value={form.bcc}
              onChange={(event) => handleFieldChange('bcc', event.target.value)}
              fullWidth
              disabled={sending}
            />
          </Box>
        </Stack>

        <TextField
          label={composerCopy.subject}
          value={form.subject}
          onChange={(event) => handleFieldChange('subject', event.target.value)}
          fullWidth
          disabled={sending}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {composerCopy.bodyLabel}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" onClick={() => applyFormat('bold')}>
              B
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyFormat('italic')}>
              I
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyFormat('underline')}>
              U
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyFormat('insertOrderedList')}>
              1.
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyFormat('insertUnorderedList')}>
              •
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const url = window.prompt('Enter URL');
                if (url) {
                  applyFormat('createLink', url);
                }
              }}
            >
              Link
            </Button>
            <Button size="small" variant="outlined" onClick={() => applyFormat('removeFormat')}>
              Clear
            </Button>
          </Stack>
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
