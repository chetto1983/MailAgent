import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Checkbox,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Toolbar,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  Archive,
  Trash2,
  MailOpen,
  Mail,
  Star,
  Tag,
  MoreVertical,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface EmailToolbarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onStar?: () => void;
  onLabel?: () => void;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  onFilterToggle?: () => void;
  showFilters?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
}

/**
 * Gmail-style Email Toolbar Component
 *
 * Features:
 * - Batch selection checkbox
 * - Bulk actions (archive, delete, mark read/unread, star, label)
 * - Search bar
 * - Refresh button
 * - Pagination controls
 * - Filter toggle
 * - Responsive design
 */
export function EmailToolbar({
  selectedCount,
  allSelected,
  onSelectAll,
  onArchive,
  onDelete,
  onMarkAsRead,
  onMarkAsUnread,
  onLabel,
  onRefresh,
  onSearch,
  onFilterToggle,
  showFilters = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  loading = false,
}: EmailToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const hasSelection = selectedCount > 0;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          px: { xs: 1, sm: 2 },
          py: 1,
          minHeight: { xs: 56, sm: 64 },
          gap: 1,
        }}
      >
        {/* Selection Checkbox */}
        <Checkbox
          edge="start"
          checked={allSelected}
          indeterminate={hasSelection && !allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          size="small"
          sx={{ mr: 0.5 }}
        />

        {/* Selection Counter */}
        {hasSelection && (
          <Chip
            label={`${selectedCount} selected`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 1 }}
          />
        )}

        {/* Batch Actions - Show when emails are selected */}
        {hasSelection ? (
          <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
            {onArchive && (
              <Tooltip title="Archive">
                <IconButton size="small" onClick={onArchive}>
                  <Archive size={18} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete">
                <IconButton size="small" onClick={onDelete} color="error">
                  <Trash2 size={18} />
                </IconButton>
              </Tooltip>
            )}
            {onMarkAsRead && (
              <Tooltip title="Mark as read">
                <IconButton size="small" onClick={onMarkAsRead}>
                  <MailOpen size={18} />
                </IconButton>
              </Tooltip>
            )}
            {onMarkAsUnread && (
              <Tooltip title="Mark as unread">
                <IconButton size="small" onClick={onMarkAsUnread}>
                  <Mail size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Add star">
              <IconButton size="small" onClick={onLabel}>
                <Star size={18} />
              </IconButton>
            </Tooltip>
            {onLabel && (
              <Tooltip title="Label">
                <IconButton size="small" onClick={onLabel}>
                  <Tag size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="More">
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertical size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <>
            {/* Search Bar - Show when no selection */}
            <TextField
              size="small"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                maxWidth: { xs: '100%', sm: 400 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    bgcolor: 'background.paper',
                  },
                },
              }}
            />

            <Box sx={{ flex: 1 }} />
          </>
        )}

        {/* Right Side Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Filter Toggle */}
          {onFilterToggle && (
            <Tooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
              <IconButton
                size="small"
                onClick={onFilterToggle}
                color={showFilters ? 'primary' : 'default'}
              >
                <Filter size={18} />
              </IconButton>
            </Tooltip>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={loading}
                sx={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              >
                <RefreshCw size={18} />
              </IconButton>
            </Tooltip>
          )}

          {/* Pagination */}
          {onPageChange && totalPages > 1 && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                {currentPage} of {totalPages}
              </Typography>
              <Tooltip title="Previous page">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Next page">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </Stack>
      </Toolbar>

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>Move to folder</MenuItem>
        <MenuItem onClick={handleMenuClose}>Filter messages</MenuItem>
        <MenuItem onClick={handleMenuClose}>Mark as important</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          Delete all
        </MenuItem>
      </Menu>
    </Box>
  );
}
