import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Mail,
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { emailApi, type Email, type EmailStats } from '@/lib/api/email';
import { useLocale } from '@/lib/hooks/use-locale';

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

  const [currentFolder, setCurrentFolder] = useState<string>('INBOX');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAiChat, setShowAiChat] = useState(true);

  const statsByFolder = useMemo(() => stats?.byFolder ?? {}, [stats]);

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
  }, [currentFolder, user]);

  // Load stats
  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const response = await emailApi.listEmails({
        folder: currentFolder,
        page: 1,
        limit: 50,
      });

      setEmails(response.data.emails);
    } catch (error) {
      console.error('Failed to load emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await emailApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    await loadStats();
    setRefreshing(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await emailApi.searchEmails(searchQuery);
      setEmails(response.data.emails);
    } catch (error) {
      console.error('Failed to search emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async (email: Email) => {
    try {
      // Load full email details
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
    } catch (error) {
      console.error('Failed to load email details:', error);
      // Fallback to list email (may have missing fields)
      setSelectedEmail(email);
    }
  };

  const handleToggleRead = async (email: Email) => {
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
  };

  const handleToggleStar = async (email: Email) => {
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
  };

  const handleDelete = async (email: Email) => {
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
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
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
  };

  const extractDisplayName = (from: string) => {
    const match = from.match(/(.+?)\s*</);
    return match ? match[1].trim() : from.split('@')[0];
  };

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
                  {/* Email List */}
                  <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
                    {loading ? (
                      <div className="text-center text-slate-400 py-8">{t.loading}</div>
                    ) : emails.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">{t.noEmails}</div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {emails.map((email) => (
                          <div
                            key={email.id}
                            onClick={() => handleEmailClick(email)}
                            className={`p-3 rounded-lg border cursor-pointer transition ${
                              selectedEmail?.id === email.id
                                ? 'border-sky-400 bg-sky-500/20'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            } ${!email.isRead ? 'font-semibold' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 truncate">
                                <div className="flex items-center gap-2">
                                  {!email.isRead && (
                                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                                  )}
                                  <span className="truncate text-sm">
                                    {extractDisplayName(email.from)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {email.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                                <span className="text-xs text-slate-400">
                                  {formatDate(email.receivedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm truncate text-slate-300 mb-1">
                              {email.subject || '(No subject)'}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {email.snippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Email Viewer */}
                  <Card className={`${showAiChat ? 'col-span-6' : 'col-span-9'} bg-white/5 border-white/10 p-6 flex flex-col overflow-hidden`}>
                    {!selectedEmail ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                        <Mail className="w-16 h-16 mb-4 opacity-50" />
                        <p>{t.selectEmail}</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Email Header - Fixed */}
                        <div className="flex-shrink-0 pb-4 mb-4">
                          <div className="flex items-start justify-between mb-4">
                            <h2 className="text-2xl font-semibold text-slate-100">
                              {selectedEmail.subject || '(No subject)'}
                            </h2>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStar(selectedEmail)}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    selectedEmail.isStarred
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-slate-400'
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleRead(selectedEmail)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(selectedEmail)}
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{t.from}:</span>
                              <span className="text-slate-200">{selectedEmail.from}</span>
                            </div>
                            {selectedEmail.to && selectedEmail.to.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{t.to}:</span>
                                <span className="text-slate-200">{selectedEmail.to.join(', ')}</span>
                              </div>
                            )}
                            {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{t.cc}:</span>
                                <span className="text-slate-200">{selectedEmail.cc.join(', ')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{t.date}:</span>
                              <span className="text-slate-200">
                                {new Date(selectedEmail.receivedAt).toLocaleString(locale)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Email Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto pr-2">
                          <div className="prose prose-invert max-w-none">
                            {selectedEmail.bodyHtml ? (
                              <div
                                dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                                className="text-slate-200"
                              />
                            ) : (
                              <pre className="whitespace-pre-wrap text-slate-200 font-sans">
                                {selectedEmail.bodyText}
                              </pre>
                            )}
                          </div>
                        </div>

                        {/* Attachments - At bottom */}
                        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                          <div className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">
                              {t.attachments} ({selectedEmail.attachments.length})
                            </h3>
                            <div className="space-y-2">
                              {selectedEmail.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10"
                                >
                                  <span className="text-sm text-slate-300">{attachment.filename}</span>
                                  <span className="text-xs text-slate-500">
                                    ({Math.round(attachment.size / 1024)} KB)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                  </Card>

                  {/* AI Chat Sidebar */}
                  {showAiChat && (
                    <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-sky-400" />
                          <h3 className="text-sm font-semibold">{t.aiAssistant}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowAiChat(false)}
                          className="h-6 w-6"
                          aria-label={t.hideAi}
                          title={t.hideAi}
                        >
                          <span aria-hidden>×</span>
                        </Button>
                      </div>

                      {!selectedEmail ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-sm">
                          <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                          <p>{t.aiPlaceholder}</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                              <h4 className="text-xs font-semibold text-sky-300 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {t.aiQuickActions}
                              </h4>
                              <div className="space-y-2">
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                                  • {t.aiSummarize}
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                                  • {t.aiReply}
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                                  • {t.aiSuggestLabels}
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                                  • {t.aiFollowUp}
                                </Button>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <h4 className="text-xs font-semibold text-slate-300 mb-2">
                                {t.aiEmailContext}
                              </h4>
                              <div className="space-y-1 text-xs text-slate-400">
                                <p>• {t.from}: {extractDisplayName(selectedEmail.from)}</p>
                                {selectedEmail.to && selectedEmail.to.length > 0 && (
                                  <p>• {t.to}: {selectedEmail.to.slice(0, 3).join(', ')}</p>
                                )}
                                {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                                  <p>• {t.cc}: {selectedEmail.cc.slice(0, 3).join(', ')}</p>
                                )}
                                <p>• {t.date}: {new Date(selectedEmail.receivedAt).toLocaleDateString(locale)}</p>
                                <p>• {t.folderLabel}: {selectedEmail.folder}</p>
                                {selectedEmail.labels.length > 0 && (
                                  <p>• {t.labels}: {selectedEmail.labels.slice(0, 3).join(', ')}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <Input
                              type="text"
                              placeholder={t.aiInputPlaceholder}
                              className="text-sm bg-white/5 border-white/10"
                            />
                            <div className="mt-2 flex justify-end">
                              <Button size="sm" variant="outline">
                                {t.aiSend}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
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


