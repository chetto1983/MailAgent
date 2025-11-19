import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  Button,
  Paper,
} from '@mui/material';
import {
  ArrowLeft,
  Archive,
  Trash2,
  MoreVertical,
  Reply,
  Forward,
  Download,
} from 'lucide-react';
import type { Email } from '@/stores/email-store';
import { useTranslations } from '@/lib/hooks/use-translations';

/**
 * Email attachment interface
 */
interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url?: string;
}

/**
 * Props for EmailDetail component
 */
interface EmailDetailProps {
  /**
   * Email to display
   */
  email: Email;

  /**
   * Callback to close detail view
   */
  onClose?: () => void;

  /**
   * Callback to archive email
   */
  onArchive?: (emailId: string) => void;

  /**
   * Callback to delete email
   */
  onDelete?: (emailId: string) => void;

  /**
   * Callback to reply to email
   */
  onReply?: (email: Email) => void;

  /**
   * Callback to forward email
   */
  onForward?: (email: Email) => void;

  /**
   * Callback for more options menu
   */
  onMoreOptions?: (event: React.MouseEvent<HTMLElement>) => void;

  /**
   * Attachments data (if available)
   */
  attachments?: Attachment[];
}

/**
 * Parse email from field
 */
function parseEmailFrom(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim() || match[1].trim(),
    };
  }
  return { name: from, email: from };
}

/**
 * Format date for display
 */
function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * EmailDetail - Email detail view component
 *
 * Displays full email content with:
 * - Header with action buttons
 * - Sender information
 * - Email body (HTML)
 * - Attachments list
 * - Reply/Forward buttons
 *
 * @example
 * ```tsx
 * <EmailDetail
 *   email={selectedEmail}
 *   onClose={() => setSelectedEmail(null)}
 *   onDelete={(id) => handleDelete(id)}
 *   onReply={(email) => handleReply(email)}
 * />
 * ```
 */
export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onClose,
  onArchive,
  onDelete,
  onReply,
  onForward,
  onMoreOptions,
  attachments,
}) => {
  const t = useTranslations();
  const fromData = useMemo(() => parseEmailFrom(email.from), [email.from]);

  // Sanitize email body (basic HTML sanitization)
  const emailBody = useMemo(() => {
    return email.body || email.bodyPreview || '';
  }, [email.body, email.bodyPreview]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header with Actions */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {onClose && (
          <Tooltip title="Back">
            <IconButton size="small" onClick={onClose}>
              <ArrowLeft size={18} />
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        {onArchive && (
          <Tooltip title="Archive">
            <IconButton size="small" onClick={() => onArchive(email.id)}>
              <Archive size={18} />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title={t.common.delete}>
            <IconButton size="small" onClick={() => onDelete(email.id)}>
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        )}
        {onMoreOptions && (
          <Tooltip title="More">
            <IconButton size="small" onClick={onMoreOptions}>
              <MoreVertical size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Email Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Subject */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          {email.subject || '(No subject)'}
        </Typography>

        {/* Sender Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ width: 48, height: 48 }}>
            {fromData.name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {fromData.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fromData.email}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatDate(email.receivedAt)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Email Body */}
        <Box
          sx={{ mb: 3, wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: emailBody }}
        />

        {/* Attachments */}
        {email.hasAttachments && attachments && attachments.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t.dashboard.emailView?.attachments || 'Attachments'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((attachment) => (
                <Paper
                  key={attachment.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 200,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {attachment.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(attachment.size)}
                    </Typography>
                  </Box>
                  {attachment.url && (
                    <IconButton
                      size="small"
                      component="a"
                      href={attachment.url}
                      download={attachment.filename}
                    >
                      <Download size={16} />
                    </IconButton>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        {onReply && (
          <Button
            variant="outlined"
            startIcon={<Reply size={16} />}
            onClick={() => onReply(email)}
          >
            Reply
          </Button>
        )}
        {onForward && (
          <Button
            variant="outlined"
            startIcon={<Forward size={16} />}
            onClick={() => onForward(email)}
          >
            Forward
          </Button>
        )}
      </Box>
    </Box>
  );
};
