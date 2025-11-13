import React, { useEffect, useState, useCallback } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Box,
  Badge,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Inbox,
  Send,
  FilePenLine,
  Trash2,
  Star,
  Archive,
  Folder as FolderIcon,
  RefreshCw,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import type { EmailStats } from '@/lib/api/email';
import { getFolders, syncAllFolders } from '@/lib/api/folders';
import { useSession } from 'next-auth/react';

export type FolderType = 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' | 'STARRED' | 'ALL' | string;

interface FolderItem {
  id: FolderType;
  label: string;
  icon: LucideIcon;
  color?: string;
  count?: number;
  unreadCount?: number;
  isSpecial?: boolean;
}

// Default folders as fallback
const defaultFolders: FolderItem[] = [
  { id: 'ALL', label: 'All Mail', icon: Archive, isSpecial: true },
  { id: 'INBOX', label: 'Inbox', icon: Inbox, color: 'primary.main', isSpecial: true },
  { id: 'STARRED', label: 'Starred', icon: Star, color: '#FFC107', isSpecial: true },
  { id: 'SENT', label: 'Sent', icon: Send, isSpecial: true },
  { id: 'DRAFTS', label: 'Drafts', icon: FilePenLine, isSpecial: true },
  { id: 'TRASH', label: 'Trash', icon: Trash2, isSpecial: true },
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
 * - Dynamic folder loading from server
 * - Visual folder hierarchy
 * - Unread count badges
 * - Touch-friendly targets
 * - Icon-based navigation
 * - Folder sync functionality
 */
export function FolderNavigation({
  selectedFolder,
  onFolderChange,
  stats,
}: FolderNavigationProps) {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<FolderItem[]>(defaultFolders);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get icon for folder
  const getFolderIcon = (specialUse?: string): LucideIcon => {
    switch (specialUse) {
      case 'INBOX':
        return Inbox;
      case 'SENT':
        return Send;
      case 'DRAFTS':
        return FilePenLine;
      case 'TRASH':
      case 'JUNK':
        return Trash2;
      case 'FLAGGED':
      case 'IMPORTANT':
        return Star;
      case 'ARCHIVE':
      case 'ALL':
        return Archive;
      default:
        return FolderIcon;
    }
  };

  // Helper function to get color for folder
  const getFolderColor = (specialUse?: string): string | undefined => {
    switch (specialUse) {
      case 'INBOX':
        return 'primary.main';
      case 'FLAGGED':
      case 'IMPORTANT':
        return '#FFC107';
      default:
        return undefined;
    }
  };

  // Load folders from server
  const loadFolders = useCallback(async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getFolders(session.accessToken);

      // Convert backend folders to FolderItem format
      const folderItems: FolderItem[] = [
        { id: 'ALL', label: 'All Mail', icon: Archive, isSpecial: true },
        { id: 'STARRED', label: 'Starred', icon: Star, color: '#FFC107', isSpecial: true },
      ];

      // Process all folders from all providers
      const seenSpecialFolders = new Set<string>();

      for (const providerFolders of Object.values(response.foldersByProvider)) {
        for (const folder of providerFolders) {
          // If it's a special folder, add it to the list (but only once)
          if (folder.specialUse && !seenSpecialFolders.has(folder.specialUse)) {
            seenSpecialFolders.add(folder.specialUse);
            folderItems.push({
              id: folder.specialUse,
              label: folder.name,
              icon: getFolderIcon(folder.specialUse),
              color: getFolderColor(folder.specialUse),
              count: folder.totalCount,
              unreadCount: folder.unreadCount,
              isSpecial: true,
            });
          } else if (!folder.specialUse && folder.isSelectable) {
            // Custom folder
            folderItems.push({
              id: folder.path,
              label: folder.name,
              icon: FolderIcon,
              count: folder.totalCount,
              unreadCount: folder.unreadCount,
              isSpecial: false,
            });
          }
        }
      }

      setFolders(folderItems);
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError('Failed to load folders');
      // Keep default folders on error
      setFolders(defaultFolders);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  // Sync folders from server
  const handleSyncFolders = async () => {
    if (!session?.accessToken) return;

    setSyncing(true);
    setError(null);

    try {
      await syncAllFolders(session.accessToken);
      // Reload folders after sync
      await loadFolders();
    } catch (err) {
      console.error('Failed to sync folders:', err);
      setError('Failed to sync folders');
    } finally {
      setSyncing(false);
    }
  };

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const getFolderCount = (folderId: FolderType, folderItem?: FolderItem): number => {
    // Use folder item count if available
    if (folderItem?.count !== undefined) {
      return folderItem.count;
    }

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

  const getUnreadCount = (folderId: FolderType, folderItem?: FolderItem): number => {
    // Use folder item unread count if available
    if (folderItem?.unreadCount !== undefined) {
      return folderItem.unreadCount;
    }

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: '0.1em', fontWeight: 600 }}
        >
          Folders
        </Typography>

        <Tooltip title="Sync folders from email server">
          <IconButton
            size="small"
            onClick={handleSyncFolders}
            disabled={syncing || loading}
            sx={{ ml: 1 }}
          >
            {syncing ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error message */}
      {error && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'error.light',
            color: 'error.contrastText',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <AlertCircle size={16} />
          <Typography variant="caption">{error}</Typography>
        </Box>
      )}

      {/* Loading state */}
      {loading && !syncing && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 4,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Folder List */}
      {!loading && (
        <List sx={{ p: 1 }}>
          {folders.map((folder) => {
            const isActive = selectedFolder === folder.id;
            const count = getFolderCount(folder.id, folder);
            const unreadCount = getUnreadCount(folder.id, folder);
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
      )}
    </Paper>
  );
}
