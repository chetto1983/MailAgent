import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { MessageCircle, Send, Mic, Volume2, Sparkles, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useLocale } from '@/lib/hooks/use-locale';
import {
  aiApi,
  type ChatSession as ApiChatSession,
  type ChatMessage as ApiChatMessage,
} from '@/lib/api/ai';

type ChatMessage = ApiChatMessage;
type ChatSession = ApiChatSession;

const MAX_CHAT_HISTORY = 5;

const translations = {
  en: {
    heroKicker: 'Smart workspace copilot',
    heroTitle: (name?: string | null) => 'MailAgent' + (name ? ' for ' + name : ''),
    heroSubtitle: 'Ask anything about your inbox, contacts, or ongoing conversations.',
    navProviders: 'Providers',
    navSettings: 'Settings',
    navLogout: 'Logout',
    historyHeading: 'Recent chats',
    historyEmpty: 'No previous conversations yet.',
    historyLoading: 'Loading conversations…',
    historyActiveTag: 'Current',
    newChatLabel: 'New chat',
    quickPrompts: [
      'Summarise the latest unread emails',
      'What should I reply to the most recent message?',
      'Draft a follow-up for yesterday\'s introductions',
      'Show highlights from this week',
    ],
    emptyStateTitle: 'Ready when you are',
    emptyStateDescription:
      'Start the conversation or pick a quick prompt above. The agent blends your knowledge base, emails, and smart reasoning.',
    toolStepsLabel: (count: number) => 'Agent steps (' + count + ')',
    thinking: 'Thinking',
    inputPlaceholder: 'Ask the workspace assistant...',
    inputTip: 'Tip: reference specific people, threads, or dates to get richer answers.',
    fallbackMessage: 'The AI agent is currently unavailable. Please try again in a few moments.',
    loadingWorkspace: 'Loading your workspace...',
    sendLabel: 'Send',
    micAria: 'Toggle voice capture',
    volumeAria: 'Play response audio',
  },
  it: {
    heroKicker: 'Copilota intelligente per il workspace',
    heroTitle: (name?: string | null) => 'MailAgent' + (name ? ' per ' + name : ''),
    heroSubtitle: 'Chiedimi qualsiasi cosa sulla tua posta, i contatti o le conversazioni in corso.',
    navProviders: 'Provider',
    navSettings: 'Impostazioni',
    navLogout: 'Esci',
    historyHeading: 'Chat recenti',
    historyEmpty: 'Nessuna conversazione precedente.',
    historyLoading: 'Caricamento conversazioni…',
    historyActiveTag: 'Attiva',
    newChatLabel: 'Nuova chat',
    quickPrompts: [
      'Riassumi le ultime email non lette',
      'Cosa dovrei rispondere all\'ultimo messaggio?',
      'Prepara un follow-up per le presentazioni di ieri',
      'Mostra i punti salienti di questa settimana',
    ],
    emptyStateTitle: 'Pronto quando lo sei tu',
    emptyStateDescription:
      'Inizia la conversazione o scegli una delle richieste rapide. L\'agente combina knowledge base, email e ragionamento.',
    toolStepsLabel: (count: number) => 'Passaggi dell\'agente (' + count + ')',
    thinking: 'Sto pensando',
    inputPlaceholder: 'Chiedi qualcosa all\'assistente del workspace...',
    inputTip: 'Suggerimento: cita persone, thread o date specifiche per ottenere risposte piu ricche.',
    fallbackMessage: 'L\'agente AI non e disponibile al momento. Riprova tra qualche istante.',
    loadingWorkspace: 'Caricamento del workspace...',
    sendLabel: 'Invia',
    micAria: 'Attiva o disattiva il microfono',
    volumeAria: 'Riproduci la risposta audio',
  },
} as const;

type LocaleKey = keyof typeof translations;

const resolveLocale = (value: string): LocaleKey => (value === 'it' ? 'it' : 'en');

const markdownComponents: Components = {
  p: ({ children, ...props }) => (
    <p className="leading-relaxed text-slate-100" {...props}>
      {children}
    </p>
  ),
  ol: ({ children, ...props }) => (
    <ol className="space-y-2 text-slate-100 list-decimal list-inside" {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }) => (
    <ul className="space-y-2 text-slate-100 list-disc list-inside" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed marker:text-sky-300 text-slate-100" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-sky-200" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="text-slate-200 not-italic" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-2 border-sky-400/50 pl-4 text-slate-200 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="overflow-auto rounded-xl bg-slate-900/80 p-4 text-sm text-slate-100 shadow-inner shadow-slate-950/50"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({
    inline,
    children,
    ...props
  }: { inline?: boolean; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) =>
    inline ? (
      <code
        className="rounded bg-slate-800/70 px-1.5 py-0.5 text-xs font-mono text-sky-200"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="font-mono text-sm text-sky-200" {...props}>
        {children}
      </code>
    ),
  a: ({ children, ...props }) => (
    <a
      className="text-sky-300 underline underline-offset-4 transition hover:text-sky-200"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { logout } = useAuthStore();
  const locale = useLocale();
  const localeKey = resolveLocale(locale);
  const t = translations[localeKey];

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeKey === 'it' ? 'it-IT' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }),
    [localeKey],
  );

  const normaliseSession = useCallback(
    (session: ApiChatSession): ChatSession => ({
      ...session,
      messages: Array.isArray(session.messages)
        ? (session.messages as ChatMessage[])
        : [],
    }),
    [],
  );

  const hydrateSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await aiApi.listSessions();
      let fetched: ChatSession[] = (data.sessions ?? []).map(normaliseSession);

      if (fetched.length === 0) {
        const { data: created } = await aiApi.createSession();
        const session = normaliseSession(created.session);
        fetched = [session];
      }

      const limited = fetched.slice(0, MAX_CHAT_HISTORY);
      setSessions(limited);
      setCurrentSessionId(limited[0]?.id ?? '');
      setMessages(limited[0]?.messages ?? []);
    } catch (error) {
      console.error('Failed to fetch chat sessions', error);
      setSessions([]);
      setCurrentSessionId('');
      setMessages([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [normaliseSession]);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }
    hydrateSessions();
  }, [isLoading, user, hydrateSessions]);

  const startNewSession = useCallback(async () => {
    try {
      const { data } = await aiApi.createSession();
      const newSession = normaliseSession(data.session);

      setSessions((prev) => {
        const others = prev.filter((session) => session.id !== newSession.id);
        return [newSession, ...others].slice(0, MAX_CHAT_HISTORY);
      });

      setCurrentSessionId(newSession.id);
      setMessages(newSession.messages ?? []);
      setInput('');
      setLoading(false);
    } catch (error) {
      console.error('Failed to create chat session', error);
    }
  }, [normaliseSession]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId || sessionId === currentSessionId) {
        return;
      }

      try {
        let session = sessions.find((item) => item.id === sessionId);

        if (!session || !session.messages || session.messages.length === 0) {
          const { data } = await aiApi.getSession(sessionId);
          if (data.session) {
            session = normaliseSession(data.session);
          }
        }

        if (!session) {
          return;
        }

        setCurrentSessionId(session.id);
        setMessages(session.messages ?? []);
        setInput('');
        setLoading(false);

        setSessions((prev) => {
          const others = prev.filter((item) => item.id !== session!.id);
          return [session!, ...others].slice(0, MAX_CHAT_HISTORY);
        });
      } catch (error) {
        console.error('Failed to load chat session', error);
      }
    },
    [currentSessionId, sessions, normaliseSession],
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || loading) {
      return;
    }

    const userMessage = input.trim();
    const pendingMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setInput('');
    setMessages(pendingMessages);
    setLoading(true);

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        const { data } = await aiApi.createSession();
        const newSession = normaliseSession(data.session);
        sessionId = newSession.id;
        setSessions((prev) => [newSession, ...prev].slice(0, MAX_CHAT_HISTORY));
        setCurrentSessionId(newSession.id);
      }

      const response = await aiApi.sendAgentMessage({
        sessionId,
        message: userMessage,
        history: pendingMessages,
      });

      if (response.data.success) {
        const updatedSession = normaliseSession(response.data.session);
        const serverMessages = Array.isArray(response.data.messages)
          ? (response.data.messages as ChatMessage[])
          : updatedSession.messages ?? [];

        setMessages(serverMessages);
        setSessions((prev) => {
          const others = prev.filter((session) => session.id !== updatedSession.id);
          return [updatedSession, ...others].slice(0, MAX_CHAT_HISTORY);
        });
        setCurrentSessionId(updatedSession.id);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: t.fallbackMessage,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t.fallbackMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handlePromptClick = (prompt: string) => {
    if (loading) {
      return;
    }
    setInput(prompt);
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
      <header className="sticky top-0 z-20 border-b border-white/5 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-sky-400" />
              {t.heroKicker}
            </div>
            <h1 className="text-3xl font-semibold mt-1">{t.heroTitle(user?.firstName)}</h1>
            <p className="text-slate-400 mt-1">{t.heroSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/providers')}>
              {t.navProviders}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/settings')}
            >
              {t.navSettings}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              {t.navLogout}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <section className="rounded-3xl border border-white/5 bg-black/20 backdrop-blur p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {t.historyHeading}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
                disabled={loading}
              >
                {t.newChatLabel}
              </Button>
            </div>
            {sessionsLoading ? (
              <p className="text-xs text-slate-500">{t.historyLoading}</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-500">{t.historyEmpty}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={`flex min-w-[160px] flex-col rounded-xl border px-3 py-2 text-left transition ${
                        isActive
                          ? 'border-sky-400/80 bg-sky-500/20 text-sky-100 shadow-md shadow-sky-900/40'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/60 hover:bg-sky-500/10'
                      }`}
                    >
                      <span className="truncate text-sm font-medium">
                        {session.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {dateFormatter.format(new Date(session.updatedAt))}
                        {isActive ? ` · ${t.historyActiveTag}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {t.quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptClick(prompt)}
                className="group rounded-xl border border-white/5 bg-white/5 hover:border-sky-400 hover:bg-sky-500/10 transition-colors px-4 py-3 text-left text-sm font-medium text-slate-200"
              >
                {prompt}
              </button>
            ))}
          </section>

          <section className="rounded-3xl border border-white/5 bg-black/20 backdrop-blur p-4 md:p-6 space-y-6 shadow-xl shadow-slate-950/40">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-300">
                <MessageCircle className="w-14 h-14 text-sky-400" />
                <h2 className="text-2xl font-semibold">{t.emptyStateTitle}</h2>
                <p className="max-w-md text-sm text-slate-400">
                  {t.emptyStateDescription}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 ${
                        isUser ? 'bg-sky-500/20 text-sky-300' : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <Card
                      className={`relative max-w-xl rounded-2xl border border-white/10 px-5 py-4 shadow-lg ${
                        isUser
                          ? 'bg-gradient-to-br from-sky-600/80 to-sky-500/40 text-slate-50'
                          : 'bg-white/5 text-slate-200'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="space-y-4 text-sm leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {message.steps && message.steps.length > 0 && (
                        <details className="mt-4 text-xs text-slate-300/90">
                          <summary className="cursor-pointer select-none font-medium text-sky-300 transition hover:text-sky-200">
                            {t.toolStepsLabel(message.steps.length)}
                          </summary>
                          <div className="mt-2 space-y-2 border-l border-sky-400/60 pl-3">
                            {message.steps.map((step, idx) => (
                              <div key={idx}>
                                <div className="font-semibold uppercase tracking-wider text-sky-200">
                                  {step.tool ?? 'tool'}
                                </div>
                                <div className="text-slate-300 whitespace-pre-wrap mt-1">
                                  {step.output}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </Card>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200">
                    <Bot className="w-5 h-5" />
                  </div>
                  <Card className="max-w-xl bg-white/5 px-5 py-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-200" />
                      <span className="text-xs uppercase tracking-widest">{t.thinking}</span>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </section>
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <form
            onSubmit={handleSendMessage}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/40"
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsRecording((prev) => !prev)}
                className={isRecording ? 'bg-red-500/20 text-red-200' : undefined}
                aria-label={t.micAria}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                type="text"
                placeholder={t.inputPlaceholder}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={loading}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-base text-slate-100 placeholder:text-slate-500"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40"
                aria-label={t.sendLabel}
              >
                <Send className="w-4 h-4 mr-2" />
                {t.sendLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t.volumeAria}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">{t.inputTip}</p>
          </form>
        </div>
      </div>
    </div>
  );
}
