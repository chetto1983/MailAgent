
import React from 'react';
import { Star, MailOpen, Loader2 } from 'lucide-react';
import type { Email } from '@/lib/api/email';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailClick: (email: Email) => void;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  formatDate: (dateString: string) => string;
  extractDisplayName: (from: string) => string;
}

export function EmailList({
  emails,
  selectedEmail,
  onEmailClick,
  loading,
  t,
  formatDate,
  extractDisplayName,
}: EmailListProps) {
  return (
    <section className="col-span-full flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur lg:col-span-4 lg:p-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Inbox
          </p>
          <h2 className="text-lg font-semibold text-slate-100 lg:text-xl">{t.folders.inbox}</h2>
        </div>
        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 shadow-inner shadow-sky-500/30">
          {emails.length} threads
        </span>
      </header>

      {loading ? (
        <div className="flex flex-1 flex-col gap-3 py-12 text-center text-slate-400">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-300" />
          <span>{t.loading}</span>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
          <MailOpen className="h-8 w-8 text-slate-500" />
          <span>{t.noEmails}</span>
        </div>
      ) : (
        <div className="custom-scroll space-y-2 overflow-y-auto pr-1 md:max-h-[70vh]">
          {emails.map((email) => {
            const isActive = selectedEmail?.id === email.id;
            return (
              <button
                key={email.id}
                type="button"
                onClick={() => onEmailClick(email)}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition duration-200 ${
                  isActive
                    ? 'border-sky-400/60 bg-gradient-to-r from-sky-500/25 to-sky-500/5 shadow-lg shadow-sky-900/40'
                    : 'border-white/5 bg-white/5 hover:-translate-y-[2px] hover:border-sky-400/30 hover:bg-sky-500/5 hover:shadow-lg hover:shadow-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    {!email.isRead && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                    )}
                    <p
                      className={`truncate text-sm ${
                        !email.isRead ? 'font-semibold text-slate-100' : 'text-slate-200'
                      }`}
                    >
                      {extractDisplayName(email.from)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {email.isStarred && (
                      <Star className="h-3 w-3 text-amber-300 transition group-hover:text-amber-200" />
                    )}
                    <span>{formatDate(email.receivedAt)}</span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-100">
                  {email.subject || '(No subject)'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{email.snippet}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
