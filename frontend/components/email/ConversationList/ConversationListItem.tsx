import React from 'react';
import {
  Box,
  ListItem,
  ListItemButton,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import { Star, StarOff, Flag, Users } from 'lucide-react';
import type { Conversation } from '@/lib/api/email';

/**
 * Props for ConversationListItem component
 */
interface ConversationListItemProps {
  /**
   * The conversation to display
   */
  conversation: Conversation;

  /**
   * Whether this conversation is selected
   */
  isSelected?: boolean;

  /**
   * Callback when conversation is clicked
   */
  onClick?: (conversation: Conversation) => void;

  /**
   * Callback when star is toggled
   */
  onToggleStar?: (conversation: Conversation) => void;
}

/**
 * Parse email from field to extract name and email
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
 * Calculate participant count (sender + recipients)
 */
function getParticipantCount(conversation: Conversation): number {
  // Count unique participants: sender (from) + recipients (to)
  const participants = new Set<string>();
  participants.add(conversation.from);
  conversation.to.forEach((email) => participants.add(email));
  return participants.size;
}

/**
 * ConversationListItem - Display a conversation/thread in a list
 *
 * Features:
 * - Shows thread subject and snippet
 * - Displays participant count and email count
 * - Shows read/unread status
 * - Star and flag indicators
 * - Date of latest message
 * - Clickable to open full conversation
 *
 * @example
 * ```tsx
 * <ConversationListItem
 *   conversation={conversation}
 *   isSelected={selectedThreadId === conversation.threadId}
 *   onClick={(conv) => handleSelectConversation(conv)}
 *   onToggleStar={(conv) => handleToggleStar(conv)}
 * />
 * ```
 */
export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isSelected = false,
  onClick,
  onToggleStar,
}) => {
  const fromData = parseEmailFrom(conversation.from);
  const participantCount = getParticipantCount(conversation);
  const hasMultipleParticipants = participantCount > 2;

  const handleClick = () => {
    onClick?.(conversation);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(conversation);
  };

  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
        },
      }}
    >
      <ListItemButton
        onClick={handleClick}
        sx={{
          py: 1.5,
          px: 2,
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        {/* Avatar */}
        <Avatar
          sx={{
            width: 40,
            height: 40,
            mt: 0.5,
            fontSize: '1rem',
            bgcolor: conversation.isRead ? 'grey.400' : 'primary.main',
          }}
        >
          {fromData.name?.[0]?.toUpperCase() || 'U'}
        </Avatar>

        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header: From + Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: conversation.isRead ? 500 : 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                color: conversation.isRead ? 'text.primary' : 'text.primary',
              }}
            >
              {fromData.name}
            </Typography>

            {/* Unread indicator */}
            {!conversation.isRead && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  flexShrink: 0,
                }}
              />
            )}

            {/* Date */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {formatDate(conversation.receivedAt)}
            </Typography>
          </Box>

          {/* Subject Line */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: conversation.isRead ? 400 : 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 0.5,
              color: 'text.primary',
            }}
          >
            {conversation.subject || '(No subject)'}
          </Typography>

          {/* Snippet */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem',
              mb: 0.75,
            }}
          >
            {conversation.snippet || ''}
          </Typography>

          {/* Metadata: Counts + Labels */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Email count */}
            {conversation.emailCount > 1 && (
              <Chip
                label={`${conversation.emailCount} messages`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  bgcolor: 'action.hover',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}

            {/* Participant count (if multiple participants) */}
            {hasMultipleParticipants && (
              <Chip
                icon={<Users size={12} />}
                label={participantCount}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  bgcolor: 'action.hover',
                  '& .MuiChip-label': { px: 0.5 },
                  '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                }}
              />
            )}

            {/* Flag indicator */}
            {conversation.isFlagged && (
              <Flag size={14} color="#f44336" fill="#f44336" />
            )}

            {/* Labels */}
            {conversation.labels?.slice(0, 2).map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
            {conversation.labels && conversation.labels.length > 2 && (
              <Typography variant="caption" color="text.secondary">
                +{conversation.labels.length - 2}
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Actions: Star */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleStarClick}
            sx={{
              color: conversation.isStarred ? 'warning.main' : 'action.disabled',
              '&:hover': {
                color: 'warning.main',
              },
            }}
          >
            {conversation.isStarred ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
          </IconButton>
        </Box>
      </ListItemButton>
    </ListItem>
  );
};
