import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Send,
  Save,
  X,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { ProviderConfig } from '@/lib/api/providers';

export interface EmailComposerProps {
  mode?: 'compose' | 'reply' | 'forward';
  originalEmail?: {
    id: string;
    from: string;
    to: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    messageId?: string;
    references?: string;
  };
  onSend?: (data: EmailDraft) => Promise<void>;
  onSaveDraft?: (data: EmailDraft) => Promise<void>;
  onClose?: () => void;
  defaultTo?: string[];
  defaultSubject?: string;
  providers: ProviderConfig[];
  defaultProviderId?: string;
}

export interface EmailDraft {
  providerId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  attachments?: File[];
}

export function EmailComposer({
  mode = 'compose',
  originalEmail,
  onSend,
  onSaveDraft,
  onClose,
  defaultTo = [],
  defaultSubject = '',
  providers,
  defaultProviderId,
}: EmailComposerProps) {
  const [providerId, setProviderId] = useState<string>(defaultProviderId ?? providers[0]?.id ?? '');
  const [to, setTo] = useState<string>(defaultTo.join(', '));
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const canSaveDraft = Boolean(onSaveDraft);
  const hasProviders = providers.length > 0;
  const buildProviderLabel = (provider: ProviderConfig) =>
    `${provider.displayName ?? provider.email} • ${provider.providerType}`;

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-sky-400 underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Compose your message...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!providers || providers.length === 0) {
      setProviderId('');
      return;
    }

    setProviderId((current) => {
      if (current) {
        return current;
      }

      if (defaultProviderId && providers.some((p) => p.id === defaultProviderId)) {
        return defaultProviderId;
      }

      return providers[0].id;
    });
  }, [providers, defaultProviderId]);

  // Initialize editor content based on mode
  useEffect(() => {
    if (!editor || !originalEmail) return;

    if (mode === 'reply') {
      // Set recipient to original sender
      setTo(originalEmail.from);

      // Set subject with Re: prefix
      const reSubject = originalEmail.subject.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;
      setSubject(reSubject);

      // Add quoted original message
      const quotedText = originalEmail.bodyHtml || originalEmail.bodyText || '';
      const quotedHtml = `<p><br></p><p>On ${new Date().toLocaleDateString()}, ${originalEmail.from} wrote:</p><blockquote>${quotedText}</blockquote>`;
      editor.commands.setContent(quotedHtml);
    } else if (mode === 'forward') {
      // Set subject with Fwd: prefix
      const fwdSubject = originalEmail.subject.startsWith('Fwd:')
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject}`;
      setSubject(fwdSubject);

      // Add forwarded message
      const forwardedText = originalEmail.bodyHtml || originalEmail.bodyText || '';
      const forwardedHtml = `<p><br></p><p>---------- Forwarded message ---------</p><p>From: ${originalEmail.from}</p><p>Subject: ${originalEmail.subject}</p><p><br></p>${forwardedText}`;
      editor.commands.setContent(forwardedHtml);
    }
  }, [editor, mode, originalEmail]);

  // Auto-save draft every 30 seconds
  const handleSaveDraft = useCallback(async () => {
    if (!editor || !onSaveDraft || !providerId) return;
    if (!to.trim() && !subject.trim() && editor.isEmpty) return; // Don't save empty draft

    setSaving(true);
    try {
      const draft: EmailDraft = {
        providerId: providerId || '',
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        cc: cc.split(',').map(e => e.trim()).filter(Boolean),
        bcc: bcc.split(',').map(e => e.trim()).filter(Boolean),
        subject,
        bodyHtml: editor.getHTML(),
        bodyText: editor.getText(),
        inReplyTo: originalEmail?.messageId,
        references: originalEmail?.references,
        attachments,
      };

      await onSaveDraft(draft);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Show user-friendly error message
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [editor, providerId, to, cc, bcc, subject, attachments, originalEmail, onSaveDraft]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!editor || !onSaveDraft) return;

    const interval = setInterval(() => {
      handleSaveDraft();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [editor, onSaveDraft, handleSaveDraft]);

  const handleSend = async () => {
    if (!editor || !onSend) return;
    if (!providerId) {
      alert('Please select a from address');
      return;
    }
    if (!to.trim()) {
      alert('Please enter at least one recipient');
      return;
    }
    if (!subject.trim()) {
      alert('Please enter a subject');
      return;
    }

    setSending(true);
    try {
      const draft: EmailDraft = {
        providerId,
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        cc: cc.split(',').map(e => e.trim()).filter(Boolean),
        bcc: bcc.split(',').map(e => e.trim()).filter(Boolean),
        subject,
        bodyHtml: editor.getHTML(),
        bodyText: editor.getText(),
        inReplyTo: originalEmail?.messageId,
        references: originalEmail?.references,
        attachments,
      };

      await onSend(draft);

      // Clear form after successful send
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      editor.commands.clearContent();
      setAttachments([]);

      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const setLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <Card className="bg-slate-900/50 border-white/10">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message'}
          </h3>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-slate-400">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* From */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            From
          </label>
          <select
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none disabled:opacity-60"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            disabled={!hasProviders}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id} className="bg-slate-900 text-slate-100">
                {buildProviderLabel(provider)}
              </option>
            ))}
          </select>
          {!hasProviders && (
            <p className="text-xs text-red-400">Connect an email provider before sending messages.</p>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCc(!showCc)}
              className="text-xs"
            >
              Cc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBcc(!showBcc)}
              className="text-xs"
            >
              Bcc
            </Button>
          </div>

          {showCc && (
            <Input
              placeholder="Cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          )}

          {showBcc && (
            <Input
              placeholder="Bcc"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          )}

          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-y border-white/10 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBold}
            className={editor.isActive('bold') ? 'bg-white/10' : ''}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleItalic}
            className={editor.isActive('italic') ? 'bg-white/10' : ''}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBulletList}
            className={editor.isActive('bulletList') ? 'bg-white/10' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleOrderedList}
            className={editor.isActive('orderedList') ? 'bg-white/10' : ''}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={editor.isActive('link') ? 'bg-white/10' : ''}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>

          <div className="flex-1" />

          <label>
            <Button variant="ghost" size="sm" asChild>
              <span>
                <Paperclip className="w-4 h-4" />
              </span>
            </Button>
            <input
              type="file"
              multiple
              onChange={handleAttachment}
              className="hidden"
            />
          </label>
        </div>

        {/* Editor */}
        <div className="border border-white/10 rounded-md bg-white/5 min-h-[300px]">
          <EditorContent editor={editor} />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Attachments ({attachments.length})</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md text-sm"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          className={`flex items-center pt-2 ${
            canSaveDraft ? 'justify-between' : 'justify-end'
          }`}
        >
          {canSaveDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving || sending || !providerId}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            disabled={sending || saving || !providerId || !hasProviders}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
