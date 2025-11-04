import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { MessageCircle, Send, Mic, Volume2, Sparkles, User, Bot } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useLocale } from '@/lib/hooks/use-locale';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  steps?: Array<{ tool: string; output: string }>;
};

const translations = {
  en: {
    heroKicker: 'Smart workspace copilot',
    heroTitle: (name?: string | null) => 'MailAgent' + (name ? ' for ' + name : ''),
    heroSubtitle: 'Ask anything about your inbox, contacts, or ongoing conversations.',
    navProviders: 'Providers',
    navSettings: 'Settings',
    navLogout: 'Logout',
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { logout } = useAuthStore();
  const locale = useLocale();
  const t = translations[resolveLocale(locale)];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setInput('');
    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await apiClient.post('/ai/agent', {
        message: userMessage,
        history: nextMessages.map(({ role, content }) => ({ role, content })),
      });

      if (response.data.success) {
        setMessages([
          ...nextMessages,
          {
            role: 'assistant',
            content: response.data.response,
            steps: response.data.steps ?? [],
          },
        ]);
      } else {
        setMessages([
          ...nextMessages,
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
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/10"
              onClick={() => router.push('/dashboard/providers')}
            >
              {t.navProviders}
            </Button>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/10"
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
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

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
                className={`border-white/10 ${isRecording ? 'bg-red-500/20 text-red-200' : 'hover:bg-white/10'}`}
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
                className="border-white/10 hover:bg-white/10"
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
