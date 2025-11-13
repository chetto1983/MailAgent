import React from 'react';
import {
  Box,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Collapse,
  Typography,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import { X, Calendar, User, Mail } from 'lucide-react';

export interface EmailFilterValues {
  provider?: string;
  isRead?: boolean | 'all';
  isStarred?: boolean;
  hasAttachments?: boolean;
  from?: string;
  startDate?: string;
  endDate?: string;
}

interface EmailFiltersProps {
  open: boolean;
  filters: EmailFilterValues;
  onFilterChange: (filters: EmailFilterValues) => void;
  onClear: () => void;
  providers?: Array<{ id: string; email: string; providerType: string }>;
}

/**
 * Gmail-style Email Filters Component
 *
 * Features:
 * - Provider selection (multi-account support)
 * - Read/Unread filter
 * - Starred filter
 * - Attachments filter
 * - Date range filter
 * - From filter
 * - Clear all filters
 * - Active filters display
 */
export function EmailFilters({
  open,
  filters,
  onFilterChange,
  onClear,
  providers = [],
}: EmailFiltersProps) {
  const handleChange = (field: keyof EmailFilterValues, value: any) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleSelectChange = (field: keyof EmailFilterValues) => (
    event: SelectChangeEvent<any>
  ) => {
    const value = event.target.value;
    handleChange(field, value === 'all' ? undefined : value);
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== 'all' && v !== ''
  ).length;

  const getProviderLabel = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return providerId;

    const typeIcon = provider.providerType === 'google' ? '📧' :
                     provider.providerType === 'microsoft' ? '📨' : '📬';
    return `${typeIcon} ${provider.email}`;
  };

  return (
    <Collapse in={open}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
          py: 2,
        }}
      >
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount} active)`}
            </Typography>
            {activeFiltersCount > 0 && (
              <Button
                size="small"
                startIcon={<X size={16} />}
                onClick={onClear}
                sx={{ textTransform: 'none' }}
              >
                Clear all
              </Button>
            )}
          </Box>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {filters.provider && (
                <Chip
                  label={`Provider: ${getProviderLabel(filters.provider)}`}
                  size="small"
                  onDelete={() => handleChange('provider', undefined)}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.isRead !== undefined && filters.isRead !== 'all' && (
                <Chip
                  label={filters.isRead ? 'Read' : 'Unread'}
                  size="small"
                  onDelete={() => handleChange('isRead', 'all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.isStarred && (
                <Chip
                  label="Starred"
                  size="small"
                  onDelete={() => handleChange('isStarred', undefined)}
                  color="warning"
                  variant="outlined"
                />
              )}
              {filters.hasAttachments && (
                <Chip
                  label="Has attachments"
                  size="small"
                  onDelete={() => handleChange('hasAttachments', undefined)}
                  color="info"
                  variant="outlined"
                />
              )}
              {filters.from && (
                <Chip
                  label={`From: ${filters.from}`}
                  size="small"
                  onDelete={() => handleChange('from', '')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {(filters.startDate || filters.endDate) && (
                <Chip
                  label={`Date: ${filters.startDate || '...'} - ${filters.endDate || '...'}`}
                  size="small"
                  onDelete={() => {
                    handleChange('startDate', '');
                    handleChange('endDate', '');
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Stack>
          )}

          <Divider />

          {/* Filter Controls */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            flexWrap="wrap"
            useFlexGap
          >
            {/* Provider Filter */}
            {providers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Provider/Account</InputLabel>
                <Select
                  value={filters.provider || 'all'}
                  onChange={handleSelectChange('provider')}
                  label="Provider/Account"
                  startAdornment={<Mail size={16} style={{ marginLeft: 8, marginRight: 4 }} />}
                >
                  <MenuItem value="all">All accounts</MenuItem>
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {getProviderLabel(provider.id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Read Status Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.isRead === undefined ? 'all' : filters.isRead ? 'read' : 'unread'}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange(
                    'isRead',
                    value === 'all' ? 'all' : value === 'read' ? true : false
                  );
                }}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="unread">Unread</MenuItem>
                <MenuItem value="read">Read</MenuItem>
              </Select>
            </FormControl>

            {/* From Filter */}
            <TextField
              size="small"
              label="From"
              placeholder="email@example.com"
              value={filters.from || ''}
              onChange={(e) => handleChange('from', e.target.value)}
              InputProps={{
                startAdornment: <User size={16} style={{ marginLeft: 8, marginRight: 8 }} />,
              }}
              sx={{ minWidth: 200, flex: 1 }}
            />

            {/* Date Range */}
            <TextField
              size="small"
              label="Start Date"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <Calendar size={16} style={{ marginLeft: 8, marginRight: 8 }} />,
              }}
              sx={{ minWidth: 160 }}
            />

            <TextField
              size="small"
              label="End Date"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <Calendar size={16} style={{ marginLeft: 8, marginRight: 8 }} />,
              }}
              sx={{ minWidth: 160 }}
            />
          </Stack>

          {/* Quick Filters */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="⭐ Starred"
              size="small"
              onClick={() => handleChange('isStarred', !filters.isStarred)}
              color={filters.isStarred ? 'warning' : 'default'}
              variant={filters.isStarred ? 'filled' : 'outlined'}
              clickable
            />
            <Chip
              label="📎 Has attachments"
              size="small"
              onClick={() => handleChange('hasAttachments', !filters.hasAttachments)}
              color={filters.hasAttachments ? 'info' : 'default'}
              variant={filters.hasAttachments ? 'filled' : 'outlined'}
              clickable
            />
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  );
}
