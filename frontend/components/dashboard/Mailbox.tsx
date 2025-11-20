import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Inbox, Star } from 'lucide-react';
import { emailApi, type EmailListParams } from '@/lib/api/email';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { getFolders, type Folder as ProviderFolder } from '@/lib/api/folders';
import { useTranslations } from '@/lib/hooks/use-translations';
import { useEmailStore } from '@/stores/email-store';
import { useEmailActions } from '@/hooks/use-email-actions';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { normalizeFolderName, getFolderIcon as getIconForFolderUtil } from '@/lib/utils/folder-normalization';

// Components
import { EmailLayout } from '@/components/email/EmailLayout';
import { EmailSidebar, type FolderGroup } from '@/components/email/EmailSidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailListItem } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';

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

  // Store state
  const {
    emails: storeEmails,
    selectedEmail: storeSelectedEmail,
    isLoading: storeLoading,
    setEmails,
    setSelectedEmail,
    setLoading,
  } = useEmailStore();

  // Local state for folders and UI
  const [remoteFolders, setRemoteFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [searchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Custom hooks
  const {
    handleDelete,
    handleToggleStar,
    handleArchive,
    handleReply,
    handleForward,
    handleEmailClick,
  } = useEmailActions();

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

  // Combined folders
  const combinedFolders = useMemo(
    () => [...aggregatorFolders, ...remoteFolders],
    [aggregatorFolders, remoteFolders]
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

      const queryParams: EmailListParams = {
        limit: 50,
        page: 1,
        ...activeFolder.queryOverrides,
        search: searchQuery || undefined,
      };

      const emailsRes = await emailApi.listEmails(queryParams);
      setEmails((emailsRes.data.emails || []) as any);
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to load mailbox data:', error);
      setEmails([]);
      setSelectedEmail(null);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, searchQuery, setEmails, setLoading, setSelectedEmail]);

  // TODO: Implement infinite scroll with loadMoreRows for pagination

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

  return (
    <EmailLayout
      sidebar={
        <EmailSidebar
          folderGroups={folderGroups}
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          loading={foldersLoading}
        />
      }
      list={
        <EmailList
          emails={storeEmails}
          selectedEmailId={storeSelectedEmail?.id}
          onEmailClick={handleEmailClick}
          loading={storeLoading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onBulkDelete={(ids) => ids.forEach(handleDelete)}
          renderItem={(email, isSelected, isMultiSelected, onToggleSelect) => (
            <EmailListItem
              email={email}
              selected={isSelected}
              multiSelected={isMultiSelected}
              onToggleSelect={onToggleSelect}
              onToggleStar={handleToggleStar}
              getProviderIcon={getProviderIcon}
            />
          )}
        />
      }
      detail={
        storeSelectedEmail ? (
          <EmailDetail
            email={storeSelectedEmail}
            onClose={() => setSelectedEmail(null)}
            onArchive={(id) => handleArchive([id])}
            onDelete={handleDelete}
            onReply={handleReply}
            onForward={handleForward}
          />
        ) : undefined
      }
      showDetail={!!storeSelectedEmail}
    />
  );
}
