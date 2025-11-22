import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Typography,
  Divider,
  Stack,
} from '@mui/material';
import { X, Search as SearchIcon } from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';

/**
 * Advanced search filters
 */
export interface AdvancedSearchFilters {
  searchQuery?: string;
  from?: string;
  startDate?: string;
  endDate?: string;
  hasAttachments?: boolean;
  isRead?: boolean | null; // null = both, true = read only, false = unread only
  isStarred?: boolean;
}

/**
 * Props for AdvancedSearchDialog
 */
interface AdvancedSearchDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Initial filter values
   */
  initialFilters?: AdvancedSearchFilters;

  /**
   * Callback when dialog closes
   */
  onClose: () => void;

  /**
   * Callback when search is applied
   */
  onSearch: (filters: AdvancedSearchFilters) => void;

  /**
   * Callback to reset all filters
   */
  onReset?: () => void;
}

/**
 * AdvancedSearchDialog - Dialog for advanced email search with multiple filters
 *
 * Features:
 * - Text search query
 * - Sender (from) filter
 * - Date range filter
 * - Has attachments filter
 * - Read/Unread filter
 * - Starred filter
 *
 * @example
 * ```tsx
 * <AdvancedSearchDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSearch={(filters) => handleSearch(filters)}
 *   onReset={() => handleReset()}
 * />
 * ```
 */
export const AdvancedSearchDialog: React.FC<AdvancedSearchDialogProps> = ({
  open,
  initialFilters = {},
  onClose,
  onSearch,
  onReset,
}) => {
  const t = useTranslations();
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters);

  // Update filter value
  const updateFilter = useCallback((key: keyof AdvancedSearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    onSearch(filters);
    onClose();
  }, [filters, onSearch, onClose]);

  // Handle reset
  const handleReset = useCallback(() => {
    const emptyFilters: AdvancedSearchFilters = {
      searchQuery: '',
      from: '',
      startDate: '',
      endDate: '',
      hasAttachments: false,
      isRead: null,
      isStarred: false,
    };
    setFilters(emptyFilters);
    onReset?.();
  }, [onReset]);

  // Handle close
  const handleClose = useCallback(() => {
    setFilters(initialFilters);
    onClose();
  }, [initialFilters, onClose]);

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter((value) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'boolean') return value;
    return true;
  }).length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon size={20} />
            <Typography variant="h6">{t.dashboard.email.advancedSearch.title}</Typography>
            {activeFiltersCount > 0 && (
              <Typography variant="caption" color="primary">
                ({activeFiltersCount} {t.dashboard.email.advancedSearch.active})
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Search Query */}
          <TextField
            fullWidth
            label={t.dashboard.email.advancedSearch.searchInSubjectBody}
            placeholder={t.dashboard.email.advancedSearch.enterKeywords}
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
            }}
          />

          {/* From (Sender) */}
          <TextField
            fullWidth
            label={t.dashboard.email.advancedSearch.fromSender}
            placeholder={t.dashboard.email.advancedSearch.senderPlaceholder}
            value={filters.from || ''}
            onChange={(e) => updateFilter('from', e.target.value)}
            helperText={t.dashboard.email.advancedSearch.filterBySender}
          />

          <Divider />

          {/* Date Range */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 2 }}>
              {t.dashboard.email.advancedSearch.dateRange}
            </FormLabel>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label={t.dashboard.email.advancedSearch.fromDate}
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                size="small"
              />
              <TextField
                fullWidth
                label={t.dashboard.email.advancedSearch.toDate}
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                size="small"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Status Filters */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1 }}>
              {t.dashboard.email.advancedSearch.statusFilters}
            </FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.hasAttachments || false}
                    onChange={(e) => updateFilter('hasAttachments', e.target.checked)}
                  />
                }
                label={t.dashboard.email.advancedSearch.hasAttachments}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.isStarred || false}
                    onChange={(e) => updateFilter('isStarred', e.target.checked)}
                  />
                }
                label={t.dashboard.email.advancedSearch.starredOnly}
              />
            </FormGroup>
          </Box>

          {/* Read Status */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1 }}>
              {t.dashboard.email.advancedSearch.readStatus}
            </FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.isRead === false}
                    onChange={(e) => updateFilter('isRead', e.target.checked ? false : null)}
                  />
                }
                label={t.dashboard.email.advancedSearch.unreadOnly}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.isRead === true}
                    onChange={(e) => updateFilter('isRead', e.target.checked ? true : null)}
                  />
                }
                label={t.dashboard.email.advancedSearch.readOnly}
              />
            </FormGroup>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleReset} color="inherit">
          {t.dashboard.email.advancedSearch.resetAll}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose}>{t.dashboard.email.advancedSearch.cancel}</Button>
        <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon size={16} />}>
          {t.dashboard.email.advancedSearch.search}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
