import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { List as VirtualizedList } from 'react-window';
import type { RowComponentProps } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
import {
  Box,
  List as MuiList,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Badge,
  Button,
  TextField,
  InputAdornment,
  Paper,
  Checkbox,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  MoreVertical,
  ArrowLeft,
  Reply,
  Forward,
  Paperclip,
  Calendar,
  Folder as FolderIcon,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { emailApi, type Email, type EmailListParams } from '@/lib/api/email';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { getFolders, type Folder as ProviderFolder } from '@/lib/api/folders';
import { useTranslations } from '@/lib/hooks/use-translations';

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
}

export function PmSyncMailbox() {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
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
    [t],
  );
  const [remoteFolders, setRemoteFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const combinedFolders = useMemo(
    () => [...aggregatorFolders, ...remoteFolders],
    [aggregatorFolders, remoteFolders],
  );
  const activeFolder = useMemo(
    () => combinedFolders.find((folder) => folder.id === selectedFolderId) || combinedFolders[0] || null,
    [combinedFolders, selectedFolderId],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [_providers, setProviders] = useState<ProviderConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(['all']));
  const [refreshing, setRefreshing] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const currentPageRef = useRef(1);
  const foldersByProvider = useMemo(() => {
    const groups: Array<{
      providerId: string;
      providerEmail: string;
      folders: FolderItem[];
    }> = [];

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
        a.providerEmail.localeCompare(b.providerEmail),
      ),
    );

    return groups;
  }, [aggregatorFolders, remoteFolders, t.dashboard.email.allAccountsLabel, t.dashboard.email.noProviders]);
  const emailBody = useMemo(() => {
    if (!selectedEmail) {
      return '';
    }
    const rawHtml =
      selectedEmail.bodyHtml ||
      selectedEmail.bodyText?.replace(/\n/g, '<br />') ||
      selectedEmail.snippet ||
      '';
    return rawHtml;
  }, [selectedEmail]);

  const getIconForFolder = useCallback((specialUse?: string | null) => {
    if (!specialUse) return <FolderIcon size={20} />;
    const normalized = specialUse.replace('\\', '').toLowerCase();
    switch (normalized) {
      case 'inbox':
        return <Inbox size={20} />;
      case 'sent':
        return <Send size={20} />;
      case 'trash':
        return <Trash2 size={20} />;
      case 'archive':
      case 'all':
        return <Archive size={20} />;
      case 'starred':
        return <Star size={20} />;
      default:
        return <FolderIcon size={20} />;
    }
  }, []);

  const loadFolderMetadata = useCallback(async () => {
    console.log('Loading folder metadata...');
    try {
      setFoldersLoading(true);
      const folderResponse = await getFolders();
      console.log('Folders loaded:', folderResponse.providers.length, 'providers');
      const dynamicFolders: FolderItem[] = [];

      // Map localized folder names to standard folder names
      const normalizeFolderName = (name: string, specialUse?: string | null): string => {
        if (specialUse) return specialUse;

        const normalized = name.toLowerCase().trim();
        // Italian mappings
        if (normalized === 'posta in arrivo' || normalized === 'inbox') return 'INBOX';
        if (normalized === 'posta inviata' || normalized === 'sent' || normalized === 'inviata') return 'SENT';
        if (normalized === 'posta eliminata' || normalized === 'trash' || normalized === 'cestino' || normalized === 'eliminata') return 'TRASH';
        if (normalized === 'bozze' || normalized === 'draft' || normalized === 'drafts') return 'DRAFT';
        if (normalized === 'posta indesiderata' || normalized === 'spam' || normalized === 'junk') return 'SPAM';
        if (normalized === 'archive' || normalized === 'archivia' || normalized === 'archivio') return 'ARCHIVE';
        if (normalized === 'posta in uscita' || normalized === 'outbox') return 'OUTBOX';

        return name; // Return original name if no mapping found
      };

      folderResponse.providers.forEach((provider) => {
        const providerFolders: ProviderFolder[] =
          (folderResponse.foldersByProvider && folderResponse.foldersByProvider[provider.id]) || [];

        providerFolders.forEach((folder) => {
          const normalizedFolderName = normalizeFolderName(folder.name, folder.specialUse);
          dynamicFolders.push({
            id: `${provider.id}:${folder.id}`,
            label: folder.name,
            icon: getIconForFolder(folder.specialUse || normalizedFolderName),
            providerId: provider.id,
            providerEmail: provider.email,
            filterFolder: normalizedFolderName,
            count: folder.unreadCount ?? folder.unseenCount ?? folder.recentCount ?? folder.totalCount,
            queryOverrides: {
              providerId: provider.id,
              folder: normalizedFolderName,
            },
          });
        });
      });

      setRemoteFolders(dynamicFolders);

      const stillExists = selectedFolderId
        ? dynamicFolders.some((folder) => folder.id === selectedFolderId)
        : false;

      if (!stillExists) {
        setSelectedFolderId(dynamicFolders[0]?.id ?? aggregatorFolders[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  }, [selectedFolderId, aggregatorFolders, getIconForFolder]);

  const loadData = useCallback(async () => {
    if (!activeFolder) {
      return;
    }
    try {
      setLoading(true);
      currentPageRef.current = 1;

      const providersRes = await providersApi.getProviders();
      setProviders(providersRes || []);

      // Build query parameters - load first page with 50 items per page
      const queryParams: EmailListParams = {
        limit: 50,
        page: 1,
        ...activeFolder.queryOverrides,
        search: searchQuery || undefined,
      };

      console.log('Loading emails for folder:', activeFolder.label, 'with params:', queryParams);

      const emailsRes = await emailApi.listEmails(queryParams);
      console.log('API returned', emailsRes.data.emails?.length || 0, 'emails');

      setEmails(emailsRes.data.emails || []);
      // Check if there are more emails to load
      setHasNextPage((emailsRes.data.emails?.length || 0) === 50);
      setSelectedEmail(null);
    } catch (error) {
      console.error('Failed to load mailbox data:', error);
      setEmails([]);
      setSelectedEmail(null);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, searchQuery]);

  const loadMoreRows = useCallback(async (_startIndex: number, _stopIndex: number) => {
    if (isLoadingMore || !hasNextPage || !activeFolder) {
      return;
    }

    try {
      setIsLoadingMore(true);
      currentPageRef.current += 1;

      const queryParams: EmailListParams = {
        limit: 50,
        page: currentPageRef.current,
        ...activeFolder.queryOverrides,
        search: searchQuery || undefined,
      };

      console.log('Loading more emails, page:', currentPageRef.current);

      const emailsRes = await emailApi.listEmails(queryParams);
      const newEmails = emailsRes.data.emails || [];

      console.log('Loaded', newEmails.length, 'more emails');

      // Append new emails to existing ones
      setEmails((prev) => [...prev, ...newEmails]);
      // Update hasNextPage based on response
      setHasNextPage(newEmails.length === 50);
    } catch (error) {
      console.error('Failed to load more emails:', error);
      setHasNextPage(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeFolder, searchQuery, hasNextPage, isLoadingMore]);

  const totalRowCount = hasNextPage ? emails.length + 1 : emails.length;
  const listHeight = typeof window === 'undefined' ? 600 : window.innerHeight - 250;

  const isRowLoaded = useCallback(
    (index: number) => !hasNextPage || index < emails.length,
    [emails, hasNextPage],
  );

  const onRowsRendered = useInfiniteLoader({
    isRowLoaded,
    loadMoreRows,
    minimumBatchSize: 50,
    rowCount: totalRowCount,
    threshold: 15,
  });

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      onRowsRendered(visibleRows);
    },
    [onRowsRendered],
  );


  useEffect(() => {
    loadFolderMetadata();
  }, [loadFolderMetadata]);

  useEffect(() => {
    if (!selectedFolderId && combinedFolders.length) {
      setSelectedFolderId(combinedFolders[0].id);
    }
  }, [combinedFolders, selectedFolderId]);

  useEffect(() => {
    if (activeFolder) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, searchQuery]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('Refreshing folders and emails...');

      // Reload folders first
      await loadFolderMetadata();

      // Then reload emails
      if (activeFolder) {
        await loadData();
      }

      console.log('Refresh completed');
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmailClick = useCallback(async (email: Email) => {
    // Fetch full email with bodyHtml
    try {
      const fullEmail = await emailApi.getEmail(email.id);
      setSelectedEmail(fullEmail.data);

      // Mark as read
      if (!fullEmail.data.isRead) {
        emailApi.updateEmail(email.id, { isRead: true });
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
      }
    } catch (error) {
      console.error('Failed to fetch email:', error);
      // Fallback to list email if fetch fails
      setSelectedEmail(email);
    }
  }, []);

  const handleToggleStar = useCallback(async (emailId: string, isStarred: boolean) => {
    await emailApi.updateEmail(emailId, { isStarred: !isStarred });
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, isStarred: !isStarred } : e))
    );
    setSelectedEmail((prev) =>
      prev?.id === emailId ? { ...prev, isStarred: !isStarred } : prev
    );
  }, []);

  const handleDelete = async (emailId: string) => {
    await emailApi.deleteEmail(emailId);
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(emails[0] || null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const idsToDelete = new Set(selectedIds);

    try {
      await Promise.all(Array.from(idsToDelete).map((id) => emailApi.deleteEmail(id)));

      let nextSelection: Email | null = selectedEmail;
      setEmails((prev) => {
        const nextEmails = prev.filter((email) => !idsToDelete.has(email.id));
        if (selectedEmail && idsToDelete.has(selectedEmail.id)) {
          nextSelection = nextEmails[0] || null;
        }
        return nextEmails;
      });

      if (selectedEmail && idsToDelete.has(selectedEmail.id)) {
        setSelectedEmail(nextSelection);
      }
    } catch (error) {
      console.error('Failed to delete selected emails:', error);
    } finally {
      setSelectedIds(new Set());
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleToggleSelect = useCallback((emailId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  // Helper: Parse email "from" field
  const parseEmailFrom = useCallback((fromString: string) => {
    // Format: "Name <email@example.com>" or just "email@example.com"
    const match = fromString.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: fromString, email: fromString };
  }, []);

  // Helper: Get provider icon based on provider type
  const getProviderIcon = useCallback((providerId?: string) => {
    if (!providerId) return '📬';

    const provider = _providers.find(p => p.id === providerId);
    if (!provider) return '📬';

    switch (provider.providerType) {
      case 'google':
        return '📧';
      case 'microsoft':
        return '📨';
      case 'generic':
      default:
        return '📬';
    }
  }, [_providers]);

  // Helper: Check if has attachments
  const hasAttachments = useCallback((email: Email) => {
    return (email.attachments?.length || 0) > 0;
  }, []);

  // Helper: Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, []);

  const renderRow = useCallback(
    ({ index, style, ariaAttributes }: RowComponentProps) => {
      if (index >= emails.length) {
        return (
          <div style={style} {...ariaAttributes}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          </div>
        );
      }

      const email = emails[index];
      return (
        <div style={style} {...ariaAttributes}>
          <ListItemButton
            selected={selectedEmail?.id === email.id}
            onClick={() => handleEmailClick(email)}
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: email.isRead ? 'transparent' : 'action.hover',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
              <Checkbox
                checked={selectedIds.has(email.id)}
                onChange={() => handleToggleSelect(email.id)}
                onClick={(e) => e.stopPropagation()}
                size="small"
              />
              <Badge
                badgeContent={getProviderIcon(email.providerId)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                    padding: 0,
                    backgroundColor: 'transparent',
                  },
                }}
              >
                <Avatar sx={{ width: 36, height: 36 }}>
                  {parseEmailFrom(email.from).name[0]?.toUpperCase() || 'U'}
                </Avatar>
              </Badge>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: email.isRead ? 400 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {parseEmailFrom(email.from).name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(email.sentAt)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: email.isRead ? 400 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.5,
                  }}
                >
                  {email.subject}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {email.snippet}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {hasAttachments(email) && (
                    <Chip
                      size="small"
                      icon={<Paperclip size={12} />}
                      label="Attachment"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStar(email.id, email.isStarred);
                }}
              >
                <Star size={16} fill={email.isStarred ? '#FFB300' : 'none'} color={email.isStarred ? '#FFB300' : 'currentColor'} />
              </IconButton>
            </Box>
          </ListItemButton>
          <Divider />
        </div>
      );
    },
    [
      emails,
      selectedEmail?.id,
      handleEmailClick,
      selectedIds,
      handleToggleSelect,
      getProviderIcon,
      handleToggleStar,
      parseEmailFrom,
      formatDate,
      hasAttachments,
    ],
  );

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Folders Sidebar */}
      <Paper
        sx={{
          width: { xs: '100%', sm: 240 },
          borderRadius: 0,
          borderRight: { xs: 0, sm: 1 },
          borderColor: 'divider',
          display: selectedEmail ? { xs: 'none', sm: 'flex' } : { xs: 'flex', sm: 'flex' },
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Mail size={18} />}
            onClick={() => router.push('/dashboard/email/compose')}
          >
            {t.common.compose}
          </Button>
        </Box>

        <MuiList sx={{ px: 1, flex: 1, overflow: 'auto' }}>
          {foldersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={18} />
            </Box>
          ) : foldersByProvider.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t.dashboard.email.noProviders}
              </Typography>
            </Box>
          ) : (
            foldersByProvider.map((group) => (
              <Accordion
                key={group.providerId}
                expanded={expandedProviders.has(group.providerId)}
                onChange={() => {
                  const newExpanded = new Set(expandedProviders);
                  if (expandedProviders.has(group.providerId)) {
                    newExpanded.delete(group.providerId);
                  } else {
                    newExpanded.add(group.providerId);
                  }
                  setExpandedProviders(newExpanded);
                }}
                disableGutters
                elevation={0}
                sx={{
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronDown size={16} />}
                  sx={{
                    minHeight: 40,
                    px: 2,
                    '&.Mui-expanded': { minHeight: 40 },
                    '& .MuiAccordionSummary-content': { my: 0.5 },
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                  >
                    {group.providerEmail}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <MuiList sx={{ py: 0 }}>
                    {group.folders.map((folder) => (
                      <ListItemButton
                        key={folder.id}
                        selected={activeFolder?.id === folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        sx={{ borderRadius: 2, mb: 0.5, mx: 1 }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 36,
                            color: folder.color || 'inherit',
                          }}
                        >
                          {folder.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={folder.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: activeFolder?.id === folder.id ? 600 : 500,
                          }}
                        />
                        {folder.count && folder.count > 0 && (
                          <Chip
                            label={folder.count}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </ListItemButton>
                    ))}
                  </MuiList>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </MuiList>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {emails.length} emails
          </Typography>
        </Box>
      </Paper>

      {/* Email List - hide on mobile when email is selected */}
      <Paper
        sx={{
          width: { xs: '100%', md: 360 },
          borderRadius: 0,
          borderRight: { xs: 0, md: 1 },
          borderColor: 'divider',
          display: selectedEmail ? { xs: 'none', sm: 'flex' } : 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {selectedIds.size > 0 ? (
              <>
                <Checkbox
                  checked={selectedIds.size === emails.length}
                  indeterminate={
                    selectedIds.size > 0 && selectedIds.size < emails.length
                  }
                  onChange={handleSelectAll}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {selectedIds.size} selected
                </Typography>
                <Tooltip title={t.common.delete}>
                  <IconButton size="small" onClick={handleBulkDelete}>
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Checkbox onChange={handleSelectAll} />
                <Tooltip title={t.common.refresh}>
                  <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  </IconButton>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  1-{emails.length} of {emails.length}
                </Typography>
              </>
            )}
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={t.dashboard.email.searchPlaceholder}
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
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : emails.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Mail size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="body2" color="text.secondary">
                No emails found
              </Typography>
            </Box>
          ) : (
            <VirtualizedList
              rowCount={totalRowCount}
              rowHeight={120}
              rowComponent={renderRow}
              rowProps={{}}
              onRowsRendered={handleRowsRendered}
              style={{ height: listHeight, width: '100%' }}
              defaultHeight={600}
              overscanCount={5}
            />
          )}
        </Box>
      </Paper>

      {/* Email Detail Panel - fullscreen on mobile, side panel on desktop */}
      {selectedEmail && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: { xs: 'fixed', sm: 'relative' },
            top: { xs: 0, sm: 'auto' },
            left: { xs: 0, sm: 'auto' },
            right: { xs: 0, sm: 'auto' },
            bottom: { xs: 0, sm: 'auto' },
            zIndex: { xs: 1200, sm: 'auto' },
            bgcolor: 'background.paper',
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
              gap: 1,
            }}
          >
            <Tooltip title="Back">
              <IconButton size="small" onClick={() => setSelectedEmail(null)}>
                <ArrowLeft size={18} />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Archive">
              <IconButton size="small">
                <Archive size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => handleDelete(selectedEmail.id)}>
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="More">
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVertical size={18} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Email Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {selectedEmail.subject}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 48, height: 48 }}>
                {parseEmailFrom(selectedEmail.from).name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {parseEmailFrom(selectedEmail.from).name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {parseEmailFrom(selectedEmail.from).email}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatDate(selectedEmail.sentAt)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }} dangerouslySetInnerHTML={{ __html: emailBody }} />

            {hasAttachments(selectedEmail) && selectedEmail.attachments && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  {t.dashboard.emailView.attachments}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedEmail.attachments.map((attachment, idx) => (
                    <Chip
                      key={attachment.id || idx}
                      icon={<Paperclip size={16} />}
                      label={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
                      onClick={async () => {
                        try {
                          const response = await emailApi.downloadAttachment(selectedEmail.id, attachment.id);
                          if (response.data.downloadUrl) {
                            // Open download URL in new tab
                            window.open(response.data.downloadUrl, '_blank');
                          } else if (response.data.message) {
                            // Show message if download not yet implemented
                            alert(response.data.message);
                          }
                        } catch (error) {
                          console.error('Failed to download attachment:', error);
                          alert('Failed to download attachment. Please try again.');
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              startIcon={<Reply size={18} />}
              onClick={() => router.push(`/dashboard/email/compose?replyTo=${selectedEmail.id}`)}
            >
              {t.dashboard.emailView.reply}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Forward size={18} />}
              onClick={() =>
                router.push(`/dashboard/email/compose?forwardFrom=${selectedEmail.id}`)
              }
            >
              {t.dashboard.emailView.forward}
            </Button>
          </Box>
        </Box>
      )}

      {/* More Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={async () => {
            if (selectedEmail) {
              await emailApi.updateEmail(selectedEmail.id, { isRead: false });
              setSelectedEmail({ ...selectedEmail, isRead: false });
              setEmails((prev) =>
                prev.map((e) => (e.id === selectedEmail.id ? { ...e, isRead: false } : e))
              );
            }
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <MailOpen size={18} />
          </ListItemIcon>
          <ListItemText>Mark as unread</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            if (selectedEmail) {
              router.push(`/dashboard/calendar?subject=${encodeURIComponent(selectedEmail.subject)}`);
            }
          }}
        >
          <ListItemIcon>
            <Calendar size={18} />
          </ListItemIcon>
          <ListItemText>Add to calendar</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
