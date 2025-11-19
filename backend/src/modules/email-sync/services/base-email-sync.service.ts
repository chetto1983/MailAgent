import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';

/**
 * Abstract base class for email sync services (Google, Microsoft, IMAP)
 * Provides common functionality and enforces implementation of provider-specific methods
 */
export abstract class BaseEmailSyncService {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly realtimeEvents: RealtimeEventsService,
  ) {}

  /**
   * Main sync entry point - must be implemented by each provider
   */
  abstract syncProvider(jobData: SyncJobData): Promise<SyncJobResult>;

  /**
   * Normalize folder name to standard mailbox folders
   * Common logic shared across all providers
   */
  protected normalizeFolderName(folderName: string): string {
    const normalized = folderName.toLowerCase().trim();

    // Standard folder mappings
    const folderMappings: Record<string, string> = {
      inbox: 'inbox',
      sent: 'sent',
      'sent items': 'sent',
      'sent mail': 'sent',
      draft: 'drafts',
      drafts: 'drafts',
      trash: 'trash',
      deleted: 'trash',
      'deleted items': 'trash',
      spam: 'spam',
      junk: 'spam',
      'junk email': 'spam',
      archive: 'archive',
      archived: 'archive',
      important: 'important',
      starred: 'starred',
    };

    return folderMappings[normalized] || folderName;
  }

  /**
   * Determine if a folder is a system folder
   */
  protected isSystemFolder(folderName: string): boolean {
    const systemFolders = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'];
    return systemFolders.includes(this.normalizeFolderName(folderName));
  }

  /**
   * Notify about mailbox changes via WebSocket/SSE
   */
  protected notifyMailboxChange(
    tenantId: string,
    providerId: string,
    reason: 'message-processed' | 'message-deleted' | 'sync-complete',
    payload?: { emailId?: string; externalId?: string; folder?: string },
  ): void {
    try {
      switch (reason) {
        case 'message-processed':
          this.realtimeEvents.emitEmailNew(tenantId, {
            providerId,
            reason: 'message-processed',
            ...payload,
          });
          break;
        case 'message-deleted':
          this.realtimeEvents.emitEmailUpdate(tenantId, {
            providerId,
            reason: 'message-deleted',
            ...payload,
          });
          break;
        case 'sync-complete':
          this.realtimeEvents.emitSyncStatus(tenantId, {
            providerId,
            status: 'completed',
          });
          break;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to notify mailbox change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Calculate sync statistics from before/after counts
   */
  protected calculateSyncStats(before: {
    emails: number;
    folders: number;
  }, after: {
    emails: number;
    folders: number;
  }): {
    newEmails: number;
    newFolders: number;
  } {
    return {
      newEmails: Math.max(0, after.emails - before.emails),
      newFolders: Math.max(0, after.folders - before.folders),
    };
  }

  /**
   * Check if an error is a "not found" error (404, resource not found, etc.)
   */
  protected isNotFoundError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('not found') ||
        message.includes('404') ||
        message.includes('does not exist') ||
        message.includes('deleted')
      );
    }
    return false;
  }

  /**
   * Extract plain text from HTML content
   */
  protected extractPlainText(html: string | undefined): string {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Truncate text to a maximum length
   */
  protected truncateText(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
