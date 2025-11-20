import React from 'react';
import {
  ListItemButton,
  Box,
  Avatar,
  Typography,
  Checkbox,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import { Star, Paperclip, Tag } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { Email } from '@/stores/email-store';
import { useLabelStore } from '@/stores/label-store';

/**
 * Props for EmailListItem component
 */
interface EmailListItemProps {
  /**
   * Email data
   */
  email: Email;

  /**
   * Whether this email is currently selected (viewing detail)
   */
  selected?: boolean;

  /**
   * Whether this email is multi-selected (for bulk actions)
   */
  multiSelected?: boolean;

  /**
   * Callback to toggle multi-selection
   */
  onToggleSelect: (id: string) => void;

  /**
   * Callback to toggle star
   */
  onToggleStar?: (id: string, isStarred: boolean) => void;

  /**
   * Custom provider icon renderer
   */
  getProviderIcon?: (providerId: string) => React.ReactNode;

  /**
   * Callback when email is clicked
   */
  onClick?: (email: Email) => void;
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
 * EmailListItem - Memoized email list item component
 *
 * Optimized for performance with React.memo and proper prop dependencies.
 *
 * @example
 * ```tsx
 * <EmailListItem
 *   email={email}
 *   selected={selectedEmail?.id === email.id}
 *   multiSelected={selectedIds.has(email.id)}
 *   onToggleSelect={(id) => handleToggleSelect(id)}
 *   onToggleStar={(id, isStarred) => handleToggleStar(id, isStarred)}
 * />
 * ```
 */
export const EmailListItem = React.memo<EmailListItemProps>(
  ({ email, selected = false, multiSelected = false, onToggleSelect, onToggleStar, getProviderIcon, onClick }) => {
    const fromData = parseEmailFrom(email.from);
    const { getLabelById } = useLabelStore();

    // Setup draggable functionality
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: email.id,
      data: {
        type: 'email',
        email,
      },
    });

    // Apply transform for drag visual feedback
    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger email open if clicking on checkbox or star button
      if ((e.target as HTMLElement).closest('.MuiCheckbox-root, .MuiIconButton-root')) {
        return;
      }
      onClick?.(email);
    };

    return (
      <>
        <ListItemButton
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          selected={selected}
          onClick={handleClick}
          sx={{
            py: 1.5,
            px: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            bgcolor: email.isRead ? 'transparent' : 'action.hover',
            opacity: isDragging ? 0.5 : 1,
            cursor: isDragging ? 'grabbing' : 'pointer',
            transition: 'opacity 0.2s ease',
            '&.Mui-selected': {
              bgcolor: 'action.selected',
            },
            ...style,
          }}
        >
          {/* Multi-select Checkbox */}
          <Checkbox
            checked={multiSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(email.id);
            }}
            onClick={(e) => e.stopPropagation()}
            sx={{ p: 0, mt: 0.5 }}
          />

          {/* Avatar / Provider Icon */}
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: '1rem',
              mt: 0.5,
            }}
          >
            {getProviderIcon ? (
              getProviderIcon(email.providerId)
            ) : (
              fromData.name?.[0]?.toUpperCase() || 'U'
            )}
          </Avatar>

          {/* Email Content */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* From & Date */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: email.isRead ? 500 : 700,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fromData.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0 }}
              >
                {formatDate(email.receivedAt)}
              </Typography>
            </Box>

            {/* Subject */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: email.isRead ? 400 : 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email.subject || '(No subject)'}
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
              {email.bodyPreview || ''}
            </Typography>

            {/* Labels and Indicators */}
            {((email.labels && email.labels.length > 0) || email.hasAttachments) && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {/* Label Chips */}
                {email.labels && email.labels.slice(0, 3).map((labelId) => {
                  const label = getLabelById(labelId);
                  if (!label) return null;
                  return (
                    <Chip
                      key={labelId}
                      size="small"
                      icon={<Tag size={10} />}
                      label={label.name}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: label.color,
                        color: '#fff',
                        '& .MuiChip-icon': {
                          color: '#fff',
                        },
                      }}
                    />
                  );
                })}
                {email.labels && email.labels.length > 3 && (
                  <Chip
                    size="small"
                    label={`+${email.labels.length - 3}`}
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: 'action.hover',
                    }}
                  />
                )}
                {/* Attachment Indicator */}
                {email.hasAttachments && (
                  <Chip
                    size="small"
                    icon={<Paperclip size={12} />}
                    label="Attachment"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            )}
          </Box>

          {/* Star Button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleStar) {
                onToggleStar(email.id, email.isStarred || false);
              }
            }}
            sx={{ mt: 0.5 }}
          >
            <Star
              size={16}
              fill={email.isStarred ? '#FFB300' : 'none'}
              color={email.isStarred ? '#FFB300' : 'currentColor'}
            />
          </IconButton>
        </ListItemButton>
        <Divider />
      </>
    );
  },
  // Custom comparison function for memo
  (prevProps, nextProps) => {
    return (
      prevProps.email.id === nextProps.email.id &&
      prevProps.email.isRead === nextProps.email.isRead &&
      prevProps.email.isStarred === nextProps.email.isStarred &&
      prevProps.selected === nextProps.selected &&
      prevProps.multiSelected === nextProps.multiSelected
    );
  }
);

EmailListItem.displayName = 'EmailListItem';
