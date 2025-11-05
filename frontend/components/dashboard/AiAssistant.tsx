
import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, User, Bot } from 'lucide-react';
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
    <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm font-semibold">{t.aiAssistant}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onHide}
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
          {/* Quick Actions */}
          <div className="flex-shrink-0 mb-3">
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <h4 className="text-xs font-semibold text-sky-300 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t.aiQuickActions}
              </h4>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-sky-500/20"
                  onClick={() => onQuickAction('summarize')}
                  disabled={aiLoading}
                >
                  • {t.aiSummarize}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-sky-500/20"
                  onClick={() => onQuickAction('reply')}
                  disabled={aiLoading}
                >
                  • {t.aiReply}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-sky-500/20"
                  onClick={() => onQuickAction('labels')}
                  disabled={aiLoading}
                >
                  • {t.aiSuggestLabels}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-sky-500/20"
                  onClick={() => onQuickAction('followup')}
                  disabled={aiLoading}
                >
                  • {t.aiFollowUp}
                </Button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-3 pr-2">
            {aiMessages.length === 0 && !aiLoading && (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400 text-xs">
                <Sparkles className="w-8 h-8 opacity-50" />
                <p>Click a quick action or ask a question below</p>
              </div>
            )}

            {aiMessages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-2 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 ${
                      isUser ? 'bg-sky-500/20 text-sky-300' : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <Card
                    className={`relative max-w-[85%] rounded-xl border border-white/10 px-3 py-2.5 shadow-md text-xs ${
                      isUser
                        ? 'bg-gradient-to-br from-sky-600/80 to-sky-500/40 text-slate-50'
                        : 'bg-white/5 text-slate-200'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="space-y-2 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {message.steps && message.steps.length > 0 && (
                      <details className="mt-3 text-xs text-slate-300/90">
                        <summary className="cursor-pointer select-none font-medium text-sky-300 transition hover:text-sky-200">
                          {t.toolStepsLabel ? t.toolStepsLabel(message.steps.length) : `Agent steps (${message.steps.length})`}
                        </summary>
                        <div className="mt-2 space-y-2 border-l border-sky-400/60 pl-2">
                          {message.steps.map((step, idx) => (
                            <div key={idx}>
                              <div className="font-semibold uppercase tracking-wider text-sky-200 text-[10px]">
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

            {aiLoading && (
              <div className="flex gap-2 text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200">
                  <Bot className="w-4 h-4" />
                </div>
                <Card className="bg-white/5 px-3 py-2.5 border border-white/10">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-100" />
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-200" />
                    <span className="text-[10px] uppercase tracking-widest">
                      {t.thinking || 'Thinking'}
                    </span>
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Email Context - Collapsed */}
          <div className="flex-shrink-0 mb-3">
            <details className="p-2 rounded-lg bg-white/5 border border-white/10">
              <summary className="text-xs font-semibold text-slate-300 cursor-pointer">
                {t.aiEmailContext}
              </summary>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
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
            </details>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-white/10">
              <Input
                type="text"
                placeholder={t.aiInputPlaceholder}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-xs text-slate-100 placeholder:text-slate-500"
                value={aiInput}
                onChange={(e) => onAiInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onAiSend();
                  }
                }}
                disabled={aiLoading}
              />
              <Button
                size="sm"
                onClick={onAiSend}
                disabled={aiLoading || !aiInput.trim()}
                className="bg-sky-600 hover:bg-sky-500 text-white shadow-md h-7 px-3"
              >
                {t.aiSend}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
