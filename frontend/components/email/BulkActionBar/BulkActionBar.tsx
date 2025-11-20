import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  X,
  Mail,
  MailOpen,
  Trash2,
  Star,
  Tag,
  FolderInput,
  MoreVertical,
} from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMarkRead: () => Promise<void>;
  onMarkUnread: () => Promise<void>;
  onDelete: () => Promise<void>;
  onStar?: () => Promise<void>;
  onUnstar?: () => Promise<void>;
  onAddLabels?: () => void;
  onMoveToFolder?: () => void;
}

/**
 * BulkActionBar - Action bar shown when emails are selected
 *
 * Features:
 * - Shows selected count
 * - Select all / Clear selection
 * - Bulk actions: mark read/unread, delete, star, labels, move
 * - Loading states for async operations
 * - Responsive design
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onStar,
  onUnstar,
  onAddLabels,
  onMoveToFolder,
}) => {
  const t = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    setLoading(actionName);
    try {
      await action();
    } catch (error) {
      console.error(`Failed to ${actionName}:`, error);
    } finally {
      setLoading(null);
    }
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreMenuAnchor(null);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderRadius: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
        }}
      >
        {/* Selection Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={onClearSelection}
            sx={{ color: 'inherit' }}
            disabled={loading !== null}
          >
            <X size={20} />
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t.dashboard.email.bulkBar.selected.replace('{count}', selectedCount.toString())}
          </Typography>
        </Box>

        {/* Select All Button */}
        {selectedCount < totalCount && (
          <>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'primary.contrastText', opacity: 0.3 }} />
            <Button
              size="small"
              onClick={onSelectAll}
              sx={{
                color: 'inherit',
                textTransform: 'none',
                fontWeight: 500,
              }}
              disabled={loading !== null}
            >
              {t.dashboard.email.bulkBar.selectAll}
            </Button>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* Mark as Read */}
          <Tooltip title={t.dashboard.email.bulkBar.markRead}>
            <span>
              <IconButton
                size="small"
                onClick={() => handleAction(onMarkRead, 'markRead')}
                disabled={loading !== null}
                sx={{ color: 'inherit' }}
              >
                {loading === 'markRead' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <MailOpen size={20} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* Mark as Unread */}
          <Tooltip title={t.dashboard.email.bulkBar.markUnread}>
            <span>
              <IconButton
                size="small"
                onClick={() => handleAction(onMarkUnread, 'markUnread')}
                disabled={loading !== null}
                sx={{ color: 'inherit' }}
              >
                {loading === 'markUnread' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Mail size={20} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* Delete */}
          <Tooltip title={t.dashboard.email.bulkBar.delete}>
            <span>
              <IconButton
                size="small"
                onClick={() => handleAction(onDelete, 'delete')}
                disabled={loading !== null}
                sx={{ color: 'inherit' }}
              >
                {loading === 'delete' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Trash2 size={20} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* More Actions Menu */}
          <Tooltip title="More actions">
            <span>
              <IconButton
                size="small"
                onClick={handleMoreClick}
                disabled={loading !== null}
                sx={{ color: 'inherit' }}
              >
                <MoreVertical size={20} />
              </IconButton>
            </span>
          </Tooltip>

          <Menu
            anchorEl={moreMenuAnchor}
            open={Boolean(moreMenuAnchor)}
            onClose={handleMoreClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {onStar && (
              <MenuItem
                onClick={() => {
                  handleAction(onStar, 'star');
                  handleMoreClose();
                }}
                disabled={loading !== null}
              >
                <Star size={18} style={{ marginRight: 8 }} />
                Add Star
              </MenuItem>
            )}
            {onUnstar && (
              <MenuItem
                onClick={() => {
                  handleAction(onUnstar, 'unstar');
                  handleMoreClose();
                }}
                disabled={loading !== null}
              >
                <Star size={18} style={{ marginRight: 8 }} />
                Remove Star
              </MenuItem>
            )}
            {onAddLabels && (
              <MenuItem
                onClick={() => {
                  onAddLabels();
                  handleMoreClose();
                }}
                disabled={loading !== null}
              >
                <Tag size={18} style={{ marginRight: 8 }} />
                Add Labels
              </MenuItem>
            )}
            {onMoveToFolder && (
              <MenuItem
                onClick={() => {
                  onMoveToFolder();
                  handleMoreClose();
                }}
                disabled={loading !== null}
              >
                <FolderInput size={18} style={{ marginRight: 8 }} />
                Move to Folder
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Paper>
  );
};
