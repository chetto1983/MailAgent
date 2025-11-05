import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Mail,
  Inbox,
  Send,
  Archive,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { emailApi, type Email, type EmailStats } from '@/lib/api/email';
import { aiApi, type ChatMessage } from '@/lib/api/ai';
import { useLocale } from '@/lib/hooks/use-locale';
import { EmailList } from '@/components/dashboard/EmailList';
import { EmailView } from '@/components/dashboard/EmailView';
import { AiAssistant } from '@/components/dashboard/AiAssistant';

const translations = {
  en: {
    title: 'Email',
    backToDashboard: 'Back to Dashboard',
    navProviders: 'Providers',
    navSettings: 'Settings',
    navLogout: 'Logout',
    folders: {
      inbox: 'Inbox',
      sent: 'Sent',
      drafts: 'Drafts',
      trash: 'Trash',
      archive: 'Archive',
    },
    searchPlaceholder: 'Search emails...',
    compose: 'Compose',
    refresh: 'Refresh',
    selectEmail: 'Select an email to read',
    noEmails: 'No emails in this folder',
    loading: 'Loading emails...',
    loadingWorkspace: 'Loading your workspace...',
    unreadCount: (count: number) => `${count} unread`,
    markAsRead: 'Mark as read',
    markAsUnread: 'Mark as unread',
    star: 'Star',
    unstar: 'Unstar',
    delete: 'Delete',
    archive: 'Archive',
    reply: 'Reply',
    forward: 'Forward',
    deleteLabel: 'Delete chat',
    deleteConfirm: 'Are you sure you want to delete this email?',
    attachments: 'Attachments',
    from: 'From',
    to: 'To',
    cc: 'Cc',
    date: 'Date',
    labels: 'Labels',
    folderLabel: 'Folder',
    aiAssistant: 'AI Assistant',
    aiPlaceholder: 'Select an email to get AI-powered suggestions',
    aiQuickActions: 'Quick actions',
    aiSummarize: 'Summarise this email',
    aiReply: 'Generate smart reply',
    aiFollowUp: 'Draft follow-up email',
    aiSuggestLabels: 'Suggest labels',
    aiEmailContext: 'Email context',
    aiInputPlaceholder: 'Ask AI about this email...',
    aiSend: 'Send',
    hideAi: 'Hide AI panel',
    showAi: 'Show AI panel',
    thinking: 'Thinking',
    toolStepsLabel: (count: number) => `Agent steps (${count})`,
  },
  it: {
    title: 'Email',
    backToDashboard: 'Torna alla Dashboard',
    navProviders: 'Provider',
    navSettings: 'Impostazioni',
    navLogout: 'Esci',
    folders: {
      inbox: 'Posta in arrivo',
      sent: 'Inviati',
      drafts: 'Bozze',
      trash: 'Cestino',
      archive: 'Archivio',
    },
    searchPlaceholder: 'Cerca email...',
    compose: 'Scrivi',
    refresh: 'Aggiorna',
    selectEmail: 'Seleziona un\'email da leggere',
    noEmails: 'Nessuna email in questa cartella',
    loading: 'Caricamento email...',
    loadingWorkspace: 'Caricamento del workspace...',
    unreadCount: (count: number) => `${count} non lette`,
    markAsRead: 'Segna come letto',
    markAsUnread: 'Segna come non letto',
    star: 'Aggiungi stella',
    unstar: 'Rimuovi stella',
    delete: 'Elimina',
    archive: 'Archivia',
    reply: 'Rispondi',
    forward: 'Inoltra',
    deleteLabel: 'Elimina chat',
    deleteConfirm: 'Sei sicuro di voler eliminare questa email?',
    attachments: 'Allegati',
    from: 'Da',
    to: 'A',
    cc: 'Cc',
    date: 'Data',
    labels: 'Etichette',
    folderLabel: 'Cartella',
    aiAssistant: 'Assistente AI',
    aiPlaceholder: 'Seleziona un\'email per ricevere suggerimenti AI',
    aiQuickActions: 'Azioni rapide',
    aiSummarize: 'Riassumi questa email',
    aiReply: 'Genera una risposta intelligente',
    aiFollowUp: 'Prepara un follow-up',
    aiSuggestLabels: 'Suggerisci etichette',
    aiEmailContext: 'Contesto email',
    aiInputPlaceholder: 'Chiedi qualcosa all\'assistente su questa email...',
    aiSend: 'Invia',
    hideAi: 'Nascondi pannello AI',
    showAi: 'Mostra pannello AI',
    thinking: 'Sto pensando',
    toolStepsLabel: (count: number) => `Passaggi dell'agente (${count})`,
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

  const statsByFolder = useMemo(() => stats?.byFolder ?? {}, [stats]);

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);

      // Load conversations (all emails from all folders grouped by thread)
      const response = await emailApi.getConversations({
        page: 1,
        limit: 50,
      });

      // Convert conversations to email format for display
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
        // Default values for fields not in conversation
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

      // Filter by current folder if not viewing all
      const filteredEmails = currentFolder === 'ALL'
        ? conversationEmails
        : conversationEmails.filter(email => email.folder === currentFolder);

      setEmails(filteredEmails);
    } catch (error) {
      console.error('Failed to load emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);

  const loadStats = useCallback(async () => {
    try {
      const response = await emailApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Load emails when folder changes
  useEffect(() => {
    if (!user) return;
    loadEmails();
  }, [loadEmails, user, currentFolder]);

  // Load stats
  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [loadStats, user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails();
    await loadStats();
    setRefreshing(false);
  }, [loadEmails, loadStats]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
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
  }, [searchQuery]);

  const handleEmailClick = useCallback(async (email: Email) => {
    try {
      // If this is a conversation (has threadId), load the full thread
      if (email.threadId) {
        const threadResponse = await emailApi.getThread(email.threadId);
        const threadEmails = threadResponse.data;

        // Set the latest email as selected (or the one clicked)
        const fullEmail = threadEmails.find(e => e.id === email.id) || threadEmails[threadEmails.length - 1];
        setSelectedEmail(fullEmail);

        // Mark all unread emails in thread as read
        const unreadIds = threadEmails.filter(e => !e.isRead).map(e => e.id);
        if (unreadIds.length > 0) {
          emailApi.bulkMarkRead(unreadIds, true).then(() => {
            setEmails((prev) =>
              prev.map((e) => {
                if (e.threadId === email.threadId || e.id === email.id) {
                  return { ...e, isRead: true };
                }
                return e;
              })
            );
            loadStats();
          });
        }
      } else {
        // Single email without thread
        const response = await emailApi.getEmail(email.id);
        setSelectedEmail(response.data);

        // Mark as read if unread
        if (!email.isRead) {
          emailApi.updateEmail(email.id, { isRead: true }).then(() => {
            setEmails((prev) =>
              prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
            );
            loadStats();
          });
        }
      }

      // Clear AI session when switching emails
      setAiSessionId(null);
      setAiMessages([]);
      setAiInput('');
    } catch (error) {
      console.error('Failed to load email details:', error);
      // Fallback to list email (may have missing fields)
      setSelectedEmail(email);
    }
  }, [loadStats]);

  const handleToggleRead = useCallback(async (email: Email) => {
    try {
      await emailApi.updateEmail(email.id, { isRead: !email.isRead });
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: !email.isRead } : e))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...email, isRead: !email.isRead });
      }
      loadStats();
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    }
  }, [loadStats, selectedEmail]);

  const handleToggleStar = useCallback(async (email: Email) => {
    try {
      await emailApi.updateEmail(email.id, { isStarred: !email.isStarred });
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isStarred: !email.isStarred } : e))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...email, isStarred: !email.isStarred });
      }
      loadStats();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [loadStats, selectedEmail]);

  const handleDelete = useCallback(async (email: Email) => {
    if (!window.confirm(t.deleteConfirm)) return;

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
  }, [loadStats, selectedEmail, t.deleteConfirm]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString(locale, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }
  }, [locale]);

  const extractDisplayName = useCallback((from: string) => {
    const match = from.match(/(.+?)\s*</);
    return match ? match[1].trim() : from.split('@')[0];
  }, []);

  const handleAiQuickAction = useCallback(async (action: string) => {
    if (!selectedEmail) return;

    setAiLoading(true);
    try {
      let prompt = '';
      switch (action) {
        case 'summarize':
          prompt = `Please summarize this email:\n\nFrom: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || selectedEmail.bodyHtml}`;
          break;
        case 'reply':
          prompt = `Generate a professional reply to this email:\n\nFrom: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || selectedEmail.bodyHtml}`;
          break;
        case 'labels':
          prompt = `Suggest appropriate labels/tags for this email:\n\nFrom: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || selectedEmail.bodyHtml}`;
          break;
        case 'followup':
          prompt = `Draft a follow-up email for:\n\nFrom: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || selectedEmail.bodyHtml}`;
          break;
        default:
          return;
      }

      const response = await aiApi.sendAgentMessage({
        sessionId: aiSessionId || undefined,
        message: prompt,
        history: aiMessages,
        locale,
      });

      setAiSessionId(response.data.sessionId);
      setAiMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to process AI request:', error);
    } finally {
      setAiLoading(false);
    }
  }, [selectedEmail, aiSessionId, aiMessages, locale]);

  const handleAiSend = useCallback(async () => {
    if (!aiInput.trim() || !selectedEmail) return;

    setAiLoading(true);
    try {
      const emailContext = `Context: You are helping with an email from ${selectedEmail.from} with subject "${selectedEmail.subject}".`;
      const fullPrompt = `${emailContext}\n\n${aiInput}`;

      const response = await aiApi.sendAgentMessage({
        sessionId: aiSessionId || undefined,
        message: fullPrompt,
        history: aiMessages,
        locale,
      });

      setAiSessionId(response.data.sessionId);
      setAiMessages(response.data.messages);
      setAiInput('');
    } catch (error) {
      console.error('Failed to send AI message:', error);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, selectedEmail, aiSessionId, aiMessages, locale]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-200 bg-slate-950">
        {t.loadingWorkspace}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t.backToDashboard}
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-sky-400" />
              <h1 className="text-2xl font-semibold">{t.title}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/providers')}>
              {t.navProviders}
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
              {t.navSettings}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              {t.navLogout}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 py-6">
          <div className="h-full flex flex-col space-y-4">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-between gap-4">
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10"
                  />
                </div>
              </form>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {t.refresh}
                </Button>
                <Button variant="default" size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.compose}
                </Button>
              </div>
            </div>

            {/* Folder Tabs */}
            <Tabs value={currentFolder} onValueChange={setCurrentFolder} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="flex-shrink-0 bg-white/5">
                <TabsTrigger value="ALL" className="gap-2">
                  <Mail className="w-4 h-4" />
                  All Conversations
                </TabsTrigger>
                <TabsTrigger value="INBOX" className="gap-2">
                  <Inbox className="w-4 h-4" />
                  {t.folders.inbox}
                  {(statsByFolder.INBOX ?? 0) > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {statsByFolder.INBOX ?? 0}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="SENT" className="gap-2">
                  <Send className="w-4 h-4" />
                  {t.folders.sent}
                </TabsTrigger>
                <TabsTrigger value="DRAFTS" className="gap-2">
                  <Archive className="w-4 h-4" />
                  {t.folders.drafts}
                </TabsTrigger>
                <TabsTrigger value="TRASH" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t.folders.trash}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={currentFolder} className="flex-1 overflow-hidden mt-4">
                <div className="h-full grid grid-cols-12 gap-4">

                  <EmailList
                    emails={emails}
                    selectedEmail={selectedEmail}
                    onEmailClick={handleEmailClick}
                    loading={loading}
                    t={t}
                    formatDate={formatDate}
                    extractDisplayName={extractDisplayName}
                  />

                  <EmailView
                    selectedEmail={selectedEmail}
                    showAiChat={showAiChat}
                    onToggleStar={handleToggleStar}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                    t={t}
                    locale={locale}
                  />

                  {showAiChat && (
                    <AiAssistant
                      selectedEmail={selectedEmail}
                      onHide={() => setShowAiChat(false)}
                      t={t}
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
              </TabsContent>
            </Tabs>

            {/* Toggle AI Chat Button (when hidden) */}
            {!showAiChat && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAiChat(true)}
                className="fixed bottom-6 right-6 shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Show AI Assistant
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

