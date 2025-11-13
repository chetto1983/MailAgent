import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab,
  Badge,
} from '@mui/material';
import { Menu, Edit, Bot } from 'lucide-react';
import { EmailToolbar } from './EmailToolbar';
import { EmailFilters, EmailFilterValues } from './EmailFilters';
import { EmailListEnhanced } from './EmailListEnhanced';
import { EmailView } from '../EmailView';
import { FolderNavigation, FolderType } from '../FolderNavigation';
import { AIChatPanel } from './AIChatPanel';
import { EmailComposer } from './EmailComposer';
import { emailApi, type Email, type EmailStats } from '@/lib/api/email';
import { useAuthStore } from '@/stores/auth-store';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';

const DRAWER_WIDTH = 260;

/**
 * Gmail-Style Mail Layout
 *
 * Features:
 * - Responsive 3-column layout (sidebar, list, preview)
 * - Mobile drawer navigation
 * - Batch email actions
 * - Advanced filters
 * - AI chat integration
 * - Email composer
 * - Multi-account support
 */
export function GmailMailLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const token = useAuthStore((state) => state.token);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showFilters, setShowFilters] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  // Data State
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType>('INBOX');
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(
    new Set()
  );
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [filters, setFilters] = useState<EmailFilterValues>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

  // Load emails
  const loadEmails = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Convert "all" to undefined for API
      const apiFilters: any = { ...filters };
      if (apiFilters.isRead === 'all') {
        delete apiFilters.isRead;
      }

      const response = await emailApi.listEmails({
        folder: selectedFolder,
        page,
        limit: 50,
        ...(apiFilters as Omit<typeof filters, 'isRead'> & { isRead?: boolean }),
      });

      setEmails(response.data.emails);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedFolder, page, filters]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!token) return;

    try {
      const response = await emailApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [token]);

  // Load providers
  const loadProviders = useCallback(async () => {
    if (!token) return;

    try {
      const data = await providersApi.getProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, [token]);

  useEffect(() => {
    loadEmails();
    loadStats();
    loadProviders();
  }, [loadEmails, loadStats, loadProviders]);

  // Handlers
  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (isMobile) {
      // On mobile, you might want to navigate to a different view
    }

    // Mark as read if unread
    if (!email.isRead) {
      emailApi.updateEmail(email.id, { isRead: true });
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
      );
    }
  };

  const handleSelectEmail = (
    email: Email,
    index: number,
    options: { checked: boolean; shiftKey: boolean }
  ) => {
    const newSelected = new Set(selectedEmailIds);

    if (options.shiftKey && lastSelectedIndex !== -1) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        if (options.checked) {
          newSelected.add(emails[i].id);
        } else {
          newSelected.delete(emails[i].id);
        }
      }
    } else {
      // Regular click
      if (options.checked) {
        newSelected.add(email.id);
      } else {
        newSelected.delete(email.id);
      }
    }

    setSelectedEmailIds(newSelected);
    setLastSelectedIndex(index);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmailIds(new Set(emails.map((e) => e.id)));
    } else {
      setSelectedEmailIds(new Set());
    }
  };

  // Batch actions
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedEmailIds);
    try {
      await Promise.all(
        ids.map((id) => emailApi.updateEmail(id, { isDeleted: true }))
      );
      setEmails((prev) => prev.filter((e) => !selectedEmailIds.has(e.id)));
      setSelectedEmailIds(new Set());
      loadStats();
    } catch (error) {
      console.error('Failed to delete emails:', error);
    }
  };

  const handleBatchArchive = async () => {
    const ids = Array.from(selectedEmailIds);
    try {
      await Promise.all(
        ids.map((id) => emailApi.updateEmail(id, { isArchived: true }))
      );
      setEmails((prev) => prev.filter((e) => !selectedEmailIds.has(e.id)));
      setSelectedEmailIds(new Set());
      loadStats();
    } catch (error) {
      console.error('Failed to archive emails:', error);
    }
  };

  const handleBatchMarkAsRead = async () => {
    const ids = Array.from(selectedEmailIds);
    try {
      await Promise.all(
        ids.map((id) => emailApi.updateEmail(id, { isRead: true }))
      );
      setEmails((prev) =>
        prev.map((e) => (selectedEmailIds.has(e.id) ? { ...e, isRead: true } : e))
      );
      setSelectedEmailIds(new Set());
      loadStats();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleBatchMarkAsUnread = async () => {
    const ids = Array.from(selectedEmailIds);
    try {
      await Promise.all(
        ids.map((id) => emailApi.updateEmail(id, { isRead: false }))
      );
      setEmails((prev) =>
        prev.map((e) =>
          selectedEmailIds.has(e.id) ? { ...e, isRead: false } : e
        )
      );
      setSelectedEmailIds(new Set());
      loadStats();
    } catch (error) {
      console.error('Failed to mark as unread:', error);
    }
  };

  // Single email actions
  const handleToggleStar = async (email: Email) => {
    try {
      await emailApi.updateEmail(email.id, { isStarred: !email.isStarred });
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, isStarred: !e.isStarred } : e
        )
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...email, isStarred: !email.isStarred });
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleToggleRead = async (email: Email) => {
    try {
      await emailApi.updateEmail(email.id, { isRead: !email.isRead });
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: !e.isRead } : e))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...email, isRead: !email.isRead });
      }
      loadStats();
    } catch (error) {
      console.error('Failed to toggle read:', error);
    }
  };

  const handleDelete = async (email: Email) => {
    try {
      await emailApi.updateEmail(email.id, { isDeleted: true });
      setEmails((prev) => prev.filter((e) => e.id !== email.id));
      setSelectedEmail(null);
      loadStats();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  const handleReply = (_email: Email) => {
    // Open composer in reply mode
    setComposerOpen(true);
    // TODO: Pass email context to composer
  };

  const handleForward = (_email: Email) => {
    // Open composer in forward mode
    setComposerOpen(true);
    // TODO: Pass email context to composer
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const extractDisplayName = (from: string) => {
    return from?.split('<')[0].trim() || from;
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <FolderNavigation
        selectedFolder={selectedFolder}
        onFolderChange={(folder) => {
          setSelectedFolder(folder);
          setPage(1);
          if (isMobile) setSidebarOpen(false);
        }}
        stats={stats}
      />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              position: 'relative',
              border: 'none',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <EmailToolbar
          selectedCount={selectedEmailIds.size}
          totalCount={emails.length}
          allSelected={
            selectedEmailIds.size > 0 && selectedEmailIds.size === emails.length
          }
          onSelectAll={handleSelectAll}
          onArchive={handleBatchArchive}
          onDelete={handleBatchDelete}
          onMarkAsRead={handleBatchMarkAsRead}
          onMarkAsUnread={handleBatchMarkAsUnread}
          onRefresh={() => {
            loadEmails();
            loadStats();
          }}
          onFilterToggle={() => setShowFilters(!showFilters)}
          showFilters={showFilters}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          loading={loading}
        />

        {/* Filters */}
        <EmailFilters
          open={showFilters}
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
          onClear={() => setFilters({})}
          providers={providers}
        />

        {/* Email List and Preview */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Email List */}
          <Box
            sx={{
              width: { xs: '100%', lg: selectedEmail ? '40%' : '100%' },
              borderRight: { lg: 1 },
              borderColor: 'divider',
              overflow: 'auto',
              display: { xs: selectedEmail ? 'none' : 'block', lg: 'block' },
            }}
          >
            <EmailListEnhanced
              emails={emails}
              selectedEmail={selectedEmail}
              onEmailClick={handleEmailClick}
              loading={loading}
              selectedEmailIds={selectedEmailIds}
              onSelectEmail={handleSelectEmail}
              formatDate={formatDate}
              extractDisplayName={extractDisplayName}
              providers={providers}
            />
          </Box>

          {/* Email Preview */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              display: { xs: selectedEmail ? 'block' : 'none', lg: 'block' },
            }}
          >
            <EmailView
              selectedEmail={selectedEmail}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
              onReply={handleReply}
              onForward={handleForward}
              onClose={isMobile ? () => setSelectedEmail(null) : undefined}
              t={{
                selectEmail: 'Select an email to view',
                folderLabel: 'Folder',
                attachments: 'Attachments',
                to: 'To',
                cc: 'CC',
                labels: 'Labels',
                date: 'Date',
                reply: 'Reply',
                forward: 'Forward',
              } as any}
              locale="en-US"
            />
          </Box>
        </Box>
      </Box>

      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1200,
            bgcolor: 'background.paper',
            boxShadow: 2,
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </IconButton>
      )}

      {/* Compose FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: { xs: 80, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: 1200,
        }}
        onClick={() => setComposerOpen(true)}
      >
        <Edit />
      </Fab>

      {/* AI Chat FAB */}
      <Fab
        color="secondary"
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: 1200,
        }}
        onClick={() => setAiChatOpen(!aiChatOpen)}
      >
        <Badge badgeContent={0} color="error">
          <Bot />
        </Badge>
      </Fab>

      {/* AI Chat Panel */}
      <AIChatPanel
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        emailContext={
          selectedEmail
            ? {
                subject: selectedEmail.subject,
                from: selectedEmail.from,
                content: selectedEmail.bodyText || selectedEmail.bodyHtml || '',
              }
            : undefined
        }
      />

      {/* Email Composer */}
      {composerOpen && (
        <EmailComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          providers={providers}
        />
      )}
    </Box>
  );
}
