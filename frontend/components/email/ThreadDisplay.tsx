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
  Divider,
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
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
} from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';
import { useEmailStore, type Email } from '@/stores/email-store';
import { useAuthStore } from '@/stores/auth-store';
import { LabelSelector } from '@/components/labels';
import { useLabelStore } from '@/stores/label-store';

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

  /**
   * Callback when labels change
   */
  onLabelsChange?: (emailId: string, labelIds: string[], updatedEmail?: any) => void;
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
 * Get appropriate icon based on file extension
 */
function getFileIcon(filename: string, size = 14): React.ReactElement {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Documents
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return <FileText size={size} />;
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return <ImageIcon size={size} />;
  }

  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'mpeg', 'mpg'].includes(ext)) {
    return <Video size={size} />;
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return <Music size={size} />;
  }

  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return <FileSpreadsheet size={size} />;
  }

  // Code
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift'].includes(ext)) {
    return <FileCode size={size} />;
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return <FileArchive size={size} />;
  }

  // Default
  return <File size={size} />;
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
  onLabelsChange,
}) => {
  const t = useTranslations();
  const { token } = useAuthStore();
  const { addEmailsToLabel, removeEmailFromLabel } = useLabelStore();

  // Get full thread conversation using the new thread support
  // Subscribe to both getEmailThread and threads to ensure reactivity when WebSocket updates arrive
  const emailStore = useEmailStore();

  // Calculate thread emails - will recalculate when store updates (including threads Map changes)
  const threadEmails = useMemo(() => {
    if (!email) return [];
    return emailStore.getEmailThread(email.id);
  }, [email, emailStore]);

  // Use the first email in thread for primary display data
  const primaryEmail = threadEmails[0] || email;
  const isThreadConversation = threadEmails.length > 1;

  const handleLabelsChange = async (labelIds: string[]) => {
    if (!email) return;

    // Get current label IDs from emailLabels relationship
    const currentLabels = email.emailLabels?.map(el => el.label.id) || [];
    const added = labelIds.filter(id => !currentLabels.includes(id));
    const removed = currentLabels.filter(id => !labelIds.includes(id));

    try {
      let updatedEmail = email;

      // Add new labels - backend returns updated emails
      if (added.length > 0) {
        for (const labelId of added) {
          const result = await addEmailsToLabel(labelId, [email.id]);
          // Use the last returned email with all updates
          if (result.emails && result.emails.length > 0) {
            updatedEmail = result.emails[0];
          }
        }
      }

      // Remove old labels - backend returns updated email
      if (removed.length > 0) {
        for (const labelId of removed) {
          const result = await removeEmailFromLabel(labelId, email.id);
          // Use the returned email with all updates
          if (result.email) {
            updatedEmail = result.email;
          }
        }
      }

      // Notify parent with the updated email data from backend
      onLabelsChange?.(email.id, labelIds, updatedEmail);
    } catch (error) {
      console.error('Failed to update labels:', error);
    }
  };

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
          {primaryEmail.subject || '(No subject)'}
          {isThreadConversation && (
            <Chip
              label={`${threadEmails.length} messages`}
              size="small"
              sx={{ ml: 2, fontSize: '0.75rem' }}
            />
          )}
        </Typography>

        {/* Labels - Show for primary email */}
        {onLabelsChange && email && (
          <Box sx={{ mb: 2 }}>
            <LabelSelector
              selectedLabelIds={email.emailLabels?.map(el => el.label.id) || []}
              onLabelsChange={handleLabelsChange}
              variant="chips"
            />
          </Box>
        )}

        {/* Thread Conversation - Show all emails in chronological order */}
        {threadEmails.map((threadEmail, index) => {
          const emailFromData = parseEmailFrom(threadEmail.from);
          const isLastEmail = index === threadEmails.length - 1;

          return (
            <Box key={threadEmail.id}>
              {/* Email Header */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {emailFromData.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {emailFromData.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {emailFromData.email}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatEmailDate(threadEmail.receivedAt)}
                  </Typography>
                </Stack>

                {threadEmail.to && threadEmail.to.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 7 }}>
                    <strong>To:</strong> {threadEmail.to.join(', ')}
                  </Typography>
                )}

                {threadEmail.cc && threadEmail.cc.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 7 }}>
                    <strong>Cc:</strong> {threadEmail.cc.join(', ')}
                  </Typography>
                )}
              </Box>

              {/* Attachments */}
              {threadEmail.attachments && threadEmail.attachments.length > 0 && threadEmail.attachments.filter(a => !a.isInline).length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'background.default',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Paperclip size={16} />
                    {threadEmail.attachments.filter(a => !a.isInline).length} {t.dashboard.email.attachment}
                    {threadEmail.attachments.filter(a => !a.isInline).length > 1 ? 's' : ''}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    {threadEmail.attachments
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
                            size="medium"
                            icon={getFileIcon(attachment.filename, 14)}
                            onClick={async (e) => {
                              try {
                                if (!token) {
                                  console.error('No auth token found');
                                  return;
                                }

                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                const response = await fetch(`${apiUrl}/email/attachments/${attachment.id}/download`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                  },
                                });

                                if (!response.ok) {
                                  throw new Error(`Download failed: ${response.status}`);
                                }

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);

                                if (e.ctrlKey || e.metaKey) {
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = attachment.filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                } else {
                                  const newWindow = window.open(url, '_blank');
                                  if (newWindow) {
                                    newWindow.addEventListener('load', () => {
                                      setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                    });
                                  } else {
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = attachment.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to open attachment:', error);
                                alert('Failed to open attachment. Please try again.');
                              }
                            }}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          />
                        );
                      })}
                  </Stack>
                </Paper>
              )}

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
                  __html: threadEmail.bodyHtml || threadEmail.bodyText || threadEmail.snippet || '',
                }}
              />

              {/* Divider between emails in thread (not after last email) */}
              {!isLastEmail && (
                <Divider sx={{ my: 3 }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ThreadDisplay;
