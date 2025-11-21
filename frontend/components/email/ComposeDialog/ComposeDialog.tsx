import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Collapse,
  Typography,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X, Send, Paperclip, Check, FileText, Trash2 } from 'lucide-react';
import type { SendEmailPayload, EmailAttachmentUpload } from '@/lib/api/email';
import { emailApi } from '@/lib/api/email';
import { useDraftAutosave } from '@/hooks/use-draft-autosave';

export interface ComposeDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Mode: compose new, reply, or forward
   */
  mode?: 'compose' | 'reply' | 'forward';

  /**
   * Default provider ID
   */
  defaultProviderId?: string;

  /**
   * Pre-fill data (for reply/forward)
   */
  prefillData?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string;
  };

  /**
   * Callback when dialog closes
   */
  onClose: () => void;

  /**
   * Callback when email is sent successfully
   */
  onSent?: () => void;

  /**
   * Callback for errors
   */
  onError?: (message: string) => void;
}

/**
 * ComposeDialog - Email composition dialog
 *
 * Features:
 * - To/CC/BCC recipient fields
 * - Subject and body
 * - Send functionality
 * - Close confirmation if unsaved changes
 *
 * @example
 * ```tsx
 * <ComposeDialog
 *   open={isOpen}
 *   defaultProviderId={providerId}
 *   onClose={() => setIsOpen(false)}
 *   onSent={() => showSuccess('Email sent!')}
 * />
 * ```
 */
export function ComposeDialog({
  open,
  mode = 'compose',
  defaultProviderId,
  prefillData,
  onClose,
  onSent,
  onError,
}: ComposeDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Form state
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachmentUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize form with prefill data
  useEffect(() => {
    if (open && prefillData) {
      setTo(prefillData.to?.join(', ') || '');
      setCc(prefillData.cc?.join(', ') || '');
      setBcc(prefillData.bcc?.join(', ') || '');
      setSubject(prefillData.subject || '');
      setBody(prefillData.body || '');
      setShowCc(!!prefillData.cc?.length);
      setShowBcc(!!prefillData.bcc?.length);
    } else if (open && !prefillData) {
      // Reset form for new compose
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setShowCc(false);
      setShowBcc(false);
      setAttachments([]);
    }
  }, [open, prefillData]);

  // Parse comma-separated emails
  const parseEmails = useCallback((emailString: string): string[] => {
    return emailString
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newAttachments: EmailAttachmentUpload[] = [];

      for (const file of Array.from(files)) {
        // Check file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          onError?.(`File ${file.name} is too large (max 10MB)`);
          continue;
        }

        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:image/png;base64,...)
            const base64Content = result.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBase64: base64,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Failed to upload attachments:', error);
      onError?.('Failed to upload attachments');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onError]);

  // Remove attachment
  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Calculate attachment size from base64
  const getBase64Size = useCallback((base64: string): number => {
    // Base64 encoding increases size by ~33%
    return Math.floor((base64.length * 3) / 4);
  }, []);

  // Draft data for autosave
  const draftData = useMemo(() => {
    if (!defaultProviderId) return null;

    return {
      providerId: defaultProviderId,
      to: to ? parseEmails(to) : undefined,
      cc: cc ? parseEmails(cc) : undefined,
      bcc: bcc ? parseEmails(bcc) : undefined,
      subject: subject || undefined,
      bodyText: body || undefined,
      bodyHtml: body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : undefined,
    };
  }, [defaultProviderId, to, cc, bcc, subject, body, parseEmails]);

  // Autosave draft
  const { isSaving: isDraftSaving, lastSaved } = useDraftAutosave({
    draftData: draftData || { providerId: defaultProviderId || '' },
    enabled: open && !!defaultProviderId && mode === 'compose', // Only autosave for new compose
    interval: 30000, // 30 seconds
  });

  // Format last saved time
  const formatLastSaved = useCallback((date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Saved just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Saved ${hours}h ago`;
  }, []);

  // Handle send
  const handleSend = useCallback(async () => {
    // Validation
    if (!defaultProviderId) {
      onError?.('No email provider selected');
      return;
    }

    const toEmails = parseEmails(to);
    if (toEmails.length === 0) {
      onError?.('Please enter at least one recipient');
      return;
    }

    if (!subject.trim()) {
      onError?.('Please enter a subject');
      return;
    }

    try {
      setSending(true);

      const payload: SendEmailPayload = {
        providerId: defaultProviderId,
        to: toEmails,
        cc: cc ? parseEmails(cc) : undefined,
        bcc: bcc ? parseEmails(bcc) : undefined,
        subject: subject.trim(),
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        bodyText: body,
        inReplyTo: prefillData?.inReplyTo,
        references: prefillData?.references,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await emailApi.sendEmail(payload);

      // Success
      onSent?.();
      onClose();

      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send email:', error);
      onError?.('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  }, [defaultProviderId, to, cc, bcc, subject, body, prefillData, parseEmails, onClose, onSent, onError, attachments]);

  // Check if form has unsaved changes
  const hasChanges = useCallback(() => {
    return !!(to || cc || bcc || subject || body);
  }, [to, cc, bcc, subject, body]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasChanges() && !sending) {
      const confirmed = window.confirm('Discard unsaved changes?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasChanges, sending, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '80vh',
          maxHeight: isMobile ? '100%' : 800,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {mode === 'reply' && 'Reply'}
              {mode === 'forward' && 'Forward'}
              {mode === 'compose' && 'New Message'}
            </Typography>
            {mode === 'compose' && (
              <Chip
                size="small"
                icon={isDraftSaving ? <CircularProgress size={12} /> : <Check size={12} />}
                label={isDraftSaving ? 'Saving...' : formatLastSaved(lastSaved)}
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  display: lastSaved || isDraftSaving ? 'flex' : 'none',
                }}
              />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            disabled={sending}
            sx={{
              width: { xs: 44, sm: 'auto' },
              height: { xs: 44, sm: 'auto' },
            }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* To Field */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 500 }}>
                To:
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' },
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {!showCc && (
                  <Button size="small" onClick={() => setShowCc(true)}>
                    Cc
                  </Button>
                )}
                {!showBcc && (
                  <Button size="small" onClick={() => setShowBcc(true)}>
                    Bcc
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* CC Field */}
          <Collapse in={showCc}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 500 }}>
                  Cc:
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="recipient@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  disabled={sending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />
              </Box>
            </Box>
          </Collapse>

          {/* BCC Field */}
          <Collapse in={showBcc}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 500 }}>
                  Bcc:
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="recipient@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  disabled={sending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { border: 'none' },
                    },
                  }}
                />
              </Box>
            </Box>
          </Collapse>

          {/* Subject Field */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 500 }}>
                Subject:
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Attachments ({attachments.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {attachments.map((attachment, index) => (
                  <Chip
                    key={index}
                    icon={<FileText size={14} />}
                    label={`${attachment.filename} (${formatFileSize(getBase64Size(attachment.contentBase64))})`}
                    onDelete={() => handleRemoveAttachment(index)}
                    deleteIcon={<Trash2 size={14} />}
                    size="small"
                    sx={{ maxWidth: '100%' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Body Field */}
          <Box sx={{ flex: 1, px: 2, py: 2 }}>
            <TextField
              fullWidth
              multiline
              placeholder="Compose your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              sx={{
                height: '100%',
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  alignItems: 'flex-start',
                  '& fieldset': { border: 'none' },
                  '& textarea': {
                    height: '100% !important',
                    overflow: 'auto !important',
                  },
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="*/*"
            aria-label="Attach files"
          />
          {/* Attach files button */}
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
            title="Attach files"
            sx={{
              width: { xs: 44, sm: 'auto' },
              height: { xs: 44, sm: 'auto' },
            }}
          >
            {uploading ? <CircularProgress size={18} /> : <Paperclip size={18} />}
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleClose} disabled={sending}>
            Discard
          </Button>
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} /> : <Send size={16} />}
            onClick={handleSend}
            disabled={sending || !to.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
