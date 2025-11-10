import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton,
  Button,
  Stack,
} from '@mui/material';
import {
  Mail,
  Star,
  StarOff,
  Trash2,
  Reply,
  Forward,
  X,
  MailOpen,
  Paperclip,
} from 'lucide-react';
import type { Email } from '@/lib/api/email';
interface EmailViewCopy {
  selectEmail: string;
  folderLabel: string;
  attachments: string;
  to: string;
  cc: string;
  labels: string;
  date: string;
  reply: string;
  forward: string;
  summaryTitle: string;
  summaryGenerate: string;
  summaryRegenerate: string;
  summaryEmpty: string;
  smartRepliesTitle: string;
  smartRepliesGenerate: string;
  smartRepliesRegenerate: string;
  smartRepliesLoading: string;
  smartRepliesEmpty: string;
  labelTitle: string;
  labelEmpty: string;
  memoryTitle: string;
  memoryDescription: string;
  memoryPlaceholder: string;
  memoryGenerate: string;
  memoryRegenerate: string;
  memoryLoading: string;
  memoryEmpty: string;
  memoryCopy: string;
  memoryCopied: string;
  memoryUse: string;
  memoryQueryRequired: string;
  memorySourceEmail: string;
  memorySourceDocument: string;
  memoryConfidenceLabel: string;
  memoryConfidenceHigh: string;
  memoryConfidenceMedium: string;
  memoryConfidenceLow: string;
  memoryUnknownSender: string;
  memoryLastQueryPrefix: string;
  memoryCopyError: string;
  memoryError: string;
}

interface EmailViewProps {
  selectedEmail: Email | null;
  onToggleStar: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  onDelete: (email: Email) => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onClose?: () => void;
  className?: string;
  t: EmailViewCopy;
  locale: string;
}

/**
 * Material Design 3 Email View Component
 *
 * Features:
 * - Material elevation system
 * - WCAG 2.1 AA compliant
 * - Responsive layout
 * - Action buttons with proper touch targets
 * - Support for HTML and text emails
 * - Attachments display
 */
export function EmailView({
  selectedEmail,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
  onClose,
  className = '',
  t,
  locale,
}: EmailViewProps) {
  const [iframeHeight, setIframeHeight] = useState(600);

  useEffect(() => {
    setIframeHeight(600);
  }, [selectedEmail?.id]);

  const htmlDocument = useMemo(() => {
    if (!selectedEmail?.bodyHtml) return '';
    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
            background: #ffffff;
            color: #111;
          }
          img, video, iframe {
            max-width: 100%;
            height: auto;
          }
          table {
            width: 100% !important;
          }
        </style>
      </head>
      <body>${selectedEmail.bodyHtml}</body>
    </html>`;
  }, [selectedEmail?.bodyHtml]);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = event.currentTarget;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        const newHeight = doc.body.scrollHeight;
        if (newHeight) {
          setIframeHeight(Math.max(newHeight, 400));
        }
      }
    } catch (error) {
      console.warn('Unable to compute iframe height', error);
    }
  };

  // Empty state
  if (!selectedEmail) {
    return (
      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          p: 6,
          minHeight: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
        className={className}
      >
        <Mail size={48} style={{ opacity: 0.3 }} />
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          maxWidth="sm"
        >
          {t.selectEmail}
        </Typography>
      </Paper>
    );
  }

  const displayName = selectedEmail.from?.split('<')[0].trim() || selectedEmail.from;

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      className={className}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, md: 2 },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: 1.5 }}
        >
          <Chip
            label={`${t.folderLabel}: ${selectedEmail.folder || 'Inbox'}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', letterSpacing: '0.08em', px: 0.75 }}
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(selectedEmail.receivedAt).toLocaleString(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Typography>
        </Stack>

        {/* Title and meta */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            mb: 1.5,
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: { xs: 36, md: 40 },
              height: { xs: 36, md: 40 },
              fontSize: '1.1rem',
            }}
          >
            {displayName[0]?.toUpperCase() || 'E'}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontSize: { xs: '1.1rem', md: '1.4rem' },
                fontWeight: 600,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 0.5,
              }}
            >
              {selectedEmail.subject || '(No subject)'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              <strong>From:</strong> {displayName}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={0.25}>
            <IconButton
              size="small"
              aria-label={selectedEmail.isStarred ? 'Unstar email' : 'Star email'}
              onClick={() => onToggleStar(selectedEmail)}
              sx={{
                width: 36,
                height: 36,
                color: selectedEmail.isStarred ? 'warning.main' : 'text.secondary',
              }}
            >
              {selectedEmail.isStarred ? (
                <Star size={16} fill="currentColor" />
              ) : (
                <StarOff size={16} />
              )}
            </IconButton>

            <IconButton
              size="small"
              aria-label={selectedEmail.isRead ? 'Mark as unread' : 'Mark as read'}
              onClick={() => onToggleRead(selectedEmail)}
              sx={{ width: 36, height: 36 }}
            >
              {selectedEmail.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
            </IconButton>

            <IconButton
              size="small"
              aria-label="Delete email"
              onClick={() => onDelete(selectedEmail)}
              color="error"
              sx={{ width: 36, height: 36 }}
            >
              <Trash2 size={16} />
            </IconButton>

            {onClose && (
              <IconButton
                size="small"
                aria-label="Close email"
                onClick={onClose}
                sx={{ width: 36, height: 36, display: { md: 'none' } }}
              >
                <X size={16} />
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Reply/Forward buttons */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            startIcon={<Reply />}
            onClick={() => onReply(selectedEmail)}
            size="small"
          >
            {t.reply}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Forward />}
            onClick={() => onForward(selectedEmail)}
            size="small"
          >
            {t.forward}
          </Button>
        </Stack>
      </Box>

      {selectedEmail && (
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
          {(selectedEmail.to || selectedEmail.cc || selectedEmail.labels) && (
            <Box
              sx={{
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                mb: 1.5,
              }}
            >
              <Stack spacing={1}>
                {selectedEmail.to && selectedEmail.to.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>{t.to}:</strong>{' '}
                    {Array.isArray(selectedEmail.to)
                      ? selectedEmail.to.join(', ')
                      : selectedEmail.to}
                  </Typography>
                )}
                {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>{t.cc}:</strong>{' '}
                    {Array.isArray(selectedEmail.cc)
                      ? selectedEmail.cc.join(', ')
                      : selectedEmail.cc}
                  </Typography>
                )}
                {selectedEmail.labels && selectedEmail.labels.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>{t.labels}:</strong>
                    </Typography>
                    {selectedEmail.labels.map((label) => (
                      <Chip key={label} label={label} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          <Paper
            elevation={0}
            sx={{
              p: 0,
              bgcolor: 'background.default',
              borderRadius: 2,
              maxHeight: { md: '65vh' },
              overflow: 'auto',
            }}
          >
            {selectedEmail.bodyHtml && htmlDocument ? (
              <iframe
                title="email-body"
                srcDoc={htmlDocument}
                style={{
                  border: 'none',
                  width: '100%',
                  height: iframeHeight,
                }}
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-scripts"
              />
            ) : (
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontSize: '15px',
                  lineHeight: 1.7,
                  m: 0,
                  p: { xs: 2, md: 3 },
                }}
              >
                {selectedEmail.bodyText}
              </Typography>
            )}
          </Paper>

          {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Paperclip size={16} />
                {t.attachments} ({selectedEmail.attachments.length})
              </Typography>
              <Stack spacing={1}>
                {selectedEmail.attachments.map((attachment) => (
                  <Paper
                    key={attachment.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mr: 2,
                      }}
                    >
                      {attachment.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(attachment.size / 1024)} KB
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>{t.date}:</strong>{' '}
          {new Date(selectedEmail.sentAt || selectedEmail.receivedAt).toLocaleString(
            locale,
            {
              dateStyle: 'full',
              timeStyle: 'medium',
            }
          )}
        </Typography>
      </Box>
    </Paper>
  );
}

export default EmailView;
