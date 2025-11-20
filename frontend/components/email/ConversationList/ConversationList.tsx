import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  Typography,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { ConversationListItem } from './ConversationListItem';
import { emailApi, type Conversation } from '@/lib/api/email';
import { useTranslations } from '@/lib/hooks/use-translations';

/**
 * Props for ConversationList component
 */
interface ConversationListProps {
  /**
   * Provider ID to filter conversations
   */
  providerId?: string;

  /**
   * Currently selected conversation thread ID
   */
  selectedThreadId?: string;

  /**
   * Callback when a conversation is selected
   */
  onSelectConversation?: (conversation: Conversation) => void;

  /**
   * Callback when refresh is triggered
   */
  onRefresh?: () => void;
}

/**
 * ConversationList - Display a list of email conversations/threads
 *
 * Features:
 * - Fetches and displays conversations from the API
 * - Supports pagination (load more)
 * - Handles loading and error states
 * - Allows selecting a conversation
 * - Star/unstar conversations
 * - Refresh functionality
 *
 * @example
 * ```tsx
 * <ConversationList
 *   providerId="gmail-provider-123"
 *   selectedThreadId={currentThreadId}
 *   onSelectConversation={(conv) => setCurrentThread(conv.threadId)}
 *   onRefresh={() => refetchData()}
 * />
 * ```
 */
export const ConversationList: React.FC<ConversationListProps> = ({
  providerId,
  selectedThreadId,
  onSelectConversation,
  onRefresh,
}) => {
  const t = useTranslations();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const ITEMS_PER_PAGE = 20;

  // Fetch conversations
  const fetchConversations = React.useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const response = await emailApi.getConversations({
          page,
          limit: ITEMS_PER_PAGE,
          providerId,
        });

        const { conversations: newConversations, pagination } = response.data;

        if (append) {
          setConversations((prev) => [...prev, ...newConversations]);
        } else {
          setConversations(newConversations);
        }

        setCurrentPage(pagination.page);
        setTotalPages(pagination.totalPages);
        setHasMore(pagination.page < pagination.totalPages);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        setError(t.dashboard.conversations.failedToLoad);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [providerId, t.dashboard.conversations.failedToLoad]
  );

  // Load conversations on mount and when providerId changes
  useEffect(() => {
    fetchConversations(1, false);
  }, [providerId, fetchConversations]);

  // Handle refresh
  const handleRefresh = () => {
    fetchConversations(1, false);
    onRefresh?.();
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchConversations(currentPage + 1, true);
    }
  };

  // Handle toggle star
  const handleToggleStar = async (conversation: Conversation) => {
    try {
      // Update the latest email in the thread
      await emailApi.updateEmail(conversation.latestEmailId, {
        isStarred: !conversation.isStarred,
      });

      // Optimistically update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.threadId === conversation.threadId
            ? { ...conv, isStarred: !conv.isStarred }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to toggle star:', err);
      // Revert on error by refetching
      fetchConversations(1, false);
    }
  };

  // Loading state
  if (loading && conversations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error && conversations.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={handleRefresh} startIcon={<RefreshCw size={16} />}>
              {t.dashboard.conversations.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (!loading && conversations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t.dashboard.conversations.noConversations}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t.dashboard.conversations.noConversationsDescription}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={handleRefresh}
        >
          {t.dashboard.conversations.retry}
        </Button>
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
      {/* Conversations List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List disablePadding>
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.threadId}
              conversation={conversation}
              isSelected={selectedThreadId === conversation.threadId}
              onClick={onSelectConversation}
              onToggleStar={handleToggleStar}
            />
          ))}
        </List>

        {/* Load More Button */}
        {hasMore && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loadingMore}
              startIcon={loadingMore ? <CircularProgress size={16} /> : null}
            >
              {loadingMore ? t.dashboard.conversations.loading : t.dashboard.conversations.loadMore}
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Page {currentPage} of {totalPages}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
