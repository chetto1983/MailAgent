import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { GmailFolderService } from './gmail-folder.service';
import { GmailAttachmentMeta } from './gmail-attachment-handler';

/**
 * Parsed Gmail message data
 */
export interface ParsedGmailMessage {
  externalId: string;
  threadId?: string | null;
  messageIdHeader?: string | undefined;
  inReplyTo?: string | undefined;
  references?: string | undefined;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  folder: string | undefined;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isDeleted: boolean;
  sentAt: Date;
  receivedAt: Date;
  size?: number | null;
  headers: Record<string, any>;
  metadataStatus: 'active' | 'deleted';
  attachments: GmailAttachmentMeta[];
}

/**
 * Gmail-specific message parser
 * Handles parsing Gmail API message objects into normalized format
 *
 * Architectural pattern: Pluggable adapter (inspired by Mail-0/Zero)
 * - Provider-specific implementation for Gmail message structure
 * - Clear separation from core sync logic
 * - Injectable dependencies for testability
 */
@Injectable()
export class GmailMessageParser {
  private readonly logger = new Logger(GmailMessageParser.name);

  constructor(private readonly gmailFolderService: GmailFolderService) {}

  /**
   * Parse a Gmail message into normalized format
   *
   * @param message - Gmail API message object
   * @param truncateText - Function to truncate text (from BaseEmailSyncService)
   * @returns Parsed message data or null if invalid
   */
  parseGmailMessage(
    message: gmail_v1.Schema$Message,
    truncateText: (text: string, maxLength: number) => string,
  ): ParsedGmailMessage | null {
    const headers = message.payload?.headers || [];
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const to = headers.find((h) => h.name === 'To')?.value?.split(',').map((e) => e.trim()) || [];
    const cc = headers.find((h) => h.name === 'Cc')?.value?.split(',').map((e) => e.trim()) || [];
    const bcc = headers.find((h) => h.name === 'Bcc')?.value?.split(',').map((e) => e.trim()) || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
    const dateStr = headers.find((h) => h.name === 'Date')?.value;
    const messageIdHeader = headers.find((h) => h.name === 'Message-ID')?.value || undefined;
    const inReplyTo = headers.find((h) => h.name === 'In-Reply-To')?.value || undefined;
    const references = headers.find((h) => h.name === 'References')?.value || undefined;

    let bodyText = '';
    let bodyHtml = '';
    const attachments: GmailAttachmentMeta[] = [];

    const extractBody = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf8');
      }

      // Extract attachment metadata
      if (part.filename && part.body?.attachmentId) {
        const contentId = part.headers?.find((h: any) => h.name === 'Content-ID')?.value;
        const isInline =
          part.headers?.some(
            (h: any) => h.name === 'Content-Disposition' && h.value?.startsWith('inline'),
          ) || false;

        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
          contentId: contentId?.replace(/[<>]/g, ''),
          isInline,
        });
      }

      if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };

    if (message.payload) {
      extractBody(message.payload);
    }

    const snippet = message.snippet || truncateText(bodyText, 200);
    const sentAt = dateStr
      ? new Date(dateStr)
      : new Date(message.internalDate ? parseInt(message.internalDate) : Date.now());
    const labelIds = message.labelIds ?? [];
    const folder = this.gmailFolderService.determineFolderFromLabels(labelIds);
    const isRead = !labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');
    const isDeleted = labelIds.includes('TRASH');
    const externalId = message.id;

    if (!externalId) {
      return null;
    }

    return {
      externalId,
      threadId: message.threadId,
      messageIdHeader,
      inReplyTo,
      references,
      from,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      snippet,
      folder,
      labels: labelIds,
      isRead,
      isStarred,
      isDeleted,
      sentAt,
      receivedAt: new Date(parseInt(message.internalDate || Date.now().toString())),
      size: message.sizeEstimate,
      headers: headers.reduce(
        (acc, h) => ({ ...acc, [h.name || '']: h.value }),
        {} as Record<string, any>,
      ),
      metadataStatus: isDeleted ? 'deleted' : 'active',
      attachments,
    };
  }
}
