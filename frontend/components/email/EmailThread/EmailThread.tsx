import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Stack,
  CircularProgress,
} from '@mui/material';
import { ChevronDown, ChevronUp, Reply, Forward } from 'lucide-react';
import type { Email } from '@/lib/api/email';
import { emailApi } from '@/lib/api/email';
import { useTranslations } from '@/lib/hooks/use-translations';

/**
 * Props for EmailThread component
 */
interface EmailThreadProps {
  /**
   * Thread ID to load and display
   */
  threadId: string;

  /**
   * Initial emails in thread (optional, if already loaded)
   */
  initialEmails?: Email[];

  /**
   * Callback for reply action
   */
  onReply?: (email: Email) => void;

  /**
   * Callback for forward action
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
 * Format date for display
 */
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return d.toLocaleString('en-US', { weekday: 'short' });
  } else {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Single email message in thread
 */
interface ThreadMessageProps {
  email: Email;
  isExpanded: boolean;
  onToggle: () => void;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
}

const ThreadMessage: React.FC<ThreadMessageProps> = ({
  email,
  isExpanded,
  onToggle,
  onReply,
  onForward,
}) => {
  const t = useTranslations();
  const fromData = React.useMemo(() => parseEmailFrom(email.from), [email.from]);

  // Email body as pure HTML (no sanitization)
  const emailBody = React.useMemo(() => {
    return email.bodyHtml || email.bodyText || email.snippet || '';
  }, [email.bodyHtml, email.bodyText, email.snippet]);

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      {/* Header */}
      <Box
        onClick={onToggle}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          bgcolor: isExpanded ? 'action.hover' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Avatar sx={{ width: 32, height: 32 }}>
          {fromData.name?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: email.isRead ? 500 : 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fromData.name}
            </Typography>
            {!email.isRead && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                }}
              />
            )}
          </Box>
          {!isExpanded && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {email.snippet || email.bodyText?.substring(0, 100) || ''}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {formatDate(email.receivedAt)}
        </Typography>
        <IconButton size="small" sx={{ ml: 1 }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </IconButton>
      </Box>

      {/* Expanded Content */}
      <Collapse in={isExpanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* To/CC info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              To: {email.to?.join(', ') || ''}
            </Typography>
            {email.cc && email.cc.length > 0 && (
              <Typography variant="caption" color="text.secondary" display="block">
                CC: {email.cc.join(', ')}
              </Typography>
            )}
          </Box>

          {/* Body */}
          <Box
            sx={{ mb: 2, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: emailBody }}
          />

          {/* Actions */}
          <Stack direction="row" spacing={1}>
            {onReply && (
              <Tooltip title={t.dashboard.emailView.reply}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onReply(email); }}>
                  <Reply size={16} />
                </IconButton>
              </Tooltip>
            )}
            {onForward && (
              <Tooltip title={t.dashboard.emailView.forward}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onForward(email); }}>
                  <Forward size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
};

/**
 * EmailThread - Displays a conversation thread with all related emails
 *
 * Features:
 * - Loads all emails in a thread
 * - Collapses/expands individual messages
 * - Auto-expands latest message
 * - Reply/Forward actions per message
 *
 * @example
 * ```tsx
 * <EmailThread
 *   threadId="thread-123"
 *   onReply={(email) => handleReply(email)}
 *   onForward={(email) => handleForward(email)}
 * />
 * ```
 */
export const EmailThread: React.FC<EmailThreadProps> = ({
  threadId,
  initialEmails,
  onReply,
  onForward,
}) => {
  const [emails, setEmails] = useState<Email[]>(initialEmails || []);
  const [loading, setLoading] = useState(!initialEmails);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load thread emails
  useEffect(() => {
    if (initialEmails) {
      setEmails(initialEmails);
      // Auto-expand latest email
      if (initialEmails.length > 0) {
        setExpandedIds(new Set([initialEmails[initialEmails.length - 1].id]));
      }
      return;
    }

    const loadThread = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await emailApi.getThread(threadId);
        const threadEmails = response.data;

        // Sort by date (oldest first)
        threadEmails.sort((a, b) =>
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
        );

        setEmails(threadEmails);

        // Auto-expand latest email
        if (threadEmails.length > 0) {
          setExpandedIds(new Set([threadEmails[threadEmails.length - 1].id]));
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
        setError('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadThread();
  }, [threadId, initialEmails]);

  // Toggle message expansion
  const toggleExpanded = (emailId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (emails.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No messages in this conversation</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Thread subject */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        {emails[0]?.subject || '(No subject)'}
      </Typography>

      {/* Messages */}
      {emails.map((email) => (
        <ThreadMessage
          key={email.id}
          email={email}
          isExpanded={expandedIds.has(email.id)}
          onToggle={() => toggleExpanded(email.id)}
          onReply={onReply}
          onForward={onForward}
        />
      ))}
    </Box>
  );
};
