import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  User,
  Bot,
  Loader2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Email } from '@/lib/api/email';
import type { ChatMessage } from '@/lib/api/ai';

interface AiAssistantProps {
  selectedEmail: Email | null;
  onHide: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  locale: string;
  extractDisplayName: (from: string) => string;
  aiMessages: ChatMessage[];
  aiInput: string;
  aiLoading: boolean;
  onAiInputChange: (value: string) => void;
  onAiSend: () => void;
  onQuickAction: (action: string) => void;
}

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

export function AiAssistant({
  selectedEmail,
  onHide,
  t,
  locale,
  extractDisplayName,
  aiMessages,
  aiInput,
  aiLoading,
  onAiInputChange,
  onAiSend,
  onQuickAction,
}: AiAssistantProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  return (
    <section className="col-span-full flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur lg:col-span-3 lg:p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 shadow-inner shadow-sky-500/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              AI Copilot
            </p>
            <h3 className="text-base font-semibold text-slate-100">{t.aiAssistant}</h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onHide}
          className="h-9 rounded-full border border-white/10 px-3 text-xs text-slate-300 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-200"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          {t.hideAi}
        </Button>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {['Summarise this email', 'Generate action items', 'Draft a reply', 'Highlight key points'].map(
          (action) => (
            <button
              key={action}
              type="button"
              onClick={() => onQuickAction(action)}
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-300 transition group-hover:text-sky-200" />
              {action}
            </button>
          ),
        )}
      </div>

      <div className="custom-scroll mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {selectedEmail ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {t.aiEmailContext}
            </p>
            <h4 className="mt-1 text-sm font-semibold text-slate-200">
              {selectedEmail.subject || '(No subject)'}
            </h4>
            <p className="mt-1 text-slate-400">
              {extractDisplayName(selectedEmail.from)} ·{' '}
              {new Date(selectedEmail.receivedAt).toLocaleString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-xs text-slate-400">
            {t.aiPlaceholder}
          </div>
        )}

        <div className="space-y-3">
          {aiMessages.length === 0 && !aiLoading && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-400">
              <Sparkles className="h-5 w-5 text-sky-400" />
              <p>{t.thinking}</p>
            </div>
          )}

          {aiMessages.map((message, index) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[85%] items-start gap-3 rounded-2xl border px-4 py-3 text-xs shadow-md ${
                    isUser
                      ? 'border-sky-400/40 bg-gradient-to-br from-sky-500/25 to-sky-500/10 text-sky-50'
                      : 'border-white/10 bg-white/5 text-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      isUser
                        ? 'border-sky-400/40 bg-sky-500/20 text-sky-200'
                        : 'border-white/10 bg-white/10 text-slate-300'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div className="space-y-1">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {message.content || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
          {aiLoading && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
              {t.thinking}...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="border-t border-white/10 pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAiSend();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            value={aiInput}
            onChange={(e) => onAiInputChange(e.target.value)}
            placeholder={t.aiInputPlaceholder}
            className="h-11 rounded-full border-white/10 bg-white/5 px-4 text-sm text-slate-100 placeholder:text-slate-500"
            disabled={aiLoading}
          />
          <Button
            type="submit"
            className="h-11 rounded-full bg-gradient-to-r from-sky-500 to-sky-400 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-400 hover:to-sky-300 hover:shadow-sky-900/50"
            disabled={aiLoading || !aiInput.trim()}
          >
            {aiLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.thinking}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t.aiSend}
              </>
            )}
          </Button>
        </form>
      </footer>
    </section>
  );
}

export default AiAssistant;
