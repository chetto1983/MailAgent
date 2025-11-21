import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  Button,
  Paper,
  CircularProgress,
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
import {
  emailApi,
  type EmailAttachment,
  type SmartReply,
  type Category,
} from '@/lib/api/email';
import { useTranslations } from '@/lib/hooks/use-translations';
import { Sparkles, Tag } from 'lucide-react';
import { LabelSelector } from '@/components/labels';
import { useLabelStore } from '@/stores/label-store';

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
}) => {
  const t = useTranslations();
  const fromData = useMemo(() => parseEmailFrom(email.from), [email.from]);

  // Attachments state
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // AI features state
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [emailLabels, setEmailLabels] = useState<string[]>(email.labels || []);
  const [savingLabels, setSavingLabels] = useState(false);

  const { addEmailsToLabel, removeEmailFromLabel } = useLabelStore();

  // Load attachments if email has them
  useEffect(() => {
    const loadAttachments = async () => {
      if (!email.hasAttachments) {
        setAttachments([]);
        return;
      }

      // If email object already has attachments array, use it
      if ((email as any).attachments && Array.isArray((email as any).attachments)) {
        setAttachments((email as any).attachments);
        return;
      }

      // Otherwise we'd need to fetch from API
      // For now, show empty state as backend might not expose attachment list endpoint
      setAttachments([]);
    };

    loadAttachments();
  }, [email]);

  // Handle attachment download
  // Handle label changes
  const handleLabelsChange = useCallback(async (newLabelIds: string[]) => {
    const oldLabelIds = emailLabels;
    setEmailLabels(newLabelIds);
    setSavingLabels(true);

    try {
      // Find added and removed labels
      const addedLabels = newLabelIds.filter((id) => !oldLabelIds.includes(id));
      const removedLabels = oldLabelIds.filter((id) => !newLabelIds.includes(id));

      // Add new labels
      for (const labelId of addedLabels) {
        await addEmailsToLabel(labelId, [email.id]);
      }

      // Remove old labels
      for (const labelId of removedLabels) {
        await removeEmailFromLabel(labelId, email.id);
      }
    } catch (error) {
      console.error('Failed to update labels:', error);
      // Revert on error
      setEmailLabels(oldLabelIds);
    } finally {
      setSavingLabels(false);
    }
  }, [emailLabels, email.id, addEmailsToLabel, removeEmailFromLabel]);

  const handleDownloadAttachment = useCallback(async (attachmentId: string) => {
    try {
      setDownloadingAttachmentId(attachmentId);

      const response = await emailApi.downloadAttachment(email.id, attachmentId);

      if (response.data.downloadUrl) {
        // Open download URL in new window
        window.open(response.data.downloadUrl, '_blank');
      } else {
        console.error('No download URL available for attachment');
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
    } finally {
      setDownloadingAttachmentId(null);
    }
  }, [email.id]);

  // AI Features Handlers

  // Handle summarize email
  const handleSummarize = useCallback(async () => {
    if (summary) {
      setShowSummary(!showSummary);
      return;
    }

    try {
      setLoadingSummary(true);
      const response = await emailApi.summarizeEmail(email.id, 'it');
      setSummary(response.data.summary);
      setShowSummary(true);
    } catch (error) {
      console.error('Failed to summarize email:', error);
    } finally {
      setLoadingSummary(false);
    }
  }, [email.id, summary, showSummary]);

  // Handle categorize email (manual trigger)
  const handleCategorize = useCallback(async () => {
    if (categories.length > 0) {
      // Already loaded, do nothing (cached)
      return;
    }

    try {
      setLoadingCategories(true);
      const categorizeResponse = await emailApi.categorizeEmail(email.id);
      setCategories(categorizeResponse.data.categories);
    } catch (error) {
      console.error('Failed to categorize email:', error);
    } finally {
      setLoadingCategories(false);
    }
  }, [email.id, categories.length]);

  // Handle generate smart replies (manual trigger)
  const handleGenerateSmartReplies = useCallback(async () => {
    if (smartReplies.length > 0) {
      // Already loaded, do nothing (cached)
      return;
    }

    try {
      setLoadingSmartReplies(true);
      const replyResponse = await emailApi.generateSmartReply(email.id, 'it');
      setSmartReplies(replyResponse.data.replies);
    } catch (error) {
      console.error('Failed to generate smart replies:', error);
    } finally {
      setLoadingSmartReplies(false);
    }
  }, [email.id, smartReplies.length]);

  // Reset AI features when email changes
  useEffect(() => {
    setSummary(null);
    setShowSummary(false);
    setSmartReplies([]);
    setCategories([]);
  }, [email.id]);

  // Email body as pure HTML (no sanitization)
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
          <Tooltip title={t.dashboard.emailView.back}>
            <IconButton size="small" onClick={onClose}>
              <ArrowLeft size={18} />
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={categories.length > 0 ? t.dashboard.emailView.categoriesLoaded : t.dashboard.emailView.categoriesGenerate}>
          <IconButton
            size="small"
            onClick={handleCategorize}
            disabled={loadingCategories}
            color={categories.length > 0 ? 'primary' : 'default'}
          >
            {loadingCategories ? (
              <CircularProgress size={18} />
            ) : (
              <Tag size={18} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={smartReplies.length > 0 ? t.dashboard.emailView.smartRepliesLoaded : t.dashboard.emailView.smartRepliesGenerate}>
          <IconButton
            size="small"
            onClick={handleGenerateSmartReplies}
            disabled={loadingSmartReplies}
            color={smartReplies.length > 0 ? 'primary' : 'default'}
          >
            {loadingSmartReplies ? (
              <CircularProgress size={18} />
            ) : (
              <Reply size={18} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={summary ? (showSummary ? t.dashboard.emailView.summaryHide : t.dashboard.emailView.summaryShow) : t.dashboard.emailView.summaryGenerate}>
          <IconButton
            size="small"
            onClick={handleSummarize}
            disabled={loadingSummary}
            color={summary ? 'primary' : 'default'}
          >
            {loadingSummary ? (
              <CircularProgress size={18} />
            ) : (
              <Sparkles size={18} />
            )}
          </IconButton>
        </Tooltip>
        {onArchive && (
          <Tooltip title={t.dashboard.emailView.archive}>
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
          <Tooltip title={t.dashboard.emailView.more}>
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

        {/* Labels */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Labels
          </Typography>
          <LabelSelector
            selectedLabelIds={emailLabels}
            onLabelsChange={handleLabelsChange}
            variant="chips"
            disabled={savingLabels}
          />
        </Box>

        {/* AI Categories */}
        {categories.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {categories.map((category, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: 'primary.50',
                  borderColor: 'primary.200',
                }}
              >
                <Tag size={14} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {category.name}
                </Typography>
                {category.confidence && (
                  <Typography variant="caption" color="text.secondary">
                    ({Math.round(category.confidence * 100)}%)
                  </Typography>
                )}
              </Paper>
            ))}
            {loadingCategories && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Categorizing...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* AI Summary */}
        {summary && showSummary && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              bgcolor: 'background.default',
              borderColor: 'primary.main',
              borderWidth: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sparkles size={16} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                AI Summary
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          </Paper>
        )}

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
                  <Tooltip title={t.dashboard.emailView.download}>
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadAttachment(attachment.id)}
                      disabled={downloadingAttachmentId === attachment.id}
                    >
                      {downloadingAttachmentId === attachment.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Download size={16} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Smart Reply Suggestions */}
      {smartReplies.length > 0 && onReply && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Sparkles size={14} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Smart Reply Suggestions
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: { xs: '200px', sm: '300px' },
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'action.hover',
                borderRadius: '3px',
              },
            }}
          >
            {smartReplies.map((reply, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => {
                  // TODO: Open compose dialog with prefilled reply
                  // For now, just trigger onReply callback
                  onReply(email);
                }}
              >
                <Typography variant="body2">{reply.text}</Typography>
                {reply.tone && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Tone: {reply.tone}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        </Box>
      )}
      {loadingSmartReplies && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">
            Generating smart replies...
          </Typography>
        </Box>
      )}

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
