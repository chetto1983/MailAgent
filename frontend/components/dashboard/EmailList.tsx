
import React from 'react';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Email } from '@/lib/api/email';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailClick: (email: Email) => void;
  loading: boolean;
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
  if (loading) {
    return (
      <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
        <div className="text-center text-slate-400 py-8">{t.loading}</div>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
        <div className="text-center text-slate-400 py-8">{t.noEmails}</div>
      </Card>
    );
  }

  return (
    <Card className="col-span-3 bg-white/5 border-white/10 p-4 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {emails.map((email) => (
          <div
            key={email.id}
            onClick={() => onEmailClick(email)}
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
    </Card>
  );
}
