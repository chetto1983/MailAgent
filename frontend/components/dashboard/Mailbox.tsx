import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox,
  Star,
  Mail as MailIcon,
  Paperclip,
  Clock,
  Calendar as CalendarIcon,
  List as ListIcon,
  MessageSquare,
} from 'lucide-react';
import { Snackbar, Alert as MuiAlert, Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { emailApi, type EmailListParams, type Conversation } from '@/lib/api/email';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { getFolders, type Folder as ProviderFolder } from '@/lib/api/folders';
import { useTranslations } from '@/lib/hooks/use-translations';
import { useEmailStore } from '@/stores/email-store';
import { useAuthStore } from '@/stores/auth-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { useEmailActions } from '@/hooks/use-email-actions';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { normalizeFolderName, getFolderIcon as getIconForFolderUtil } from '@/lib/utils/folder-normalization';

// Components
import { EmailLayout } from '@/components/email/EmailLayout';
import { EmailSidebar, type FolderGroup, type SmartFilter } from '@/components/email/EmailSidebar/EmailSidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailListItem } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';
import { EmailThread } from '@/components/email/EmailThread';
import { ConversationList } from '@/components/email/ConversationList';
import { ComposeDialog } from '@/components/email/ComposeDialog/ComposeDialog';
import { AdvancedSearchDialog, type AdvancedSearchFilters } from '@/components/email/AdvancedSearchDialog';
import { LabelManager } from '@/components/labels';

interface FolderItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  color?: string;
  providerId?: string;
  providerEmail?: string;
  filterFolder?: string;
  queryOverrides?: Partial<EmailListParams>;
  aggregate?: boolean;
  specialUse?: string;
}

/**
 * PmSyncMailboxRefactored - Refactored email mailbox component using modular architecture
 *
 * Uses:
 * - EmailLayout for container structure
 * - EmailSidebar for folder navigation
 * - EmailList for email list with search
 * - EmailListItem for individual emails (memoized)
 * - EmailDetail for email detail view
 * - email-store for global state
 * - Custom hooks for actions and keyboard navigation
 */
export function Mailbox() {
  const t = useTranslations();

  // Auth store - for WebSocket token
  const { token } = useAuthStore();

  // Store state
  const {
    emails: storeEmails,
    selectedEmail: storeSelectedEmail,
    isLoading: storeLoading,
    setEmails,
    setSelectedEmail,
    setLoading,
  } = useEmailStore();

  // WebSocket for real-time updates (email events, folder counts, etc.)
  useWebSocket(token, true);

  // Local state for folders and UI
  const [remoteFolders, setRemoteFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [searchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({});
  const [pagination, setPagination] = useState({ page: 1, hasMore: true, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'conversation'>('list');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Label manager state
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  // Custom hooks
  const {
    handleDelete,
    handleToggleStar,
    handleArchive,
    handleMarkAsRead,
    handleMoveToFolder,
    handleReply,
    handleForward,
    handleEmailClick,
  } = useEmailActions({
    onSuccess: (message) => {
      setSnackbar({
        open: true,
        message,
        severity: 'success',
      });
    },
    onError: (message) => {
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    },
  });

  // Smart Filters for quick access
  const smartFilters = useMemo<SmartFilter[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return [
      {
        id: 'smart:unread',
        label: 'Unread',
        icon: <MailIcon size={18} />,
        color: '#0B7EFF',
      },
      {
        id: 'smart:today',
        label: 'Today',
        icon: <Clock size={18} />,
        color: '#00C853',
      },
      {
        id: 'smart:this-week',
        label: 'This Week',
        icon: <CalendarIcon size={18} />,
        color: '#9C27B0',
      },
      {
        id: 'smart:attachments',
        label: 'Has Attachments',
        icon: <Paperclip size={18} />,
        color: '#FF9800',
      },
      {
        id: 'smart:important',
        label: 'Important',
        icon: <Star size={18} />,
        color: '#FFB300',
      },
    ];
  }, []);

  // Aggregator folders (All Inbox, All Starred)
  const aggregatorFolders = useMemo<FolderItem[]>(
    () => [
      {
        id: 'all:inbox',
        label: t.dashboard.folders.inbox,
        icon: <Inbox size={20} />,
        aggregate: true,
        queryOverrides: { folder: 'INBOX' },
      },
      {
        id: 'all:starred',
        label: t.dashboard.email.starredFolderLabel || t.dashboard.folders.starred,
        icon: <Star size={20} />,
        color: '#FFB300',
        aggregate: true,
        queryOverrides: { isStarred: true },
      },
    ],
    [t]
  );

  // Convert smart filters to folder items for unified handling
  const smartFilterFolders = useMemo<FolderItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return smartFilters.map((filter) => {
      let queryOverrides: Partial<EmailListParams> = {};

      switch (filter.id) {
        case 'smart:unread':
          queryOverrides = { isRead: false };
          break;
        case 'smart:today':
          queryOverrides = { startDate: today.toISOString() };
          break;
        case 'smart:this-week':
          queryOverrides = { startDate: startOfWeek.toISOString() };
          break;
        case 'smart:attachments':
          queryOverrides = { hasAttachments: true };
          break;
        case 'smart:important':
          queryOverrides = { isStarred: true };
          break;
      }

      return {
        id: filter.id,
        label: filter.label,
        icon: filter.icon,
        count: filter.count,
        color: filter.color,
        aggregate: true,
        queryOverrides,
      };
    });
  }, [smartFilters]);

  // Combined folders
  const combinedFolders = useMemo(
    () => [...smartFilterFolders, ...aggregatorFolders, ...remoteFolders],
    [smartFilterFolders, aggregatorFolders, remoteFolders]
  );

  // Active folder
  const activeFolder = useMemo(
    () =>
      combinedFolders.find((folder) => folder.id === selectedFolderId) ||
      combinedFolders[0] ||
      null,
    [combinedFolders, selectedFolderId]
  );

  // Folders grouped by provider for sidebar
  const folderGroups = useMemo<FolderGroup[]>(() => {
    const groups: FolderGroup[] = [];

    if (aggregatorFolders.length) {
      groups.push({
        providerId: 'all',
        providerEmail: t.dashboard.email.allAccountsLabel || 'All accounts',
        folders: aggregatorFolders,
      });
    }

    const providerMap = new Map<
      string,
      { providerId: string; providerEmail: string; folders: FolderItem[] }
    >();

    remoteFolders.forEach((folder) => {
      if (!folder.providerId) return;
      if (!providerMap.has(folder.providerId)) {
        providerMap.set(folder.providerId, {
          providerId: folder.providerId,
          providerEmail: folder.providerEmail || t.dashboard.email.noProviders,
          folders: [],
        });
      }
      providerMap.get(folder.providerId)!.folders.push(folder);
    });

    groups.push(
      ...Array.from(providerMap.values()).sort((a, b) =>
        a.providerEmail.localeCompare(b.providerEmail)
      )
    );

    return groups;
  }, [aggregatorFolders, remoteFolders, t]);

  // Get provider icon
  const getProviderIcon = useCallback((providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return null;
    // Return icon based on provider type
    return provider.providerType === 'google' ? '📧' : '📨';
  }, [providers]);

  // Load folder metadata
  const loadFolderMetadata = useCallback(async () => {
    try {
      setFoldersLoading(true);
      const folderResponse = await getFolders();

      const normalized: FolderItem[] = [];
      Object.entries(folderResponse.foldersByProvider).forEach(
        ([providerId, folders]) => {
          const provider = folderResponse.providers.find((p) => p.id === providerId);
          folders.forEach((folder: ProviderFolder) => {
            const folderName = normalizeFolderName(folder.name, folder.specialUse);
            const IconComponent = getIconForFolderUtil(folder.specialUse);
            normalized.push({
              id: folder.id,
              label: folder.name,
              icon: <IconComponent size={20} />,
              count: folder.unreadCount,
              providerId: folder.providerId,
              providerEmail: provider?.email || '',
              filterFolder: folderName,
              specialUse: folder.specialUse,
              queryOverrides: {
                providerId: folder.providerId,
                folder: folderName,
              },
            });
          });
        }
      );

      setRemoteFolders(normalized);
      setFoldersLoading(false);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFoldersLoading(false);
    }
  }, []);

  // Load emails data
  const loadData = useCallback(async () => {
    if (!activeFolder) return;

    try {
      setLoading(true);

      const providersRes = await providersApi.getProviders();
      setProviders(providersRes || []);

      // Check if filtering by label
      if (activeFolder.id.startsWith('label:')) {
        const labelId = activeFolder.id.replace('label:', '');
        // For now, just use regular email list with filter
        // TODO: Backend should support filtering by label in listEmails endpoint
        const queryParams: EmailListParams = {
          limit: 50,
          page: 1,
          search: advancedFilters.searchQuery || searchQuery || undefined,
          from: advancedFilters.from || undefined,
          startDate: advancedFilters.startDate || undefined,
          endDate: advancedFilters.endDate || undefined,
          hasAttachments: advancedFilters.hasAttachments || undefined,
          isRead: advancedFilters.isRead !== null ? advancedFilters.isRead : undefined,
          isStarred: advancedFilters.isStarred || undefined,
        };

        const emailsRes = await emailApi.listEmails(queryParams);
        // Filter emails by label client-side for now
        const filteredEmails = (emailsRes.data.emails || []).filter((email: any) =>
          email.labels && email.labels.includes(labelId)
        );
        setEmails(filteredEmails as any);
        setSelectedEmail(null);

        // Update pagination (approximate since we're filtering client-side)
        setPagination({
          page: 1,
          hasMore: false, // Disable pagination for label filtering for now
          total: filteredEmails.length,
        });
      } else {
        const queryParams: EmailListParams = {
          limit: 50,
          page: 1,
          ...activeFolder.queryOverrides,
          search: advancedFilters.searchQuery || searchQuery || undefined,
          from: advancedFilters.from || undefined,
          startDate: advancedFilters.startDate || undefined,
          endDate: advancedFilters.endDate || undefined,
          hasAttachments: advancedFilters.hasAttachments || undefined,
          isRead: advancedFilters.isRead !== null ? advancedFilters.isRead : undefined,
          isStarred: advancedFilters.isStarred || undefined,
        };

        const emailsRes = await emailApi.listEmails(queryParams);
        setEmails((emailsRes.data.emails || []) as any);
        setSelectedEmail(null);

        // Update pagination
        setPagination({
          page: 1,
          hasMore: emailsRes.data.pagination.page < emailsRes.data.pagination.totalPages,
          total: emailsRes.data.pagination.total,
        });
      }
    } catch (error) {
      console.error('Failed to load mailbox data:', error);
      setEmails([]);
      setSelectedEmail(null);
      setPagination({ page: 1, hasMore: false, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [activeFolder, searchQuery, advancedFilters, setEmails, setLoading, setSelectedEmail]);

  // Load more emails (infinite scroll)
  const loadMoreEmails = useCallback(async () => {
    if (!activeFolder || !pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);

      const queryParams: EmailListParams = {
        limit: 50,
        page: pagination.page + 1,
        ...activeFolder.queryOverrides,
        search: advancedFilters.searchQuery || searchQuery || undefined,
        from: advancedFilters.from || undefined,
        startDate: advancedFilters.startDate || undefined,
        endDate: advancedFilters.endDate || undefined,
        hasAttachments: advancedFilters.hasAttachments || undefined,
        isRead: advancedFilters.isRead !== null ? advancedFilters.isRead : undefined,
        isStarred: advancedFilters.isStarred || undefined,
      };

      const emailsRes = await emailApi.listEmails(queryParams);

      // Append new emails to existing ones
      setEmails([...storeEmails, ...(emailsRes.data.emails || [])] as any);

      // Update pagination
      setPagination({
        page: emailsRes.data.pagination.page,
        hasMore: emailsRes.data.pagination.page < emailsRes.data.pagination.totalPages,
        total: emailsRes.data.pagination.total,
      });
    } catch (error) {
      console.error('Failed to load more emails:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load more emails',
        severity: 'error',
      });
    } finally {
      setLoadingMore(false);
    }
  }, [activeFolder, searchQuery, advancedFilters, pagination, loadingMore, storeEmails, setEmails]);

  // Refresh emails
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Load folders on mount
  useEffect(() => {
    loadFolderMetadata();
  }, [loadFolderMetadata]);

  // Load emails when folder ID changes (not activeFolder object to avoid unnecessary re-renders)
  useEffect(() => {
    if (selectedFolderId) {
      loadData();
    }
  }, [selectedFolderId, loadData]);

  // Keyboard navigation
  useKeyboardNavigation({
    emails: storeEmails,
    enabled: true,
    onDelete: handleDelete,
    onReply: handleReply,
    onToggleStar: handleToggleStar,
  });

  // Get default provider for compose
  const defaultProviderId = useMemo(() => {
    return providers.find(p => p.isDefault)?.id || providers[0]?.id;
  }, [providers]);

  // Handle advanced search
  const handleAdvancedSearch = useCallback((filters: AdvancedSearchFilters) => {
    setAdvancedFilters(filters);
    // Reload data with new filters (loadData will be called via useEffect since advancedFilters changes)
  }, []);

  // Reset advanced filters
  const handleResetFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);

  // Check if any advanced filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(advancedFilters).some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'boolean') return value;
      return true;
    });
  }, [advancedFilters]);

  // Handle drag and drop email to folder
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return; // No valid drop target or dropped on itself
    }

    const emailId = active.id as string;
    const folderId = over.id as string;

    // Move email to folder using existing hook
    handleMoveToFolder([emailId], folderId);
  }, [handleMoveToFolder]);

  // Handle view mode toggle
  const handleViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: 'list' | 'conversation' | null) => {
      if (newMode !== null) {
        setViewMode(newMode);
        // Reset selections when switching view modes
        setSelectedEmail(null);
        setSelectedThreadId(null);
      }
    },
    [setSelectedEmail]
  );

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversation: Conversation) => {
    setSelectedThreadId(conversation.threadId);
    // Fetch the first email in the thread to use for the EmailThread component
    emailApi.getThread(conversation.threadId).then((response) => {
      const threadEmails = response.data;
      if (threadEmails.length > 0) {
        setSelectedEmail(threadEmails[0] as any);
      }
    }).catch((error) => {
      console.error('Failed to load thread:', error);
    });
  }, [setSelectedEmail]);

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <EmailLayout
          sidebar={
          <EmailSidebar
            folderGroups={folderGroups}
            selectedFolderId={selectedFolderId}
            onFolderSelect={setSelectedFolderId}
            loading={foldersLoading}
            smartFilters={smartFilters}
            showSmartFilters={true}
            showLabels={true}
            onManageLabels={() => setLabelManagerOpen(true)}
            onCompose={() => setComposeOpen(true)}
          />
        }
        list={
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* View Mode Toggle */}
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center',
                bgcolor: 'background.paper',
              }}
            >
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label="view mode"
              >
                <ToggleButton value="list" aria-label="list view">
                  <Tooltip title="Email List">
                    <ListIcon size={18} />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="conversation" aria-label="conversation view">
                  <Tooltip title="Conversation View">
                    <MessageSquare size={18} />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Render appropriate view based on mode */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {viewMode === 'list' ? (
                <EmailList
                  emails={storeEmails}
                  selectedEmailId={storeSelectedEmail?.id}
                  onEmailClick={handleEmailClick}
                  loading={storeLoading}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  onBulkDelete={(ids) => ids.forEach(handleDelete)}
                  onBulkArchive={(ids) => handleArchive(ids)}
                  onBulkMarkAsRead={(ids, isRead) => handleMarkAsRead(ids, isRead)}
                  onLoadMore={loadMoreEmails}
                  hasMore={pagination.hasMore}
                  loadingMore={loadingMore}
                  onAdvancedSearch={() => setAdvancedSearchOpen(true)}
                  hasActiveFilters={hasActiveFilters}
                  renderItem={(email, isSelected, isMultiSelected, onToggleSelect, onEmailClick) => (
                    <EmailListItem
                      email={email}
                      selected={isSelected}
                      multiSelected={isMultiSelected}
                      onToggleSelect={onToggleSelect}
                      onToggleStar={handleToggleStar}
                      getProviderIcon={getProviderIcon}
                      onClick={onEmailClick}
                    />
                  )}
                />
              ) : (
                <ConversationList
                  providerId={activeFolder?.providerId}
                  selectedThreadId={selectedThreadId || undefined}
                  onSelectConversation={handleConversationSelect}
                  onRefresh={handleRefresh}
                />
              )}
            </Box>
          </Box>
        }
        detail={
          storeSelectedEmail ? (
            storeSelectedEmail.threadId ? (
              <EmailThread
                threadId={storeSelectedEmail.threadId}
                onReply={handleReply}
                onForward={handleForward}
              />
            ) : (
              <EmailDetail
                email={storeSelectedEmail}
                onClose={() => setSelectedEmail(null)}
                onArchive={(id) => handleArchive([id])}
                onDelete={handleDelete}
                onReply={handleReply}
                onForward={handleForward}
              />
            )
          ) : undefined
        }
        showDetail={!!storeSelectedEmail}
      />
      </DndContext>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen}
        defaultProviderId={defaultProviderId}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          setSnackbar({
            open: true,
            message: 'Email sent successfully ✓',
            severity: 'success',
          });
          loadData(); // Refresh email list
        }}
        onError={(message) => {
          setSnackbar({
            open: true,
            message,
            severity: 'error',
          });
        }}
      />

      {/* Advanced Search Dialog */}
      <AdvancedSearchDialog
        open={advancedSearchOpen}
        initialFilters={advancedFilters}
        onClose={() => setAdvancedSearchOpen(false)}
        onSearch={handleAdvancedSearch}
        onReset={handleResetFilters}
      />

      {/* Label Manager Dialog */}
      <LabelManager
        open={labelManagerOpen}
        onClose={() => setLabelManagerOpen(false)}
      />
    </>
  );
}
