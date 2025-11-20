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
  CircularProgress,
} from '@mui/material';
import { Search, RefreshCw, Trash2, Mail } from 'lucide-react';
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
  renderItem: (email: Email, isSelected: boolean, isMultiSelected: boolean, onToggleSelect: (id: string) => void) => React.ReactNode;
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
  emptyMessage,
  searchPlaceholder,
  renderItem,
}) => {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onBulkDelete, selectedIds]);

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
        <Box onClick={() => onEmailClick(email)}>
          {renderItem(email, isSelected, isMultiSelected, handleToggleSelect)}
        </Box>
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
      </Box>

      {/* Email List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredEmails.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Mail size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="body2" color="text.secondary">
              {emptyMessage || 'No emails found'}
            </Typography>
          </Box>
        ) : (
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
        )}
      </Box>
    </Paper>
  );
};
