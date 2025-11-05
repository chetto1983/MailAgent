
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import type { Email } from '@/lib/api/email';

interface AiAssistantProps {
  selectedEmail: Email | null;
  onHide: () => void;
  t: any;
  locale: string;
  extractDisplayName: (from: string) => string;
}

export function AiAssistant({
  selectedEmail,
  onHide,
  t,
  locale,
  extractDisplayName,
}: AiAssistantProps) {
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
  );
}
