import React, { useState, useMemo } from 'react';
import { ListItemButton, Box, Typography, Checkbox, Chip, Divider } from '@mui/material';
import { Paperclip, Users } from 'lucide-react';
import type { Email } from '@/stores/email-store';
import type { Conversation } from '@/lib/api/email';
import { useLabelStore } from '@/stores/label-store';
import { ThreadActionBar, ThreadAvatar, ThreadLabels } from './shared';

/**
 * Props for ThreadListItem component
 */
interface ThreadListItemProps {
  /**
   * Thread data (email or conversation)
   */
  thread: Email | Conversation;

  /**
   * Whether this thread is selected
   */
  selected?: boolean;

  /**
   * Whether this thread is multi-selected
   */
  multiSelected?: boolean;

  /**
   * Callback to toggle selection
   */
  onToggleSelect?: (id: string) => void;

  /**
   * Callback to toggle star
   */
  onToggleStar?: (id: string, isStarred: boolean) => void;

  /**
   * Callback to toggle important
   */
  onToggleImportant?: (id: string, isImportant: boolean) => void;

  /**
   * Callback to archive
   */
  onArchive?: (id: string) => void;

  /**
   * Callback to delete
   */
  onDelete?: (id: string) => void;

  /**
   * Custom provider icon renderer
   */
  getProviderIcon?: (providerId: string) => React.ReactNode;

  /**
   * Callback when clicked
   */
  onClick?: () => void;

  /**
   * View mode
   */
  viewMode?: 'list' | 'conversation';
}

/**
 * Type guard to check if thread is Email
 */
function isEmail(thread: Email | Conversation): thread is Email {
  return 'providerId' in thread;
}

/**
 * Type guard to check if thread is Conversation
 */
function isConversation(thread: Email | Conversation): thread is Conversation {
  return 'emailCount' in thread;
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
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (hours < 24 * 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * ThreadListItem - Unified list item for emails and conversations
 *
 * Features:
 * - Supports both Email and Conversation types
 * - Floating action bar on hover
 * - Multi-selection support
 * - Optimized with React.memo
 * - Accessible with proper ARIA attributes
 */
export const ThreadListItem = React.memo<ThreadListItemProps>(
  ({
    thread,
    selected = false,
    multiSelected = false,
    onToggleSelect,
    onToggleStar,
    onToggleImportant,
    onArchive,
    onDelete,
    getProviderIcon,
    onClick,
    viewMode: _viewMode = 'list',
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { getLabelById } = useLabelStore();

    // Extract common properties
    const { threadId, from, subject, snippet, receivedAt, isRead, isStarred, isImportant, labels } =
      useMemo(() => {
        if (isEmail(thread)) {
          return {
            threadId: thread.id,
            from: thread.from,
            subject: thread.subject,
            snippet: thread.bodyPreview || '',
            receivedAt: thread.receivedAt,
            isRead: thread.isRead,
            isStarred: thread.isStarred || false,
            isImportant: thread.isImportant || false,
            labels: thread.labels || [],
          };
        } else {
          return {
            threadId: thread.threadId || '',
            from: thread.from,
            subject: thread.subject,
            snippet: thread.snippet || '',
            receivedAt: thread.receivedAt,
            isRead: thread.isRead,
            isStarred: thread.isStarred || false,
            isImportant: false,
            labels: thread.labels || [],
          };
        }
      }, [thread]);

    const fromData = useMemo(() => parseEmailFrom(from), [from]);

    const handleClick = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.MuiCheckbox-root')) {
        return;
      }
      onClick?.();
    };

    const handleToggleStar = () => {
      onToggleStar?.(threadId, isStarred);
    };

    const handleToggleImportant = () => {
      onToggleImportant?.(threadId, isImportant);
    };

    const handleArchive = () => {
      onArchive?.(threadId);
    };

    const handleDelete = () => {
      onDelete?.(threadId);
    };

    const handleToggleSelect = () => {
      onToggleSelect?.(threadId);
    };

    // Convert labels to ThreadLabels format
    const labelsData = useMemo(() => {
      return labels
        .map((labelId) => {
          const label = getLabelById(labelId);
          if (!label) return null;
          return {
            id: labelId,
            name: label.name,
            color: label.color,
          };
        })
        .filter((label): label is NonNullable<typeof label> => label !== null);
    }, [labels, getLabelById]);

    // Get email count for conversations
    const emailCount = isConversation(thread) ? thread.emailCount : undefined;

    return (
      <>
        <ListItemButton
          selected={selected}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          sx={{
            py: 1.5,
            px: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            bgcolor: isRead ? 'transparent' : 'action.hover',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            position: 'relative',
            '&.Mui-selected': {
              bgcolor: 'action.selected',
            },
            '&:hover': {
              bgcolor: isRead ? 'action.hover' : 'action.selected',
            },
          }}
        >
          {/* Checkbox */}
          {onToggleSelect && (
            <Checkbox
              checked={multiSelected}
              onChange={handleToggleSelect}
              onClick={(e) => e.stopPropagation()}
              sx={{
                p: 0,
                mt: 0.5,
                width: { xs: 44, sm: 'auto' },
                height: { xs: 44, sm: 'auto' },
              }}
            />
          )}

          {/* Avatar */}
          <Box sx={{ mt: 0.5 }}>
            <ThreadAvatar
              email={fromData.email}
              name={fromData.name}
              providerIcon={isEmail(thread) ? getProviderIcon?.(thread.providerId) : undefined}
              isUnread={!isRead}
              size={40}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* From & Date */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isRead ? 500 : 700,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fromData.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {formatDate(receivedAt)}
              </Typography>
            </Box>

            {/* Subject */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: isRead ? 400 : 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subject || '(No subject)'}
            </Typography>

            {/* Snippet */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {snippet}
            </Typography>

            {/* Metadata: Labels, Attachments, Thread Count */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <ThreadLabels labels={labelsData} maxVisible={3} size="small" />

              {isEmail(thread) && thread.hasAttachments && (
                <Chip
                  size="small"
                  icon={<Paperclip size={12} />}
                  label="Attachment"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}

              {emailCount && emailCount > 1 && (
                <Chip
                  size="small"
                  icon={<Users size={12} />}
                  label={`${emailCount}`}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          </Box>

          {/* Floating Action Bar */}
          {(onToggleStar || onToggleImportant || onArchive || onDelete) && (
            <ThreadActionBar
              threadId={threadId}
              isStarred={isStarred}
              isImportant={isImportant}
              onToggleStar={handleToggleStar}
              onToggleImportant={handleToggleImportant}
              onArchive={handleArchive}
              onDelete={handleDelete}
              showOnHover
              isHovered={isHovered}
              position="center"
            />
          )}
        </ListItemButton>
        <Divider />
      </>
    );
  },
  (prevProps, nextProps) => {
    const prevThread = prevProps.thread;
    const nextThread = nextProps.thread;

    const prevId = 'threadId' in prevThread ? prevThread.threadId : prevThread.id;
    const nextId = 'threadId' in nextThread ? nextThread.threadId : nextThread.id;

    return (
      prevId === nextId &&
      prevThread.isRead === nextThread.isRead &&
      prevThread.isStarred === nextThread.isStarred &&
      ('isImportant' in prevThread ? prevThread.isImportant : false) ===
        ('isImportant' in nextThread ? nextThread.isImportant : false) &&
      prevProps.selected === nextProps.selected &&
      prevProps.multiSelected === nextProps.multiSelected
    );
  }
);

ThreadListItem.displayName = 'ThreadListItem';
