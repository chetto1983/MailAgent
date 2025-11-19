import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { decode } from 'he';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';

/**
 * Abstract base class for email sync services (Google, Microsoft, IMAP)
 * Provides common functionality and enforces implementation of provider-specific methods
 *
 * Features:
 * - Folder name normalization with i18n support
 * - HTML to plain text conversion
 * - WebSocket/SSE notifications
 * - Retry configuration
 * - Common error handling
 * - Sync statistics calculation
 */
export abstract class BaseEmailSyncService implements OnModuleInit {
  protected abstract readonly logger: Logger;

  // Configuration properties (initialized in onModuleInit)
  protected batchSize: number;
  protected retryMaxAttempts: number;
  protected retry429DelayMs: number;
  protected retry5xxDelayMs: number;
  protected fullSyncMaxMessages: number;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly realtimeEvents: RealtimeEventsService,
    protected readonly config: ConfigService,
  ) {}

  /**
   * Initialize configuration from environment variables
   * Child classes should call super.onModuleInit() and then override with provider-specific config
   */
  onModuleInit() {
    // Default batch size (providers can override)
    this.batchSize = this.config.get<number>('SYNC_BATCH_SIZE', 100);

    // Retry configuration
    this.retryMaxAttempts = this.config.get<number>('RETRY_MAX_ATTEMPTS', 3);
    this.retry429DelayMs = this.config.get<number>('RETRY_429_DELAY_MS', 2000);
    this.retry5xxDelayMs = this.config.get<number>('RETRY_5XX_DELAY_MS', 2000);

    // Full sync limits
    this.fullSyncMaxMessages = this.config.get<number>('FULL_SYNC_MAX_MESSAGES', 200);
  }

  /**
   * Main sync entry point - must be implemented by each provider
   */
  abstract syncProvider(jobData: SyncJobData): Promise<SyncJobResult>;

  /**
   * Normalize folder name to standard mailbox folders
   * Supports internationalization (English, Italian, German)
   * Returns UPPERCASE folder names to match database conventions
   *
   * @param folderName - The raw folder name from the provider
   * @returns Normalized folder name in UPPERCASE (e.g., 'INBOX', 'SENT', 'TRASH')
   */
  protected normalizeFolderName(folderName: string): string {
    const lowerName = folderName.toLowerCase().trim();

    // INBOX variations (English, Italian, German)
    if (lowerName === 'inbox' || lowerName === 'posta in arrivo' || lowerName === 'posteingang') {
      return 'INBOX';
    }

    // SENT variations
    if (
      lowerName === 'sent items' ||
      lowerName === 'sentitems' ||
      lowerName === 'sent' ||
      lowerName === 'sent mail' ||
      lowerName === 'posta inviata' ||
      lowerName === 'inviata' ||
      lowerName === 'elementi inviati'
    ) {
      return 'SENT';
    }

    // TRASH/DELETED variations
    if (
      lowerName === 'deleted items' ||
      lowerName === 'deleteditems' ||
      lowerName === 'trash' ||
      lowerName === 'deleted' ||
      lowerName === 'posta eliminata' ||
      lowerName === 'cestino' ||
      lowerName === 'eliminata'
    ) {
      return 'TRASH';
    }

    // DRAFTS variations
    if (lowerName === 'drafts' || lowerName === 'bozze' || lowerName === 'draft') {
      return 'DRAFTS';
    }

    // SPAM/JUNK variations
    if (
      lowerName === 'junk email' ||
      lowerName === 'junk' ||
      lowerName === 'spam' ||
      lowerName === 'posta indesiderata' ||
      lowerName === 'post indiserata'
    ) {
      return 'SPAM';
    }

    // ARCHIVE variations
    if (
      lowerName === 'archive' ||
      lowerName === 'archivia' ||
      lowerName === 'archivio' ||
      lowerName === 'archived' ||
      lowerName === 'all mail'
    ) {
      return 'ARCHIVE';
    }

    // IMPORTANT/STARRED variations
    if (lowerName === 'important' || lowerName === 'starred') {
      return 'IMPORTANT';
    }

    // Return original name in uppercase if no match
    return folderName.toUpperCase();
  }

  /**
   * Determine if a folder is a system folder
   *
   * @param folderName - The folder name to check (will be normalized)
   * @returns True if the folder is a standard system folder
   */
  protected isSystemFolder(folderName: string): boolean {
    const systemFolders = ['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE'];
    return systemFolders.includes(this.normalizeFolderName(folderName));
  }

  /**
   * Notify about mailbox changes via WebSocket/SSE
   *
   * @param tenantId - The tenant ID to notify
   * @param providerId - The provider ID (email account)
   * @param reason - The type of change that occurred
   * @param payload - Additional metadata about the change
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
   *
   * @param before - Counts before sync (emails, folders)
   * @param after - Counts after sync (emails, folders)
   * @returns The number of new emails and folders added
   */
  protected calculateSyncStats(
    before: { emails: number; folders: number },
    after: { emails: number; folders: number },
  ): {
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
   *
   * @param error - The error to check
   * @returns True if the error indicates a resource was not found
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

    // Check for HTTP status codes in error object
    const errorObj = error as any;
    const status = errorObj?.response?.status ?? errorObj?.status ?? errorObj?.statusCode;
    if (status === 404 || status === 410) {
      return true;
    }

    return false;
  }

  /**
   * Check if an error is a rate limit error (429)
   *
   * @param error - The error to check
   * @returns True if the error indicates rate limiting
   */
  protected isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('rate limit') || message.includes('429')) {
        return true;
      }
    }

    const errorObj = error as any;
    const status = errorObj?.response?.status ?? errorObj?.status ?? errorObj?.statusCode;
    return status === 429;
  }

  /**
   * Check if an error is a server error (5xx)
   *
   * @param error - The error to check
   * @returns True if the error is a server error
   */
  protected isServerError(error: unknown): boolean {
    const errorObj = error as any;
    const status = errorObj?.response?.status ?? errorObj?.status ?? errorObj?.statusCode;
    return typeof status === 'number' && status >= 500 && status < 600;
  }

  /**
   * Extract plain text from HTML content
   * Uses cheerio for robust HTML parsing and 'he' for proper entity decoding
   *
   * @param html - The HTML content to convert
   * @returns Plain text with normalized whitespace
   */
  protected extractPlainText(html: string | undefined): string {
    if (!html) return '';

    try {
      // Load HTML into cheerio
      const $ = cheerio.load(html);

      // Remove script and style tags
      $('script, style').remove();

      // Extract text content
      let text = $.text();

      // Decode HTML entities
      text = decode(text);

      // Normalize whitespace
      text = text.replace(/\s+/g, ' ').trim();

      return text;
    } catch (error) {
      // Fallback to basic regex if cheerio fails
      this.logger.warn(
        `Failed to parse HTML with cheerio, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );

      let text = html.replace(/<[^>]*>/g, ' ');
      text = decode(text);
      text = text.replace(/\s+/g, ' ').trim();

      return text;
    }
  }

  /**
   * Truncate text to a maximum length
   *
   * @param text - The text to truncate
   * @param maxLength - Maximum length (including ellipsis)
   * @returns Truncated text with '...' if truncated
   */
  protected truncateText(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate email address format
   *
   * @param email - The email address to validate
   * @returns True if the email format is valid
   */
  protected validateEmailAddress(email: string): boolean {
    if (!email) return false;

    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format a date to ISO 8601 string
   *
   * @param date - The date to format (Date object, timestamp, or ISO string)
   * @returns ISO 8601 formatted string
   */
  protected formatTimestamp(date: Date | number | string): string {
    if (date instanceof Date) {
      return date.toISOString();
    }

    if (typeof date === 'number') {
      return new Date(date).toISOString();
    }

    // Already a string, validate and return
    try {
      return new Date(date).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Sleep for a specified duration (useful for retry delays)
   *
   * @param ms - Milliseconds to sleep
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract error message from various error formats
   *
   * @param error - The error object
   * @returns Human-readable error message
   */
  protected extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    const errorObj = error as any;
    return (
      errorObj?.message ??
      errorObj?.error?.message ??
      errorObj?.response?.data?.error?.message ??
      'Unknown error'
    );
  }
}
