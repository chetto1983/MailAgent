import React from 'react';
import {
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Divider,
  Paper,
  Box,
  CircularProgress,
} from '@mui/material';
import { Mail, MailOpen, Star } from 'lucide-react';
import Checkbox from '@mui/material/Checkbox';
import type { Email } from '@/lib/api/email';

interface EmailListCopy {
  inboxLabel: string;
  loading: string;
  empty: string;
  threads: {
    singular: string;
    plural: string;
  };
}

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailClick: (email: Email) => void;
  loading: boolean;
  t: EmailListCopy;
  selectedEmailIds: Set<string>;
  onSelectEmail: (
    email: Email,
    index: number,
    options: { checked: boolean; shiftKey: boolean },
  ) => void;
  formatDate: (dateString: string) => string;
  extractDisplayName: (from: string) => string;
}

/**
 * Material Design 3 Email List Component
 *
 * Features:
 * - Material elevation and shadows
 * - WCAG 2.1 AA compliant colors
 * - Touch-friendly 48px+ targets
 * - Unread indicator with chip
 * - Star indicator for starred emails
 * - Responsive layout
 */
export function EmailList({
  emails,
  selectedEmail,
  onEmailClick,
  loading,
  t,
  selectedEmailIds,
  onSelectEmail,
  formatDate,
  extractDisplayName,
}: EmailListProps) {
  // Loading state
  if (loading) {
    return (
      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {t.loading}
        </Typography>
      </Paper>
    );
  }

  // Empty state
  if (!emails || emails.length === 0) {
    return (
      <Paper
        elevation={1}
        sx={{
          borderRadius: 2,
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <MailOpen size={48} style={{ opacity: 0.3 }} />
        <Typography variant="body1" color="text.secondary">
          {t.empty}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: '0.1em' }}
          >
            {t.inboxLabel}
          </Typography>
          <Typography variant="h6" component="h2">
            {t.inboxLabel}
          </Typography>
        </Box>
        <Chip
          label={`${emails.length} ${emails.length === 1 ? t.threads.singular : t.threads.plural}`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Email List */}
      <List sx={{ p: 0, maxHeight: { md: '72vh' }, overflowY: 'auto' }}>
        {emails.map((email, index) => {
          const isActive = selectedEmail?.id === email.id;
          const isChecked = selectedEmailIds.has(email.id);
          const displayName = extractDisplayName(email.from);

          return (
            <React.Fragment key={email.id}>
              <ListItemButton
                selected={isActive}
                onClick={() => onEmailClick(email)}
                sx={{
                  bgcolor: isChecked ? 'action.selected' : undefined,
                  py: 2,
                  px: 2.5,
                  minHeight: 88, // Touch-friendly target
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isChecked}
                  tabIndex={-1}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    onSelectEmail(email, index, {
                      checked: event.target.checked,
                      shiftKey: (event.nativeEvent as MouseEvent).shiftKey,
                    })
                  }
                  sx={{ mr: 1 }}
                />
                {/* Avatar */}
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: email.isRead ? 'grey.400' : 'primary.main',
                      width: 40,
                      height: 40,
                    }}
                  >
                    {displayName[0]?.toUpperCase() || <Mail size={20} />}
                  </Avatar>
                </ListItemAvatar>

                {/* Content */}
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      {/* Sender name */}
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: email.isRead ? 400 : 600,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        {!email.isRead && (
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
                        {displayName}
                      </Typography>

                      {/* Date and star */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexShrink: 0,
                        }}
                      >
                        {email.isStarred && (
                          <Star
                            size={16}
                            fill="currentColor"
                            style={{ color: '#FFC107' }}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(email.receivedAt)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <>
                      {/* Subject */}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          display: 'block',
                          fontWeight: email.isRead ? 400 : 500,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.5,
                        }}
                      >
                        {email.subject || '(No subject)'}
                      </Typography>

                      {/* Snippet */}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}
                      >
                        {email.snippet}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>

              {/* Divider between items (not after last) */}
              {index < emails.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
}
