import React from 'react';
import {
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Paper,
  Box,
  CircularProgress,
  Badge,
  Stack,
} from '@mui/material';
import { Mail, MailOpen, Star, Paperclip } from 'lucide-react';
import Checkbox from '@mui/material/Checkbox';
import type { Email } from '@/lib/api/email';

interface Provider {
  id: string;
  email: string;
  providerType: 'google' | 'microsoft' | 'generic';
}

interface EmailListEnhancedProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailClick: (email: Email) => void;
  loading: boolean;
  selectedEmailIds: Set<string>;
  onSelectEmail: (
    email: Email,
    index: number,
    options: { checked: boolean; shiftKey: boolean },
  ) => void;
  formatDate: (dateString: string) => string;
  extractDisplayName: (from: string) => string;
  providers?: Provider[];
  emptyMessage?: string;
  loadingMessage?: string;
}

/**
 * Enhanced Email List Component - Gmail Style
 *
 * Features:
 * - Provider badges with icons
 * - Attachment indicators
 * - Hover states
 * - Multi-select with checkboxes
 * - Read/Unread states
 * - Star indicators
 * - Responsive layout
 * - Touch-friendly targets (48px+)
 */
export function EmailListEnhanced({
  emails,
  selectedEmail,
  onEmailClick,
  loading,
  selectedEmailIds,
  onSelectEmail,
  formatDate,
  extractDisplayName,
  providers = [],
  emptyMessage = 'No emails to display',
  loadingMessage = 'Loading emails...',
}: EmailListEnhancedProps) {
  const getProviderInfo = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return null;

    const icons = {
      google: '📧',
      microsoft: '📨',
      generic: '📬',
    };

    const colors = {
      google: '#4285F4',
      microsoft: '#00A4EF',
      generic: '#757575',
    };

    return {
      icon: icons[provider.providerType] || icons.generic,
      color: colors[provider.providerType] || colors.generic,
      email: provider.email,
      type: provider.providerType,
    };
  };

  // Loading state
  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {loadingMessage}
        </Typography>
      </Paper>
    );
  }

  // Empty state
  if (!emails || emails.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <MailOpen size={48} style={{ opacity: 0.3 }} />
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <List sx={{ p: 0 }}>
        {emails.map((email, index) => {
          const isActive = selectedEmail?.id === email.id;
          const isChecked = selectedEmailIds.has(email.id);
          const displayName = extractDisplayName(email.from);
          const providerInfo = getProviderInfo(email.providerId);
          const hasAttachments =
            email.attachments && email.attachments.length > 0;

          return (
            <React.Fragment key={email.id}>
              <ListItemButton
                selected={isActive}
                onClick={() => onEmailClick(email)}
                sx={{
                  bgcolor: isChecked
                    ? 'action.selected'
                    : isActive
                      ? 'action.hover'
                      : undefined,
                  py: 1.5,
                  px: { xs: 1, sm: 2 },
                  minHeight: 72,
                  gap: 1,
                  '&.Mui-selected': {
                    bgcolor: 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  },
                  '&:hover': {
                    bgcolor: isActive ? 'action.selected' : 'action.hover',
                    '& .email-checkbox': {
                      opacity: 1,
                    },
                  },
                  borderLeft: !email.isRead ? 3 : 0,
                  borderColor: 'primary.main',
                }}
              >
                {/* Checkbox */}
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isChecked}
                  tabIndex={-1}
                  className="email-checkbox"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    onSelectEmail(email, index, {
                      checked: event.target.checked,
                      shiftKey: (event.nativeEvent as MouseEvent).shiftKey,
                    })
                  }
                  sx={{
                    opacity: { xs: 1, md: isChecked ? 1 : 0 },
                    transition: 'opacity 0.2s',
                    mr: 0.5,
                  }}
                />

                {/* Star Icon (outside checkbox) */}
                {email.isStarred && (
                  <Star
                    size={16}
                    fill="#FFC107"
                    style={{ color: '#FFC107', flexShrink: 0, marginLeft: 4 }}
                  />
                )}

                {/* Avatar */}
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      providerInfo ? (
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                          title={providerInfo.email}
                        >
                          {providerInfo.icon}
                        </Box>
                      ) : null
                    }
                  >
                    <Avatar
                      sx={{
                        bgcolor: email.isRead ? 'grey.400' : 'primary.main',
                        width: 36,
                        height: 36,
                        fontSize: '0.95rem',
                      }}
                    >
                      {displayName[0]?.toUpperCase() || <Mail size={18} />}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>

                {/* Content */}
                <ListItemText
                  sx={{ my: 0, flex: 1, minWidth: 0 }}
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 0.5 }}
                    >
                      {/* Sender name */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: email.isRead ? 400 : 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {displayName}
                      </Typography>

                      {/* Date and indicators */}
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{ flexShrink: 0 }}
                      >
                        {hasAttachments && (
                          <Paperclip
                            size={14}
                            style={{
                              color: 'var(--mui-palette-text-secondary)',
                            }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {formatDate(email.receivedAt)}
                        </Typography>
                      </Stack>
                    </Stack>
                  }
                  secondary={
                    <>
                      {/* Subject */}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          display: 'block',
                          fontWeight: email.isRead ? 400 : 600,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.25,
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
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '0.8125rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {email.snippet}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>

              {/* Divider between items */}
              {index < emails.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
}
