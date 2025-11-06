
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
    <section className="col-span-full flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/75 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur lg:col-span-3 lg:p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400">
            Inbox
          </h2>
          <p className="mt-1 text-lg font-semibold text-slate-100">{t.folders.inbox}</p>
        </div>
        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 shadow-inner shadow-sky-500/30">
          {emails.length} threads
        </span>
      </header>

      {loading ? (
        <div className="flex flex-1 flex-col gap-3 py-10 text-center text-slate-400">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-300" />
          <span>{t.loading}</span>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-6 text-center text-slate-400">
          <MailOpen className="h-8 w-8 text-slate-500/70" />
          <span>{t.noEmails}</span>
        </div>
      ) : (
        <div className="custom-scroll space-y-2 overflow-y-auto pr-1 md:max-h-[72vh]">
          {emails.map((email) => {
            const isActive = selectedEmail?.id === email.id;
            return (
              <button
                key={email.id}
                type="button"
                onClick={() => onEmailClick(email)}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition duration-200 ease-out ${
                  isActive
                    ? 'border-sky-400/70 bg-gradient-to-r from-sky-500/30 via-sky-500/10 to-transparent text-slate-100 shadow-lg shadow-sky-900/50'
                    : 'border-transparent bg-white/5 text-slate-200 hover:-translate-y-[1px] hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-slate-100 hover:shadow-lg hover:shadow-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2 text-sm">
                    {!email.isRead && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 shadow-sm shadow-sky-500/50" />
                    )}
                    <span className={`truncate ${!email.isRead ? 'font-semibold text-slate-50' : 'text-slate-200'}`}>
                      {extractDisplayName(email.from)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {email.isStarred && (
                      <Star className="h-3 w-3 text-amber-300 transition group-hover:text-amber-200" />
                    )}
                    <span>{formatDate(email.receivedAt)}</span>
                  </div>
                </div>
                <p
                  className={`mt-2 line-clamp-1 text-[15px] font-medium ${
                    isActive ? 'text-slate-100' : 'text-slate-200'
                  }`}
                >
                  {email.subject || '(No subject)'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                  {email.snippet}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
