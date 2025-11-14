#!/bin/bash

# Fix unused imports in DashboardCard
sed -i 's/import { Card, CardContent, CardHeader, Typography, Box, IconButton }/import { Card, CardContent, CardHeader, Typography, IconButton }/' components/dashboard/DashboardCard.tsx

# Fix PmSyncContacts - remove Tag import
sed -i 's/  Tag,$//' components/dashboard/PmSyncContacts.tsx

# Fix PmSyncContacts - add Tooltip
sed -i '/  CircularProgress,$/a\  Tooltip,' components/dashboard/PmSyncContacts.tsx

# Fix PmSyncCalendar - remove unused imports
sed -i 's/  Chip,$//' components/dashboard/PmSyncCalendar.tsx
sed -i 's/  Settings as SettingsIcon,$//' components/dashboard/PmSyncCalendar.tsx
sed -i 's/  Calendar as CalendarIcon,$//' components/dashboard/PmSyncCalendar.tsx

# Fix PmSyncCalendar - remove unused state
sed -i '/const \[aiSuggestionOpen,/d' components/dashboard/PmSyncCalendar.tsx
sed -i '/const \[selectedEvent,/d' components/dashboard/PmSyncCalendar.tsx

# Fix PmSyncDashboard - remove unused imports
sed -i 's/  Chip,$//' components/dashboard/PmSyncDashboard.tsx
sed -i 's/  ListItem,$//' components/dashboard/PmSyncDashboard.tsx
sed -i 's/  IconButton,$//' components/dashboard/PmSyncDashboard.tsx

# Fix PmSyncDashboard - prefix unused variable
sed -i 's/const \[loading,/const [_loading,/' components/dashboard/PmSyncDashboard.tsx

# Fix PmSyncMailbox - remove unused imports
sed -i 's/, useCallback//' components/dashboard/PmSyncMailbox.tsx
sed -i 's/  Grid,$//' components/dashboard/PmSyncMailbox.tsx
sed -i 's/  Folder,$//' components/dashboard/PmSyncMailbox.tsx

# Fix PmSyncMailbox - prefix unused variable
sed -i 's/const \[providers,/const [_providers,/' components/dashboard/PmSyncMailbox.tsx

# Fix PmSyncTasks - remove unused imports
sed -i '/  ListItem,$/d' components/dashboard/PmSyncTasks.tsx
sed -i '/  Menu,$/d' components/dashboard/PmSyncTasks.tsx
sed -i '/  MenuItem,$/d' components/dashboard/PmSyncTasks.tsx
sed -i '/  Search,$/d' components/dashboard/PmSyncTasks.tsx

# Fix PmSyncTasks - prefix unused variables
sed -i 's/const \[searchQuery,/const [_searchQuery,/' components/dashboard/PmSyncTasks.tsx
sed -i 's/setSearchQuery]/setSearchQuery]/' components/dashboard/PmSyncTasks.tsx
sed -i 's/setSelectedTask]/setSelectedTask]/' components/dashboard/PmSyncTasks.tsx

# Fix PmSyncSettings - remove unused imports
sed -i '/  Shield,$/d' components/dashboard/PmSyncSettings.tsx
sed -i '/  Mail,$/d' components/dashboard/PmSyncSettings.tsx

# Fix PmSyncHeader - fix auth store path
sed -i "s/from '@\/stores\/authStore'/from '@\/stores\/auth-store'/" components/layout/PmSyncHeader.tsx

# Fix PmSyncLayout - remove unused import
sed -i 's/, useMediaQuery//' components/layout/PmSyncLayout.tsx

echo "TypeScript errors fixed!"
