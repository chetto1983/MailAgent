import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import {
  RefreshCw,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { emailApi, type Email, type EmailStats } from '@/lib/api/email';
import { aiApi, type ChatMessage } from '@/lib/api/ai';
import { useLocale } from '@/lib/hooks/use-locale';
import { EmailList } from '@/components/dashboard/EmailList';
import { EmailView } from '@/components/dashboard/EmailView';
import { AiAssistant } from '@/components/dashboard/AiAssistant';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { EmailComposer, type EmailDraft } from '@/components/dashboard/email/EmailComposer';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

const translations = {
  en: {
    title: 'Inbox',
    description: (unread: number) => `${unread} unread – focus on what matters`,
    searchPlaceholder: 'Search emails...',
    compose: 'Compose',
    refresh: 'Refresh',
    toggleAi: 'Toggle AI',
    selectEmail: 'Select an email to read',
    noProviders: 'Connect a provider to send and receive email.',
  },
  it: {
    title: 'Posta',
    description: (unread: number) => `${unread} non lette – concentrati su ciò che conta`,
    searchPlaceholder: 'Cerca email...',
    compose: 'Scrivi',
    refresh: 'Aggiorna',
    toggleAi: 'AI',
    selectEmail: 'Seleziona un\'email da leggere',
    noProviders: 'Collega un provider per inviare e ricevere email.',
  },
} as const;

type LocaleKey = keyof typeof translations;

const resolveLocale = (value: string): LocaleKey => (value === 'it' ? 'it' : 'en');

export default function EmailPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { logout } = useAuthStore();
  const locale = useLocale();
  const localeKey = resolveLocale(locale);
  const t = translations[localeKey];

  const [currentFolder, setCurrentFolder] = useState<string>('ALL');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAiChat, setShowAiChat] = useState(true);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [emailProviders, setEmailProviders] = useState<ProviderConfig[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [composeOriginalEmail, setComposeOriginalEmail] = useState<Email | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const statsByFolder = useMemo(() => stats?.byFolder ?? {}, [stats]);
  const hasEmailProviders = emailProviders.length > 0;
  const defaultProviderId = useMemo(
    () => emailProviders.find((provider) => provider.isDefault)?.id ?? emailProviders[0]?.id ?? null,
    [emailProviders],
  );

  const loadEmails = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const response = await emailApi.getConversations({
        page: 1,
        limit: 60,
      });

      const conversationEmails: Email[] = response.data.conversations.map((conv) => ({
        id: conv.latestEmailId,
        threadId: conv.threadId,
        from: conv.from,
        to: conv.to,
        subject: conv.subject + (conv.emailCount > 1 ? ` (${conv.emailCount})` : ''),
        snippet: conv.snippet,
        folder: conv.folder,
        labels: conv.labels,
        isRead: conv.isRead,
        isStarred: conv.isStarred,
        isFlagged: conv.isFlagged,
        receivedAt: conv.receivedAt,
        sentAt: conv.sentAt,
        tenantId: '',
        providerId: '',
        externalId: '',
        cc: [],
        bcc: [],
        isDraft: false,
        isDeleted: false,
        createdAt: conv.receivedAt,
        updatedAt: conv.receivedAt,
      }));

      const filteredEmails =
        currentFolder === 'ALL'
          ? conversationEmails
          : conversationEmails.filter((email) => email.folder === currentFolder);

      setEmails(filteredEmails);
    } catch (error) {
      console.error('Failed to load emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, user]);

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
    loadEmails();
  }, [loadEmails, user, currentFolder]);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [loadStats, user]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEmails(), loadStats()]);
    setRefreshing(false);
  }, [loadEmails, loadStats]);

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
          setSelectedEmail(fullEmail);

          const unreadIds = threadEmails.filter((e) => !e.isRead).map((e) => e.id);
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
          setSelectedEmail(response.data);

          if (!email.isRead) {
            emailApi.updateEmail(email.id, { isRead: true }).then(() => {
              setEmails((prev) =>
                prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)),
              );
              loadStats();
            });
          }
        }

        setAiSessionId(null);
        setAiMessages([]);
        setAiInput('');

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
      if (!searchQuery.trim()) return;

      try {
        setLoading(true);
        const response = await emailApi.searchEmails(searchQuery);
        setEmails(response.data.emails);
      } catch (error) {
        console.error('Failed to search emails:', error);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
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

  const handleAiQuickAction = useCallback(
    async (action: string) => {
      if (!selectedEmail) return;

      setAiLoading(true);
      try {
        const response = await aiApi.sendAgentMessage({
          sessionId: aiSessionId ?? undefined,
          message: action,
          context: {
            emailId: selectedEmail.id,
          },
        });

        if (!aiSessionId) {
          setAiSessionId(response.data.sessionId);
        }

        setAiMessages(response.data.messages);
      } catch (error) {
        console.error('Failed to run AI quick action:', error);
      } finally {
        setAiLoading(false);
      }
    },
    [aiSessionId, selectedEmail],
  );

  const handleAiSend = useCallback(async () => {
    if (!aiInput.trim() || !selectedEmail) return;

    setAiLoading(true);
    try {
      const response = await aiApi.sendAgentMessage({
        sessionId: aiSessionId ?? undefined,
        message: aiInput,
        context: {
          emailId: selectedEmail.id,
        },
      });

      if (!aiSessionId) {
        setAiSessionId(response.data.sessionId);
      }

      setAiMessages(response.data.messages);
      setAiInput('');
    } catch (error) {
      console.error('Failed to send AI message:', error);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiSessionId, selectedEmail]);

  const handleComposeOpenChange = useCallback((open: boolean) => {
    setIsComposeOpen(open);
    if (!open) {
      setComposeMode('compose');
      setComposeOriginalEmail(null);
    }
  }, []);

  const openCompose = useCallback(() => {
    if (!hasEmailProviders) {
      router.push('/dashboard/providers');
      return;
    }
    setComposeMode('compose');
    setComposeOriginalEmail(null);
    setIsComposeOpen(true);
  }, [hasEmailProviders, router]);

  const openReply = useCallback(
    (email: Email) => {
      if (!hasEmailProviders) {
        router.push('/dashboard/providers');
        return;
      }
      setComposeMode('reply');
      setComposeOriginalEmail(email);
      setIsComposeOpen(true);
    },
    [hasEmailProviders, router],
  );

  const openForward = useCallback(
    (email: Email) => {
      if (!hasEmailProviders) {
        router.push('/dashboard/providers');
        return;
      }
      setComposeMode('forward');
      setComposeOriginalEmail(email);
      setIsComposeOpen(true);
    },
    [hasEmailProviders, router],
  );

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
        await Promise.all([loadEmails(), loadStats()]);
      } catch (error) {
        console.error('Failed to send email:', error);
        alert('Failed to send email. Please try again.');
      }
    },
    [composeMode, composeOriginalEmail, fileToBase64, loadEmails, loadStats],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading your workspace...
      </div>
    );
  }

  const layoutActions = (
    <div className="hidden items-center gap-2 lg:flex">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={refreshing}
        className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        {t.refresh}
      </Button>
      <Button
        size="sm"
        className="rounded-full bg-gradient-to-r from-sky-500 to-sky-400 text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-400 hover:to-sky-300 hover:shadow-sky-900/60"
        onClick={openCompose}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t.compose}
      </Button>
      <Button
        variant={showAiChat ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowAiChat((prev) => !prev)}
        className={`rounded-full ${showAiChat ? 'bg-sky-500/20 text-sky-100 hover:bg-sky-500/30' : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100'}`}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {t.toggleAi}
      </Button>
    </div>
  );

  const description = stats ? t.description(stats.unread) : t.description(0);

  return (
    <>
      <DashboardLayout
        title={t.title}
        description={description}
        actions={layoutActions}
        onLogout={handleLogout}
      >
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-xl items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-lg shadow-slate-950/50 backdrop-blur"
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="rounded-full border border-white/10 px-3 text-xs text-slate-300 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
          >
            Go
          </Button>
        </form>

        {!hasEmailProviders && (
          <div className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-200 shadow-inner shadow-amber-500/10">
            {t.noProviders}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onEmailClick={handleEmailClick}
            loading={loading}
            t={{
              ...t,
              folders: { inbox: 'Inbox' },
              loading: 'Loading emails...',
              noEmails: 'No emails to display',
            }}
            formatDate={formatDate}
            extractDisplayName={extractDisplayName}
          />

          <EmailView
            selectedEmail={selectedEmail}
            showAiChat={showAiChat}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
            onReply={openReply}
            onForward={openForward}
            onClose={closeMobileDetail}
            className="hidden lg:flex"
            t={{
              ...t,
              folderLabel: 'Folder',
              attachments: 'Attachments',
              to: 'To',
              cc: 'Cc',
              labels: 'Labels',
              date: 'Date',
            }}
            locale={locale}
          />

          {showAiChat && (
            <AiAssistant
              selectedEmail={selectedEmail}
              onHide={() => setShowAiChat(false)}
              t={{
                ...t,
                aiAssistant: 'Workspace AI',
                hideAi: 'Hide',
                aiQuickActions: 'Quick actions',
                aiEmailContext: 'Email context',
                aiPlaceholder: 'Select an email to unlock AI insights.',
                aiInputPlaceholder: 'Ask MailAgent anything...',
                aiSend: 'Send',
                thinking: 'Thinking',
              }}
              locale={locale}
              extractDisplayName={extractDisplayName}
              aiMessages={aiMessages}
              aiInput={aiInput}
              aiLoading={aiLoading}
              onAiInputChange={setAiInput}
              onAiSend={handleAiSend}
              onQuickAction={handleAiQuickAction}
            />
          )}
        </div>
      </DashboardLayout>

      <Dialog open={isComposeOpen} onOpenChange={handleComposeOpenChange}>
        <DialogContent className="max-w-4xl bg-transparent border-none p-0 shadow-none">
          <EmailComposer
            key={`${composeMode}-${composeOriginalEmail?.id ?? 'new'}`}
            mode={composeMode}
            originalEmail={composeOriginalEmail ?? undefined}
            onSend={handleComposerSend}
            onClose={() => handleComposeOpenChange(false)}
            providers={emailProviders}
            defaultProviderId={composeOriginalEmail?.providerId ?? defaultProviderId ?? undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={mobileDetailOpen && Boolean(selectedEmail)} onOpenChange={setMobileDetailOpen}>
        <DialogContent className="max-w-3xl bg-transparent border-none p-0 shadow-none">
          <EmailView
            selectedEmail={selectedEmail}
            showAiChat={false}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
            onReply={openReply}
            onForward={openForward}
            onClose={closeMobileDetail}
            t={{
              ...t,
              folderLabel: 'Folder',
              attachments: 'Attachments',
              to: 'To',
              cc: 'Cc',
              labels: 'Labels',
              date: 'Date',
            }}
            locale={locale}
          />
        </DialogContent>
      </Dialog>

      {hasEmailProviders && (
        <Button
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-sky-500 to-sky-400 text-white shadow-xl shadow-slate-950/60 transition hover:scale-105 lg:hidden"
          onClick={openCompose}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
