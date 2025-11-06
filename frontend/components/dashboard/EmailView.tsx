import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Star,
  Trash2,
  Reply,
  Forward,
  X,
} from 'lucide-react';
import type { Email } from '@/lib/api/email';

interface EmailViewProps {
  selectedEmail: Email | null;
  showAiChat: boolean;
  onToggleStar: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  onDelete: (email: Email) => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onClose?: () => void;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  locale: string;
}

export function EmailView({
  selectedEmail,
  showAiChat,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
  onClose,
  className = '',
  t,
  locale,
}: EmailViewProps) {
  if (!selectedEmail) {
    return (
      <section
        className={`${showAiChat ? 'lg:col-span-5' : 'lg:col-span-7'} col-span-full flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-slate-950/65 p-6 text-center text-slate-400 shadow-inner shadow-slate-950/40 backdrop-blur ${className}`}
      >
        <Mail className="h-12 w-12 text-slate-500/70" />
        <p className="max-w-sm text-sm leading-relaxed">{t.selectEmail}</p>
      </section>
    );
  }

  return (
    <section
      className={`${showAiChat ? 'lg:col-span-5' : 'lg:col-span-7'} col-span-full flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/80 shadow-2xl shadow-slate-950/50 backdrop-blur ${className}`}
    >
      <header className="border-b border-white/10 bg-slate-950/70 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {t.folderLabel}: {selectedEmail.folder}
            </div>
            <h2 className="text-2xl font-semibold leading-tight text-slate-50 md:text-[28px]">
              {selectedEmail.subject || '(No subject)'}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="font-medium text-slate-100">{selectedEmail.from}</span>
              <span className="text-slate-400">
                {new Date(selectedEmail.receivedAt).toLocaleString(locale)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleStar(selectedEmail)}
              className="rounded-full border border-white/10 text-amber-300 transition hover:border-amber-200 hover:bg-amber-500/10"
            >
              <Star
                className={`h-4 w-4 ${selectedEmail.isStarred ? 'fill-amber-300 text-amber-300' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleRead(selectedEmail)}
              className="rounded-full border border-white/10 text-slate-300 transition hover:border-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(selectedEmail)}
              className="rounded-full border border-white/10 text-red-300 transition hover:border-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full border border-white/10 text-slate-300 transition hover:border-slate-200 hover:bg-white/10 hover:text-slate-50 lg:hidden"
                aria-label="Close message"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReply(selectedEmail)}
            className="rounded-full border-sky-400/40 bg-sky-500/10 text-sky-200 transition hover:bg-sky-500/20 hover:text-sky-100"
          >
            <Reply className="mr-2 h-4 w-4" />
            {t.reply}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onForward(selectedEmail)}
            className="rounded-full border-white/10 bg-white/5 text-slate-200 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-100"
          >
            <Forward className="mr-2 h-4 w-4" />
            {t.forward}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs text-slate-300 lg:text-sm">
            {selectedEmail.to && selectedEmail.to.length > 0 && (
              <span>
                <span className="font-semibold text-slate-200">{t.to}:</span>{' '}
                {selectedEmail.to.join(', ')}
              </span>
            )}
            {selectedEmail.cc && selectedEmail.cc.length > 0 && (
              <span>
                <span className="font-semibold text-slate-200">{t.cc}:</span>{' '}
                {selectedEmail.cc.join(', ')}
              </span>
            )}
            {selectedEmail.labels && selectedEmail.labels.length > 0 && (
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-slate-200">{t.labels}:</span>
                {selectedEmail.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sky-200"
                  >
                    {label}
                  </span>
                ))}
              </span>
            )}
          </div>

          <article className="custom-scroll max-h-[58vh] overflow-y-auto rounded-2xl border border-white/5 bg-white/5 px-6 py-7 shadow-inner shadow-slate-950/40">
            {selectedEmail.bodyHtml ? (
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                className="prose prose-invert mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-100"
              />
            ) : (
              <pre className="mx-auto max-w-2xl whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-100">
                {selectedEmail.bodyText}
              </pre>
            )}
          </article>

          {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">
                {t.attachments} ({selectedEmail.attachments.length})
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedEmail.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    <span className="truncate">{attachment.filename}</span>
                    <span className="text-xs text-slate-400">
                      {Math.round(attachment.size / 1024)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 bg-slate-950/65 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 lg:text-sm">
            <span className="font-semibold text-slate-200">{t.date}:</span>{' '}
            {new Date(selectedEmail.sentAt || selectedEmail.receivedAt).toLocaleString(locale)}
          </div>
        </div>
      </footer>
    </section>
  );
}

export default EmailView;
