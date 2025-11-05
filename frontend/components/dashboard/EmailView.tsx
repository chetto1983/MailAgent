
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Star, Trash2 } from 'lucide-react';
import type { Email } from '@/lib/api/email';

interface EmailViewProps {
  selectedEmail: Email | null;
  showAiChat: boolean;
  onToggleStar: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  onDelete: (email: Email) => void;
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
  t,
  locale,
}: EmailViewProps) {
  if (!selectedEmail) {
    return (
      <Card className={`${showAiChat ? 'col-span-6' : 'col-span-9'} bg-white/5 border-white/10 p-6 flex flex-col overflow-hidden`}>
        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
          <Mail className="w-16 h-16 mb-4 opacity-50" />
          <p>{t.selectEmail}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${showAiChat ? 'col-span-6' : 'col-span-9'} bg-white/5 border-white/10 p-6 flex flex-col overflow-hidden`}>
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
                onClick={() => onToggleStar(selectedEmail)}
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
                onClick={() => onToggleRead(selectedEmail)}
              >
                <Mail className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(selectedEmail)}
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
    </Card>
  );
}
