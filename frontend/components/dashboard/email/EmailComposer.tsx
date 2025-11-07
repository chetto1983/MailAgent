import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Chip,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Send,
  Save,
  X,
  Paperclip,
  Check,
} from 'lucide-react';
import type { ProviderConfig } from '@/lib/api/providers';

export interface EmailComposerProps {
  open: boolean;
  mode?: 'compose' | 'reply' | 'forward';
  originalEmail?: {
    id: string;
    from: string;
    to: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    messageId?: string;
    references?: string;
  };
  onSend?: (data: EmailDraft) => Promise<void>;
  onSaveDraft?: (data: EmailDraft) => Promise<void>;
  onClose?: () => void;
  defaultTo?: string[];
  defaultSubject?: string;
  providers: ProviderConfig[];
  defaultProviderId?: string;
}

export interface EmailDraft {
  providerId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  attachments?: File[];
}

/**
 * Material Design 3 Email Composer
 *
 * UX Features:
 * - Full-screen dialog on mobile
 * - Clear validation states
 * - Auto-save indicator
 * - Loading states for all actions
 * - Success/error feedback
 * - Accessible keyboard shortcuts
 * - Touch-friendly toolbar
 */
export function EmailComposer({
  open,
  mode = 'compose',
  originalEmail,
  onSend,
  onSaveDraft,
  onClose,
  defaultTo = [],
  defaultSubject = '',
  providers,
  defaultProviderId,
}: EmailComposerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Form state
  const [providerId, setProviderId] = useState<string>(defaultProviderId ?? providers[0]?.id ?? '');
  const [to, setTo] = useState<string>(defaultTo.join(', '));
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Action states
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');

  const canSaveDraft = Boolean(onSaveDraft);
  const hasProviders = providers.length > 0;

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Compose your message...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] p-3 text-base',
        style: 'font-family: inherit',
      },
    },
    immediatelyRender: false,
  });

  // Initialize from original email
  useEffect(() => {
    if (!editor || !originalEmail || !open) return;

    if (mode === 'reply') {
      setTo(originalEmail.from);
      const reSubject = originalEmail.subject.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;
      setSubject(reSubject);
      const quotedText = originalEmail.bodyHtml || originalEmail.bodyText || '';
      const quotedHtml = `<p><br></p><p><em>On ${new Date().toLocaleDateString()}, ${originalEmail.from} wrote:</em></p><blockquote>${quotedText}</blockquote>`;
      editor.commands.setContent(quotedHtml);
    } else if (mode === 'forward') {
      const fwdSubject = originalEmail.subject.startsWith('Fwd:')
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject}`;
      setSubject(fwdSubject);
      const forwardedText = originalEmail.bodyHtml || originalEmail.bodyText || '';
      const forwardedHtml = `<p><br></p><hr><p><strong>Forwarded message</strong></p><p><strong>From:</strong> ${originalEmail.from}</p><p><strong>Subject:</strong> ${originalEmail.subject}</p><br>${forwardedText}`;
      editor.commands.setContent(forwardedHtml);
    }
  }, [editor, mode, originalEmail, open]);

  // Auto-save draft every 30s
  const handleSaveDraft = useCallback(async () => {
    if (!editor || !onSaveDraft || !providerId) return;
    if (!to.trim() && !subject.trim() && editor.isEmpty) return;

    setSaving(true);
    setError('');
    try {
      const draft: EmailDraft = {
        providerId,
        to: to.split(',').map((e) => e.trim()).filter(Boolean),
        cc: cc.split(',').map((e) => e.trim()).filter(Boolean),
        bcc: bcc.split(',').map((e) => e.trim()).filter(Boolean),
        subject,
        bodyHtml: editor.getHTML(),
        bodyText: editor.getText(),
        inReplyTo: originalEmail?.messageId,
        references: originalEmail?.references,
        attachments,
      };

      await onSaveDraft(draft);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save draft:', err);
      setError('Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [attachments, bcc, cc, editor, onSaveDraft, originalEmail, providerId, subject, to]);

  useEffect(() => {
    if (!editor || !onSaveDraft || !open) return;

    const interval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // Auto-save every 30s

    return () => clearInterval(interval);
  }, [editor, onSaveDraft, handleSaveDraft, open]);

  // Handle attachments
  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const newFiles = Array.from(event.target.files);
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send email
  const handleSend = async () => {
    if (!editor || !onSend) return;

    // Validation
    if (!providerId) {
      setError('Please select a from address');
      return;
    }
    if (!to.trim()) {
      setError('Please enter at least one recipient');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    setSending(true);
    setError('');
    try {
      const draft: EmailDraft = {
        providerId,
        to: to.split(',').map((e) => e.trim()).filter(Boolean),
        cc: cc.split(',').map((e) => e.trim()).filter(Boolean),
        bcc: bcc.split(',').map((e) => e.trim()).filter(Boolean),
        subject,
        bodyHtml: editor.getHTML(),
        bodyText: editor.getText(),
        inReplyTo: originalEmail?.messageId,
        references: originalEmail?.references,
        attachments,
      };

      await onSend(draft);

      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      editor.commands.clearContent();
      setAttachments([]);
      setError('');

      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to send email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email. Please try again.';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Toolbar actions
  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const setLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  const titleText =
    mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: { xs: '100%', sm: '90vh' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
            {mode.toUpperCase()}
          </Typography>
          <Typography variant="h6" component="h2">
            {titleText}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Auto-save indicator */}
          {lastSaved && !sending && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Check size={14} color={theme.palette.success.main} />
              <Typography variant="caption" color="text.secondary">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          )}
          {saving && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Saving...
              </Typography>
            </Box>
          )}
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          {/* Error alert */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Provider warning */}
          {!hasProviders && (
            <Alert severity="warning">
              Connect an email provider before sending messages.
            </Alert>
          )}

          {/* From */}
          <FormControl fullWidth size="small">
            <InputLabel id="from-label">From</InputLabel>
            <Select
              labelId="from-label"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={!hasProviders}
              label="From"
            >
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.displayName ?? provider.email} ({provider.providerType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* To */}
          <TextField
            label="To"
            placeholder="recipient@example.com, ..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            fullWidth
            size="small"
            required
            error={!to.trim() && error !== ''}
          />

          {/* Cc/Bcc toggle */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={showCc ? 'contained' : 'outlined'}
              onClick={() => setShowCc(!showCc)}
            >
              Cc
            </Button>
            <Button
              size="small"
              variant={showBcc ? 'contained' : 'outlined'}
              onClick={() => setShowBcc(!showBcc)}
            >
              Bcc
            </Button>
          </Box>

          {/* Cc */}
          {showCc && (
            <TextField
              label="Cc"
              placeholder="cc@example.com, ..."
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          {/* Bcc */}
          {showBcc && (
            <TextField
              label="Bcc"
              placeholder="bcc@example.com, ..."
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          {/* Subject */}
          <TextField
            label="Subject"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            size="small"
            required
            error={!subject.trim() && error !== ''}
          />

          <Divider />

          {/* Formatting toolbar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
              p: 1,
              bgcolor: 'background.default',
              borderRadius: 1,
            }}
          >
            <ToggleButtonGroup size="small" exclusive>
              <ToggleButton
                value="bold"
                selected={editor.isActive('bold')}
                onChange={toggleBold}
                aria-label="bold"
              >
                <Bold size={18} />
              </ToggleButton>
              <ToggleButton
                value="italic"
                selected={editor.isActive('italic')}
                onChange={toggleItalic}
                aria-label="italic"
              >
                <Italic size={18} />
              </ToggleButton>
              <ToggleButton
                value="bulletList"
                selected={editor.isActive('bulletList')}
                onChange={toggleBulletList}
                aria-label="bullet list"
              >
                <List size={18} />
              </ToggleButton>
              <ToggleButton
                value="orderedList"
                selected={editor.isActive('orderedList')}
                onChange={toggleOrderedList}
                aria-label="ordered list"
              >
                <ListOrdered size={18} />
              </ToggleButton>
              <ToggleButton
                value="link"
                selected={editor.isActive('link')}
                onChange={setLink}
                aria-label="insert link"
              >
                <LinkIcon size={18} />
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ flex: 1 }} />

            {/* Attach button */}
            <label>
              <IconButton component="span" size="small" aria-label="attach files">
                <Paperclip size={18} />
              </IconButton>
              <input
                type="file"
                multiple
                onChange={handleAttachment}
                aria-label="file upload"
                style={{ display: 'none' }}
              />
            </label>
          </Box>

          {/* Editor */}
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: { xs: 200, sm: 300 },
              maxHeight: { xs: 300, sm: 400 },
              overflow: 'auto',
              bgcolor: 'background.paper',
            }}
          >
            <EditorContent editor={editor} />
          </Box>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Attachments ({attachments.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {attachments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    icon={<Paperclip size={14} />}
                    onDelete={() => removeAttachment(index)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        {/* Save draft button */}
        {canSaveDraft && (
          <Button
            onClick={handleSaveDraft}
            disabled={saving || sending || !providerId}
            startIcon={saving ? <CircularProgress size={16} /> : <Save size={16} />}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Cancel/Send buttons */}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending || saving || !providerId || !hasProviders}
            startIcon={sending ? <CircularProgress size={16} /> : <Send size={16} />}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

export default EmailComposer;
