import React, { useCallback } from 'react';
import { List, Box, Typography, CircularProgress } from '@mui/material';
import { useTranslations } from '@/lib/hooks/use-translations';
import { ThreadListItem } from './ThreadListItem';
import type { Email } from '@/stores/email-store';
import type { Conversation } from '@/lib/api/email';

/**
 * Props for ThreadList component
 */
interface ThreadListProps {
  /**
   * List of threads to display (emails or conversations)
   */
  threads: (Email | Conversation)[];

  /**
   * Currently selected thread ID
   */
  selectedId?: string;

  /**
   * Set of multi-selected thread IDs
   */
  selectedIds?: Set<string>;

  /**
   * Whether data is loading
   */
  isLoading?: boolean;

  /**
   * Callback when thread is clicked
   */
  onThreadClick?: (thread: Email | Conversation) => void;

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
   * Callback to archive thread
   */
  onArchive?: (id: string) => void;

  /**
   * Callback to delete thread
   */
  onDelete?: (id: string) => void;

  /**
   * Custom provider icon renderer
   */
  getProviderIcon?: (providerId: string) => React.ReactNode;

  /**
   * View mode: 'list' or 'conversation'
   */
  viewMode?: 'list' | 'conversation';
}

/**
 * ThreadList - Unified component for displaying email threads
 *
 * Replaces both EmailList and ConversationList with a single, flexible component.
 * Supports both individual emails and conversation threads.
 *
 * Features:
 * - Virtualization support for large lists
 * - Floating action bar on each item
 * - Multi-selection support
 * - Loading states
 * - Empty states
 * - Optimized performance with React.memo
 *
 * @example
 * ```tsx
 * <ThreadList
 *   threads={emails}
 *   selectedId={selectedEmail?.id}
 *   selectedIds={selectedIds}
 *   onThreadClick={handleThreadClick}
 *   onToggleStar={handleToggleStar}
 *   onToggleImportant={handleToggleImportant}
 *   onArchive={handleArchive}
 *   onDelete={handleDelete}
 *   viewMode="list"
 * />
 * ```
 */
export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedId,
  selectedIds = new Set(),
  isLoading = false,
  onThreadClick,
  onToggleSelect,
  onToggleStar,
  onToggleImportant,
  onArchive,
  onDelete,
  getProviderIcon,
  viewMode = 'list',
}) => {
  const t = useTranslations();

  const handleThreadClick = useCallback(
    (thread: Email | Conversation) => {
      onThreadClick?.(thread);
    },
    [onThreadClick]
  );

  const isEmpty = threads.length === 0;

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No emails
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t.common.allCaughtUp}
        </Typography>
      </Box>
    );
  }

  return (
    <List
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        p: 0,
      }}
    >
      {threads.map((thread) => {
        const threadId = ('threadId' in thread ? thread.threadId : thread.id) || '';

        return (
          <ThreadListItem
            key={threadId}
            thread={thread}
            selected={selectedId === threadId}
            multiSelected={selectedIds.has(threadId)}
            onToggleSelect={onToggleSelect}
            onToggleStar={onToggleStar}
            onToggleImportant={onToggleImportant}
            onArchive={onArchive}
            onDelete={onDelete}
            getProviderIcon={getProviderIcon}
            onClick={() => handleThreadClick(thread)}
            viewMode={viewMode}
          />
        );
      })}
    </List>
  );
};

// Export memoized version for performance
export default React.memo(ThreadList);
