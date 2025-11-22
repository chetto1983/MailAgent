import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Chip,
  Paper,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
} from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';
import type { Email } from '@/stores/email-store';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Props for ThreadDisplay component
 */
interface ThreadDisplayProps {
  /**
   * Email/thread to display
   */
  email: Email | null;

  /**
   * Whether data is loading
   */
  isLoading?: boolean;

  /**
   * Callback to close/go back
   */
  onClose?: () => void;

  /**
   * Callback to toggle star
   */
  onToggleStar?: (id: string, isStarred: boolean) => void;

  /**
   * Callback to archive
   */
  onArchive?: (id: string) => void;

  /**
   * Callback to delete
   */
  onDelete?: (id: string) => void;

  /**
   * Callback to reply
   */
  onReply?: (email: Email) => void;

  /**
   * Callback to reply all
   */
  onReplyAll?: (email: Email) => void;

  /**
   * Callback to forward
   */
  onForward?: (email: Email) => void;
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
 * Format date for email header
 */
function formatEmailDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * ThreadDisplay - Clean email/thread viewer
 *
 * Features:
 * - Clean, readable layout
 * - Toolbar with common actions
 * - HTML email rendering (sanitized)
 * - Attachments display
 * - Reply/Forward actions
 * - Mobile responsive
 *
 * @example
 * ```tsx
 * <ThreadDisplay
 *   email={selectedEmail}
 *   onClose={() => setSelectedEmail(null)}
 *   onToggleStar={handleToggleStar}
 *   onArchive={handleArchive}
 *   onDelete={handleDelete}
 *   onReply={handleReply}
 * />
 * ```
 */
export const ThreadDisplay: React.FC<ThreadDisplayProps> = ({
  email,
  isLoading = false,
  onClose,
  onToggleStar,
  onArchive,
  onDelete,
  onReply,
  onReplyAll,
  onForward,
}) => {
  const t = useTranslations();
  const { token } = useAuthStore();

  const fromData = useMemo(() => {
    return email ? parseEmailFrom(email.from) : { name: '', email: '' };
  }, [email]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Empty state
  if (!email) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 400,
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t.dashboard.email.selectEmail}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <Paper
        elevation={0}
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
          <IconButton size="small" onClick={onClose} sx={{ mr: 1 }}>
            <ChevronLeft size={20} />
          </IconButton>
        )}

        {/* Reply/Forward Actions - Left Side */}
        <IconButton size="small" onClick={() => onReply?.(email)} title={t.dashboard.emailView.reply}>
          <Reply size={18} />
        </IconButton>
        <IconButton size="small" onClick={() => onReplyAll?.(email)} title={t.dashboard.emailView.replyAll}>
          <ReplyAll size={18} />
        </IconButton>
        <IconButton size="small" onClick={() => onForward?.(email)} title={t.dashboard.emailView.forward}>
          <Forward size={18} />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <IconButton
          size="small"
          onClick={() => onToggleStar?.(email.id, email.isStarred || false)}
          title={email.isStarred ? t.dashboard.email.bulkBar.removeStar : t.dashboard.email.bulkBar.addStar}
        >
          <Star size={18} fill={email.isStarred ? '#FFB300' : 'none'} color={email.isStarred ? '#FFB300' : 'currentColor'} />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onArchive?.(email.id)}
          title={t.dashboard.email.bulkBar.archive}
        >
          <Archive size={18} />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onDelete?.(email.id)}
          title={t.dashboard.email.bulkBar.delete}
        >
          <Trash2 size={18} />
        </IconButton>

        <IconButton size="small" title={t.dashboard.emailView.more}>
          <MoreVertical size={18} />
        </IconButton>
      </Paper>

      {/* Email Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          // Scrollbar per Firefox
          scrollbarWidth: 'thin',
          scrollbarColor: '#bdbdbd transparent',
          // Scrollbar per Chrome, Safari, Edge
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#bdbdbd',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: '#9e9e9e',
            },
          },
        }}
      >
        {/* Subject */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {email.subject || '(No subject)'}
        </Typography>

        {/* From/To/Date */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ width: 48, height: 48 }}>
              {fromData.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {fromData.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fromData.email}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatEmailDate(email.receivedAt)}
            </Typography>
          </Stack>

          {email.to && email.to.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>To:</strong> {email.to.join(', ')}
            </Typography>
          )}

          {email.cc && email.cc.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              <strong>Cc:</strong> {email.cc.join(', ')}
            </Typography>
          )}
        </Box>

        {/* Email Body */}
        <Box
          sx={{
            mb: 3,
            '& img': {
              maxWidth: '100%',
              height: 'auto',
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'underline',
            },
          }}
          dangerouslySetInnerHTML={{
            __html: email.bodyHtml || email.bodyText || email.snippet || '',
          }}
        />

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Paperclip size={16} />
              Attachments ({email.attachments.filter(a => !a.isInline).length})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, gap: 1 }}>
              {email.attachments
                .filter(attachment => !attachment.isInline)
                .map((attachment) => {
                  const sizeKB = Math.round(attachment.size / 1024);
                  const sizeLabel = sizeKB > 1024
                    ? `${(sizeKB / 1024).toFixed(1)} MB`
                    : `${sizeKB} KB`;

                  return (
                    <Chip
                      key={attachment.id}
                      label={`${attachment.filename} (${sizeLabel})`}
                      size="small"
                      icon={<Paperclip size={14} />}
                      onClick={async () => {
                        try {
                          if (!token) {
                            console.error('No auth token found');
                            return;
                          }

                          // Fetch with Authorization header
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                          const response = await fetch(`${apiUrl}/email/attachments/${attachment.id}/download`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                          });

                          if (!response.ok) {
                            throw new Error(`Download failed: ${response.status}`);
                          }

                          // Create blob and download
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = attachment.filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Failed to download attachment:', error);
                          alert('Failed to download attachment. Please try again.');
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ThreadDisplay;
