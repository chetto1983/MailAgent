import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Checkbox,
  Tooltip,
  Typography,
  Skeleton,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Search, RefreshCw, Trash2, Mail, Archive, MailOpen, MailCheck, SlidersHorizontal } from 'lucide-react';
import type { Email } from '@/stores/email-store';
import { useTranslations } from '@/lib/hooks/use-translations';
import { List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * Props for EmailList component
 */
interface EmailListProps {
  /**
   * List of emails to display
   */
  emails: Email[];

  /**
   * Currently selected email ID
   */
  selectedEmailId?: string | null;

  /**
   * Callback when an email is clicked
   */
  onEmailClick: (email: Email) => void;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Refreshing state
   */
  refreshing?: boolean;

  /**
   * Callback for refresh action
   */
  onRefresh?: () => void;

  /**
   * Callback for bulk delete
   */
  onBulkDelete?: (ids: string[]) => void;

  /**
   * Callback for bulk archive
   */
  onBulkArchive?: (ids: string[]) => void;

  /**
   * Callback for bulk mark as read/unread
   */
  onBulkMarkAsRead?: (ids: string[], isRead: boolean) => void;

  /**
   * Custom empty state message
   */
  emptyMessage?: string;

  /**
   * Custom search placeholder
   */
  searchPlaceholder?: string;

  /**
   * Render function for each email item
   */
  renderItem: (
    email: Email,
    isSelected: boolean,
    isMultiSelected: boolean,
    onToggleSelect: (id: string) => void,
    onEmailClick: (email: Email) => void,
  ) => React.ReactNode;

  /**
   * Callback for loading more emails (infinite scroll)
   */
  onLoadMore?: () => void;

  /**
   * Whether there are more emails to load
   */
  hasMore?: boolean;

  /**
   * Whether more emails are being loaded
   */
  loadingMore?: boolean;

  /**
   * Callback for opening advanced search
   */
  onAdvancedSearch?: () => void;

  /**
   * Whether advanced filters are active
   */
  hasActiveFilters?: boolean;

  /**
   * Set of selected email IDs (for multi-selection)
   */
  selectedIds?: Set<string>;

  /**
   * Callback when selection is toggled
   */
  onToggleSelection?: (id: string) => void;
}

/**
 * EmailList - Email list component with toolbar and virtualization
 *
 * Features:
 * - Search filtering
 * - Bulk selection and actions
 * - Refresh button
 * - Empty state
 * - Customizable item rendering
 *
 * @example
 * ```tsx
 * <EmailList
 *   emails={emails}
 *   selectedEmailId={selectedEmail?.id}
 *   onEmailClick={(email) => setSelectedEmail(email)}
 *   loading={loading}
 *   renderItem={(email, isSelected, isMultiSelected, onToggleSelect) => (
 *     <EmailListItem
 *       email={email}
 *       selected={isSelected}
 *       multiSelected={isMultiSelected}
 *       onToggleSelect={onToggleSelect}
 *     />
 *   )}
 * />
 * ```
 */
export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onEmailClick,
  loading = false,
  refreshing = false,
  onRefresh,
  onBulkDelete,
  onBulkArchive,
  onBulkMarkAsRead,
  emptyMessage,
  searchPlaceholder,
  renderItem,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  onAdvancedSearch,
  hasActiveFilters = false,
  selectedIds: propSelectedIds,
  onToggleSelection,
}) => {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');

  // Use prop selectedIds if provided, otherwise use local state
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = propSelectedIds ?? localSelectedIds;
  const setSelectedIds = onToggleSelection ?
    (ids: Set<string>) => ids.forEach(id => onToggleSelection(id)) :
    setLocalSelectedIds;

  // Infinite scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onLoadMore) return;

    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Load more when 200px from bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // Filter emails by search query
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;

    const query = searchQuery.toLowerCase();
    return emails.filter(
      (email) =>
        email.subject?.toLowerCase().includes(query) ||
        email.from?.toLowerCase().includes(query) ||
        email.bodyPreview?.toLowerCase().includes(query)
    );
  }, [emails, searchQuery]);

  // Handle select all
  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setSelectedIds(new Set(filteredEmails.map((e) => e.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredEmails]
  );

  // Handle toggle single selection
  const handleToggleSelect = useCallback((id: string) => {
    if (onToggleSelection) {
      // Use provided callback from parent
      onToggleSelection(id);
    } else {
      // Fallback to local state
      setLocalSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    }
  }, [onToggleSelection]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onBulkDelete, selectedIds]);

  // Handle bulk archive
  const handleBulkArchive = useCallback(() => {
    if (onBulkArchive && selectedIds.size > 0) {
      onBulkArchive(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onBulkArchive, selectedIds]);

  // Handle bulk mark as read
  const handleBulkMarkAsRead = useCallback((isRead: boolean) => {
    if (onBulkMarkAsRead && selectedIds.size > 0) {
      onBulkMarkAsRead(Array.from(selectedIds), isRead);
      setSelectedIds(new Set());
    }
  }, [onBulkMarkAsRead, selectedIds]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  const Row = ({
    index,
    style,
    ariaAttributes
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const email = filteredEmails[index];
    const isSelected = selectedEmailId === email.id;
    const isMultiSelected = selectedIds.has(email.id);

    return (
      <div style={style} {...ariaAttributes}>
        {renderItem(email, isSelected, isMultiSelected, handleToggleSelect, onEmailClick)}
      </div>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Actions Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {selectedIds.size > 0 ? (
            <>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {selectedIds.size} selected
              </Typography>
              {onBulkMarkAsRead && (
                <>
                  <Tooltip title="Mark as read">
                    <IconButton size="small" onClick={() => handleBulkMarkAsRead(true)}>
                      <MailCheck size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Mark as unread">
                    <IconButton size="small" onClick={() => handleBulkMarkAsRead(false)}>
                      <MailOpen size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {onBulkArchive && (
                <Tooltip title="Archive">
                  <IconButton size="small" onClick={handleBulkArchive}>
                    <Archive size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {onBulkDelete && (
                <Tooltip title={t.common.delete}>
                  <IconButton size="small" onClick={handleBulkDelete}>
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              <Checkbox onChange={handleSelectAll} />
              {onRefresh && (
                <Tooltip title={t.common.refresh}>
                  <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  </IconButton>
                </Tooltip>
              )}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {filteredEmails.length > 0 ? `1-${filteredEmails.length}` : '0'} of {emails.length}
              </Typography>
            </>
          )}
        </Box>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder || t.dashboard.email.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          {onAdvancedSearch && (
            <Tooltip title="Advanced Search">
              <IconButton
                size="small"
                onClick={onAdvancedSearch}
                color={hasActiveFilters ? 'primary' : 'default'}
                sx={{
                  border: 1,
                  borderColor: hasActiveFilters ? 'primary.main' : 'divider',
                }}
              >
                <SlidersHorizontal size={18} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Email List */}
      <Box sx={{ flex: 1, overflow: 'auto' }} onScroll={handleScroll}>
        {loading ? (
          <Box sx={{ px: 2, pt: 2 }}>
            {[...Array(8)].map((_, i) => (
              <Stack key={i} direction="row" spacing={2} sx={{ mb: 2, alignItems: 'flex-start' }}>
                <Skeleton variant="rectangular" width={18} height={18} sx={{ mt: 0.5 }} />
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                    <Skeleton variant="text" width="40%" height={20} />
                    <Box sx={{ flex: 1 }} />
                    <Skeleton variant="text" width={60} height={20} />
                  </Stack>
                  <Skeleton variant="text" width="90%" height={18} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="70%" height={16} />
                </Box>
                <Skeleton variant="circular" width={24} height={24} sx={{ mt: 0.5 }} />
              </Stack>
            ))}
          </Box>
        ) : filteredEmails.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Mail size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="body2" color="text.secondary">
              {emptyMessage || 'No emails found'}
            </Typography>
          </Box>
        ) : (
          <>
            <AutoSizer>
              {({ height, width }) => (
                <div style={{ height, width }}>
                  <List
                    defaultHeight={height}
                    rowHeight={80}
                    rowCount={filteredEmails.length}
                    rowComponent={Row}
                    rowProps={{}}
                  />
                </div>
              )}
            </AutoSizer>
            {/* Loading more indicator */}
            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};
