import React from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Box,
  Badge,
} from '@mui/material';
import {
  Inbox,
  Send,
  FilePenLine,
  Trash2,
  Star,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import type { EmailStats } from '@/lib/api/email';

export type FolderType = 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' | 'STARRED' | 'ALL';

interface FolderItem {
  id: FolderType;
  label: string;
  icon: LucideIcon;
  color?: string;
}

const folders: FolderItem[] = [
  { id: 'ALL', label: 'All Mail', icon: Archive },
  { id: 'INBOX', label: 'Inbox', icon: Inbox, color: 'primary.main' },
  { id: 'STARRED', label: 'Starred', icon: Star, color: '#FFC107' },
  { id: 'SENT', label: 'Sent', icon: Send },
  { id: 'DRAFTS', label: 'Drafts', icon: FilePenLine },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
];

interface FolderNavigationProps {
  selectedFolder: FolderType;
  onFolderChange: (folder: FolderType) => void;
  stats?: EmailStats | null;
}

/**
 * Material Design 3 Folder Navigation Component
 *
 * Features:
 * - Visual folder hierarchy
 * - Unread count badges
 * - Touch-friendly targets
 * - Icon-based navigation
 */
export function FolderNavigation({
  selectedFolder,
  onFolderChange,
  stats,
}: FolderNavigationProps) {
  const getFolderCount = (folderId: FolderType): number => {
    if (!stats) return 0;

    switch (folderId) {
      case 'ALL':
        return stats.total;
      case 'INBOX':
        return stats.byFolder?.INBOX || 0;
      case 'SENT':
        return stats.byFolder?.SENT || 0;
      case 'DRAFTS':
        return stats.byFolder?.DRAFTS || 0;
      case 'TRASH':
        return stats.byFolder?.TRASH || 0;
      case 'STARRED':
        return stats.starred || 0;
      default:
        return 0;
    }
  };

  const getUnreadCount = (folderId: FolderType): number => {
    if (!stats) return 0;

    // Only show unread count for INBOX and ALL
    if (folderId === 'INBOX' || folderId === 'ALL') {
      return stats.unread;
    }

    return 0;
  };

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        height: 'fit-content',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: '0.1em', fontWeight: 600 }}
        >
          Folders
        </Typography>
      </Box>

      {/* Folder List */}
      <List sx={{ p: 1 }}>
        {folders.map((folder) => {
          const isActive = selectedFolder === folder.id;
          const count = getFolderCount(folder.id);
          const unreadCount = getUnreadCount(folder.id);
          const IconComponent = folder.icon;

          return (
            <ListItemButton
              key={folder.id}
              selected={isActive}
              onClick={() => onFolderChange(folder.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 48,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '& .MuiTypography-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive
                    ? 'primary.contrastText'
                    : folder.color || 'text.secondary',
                }}
              >
                <IconComponent size={20} />
              </ListItemIcon>

              <ListItemText
                primary={folder.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: isActive ? 600 : 400,
                }}
              />

              {/* Count badges */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    max={999}
                    sx={{
                      '& .MuiBadge-badge': {
                        position: 'static',
                        transform: 'none',
                        minWidth: 20,
                        height: 20,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      },
                    }}
                  />
                )}

                {count > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: isActive ? 'primary.contrastText' : 'text.secondary',
                      fontWeight: isActive ? 600 : 400,
                      ml: unreadCount > 0 ? 0 : 0,
                    }}
                  >
                    {count}
                  </Typography>
                )}
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
