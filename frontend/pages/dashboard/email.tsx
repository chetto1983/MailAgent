import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/router';
import { RefreshCw, Plus, Search, Mail, MailOpen, Trash2, X, Star } from 'lucide-react';
import {
  Box,
  Grid,
  TextField,
  InputAdornment,
  Typography,
  Fab,
  Stack,
  CircularProgress,
  Paper,
  IconButton,
  MenuItem,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { emailApi, type Email, type EmailStats, type EmailListParams } from '@/lib/api/email';
import { useLocale } from '@/lib/hooks/use-locale';
import { useTranslations } from '@/lib/hooks/use-translations';
import { EmailList } from '@/components/dashboard/EmailList';
import { EmailView } from '@/components/dashboard/EmailView';
import { EmailSummary } from '@/components/dashboard/ai/EmailSummary';
import { SmartReply } from '@/components/dashboard/ai/SmartReply';
import { LabelSuggestions } from '@/components/dashboard/ai/LabelSuggestions';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { EmailComposer, type EmailDraft } from '@/components/dashboard/email/EmailComposer';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FolderNavigation, type FolderType } from '@/components/dashboard/FolderNavigation';

type ParsedSseMessage = {
  type: string;
  data?: string;
};

const parseSseMessage = (chunk: string): ParsedSseMessage | null => {
  if (!chunk) {
    return null;
  }

  const lines = chunk.split(/\r?\n/);
  let type = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      type = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  return { type, data: dataLines.join('\n') };
};

export default function EmailPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { logout } = useAuthStore();
  const locale = useLocale();
  const localized = useTranslations();
  const common = localized.common;
  const emailCopy = localized.dashboard.email;
  const emailListCopy = localized.dashboard.emailList;
  const emailViewCopy = localized.dashboard.emailView;

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [emailProviders, setEmailProviders] = useState<ProviderConfig[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [composeOriginalEmail, setComposeOriginalEmail] = useState<Email | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderType>('INBOX');
  const [composerBodyPrefill, setComposerBodyPrefill] = useState('');
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [fromFilter, setFromFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const updateEmailState = useCallback((nextEmails: Email[]) => {
    setEmails(nextEmails);
    setSelectedEmail((prev) => {
      if (!prev) {
        return prev;
      }
      const updated = nextEmails.find((email) => email.id === prev.id);
      if (!updated) {
        return prev;
      }
      return { ...prev, ...updated };
    });
  }, []);
  const applyClientFilters = useCallback(
    (list: Email[]) => {
      const normalizedFrom = fromFilter.trim().toLowerCase();
      const parseDate = (value: string) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      return list.filter((email) => {
        if (providerFilter !== 'all' && email.providerId !== providerFilter) {
          return false;
        }
        if (readFilter === 'read' && !email.isRead) {
          return false;
        }
        if (readFilter === 'unread' && email.isRead) {
          return false;
        }
        if (starredOnly && !email.isStarred) {
          return false;
        }
        if (normalizedFrom && !email.from.toLowerCase().includes(normalizedFrom)) {
          return false;
        }
        if (start) {
          const received = new Date(email.receivedAt);
          if (received < start) {
            return false;
          }
          if (end && received > end) {
            return false;
          }
        } else if (end) {
          const received = new Date(email.receivedAt);
          if (received > end) {
            return false;
          }
        }
        return true;
      });
    },
    [providerFilter, readFilter, starredOnly, fromFilter, startDate, endDate],
  );

  const hasEmailProviders = emailProviders.length > 0;
  const defaultProviderId = useMemo(
    () => emailProviders.find((provider) => provider.isDefault)?.id ?? emailProviders[0]?.id ?? null,
    [emailProviders],
  );

  const loadEmails = useCallback(
    async (folder?: FolderType, search?: string) => {
      if (!user) return;
      try {
        setLoading(true);

        const normalizedSearch = search?.trim();
        const normalizedFrom = fromFilter.trim();
        const providerIdFilter = providerFilter !== 'all' ? providerFilter : undefined;
        const readFilterValue =
          readFilter === 'all' ? undefined : readFilter === 'read';

        // Determine folder filter for API
        let folderFilter: string | undefined;
        let isStarredFilter: boolean | undefined = starredOnly ? true : undefined;

        if (folder && folder !== 'ALL') {
          if (folder === 'STARRED') {
            isStarredFilter = true;
          } else {
            folderFilter = folder;
          }
        }

        if (normalizedSearch) {
          const response = await emailApi.searchEmails(normalizedSearch);
          const nextEmails = response.data.emails || [];
          updateEmailState(applyClientFilters(nextEmails));
          return;
        }

        const params: EmailListParams = {
          page: 1,
          limit: 100,
          folder: folderFilter,
          isStarred: isStarredFilter,
          isRead: readFilterValue,
          providerId: providerIdFilter,
        };

        if (normalizedFrom) {
          params.from = normalizedFrom;
        }
        if (startDate) {
          params.startDate = startDate;
        }
        if (endDate) {
          params.endDate = endDate;
        }

        const response = await emailApi.listEmails(params);

        const nextEmails = response.data.emails || [];
        updateEmailState(applyClientFilters(nextEmails));
      } catch (error) {
        console.error('Failed to load emails:', error);
        updateEmailState([]);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      updateEmailState,
      applyClientFilters,
      providerFilter,
      readFilter,
      starredOnly,
      fromFilter,
      startDate,
      endDate,
    ],
  );

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const response = await emailApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [user]);

  const loadProviders = useCallback(async () => {
    if (!user) return;
    try {
      const data = await providersApi.getProviders();
      // Ensure data is an array before filtering
      if (!Array.isArray(data)) {
        console.error('Providers API returned non-array data:', data);
        setEmailProviders([]);
        return;
      }
      const activeEmailProviders = data.filter(
        (provider) => provider.supportsEmail && provider.isActive,
      );
      setEmailProviders(activeEmailProviders);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setEmailProviders([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadEmails(selectedFolder);
    loadStats();
  }, [loadEmails, loadStats, user, selectedFolder]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const selectedFolderRef = useRef<FolderType>(selectedFolder);
  const searchQueryRef = useRef<string>(searchQuery);

  useEffect(() => {
    selectedFolderRef.current = selectedFolder;
  }, [selectedFolder]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const refreshCurrentMailbox = useCallback(() => {
    const activeFolder = selectedFolderRef.current;
    const activeSearch = searchQueryRef.current.trim();
    loadEmails(activeFolder, activeSearch ? activeSearch : undefined);
    loadStats();
  }, [loadEmails, loadStats]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return undefined;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      return undefined;
    }

    let isCancelled = false;
    let retryDelay = 2000;
    let retryHandle: number | null = null;
    const controller = new AbortController();

    const connect = async () => {
      if (isCancelled) {
        return;
      }

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          return;
        }

        const response = await fetch(`${baseUrl}/email-events/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed with status ${response.status}`);
        }

        retryDelay = 2000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseMessage(rawEvent);

            if (parsed?.type === 'emailUpdate' && parsed.data) {
              const shouldRefresh = typeof document === 'undefined' || !document.hidden;
              if (shouldRefresh) {
                try {
                  JSON.parse(parsed.data);
                  refreshCurrentMailbox();
                } catch (parseError) {
                  console.warn('Failed to parse email update payload', parseError);
                }
              }
            }

            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const nextDelay = Math.min(retryDelay * 1.5, 30000);
        retryHandle = window.setTimeout(() => {
          retryDelay = nextDelay;
          connect();
        }, retryDelay);
      }
    };

    connect();

    return () => {
      isCancelled = true;
      controller.abort();
      if (retryHandle) {
        window.clearTimeout(retryHandle);
      }
    };
  }, [user, refreshCurrentMailbox]);

  const clearSelection = useCallback(() => {
    setSelectedEmailIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEmails(selectedFolder, searchQuery), loadStats()]);
    setRefreshing(false);
  }, [loadEmails, loadStats, selectedFolder, searchQuery]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  const handleEmailClick = useCallback(
    async (email: Email) => {
      try {
        if (email.threadId) {
          const threadResponse = await emailApi.getThread(email.threadId);
          const threadEmails = threadResponse.data;
          const fullEmail = threadEmails.find((e) => e.id === email.id) || threadEmails.at(-1)!;
          const unreadIds = threadEmails.filter((e) => !e.isRead).map((e) => e.id);

          const normalizedEmail =
            unreadIds.length > 0 && !fullEmail.isRead
              ? { ...fullEmail, isRead: true }
              : fullEmail;
          setSelectedEmail(normalizedEmail);

          if (unreadIds.length > 0) {
            emailApi.bulkMarkRead(unreadIds, true).then(() => {
              setEmails((prev) =>
                prev.map((e) => {
                  if (e.threadId === email.threadId || e.id === email.id) {
                    return { ...e, isRead: true };
                  }
                  return e;
                }),
              );
              loadStats();
            });
          }
        } else {
          const response = await emailApi.getEmail(email.id);
          const normalizedEmail = !email.isRead
            ? { ...response.data, isRead: true }
            : response.data;
          setSelectedEmail(normalizedEmail);

          if (!email.isRead) {
            emailApi.updateEmail(email.id, { isRead: true }).then(() => {
              setEmails((prev) =>
                prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)),
              );
              loadStats();
            });
          }
        }

        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setMobileDetailOpen(true);
        }
      } catch (error) {
        console.error('Failed to load email details:', error);
        setSelectedEmail(email);
      }
    },
    [loadStats],
  );

  const closeMobileDetail = useCallback(() => setMobileDetailOpen(false), []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // If search is cleared, reload current folder
      if (!searchQuery.trim()) {
        loadEmails(selectedFolder);
        return;
      }

      // Otherwise, search
      loadEmails(selectedFolder, searchQuery);
    },
    [searchQuery, loadEmails, selectedFolder],
  );

  const handleFolderChange = useCallback(
    (folder: FolderType) => {
      setSelectedFolder(folder);
      setSearchQuery(''); // Clear search when changing folders
      setSelectedEmail(null); // Clear selected email
      clearSelection();
    },
    [clearSelection],
  );

  const handleToggleRead = useCallback(
    async (email: Email) => {
      try {
        await emailApi.updateEmail(email.id, { isRead: !email.isRead });
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: !email.isRead } : e)),
        );
        if (selectedEmail?.id === email.id) {
          setSelectedEmail({ ...email, isRead: !email.isRead });
        }
        loadStats();
      } catch (error) {
        console.error('Failed to toggle read status:', error);
      }
    },
    [loadStats, selectedEmail],
  );

  const handleToggleStar = useCallback(
    async (email: Email) => {
      try {
        await emailApi.updateEmail(email.id, { isStarred: !email.isStarred });
        setEmails((prev) =>
          prev.map((e) =>
            e.id === email.id ? { ...e, isStarred: !email.isStarred } : e,
          ),
        );
        if (selectedEmail?.id === email.id) {
          setSelectedEmail({ ...email, isStarred: !email.isStarred });
        }
        loadStats();
      } catch (error) {
        console.error('Failed to toggle star:', error);
      }
    },
    [loadStats, selectedEmail],
  );

  const handleDelete = useCallback(
    async (email: Email) => {
      if (!window.confirm('Are you sure you want to delete this email?')) return;

      try {
        await emailApi.deleteEmail(email.id);
        setEmails((prev) => prev.filter((e) => e.id !== email.id));
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        loadStats();
      } catch (error) {
        console.error('Failed to delete email:', error);
      }
    },
    [loadStats, selectedEmail],
  );

  const formatDate = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      }
      if (diffHours < 24 * 7) {
        return date.toLocaleDateString(locale, { weekday: 'short' });
      }
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    },
    [locale],
  );

  const extractDisplayName = useCallback((from: string) => {
    const match = from.match(/"?(.*?)"?\s*<.*?>$/);
    return match ? match[1].trim() : from.split('@')[0];
  }, []);

  const handleEmailSelect = useCallback(
    (email: Email, index: number, options: { checked: boolean; shiftKey: boolean }) => {
      setSelectedEmailIds((prev) => {
        const next = new Set(prev);
        let newAnchor = lastSelectedIndex;

        if (options.shiftKey && lastSelectedIndex !== null && options.checked) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i += 1) {
            const rangeEmail = emails[i];
            if (rangeEmail) {
              next.add(rangeEmail.id);
            }
          }
          newAnchor = index;
        } else if (options.checked) {
          next.add(email.id);
          newAnchor = index;
        } else {
          next.delete(email.id);
          if (next.size === 0) {
            newAnchor = null;
          }
        }

        if (newAnchor !== lastSelectedIndex) {
          setLastSelectedIndex(newAnchor);
        }

        return next;
      });
    },
    [emails, lastSelectedIndex],
  );

  useEffect(() => {
    setSelectedEmailIds((prev) => {
      const allowed = new Set(emails.map((email) => email.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      if (!changed) {
        return prev;
      }
      if (next.size === 0) {
        setLastSelectedIndex(null);
      }
      return next;
    });
  }, [emails]);

  const selectedIdsArray = useMemo(() => Array.from(selectedEmailIds), [selectedEmailIds]);
  const hasSelection = selectedIdsArray.length > 0;

  const handleSelectAllVisible = () => {
    setSelectedEmailIds(new Set(emails.map((email) => email.id)));
    setLastSelectedIndex(null);
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (!selectedIdsArray.length) return;
    setBulkActionLoading(true);
    try {
      await emailApi.bulkMarkRead(selectedIdsArray, isRead);
      setEmails((prev) =>
        prev.map((email) => (selectedIdsArray.includes(email.id) ? { ...email, isRead } : email)),
      );
      await loadStats();
      clearSelection();
    } catch (error) {
      console.error('Bulk mark read failed', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIdsArray.length) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedIdsArray.map((id) => emailApi.deleteEmail(id)));
      setEmails((prev) => prev.filter((email) => !selectedIdsArray.includes(email.id)));
      await loadStats();
      clearSelection();
    } catch (error) {
      console.error('Bulk delete failed', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleComposeOpenChange = useCallback((open: boolean) => {
    setIsComposeOpen(open);
    if (!open) {
      setComposeMode('compose');
      setComposeOriginalEmail(null);
      setComposerBodyPrefill('');
    }
  }, []);

  const openCompose = useCallback(() => {
    if (!hasEmailProviders) {
      router.push('/dashboard/providers');
      return;
    }
    setComposeMode('compose');
    setComposeOriginalEmail(null);
    setComposerBodyPrefill('');
    setIsComposeOpen(true);
  }, [hasEmailProviders, router]);

  const openReply = useCallback(
    (email: Email, body?: string) => {
      if (!hasEmailProviders) {
        router.push('/dashboard/providers');
        return;
      }
      setComposeMode('reply');
      setComposeOriginalEmail(email);
      setComposerBodyPrefill(body ?? '');
      setIsComposeOpen(true);
    },
    [hasEmailProviders, router],
  );

  const openForward = useCallback(
    (email: Email, body?: string) => {
      if (!hasEmailProviders) {
        router.push('/dashboard/providers');
        return;
      }
      setComposeMode('forward');
      setComposeOriginalEmail(email);
      setComposerBodyPrefill(body ?? '');
      setIsComposeOpen(true);
    },
    [hasEmailProviders, router],
  );

  const handleSmartReplySelect = useCallback(
    (text: string) => {
      if (!selectedEmail) return;
      openReply(selectedEmail, text);
    },
    [openReply, selectedEmail],
  );

  const renderAssistantPanel = useCallback(() => {
    if (!selectedEmail) {
      return (
        <Paper
          variant="outlined"
          sx={{
            mt: 3,
            borderRadius: 2,
            p: 2,
            color: 'text.secondary',
            fontSize: 14,
          }}
        >
          {emailViewCopy.selectEmail}
        </Paper>
      );
    }

    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        <EmailSummary
          emailId={selectedEmail.id}
          locale={locale}
          t={{
            summaryTitle: emailViewCopy.summaryTitle,
            summaryGenerate: emailViewCopy.summaryGenerate,
            summaryRegenerate: emailViewCopy.summaryRegenerate,
            summaryEmpty: emailViewCopy.summaryEmpty,
          }}
        />
        <SmartReply
          emailId={selectedEmail.id}
          locale={locale}
          t={{
            smartRepliesTitle: emailViewCopy.smartRepliesTitle,
            smartRepliesGenerate: emailViewCopy.smartRepliesGenerate,
            smartRepliesRegenerate: emailViewCopy.smartRepliesRegenerate,
            smartRepliesLoading: emailViewCopy.smartRepliesLoading,
            smartRepliesEmpty: emailViewCopy.smartRepliesEmpty,
          }}
          onSelect={handleSmartReplySelect}
        />
        <LabelSuggestions
          emailId={selectedEmail.id}
          locale={locale}
          t={{
            labelTitle: emailViewCopy.labelTitle,
            labelEmpty: emailViewCopy.labelEmpty,
          }}
        />
      </Stack>
    );
  }, [selectedEmail, locale, emailViewCopy, handleSmartReplySelect]);

  const fileToBase64 = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const [, base64] = result.split(',');
          resolve(base64 ?? '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }),
    [],
  );

  const handleComposerSend = useCallback(
    async (draft: EmailDraft) => {
      try {
        const attachments =
          draft.attachments && draft.attachments.length > 0
            ? await Promise.all(
                draft.attachments.map(async (file) => ({
                  filename: file.name,
                  contentType: file.type || 'application/octet-stream',
                  contentBase64: await fileToBase64(file),
                })),
              )
            : undefined;

        if (composeMode === 'reply' && composeOriginalEmail) {
          await emailApi.replyToEmail(composeOriginalEmail.id, {
            to: draft.to,
            cc: draft.cc,
            bcc: draft.bcc,
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
            bodyText: draft.bodyText,
            inReplyTo: draft.inReplyTo,
            references: draft.references,
            attachments,
          });
        } else if (composeMode === 'forward' && composeOriginalEmail) {
          await emailApi.forwardEmail(composeOriginalEmail.id, {
            to: draft.to,
            cc: draft.cc,
            bcc: draft.bcc,
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
            bodyText: draft.bodyText,
            inReplyTo: draft.inReplyTo,
            references: draft.references,
            attachments,
          });
        } else {
          await emailApi.sendEmail({
            providerId: draft.providerId,
            to: draft.to,
            cc: draft.cc,
            bcc: draft.bcc,
            subject: draft.subject,
            bodyHtml: draft.bodyHtml,
            bodyText: draft.bodyText,
            inReplyTo: draft.inReplyTo,
            references: draft.references,
            attachments,
          });
        }

        setIsComposeOpen(false);
        setComposeOriginalEmail(null);
        setComposeMode('compose');
        await Promise.all([loadEmails(selectedFolder), loadStats()]);
      } catch (error) {
        console.error('Failed to send email:', error);
        alert('Failed to send email. Please try again.');
      }
    },
    [composeMode, composeOriginalEmail, fileToBase64, loadEmails, loadStats, selectedFolder],
  );

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        <Typography variant="body1">{common.loading}</Typography>
      </Box>
    );
  }

  const layoutActions = (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ display: { xs: 'none', lg: 'flex' } }}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
      >
        {common.refresh}
      </Button>
      <Button size="sm" onClick={openCompose} startIcon={<Plus size={16} />}>
        {common.compose}
      </Button>
    </Stack>
  );

  const formatDescription = (count: number) =>
    emailCopy.descriptionTemplate.replace('{count}', String(Math.max(0, count)));
  const description = formatDescription(stats?.unread ?? 0);
  const filtersActive =
    providerFilter !== 'all' ||
    readFilter !== 'all' ||
    starredOnly ||
    !!fromFilter.trim() ||
    !!startDate ||
    !!endDate;
  const handleFilterReset = () => {
    setProviderFilter('all');
    setReadFilter('all');
    setStarredOnly(false);
    setFromFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Get the folder display name
  const getFolderDisplayName = (folder: FolderType): string => {
    const folderNames: Record<FolderType, string> = {
      ALL: 'All Mail',
      INBOX: 'Inbox',
      SENT: 'Sent',
      DRAFTS: 'Drafts',
      TRASH: 'Trash',
      STARRED: 'Starred',
    };
    return folderNames[folder] || 'Inbox';
  };

  return (
    <>
      <DashboardLayout
        title={getFolderDisplayName(selectedFolder)}
        description={description}
        actions={layoutActions}
        onLogout={handleLogout}
      >
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          onSubmit={handleSearch}
        >
          <TextField
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={emailCopy.searchPlaceholder}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" size="sm" variant="outline">
            {common.search}
          </Button>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Provider"
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All providers</MenuItem>
                {emailProviders.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.displayName || provider.email || provider.providerType || provider.id}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="From"
                value={fromFilter}
                onChange={(event) => setFromFilter(event.target.value)}
                placeholder="sender@company.com"
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="End date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={readFilter}
                onChange={(_, next) => {
                  if (next) {
                    setReadFilter(next as 'all' | 'unread' | 'read');
                  }
                }}
                aria-label="Read filter"
                color="primary"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="unread">Unread</ToggleButton>
                <ToggleButton value="read">Read</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={3}>
              <Chip
                icon={<Star size={14} />}
                label="Starred only"
                color={starredOnly ? 'warning' : 'default'}
                variant={starredOnly ? 'filled' : 'outlined'}
                onClick={() => setStarredOnly((prev) => !prev)}
                sx={{ width: 'fit-content' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleFilterReset}
                disabled={!filtersActive}
              >
                Reset filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {hasSelection && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {emailCopy.bulkBar.selected.replace('{count}', selectedIdsArray.length.toString())}
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkMarkRead(false)}
              disabled={bulkActionLoading}
              startIcon={<Mail size={16} />}
            >
              {emailCopy.bulkBar.markUnread}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkMarkRead(true)}
              disabled={bulkActionLoading}
              startIcon={<MailOpen size={16} />}
            >
              {emailCopy.bulkBar.markRead}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              startIcon={<Trash2 size={16} />}
            >
              {emailCopy.bulkBar.delete}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSelectAllVisible}>
              {emailCopy.bulkBar.selectAll}
            </Button>
            <IconButton
              size="small"
              onClick={clearSelection}
              disabled={bulkActionLoading}
              sx={{ ml: 'auto' }}
              aria-label={emailCopy.bulkBar.clear}
            >
              <X size={16} />
            </IconButton>
          </Paper>
        )}

        {!hasEmailProviders && (
          <Box
            sx={{
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'warning.main',
              bgcolor: 'warning.light',
              color: 'warning.contrastText',
              px: 3,
              py: 2,
            }}
          >
            <Typography variant="body2">{emailCopy.noProviders}</Typography>
          </Box>
        )}

        <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} sx={{ display: { xs: 'block', lg: 'none' } }}>
          <FolderNavigation
            selectedFolder={selectedFolder}
            onFolderChange={handleFolderChange}
            stats={stats}
          />
          {renderAssistantPanel()}
        </Grid>

        <Grid item xs={12} lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <FolderNavigation
            selectedFolder={selectedFolder}
            onFolderChange={handleFolderChange}
            stats={stats}
          />
          {renderAssistantPanel()}
        </Grid>

          <Grid item xs={12} lg={4}>
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onEmailClick={handleEmailClick}
              loading={loading}
              t={emailListCopy}
              selectedEmailIds={selectedEmailIds}
              onSelectEmail={handleEmailSelect}
              formatDate={formatDate}
              extractDisplayName={extractDisplayName}
            />
          </Grid>

          <Grid item xs={12} lg={5} sx={{ display: { xs: 'none', lg: 'block' } }}>
            <EmailView
              selectedEmail={selectedEmail}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
              onReply={openReply}
              onForward={openForward}
              onClose={closeMobileDetail}
              t={emailViewCopy}
              locale={locale}
            />
          </Grid>
        </Grid>
      </DashboardLayout>

      <EmailComposer
        key={`${composeMode}-${composeOriginalEmail?.id ?? 'new'}`}
        open={isComposeOpen}
        mode={composeMode}
        originalEmail={composeOriginalEmail ?? undefined}
        onSend={handleComposerSend}
        onClose={() => handleComposeOpenChange(false)}
        defaultBody={composerBodyPrefill}
        providers={emailProviders}
        defaultProviderId={composeOriginalEmail?.providerId ?? defaultProviderId ?? undefined}
      />

      <Dialog
        open={mobileDetailOpen && Boolean(selectedEmail)}
        onOpenChange={setMobileDetailOpen}
        fullWidth
        maxWidth="md"
      >
        <DialogContent sx={{ p: 0 }}>
          <EmailView
            selectedEmail={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
            onReply={openReply}
            onForward={openForward}
            onClose={closeMobileDetail}
            t={emailViewCopy}
            locale={locale}
          />
        </DialogContent>
      </Dialog>

      {hasEmailProviders && (
        <Fab
          color="primary"
          onClick={openCompose}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            display: { xs: 'flex', lg: 'none' },
          }}
          aria-label={common.compose}
        >
          <Plus size={20} />
        </Fab>
      )}
    </>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
