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
  FilePen,
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
import { useAuthStore } from '@/stores/auth-store';

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
  { id: 'DRAFTS', label: 'Drafts', icon: FilePen, isSpecial: true },
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
  const token = useAuthStore((state) => state.token);
  const [folders, setFolders] = useState<FolderItem[]>(defaultFolders);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load folders from server
  const loadFolders = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getFolders(token);

      // Use a map to store folders, allows for easy updating and aggregation.
      // Initialize with default folders to ensure they are always present.
      const folderItemsMap = new Map<FolderType, FolderItem>(
        defaultFolders.map((f) => [f.id, { ...f, count: 0, unreadCount: 0 }])
      );

      // Process all folders from all providers
      for (const providerFolders of Object.values(response.foldersByProvider)) {
        for (const folder of providerFolders) {
          const isSpecial = !!folder.specialUse;
          const folderId = isSpecial ? folder.specialUse! : folder.path;

          if (folderItemsMap.has(folderId)) {
            // Aggregate counts for existing folders (especially special ones)
            const existingFolder = folderItemsMap.get(folderId)!;
            existingFolder.count = (existingFolder.count || 0) + (folder.totalCount || 0);
            existingFolder.unreadCount =
              (existingFolder.unreadCount || 0) + (folder.unreadCount || 0);
            
            // Use provider-given name for special folders, can be more accurate
            if (isSpecial) {
              existingFolder.label = folder.name;
            }
          } else if (!isSpecial && folder.isSelectable) {
            // Add new custom folders
            folderItemsMap.set(folderId, {
              id: folderId,
              label: folder.name,
              icon: FolderIcon,
              count: folder.totalCount,
              unreadCount: folder.unreadCount,
              isSpecial: false,
            });
          }
        }
      }
      
      const allFolder = folderItemsMap.get('ALL');
      if (allFolder) {
        delete allFolder.count;
        delete allFolder.unreadCount;
      }

      const starredFolder = folderItemsMap.get('STARRED');
      if (starredFolder) {
        delete starredFolder.count;
        delete starredFolder.unreadCount;
      }

      const inboxFolder = folderItemsMap.get('INBOX');
      if (inboxFolder) {
        delete inboxFolder.unreadCount;
      }

      setFolders(Array.from(folderItemsMap.values()));
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError('Failed to load folders');
      // Keep default folders on error
      setFolders(defaultFolders);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Sync folders from server
  const handleSyncFolders = async () => {
    if (!token) return;

    setSyncing(true);
    setError(null);

    try {
      await syncAllFolders(token);
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
    // Prioritize folder item count, which is aggregated from the API
    if (folderItem?.count !== undefined) {
      return folderItem.count;
    }
    // Fallback to stats prop for high-level counts if not provided by folder item
    if (stats) {
      if (folderId === 'ALL') return stats.total;
      if (folderId === 'STARRED') return stats.starred;
      return stats.byFolder?.[folderId] || 0;
    }
    return 0;
  };

  const getUnreadCount = (folderId: FolderType, folderItem?: FolderItem): number => {
    // Prioritize folder item unread count, which is aggregated from the API
    if (folderItem?.unreadCount !== undefined) {
      return folderItem.unreadCount;
    }
    // Fallback to stats prop for unified unread count
    if (stats && (folderId === 'INBOX' || folderId === 'ALL')) {
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
