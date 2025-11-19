import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingJob, EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { EmailEventReason } from '../../realtime/types/realtime.types';
import { mergeEmailStatusMetadata } from '../utils/email-metadata.util';
import { ConfigService } from '@nestjs/config';
import { ProviderTokenService } from './provider-token.service';
import { RetryService } from '../../../common/services/retry.service';
import { AttachmentStorageService } from '../../email/services/attachment.storage';
import { BaseEmailSyncService } from './base-email-sync.service';

/**
 * Attachment metadata from Gmail message
 */
interface GmailAttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  contentId?: string;
  isInline: boolean;
}

@Injectable()
export class GoogleSyncService extends BaseEmailSyncService {
  protected readonly logger = new Logger(GoogleSyncService.name);
  private GMAIL_HISTORY_MAX_PAGES: number;
  private suppressMessageEvents = false;

  constructor(
    prisma: PrismaService,
    realtimeEvents: RealtimeEventsService,
    config: ConfigService,
    private crypto: CryptoService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
    private knowledgeBaseService: KnowledgeBaseService,
    private providerTokenService: ProviderTokenService,
    private retryService: RetryService,
    private attachmentStorage: AttachmentStorageService,
  ) {
    super(prisma, realtimeEvents, config);
  }

  onModuleInit() {
    super.onModuleInit(); // Load base configuration

    // Gmail-specific configuration overrides
    this.batchSize = this.config.get<number>('GMAIL_BATCH_GET_SIZE', 100);
    this.fullSyncMaxMessages = this.config.get<number>('GMAIL_FULL_MAX_MESSAGES', 200);
    this.retryMaxAttempts = this.config.get<number>('GMAIL_RETRY_MAX_ATTEMPTS', 3);
    this.retry429DelayMs = this.config.get<number>('GMAIL_RETRY_429_DELAY_MS', 2000);
    this.retry5xxDelayMs = this.config.get<number>('GMAIL_RETRY_5XX_DELAY_MS', 2000);

    // Gmail-only configuration
    this.GMAIL_HISTORY_MAX_PAGES = this.config.get<number>('GMAIL_HISTORY_MAX_PAGES', 25);
    this.suppressMessageEvents = this.config.get<boolean>('REALTIME_SUPPRESS_MESSAGE_EVENTS', false);
  }

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType } = jobData;

    this.logger.log(`Starting ${syncType} Gmail sync for ${email}`);

    try {
      const { provider, accessToken } = await this.providerTokenService.getProviderWithToken(
        providerId,
      );

      // Create Gmail client
      const gmail = this.createGmailClient(accessToken);

      // Get last sync token from metadata (for incremental sync)
      const metadata = (provider.metadata as any) || {};
      const lastHistoryId = metadata.lastSyncToken;

      let messagesProcessed = 0;
      let newMessages = 0;
      let newHistoryId: string | undefined;

      if (syncType === 'incremental' && lastHistoryId) {
        // Incremental sync using historyId
        const historyResult = await this.syncIncremental(
          gmail,
          lastHistoryId,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = historyResult.messagesProcessed;
        newMessages = historyResult.newMessages;
        newHistoryId = historyResult.newHistoryId;
      } else {
        // Full sync - fetch recent messages
        const fullResult = await this.syncFull(
          gmail,
          email,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = fullResult.messagesProcessed;
        newMessages = fullResult.newMessages;
        newHistoryId = fullResult.historyId;
      }

      if (this.suppressMessageEvents && messagesProcessed > 0) {
        this.realtimeEvents.emitEmailBatchProcessed(provider.tenantId, {
          providerId,
          processed: messagesProcessed,
          created: newMessages,
          syncType,
        });
        this.realtimeEvents.emitSyncStatus(provider.tenantId, {
          providerId,
          status: 'in_progress',
          processed: messagesProcessed,
        });
      }

      return {
        success: true,
        providerId,
        email,
        messagesProcessed,
        newMessages,
        syncDuration: 0, // Will be set by worker
        lastSyncToken: newHistoryId,
      };
    } catch (error) {
      this.logger.error(`Gmail sync failed for ${email}:`, error);
      throw error;
    }
  }

  private createGmailClient(accessToken: string): gmail_v1.Gmail {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    return this.retryService.withRetry(fn, {
      maxAttempts: this.retryMaxAttempts,
      delay429Ms: this.retry429DelayMs,
      delay5xxMs: this.retry5xxDelayMs,
      loggerName: 'Gmail',
    });
  }

  /**
   * Incremental sync using Gmail History API
   */
  private async syncIncremental(
    gmail: gmail_v1.Gmail,
    startHistoryId: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    newHistoryId: string;
  }> {
    this.logger.debug(`Incremental sync from historyId: ${startHistoryId}`);

    try {
      // Get profile to obtain the latest historyId
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const currentHistoryId = profile.data.historyId!;

      if (currentHistoryId === startHistoryId) {
        return {
          messagesProcessed: 0,
          newMessages: 0,
          newHistoryId: currentHistoryId,
        };
      }

      let messagesProcessed = 0;
      let newMessages = 0;
      let pageToken: string | undefined;
      let pagesFetched = 0;
      const MAX_PAGES = this.GMAIL_HISTORY_MAX_PAGES;
      const addedMessageIds = new Set<string>();
      const labelRefreshIds = new Set<string>();
      const deletedMessageIds = new Set<string>();

      do {
        const historyResponse = await gmail.users.history.list({
          userId: 'me',
          startHistoryId,
          pageToken,
          historyTypes: ['messageAdded', 'messageDeleted'],
          maxResults: 500,
        });

        const history = historyResponse.data.history || [];

        for (const record of history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              const messageId = added.message?.id;
              if (!messageId) {
                continue;
              }
              addedMessageIds.add(messageId);
            }
          }

          if (record.labelsAdded) {
            for (const labelChange of record.labelsAdded) {
              const messageId = labelChange.message?.id;
              if (!messageId) {
                continue;
              }
              labelRefreshIds.add(messageId);
            }
          }

          if (record.labelsRemoved) {
            for (const labelChange of record.labelsRemoved) {
              const messageId = labelChange.message?.id;
              if (!messageId) {
                continue;
              }
              labelRefreshIds.add(messageId);
            }
          }

          if (record.messagesDeleted) {
            for (const deleted of record.messagesDeleted) {
              const messageId = deleted.message?.id;
              if (!messageId) {
                continue;
              }
              deletedMessageIds.add(messageId);
            }
          }
        }

        pageToken = historyResponse.data.nextPageToken ?? undefined;
        pagesFetched += 1;
      } while (pageToken && pagesFetched < MAX_PAGES);

      if (pageToken) {
        this.logger.warn(
          `Gmail history pagination truncated after ${pagesFetched} pages for provider ${providerId}.`,
        );
      }

      // Process added messages in batches
      const addedIds = Array.from(addedMessageIds);
      for (let i = 0; i < addedIds.length; i += this.batchSize) {
        const chunkIds = addedIds.slice(i, i + this.batchSize);
        if (!chunkIds.length) continue;

        const batchGet = (gmail.users.messages as any)?.batchGet;
        let fullMessages: gmail_v1.Schema$Message[] = [];

        if (typeof batchGet === 'function') {
          const batchResponse = await batchGet.call(gmail.users.messages, {
            userId: 'me',
            ids: chunkIds,
            format: 'full',
          });

          const responses = batchResponse.data.responses || [];
          fullMessages = responses
            .map((r: { message?: gmail_v1.Schema$Message }) => r.message)
            .filter(
              (msg: gmail_v1.Schema$Message | undefined | null): msg is gmail_v1.Schema$Message =>
                !!msg?.id,
            );
        } else {
          const chunkResponses = await Promise.all(
            chunkIds.map((id) =>
              gmail.users.messages
                .get({ userId: 'me', id, format: 'full' })
                .then((res) => res.data)
                .catch(() => null),
            ),
          );
          fullMessages = chunkResponses.filter((msg): msg is gmail_v1.Schema$Message => !!msg?.id);
        }

        if (fullMessages.length) {
          const batchResult = await this.processMessagesBatch(fullMessages, providerId, tenantId);
          messagesProcessed += batchResult.processed;
          newMessages += batchResult.created;
        }
      }

      // Process label changes
      await Promise.allSettled(
        Array.from(labelRefreshIds).map((id) =>
          this.refreshMessageMetadata(gmail, id, providerId, tenantId).then(() => {
            messagesProcessed++;
          }),
        ),
      );

      await Promise.allSettled(
        Array.from(deletedMessageIds).map((id) =>
          this.handleMessageDeletion(gmail, id, providerId, tenantId).then(() => {
            messagesProcessed++;
          }),
        ),
      );

      return {
        messagesProcessed,
        newMessages,
        newHistoryId: currentHistoryId,
      };
    } catch (error) {
      this.logger.error('Incremental sync error:', error);
      throw error;
    }
  }

  /**
   * Full sync - fetch the most recent messages up to configured cap
   */
  private async syncFull(
    gmail: gmail_v1.Gmail,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    historyId: string;
  }> {
    this.logger.debug(`Full sync - fetching latest Gmail messages (limit ${this.fullSyncMaxMessages})`);

    try {
      // Get profile for historyId
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const historyId = profile.data.historyId!;

      // List newest messages (all folders) up to the configured cap
      const remaining = this.fullSyncMaxMessages;
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: Math.min(500, remaining), // Gmail API max per request
      });

      let messages = messagesResponse.data.messages || [];
      let pageToken = messagesResponse.data.nextPageToken;

      // Fetch additional pages if needed (up to configured total)
      while (pageToken && messages.length < this.fullSyncMaxMessages) {
        const nextResponse = await gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(500, this.fullSyncMaxMessages - messages.length),
          pageToken,
        });

        messages = [...messages, ...(nextResponse.data.messages || [])];
        pageToken = nextResponse.data.nextPageToken;

        if (!pageToken || messages.length >= this.fullSyncMaxMessages) {
          break;
        }
      }

      this.logger.debug(`Found ${messages.length} Gmail messages from the most recent pages`);

      let messagesProcessed = 0;
      let newMessages = 0;

      for (let i = 0; i < messages.length; i += this.batchSize) {
        const chunkIds = messages.slice(i, i + this.batchSize).map((m) => m.id!).filter(Boolean);
        if (!chunkIds.length) continue;

        const fullMessages = await this.fetchMessagesBatch(gmail, chunkIds, 'full');

        if (fullMessages.length) {
          const batchResult = await this.processMessagesBatch(fullMessages, providerId, tenantId);
          messagesProcessed += batchResult.processed;
          newMessages += batchResult.created;
        }
      }

      return {
        messagesProcessed,
        newMessages,
        historyId,
      };
    } catch (error) {
      this.logger.error('Full sync error:', error);
      throw error;
    }
  }




  /**
   * Refresh Gmail message metadata when labels change.
   */
  private async refreshMessageMetadata(
    gmail: gmail_v1.Gmail,
    messageId: string,
    providerId: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.email.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: messageId,
        },
      },
      select: {
        id: true,
        folder: true,
        isDeleted: true,
        labels: true,
        metadata: true,
      },
    });

    if (!existing) {
      return;
    }

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
      });

      const labelIds = response.data.labelIds ?? [];
      const folder = this.determineFolderFromLabels(labelIds, existing.folder);
      const isDeleted = labelIds.includes('TRASH');
      const isRead = !labelIds.includes('UNREAD');
      const isStarred = labelIds.includes('STARRED');
      const metadata = mergeEmailStatusMetadata(existing.metadata as Record<string, any> | null, isDeleted ? 'deleted' : 'active');

      try {
        await this.prisma.email.update({
          where: { id: existing.id },
          data: {
            labels: labelIds,
            folder,
            isDeleted,
            isRead,
            isStarred,
            metadata,
          },
        });

        this.notifyGmailMailboxChange(tenantId, providerId, 'labels-updated', {
          emailId: existing.id,
          externalId: messageId,
          folder,
        });
      } catch (updateError) {
        const message = updateError instanceof Error ? updateError.message : String(updateError);
        this.logger.warn(
          `Failed to update Gmail message ${messageId} after label change: ${message}`,
        );
      }
    } catch (error) {
      if (this.isNotFoundError(error)) {
        await this.enforceTrashState(existing, tenantId);

        this.notifyGmailMailboxChange(tenantId, providerId, 'message-deleted', {
          emailId: existing.id,
          externalId: messageId,
        });
      } else {
        const message = this.extractErrorMessage(error);
        this.logger.warn(`Failed to refresh Gmail message ${messageId}: ${message}`);
      }
    }
  }

  private async handleMessageDeletion(
    gmail: gmail_v1.Gmail,
    messageId: string,
    providerId: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.email.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: messageId,
        },
      },
      select: {
        id: true,
        folder: true,
        isDeleted: true,
        labels: true,
        metadata: true,
      },
    });

    if (!existing) {
      return;
    }

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
      });

      const labelIds = response.data.labelIds ?? [];
      const labelsWithTrash = Array.from(new Set([...labelIds, 'TRASH']));
      const isRead = !labelsWithTrash.includes('UNREAD');
      const isStarred = labelsWithTrash.includes('STARRED');
      const metadata = mergeEmailStatusMetadata(existing.metadata as Record<string, any> | null, 'deleted');

      try {
        await this.prisma.email.update({
          where: { id: existing.id },
          data: {
            labels: labelsWithTrash,
            folder: 'TRASH',
            isDeleted: true,
            isRead,
            isStarred,
            metadata,
          },
        });
      } catch (updateError) {
        const message = updateError instanceof Error ? updateError.message : String(updateError);
        this.logger.warn(
          `Failed to mark Gmail message ${messageId} as deleted: ${message}`,
        );
      }
    } catch (error) {
      if (this.isNotFoundError(error)) {
        await this.enforceTrashState(existing, tenantId);
      } else {
        const message = this.extractErrorMessage(error);
        this.logger.warn(`Error while handling Gmail deletion for ${messageId}: ${message}`);
      }
    }
  }

  private async enforceTrashState(
    existing: {
      id: string;
      folder: string;
      isDeleted: boolean;
      labels: string[] | null;
      metadata: any;
    },
    tenantId: string,
    forceHardDelete = false,
  ): Promise<void> {
    const currentLabels = Array.isArray(existing.labels) ? existing.labels : [];

    if (forceHardDelete || existing.folder === 'TRASH' || existing.isDeleted) {
      await this.removeEmailPermanently(existing.id, tenantId);
      return;
    }

    const updatedLabels = currentLabels.includes('TRASH')
      ? currentLabels
      : [...currentLabels, 'TRASH'];
    const metadata = mergeEmailStatusMetadata(existing.metadata, 'deleted');

    try {
      await this.prisma.email.update({
        where: { id: existing.id },
        data: {
          isDeleted: true,
          folder: 'TRASH',
          labels: updatedLabels,
          metadata,
        },
      });
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.warn(
        `Failed to soft-delete Gmail message ${existing.id} locally: ${message}`,
      );
    }
  }

  private async removeEmailPermanently(emailId: string, tenantId: string): Promise<void> {
    try {
      await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, emailId);
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.warn(
        `Failed to delete embeddings for email ${emailId} during hard-delete: ${message}`,
      );
    }

    try {
      await this.prisma.email.delete({
        where: { id: emailId },
      });
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.warn(`Failed to remove email ${emailId} from database: ${message}`);
    }
  }

  private determineFolderFromLabels(labelIds?: string[], fallback?: string): string {
    if (!labelIds || labelIds.length === 0) {
      return fallback ?? 'INBOX';
    }

    if (labelIds.includes('TRASH')) {
      return 'TRASH';
    }

    if (labelIds.includes('SPAM')) {
      return 'SPAM';
    }

    if (labelIds.includes('SENT')) {
      return 'SENT';
    }

    if (labelIds.includes('DRAFT') || labelIds.includes('DRAFTS')) {
      return 'DRAFTS';
    }

    // Check for Gmail categories BEFORE generic INBOX
    // Gmail adds both INBOX and CATEGORY_ labels, so we prioritize categories
    const categoryLabel = labelIds.find((label) => label.startsWith('CATEGORY_'));
    if (categoryLabel) {
      switch (categoryLabel) {
        case 'CATEGORY_PERSONAL':
          return 'INBOX';
        case 'CATEGORY_SOCIAL':
          return 'SOCIAL';
        case 'CATEGORY_PROMOTIONS':
          return 'PROMOTIONS';
        case 'CATEGORY_UPDATES':
          return 'UPDATES';
        case 'CATEGORY_FORUMS':
          return 'FORUMS';
        default:
          break;
      }
    }

    if (labelIds.includes('INBOX')) {
      return 'INBOX';
    }

    return fallback ?? 'INBOX';
  }

  private async applyStatusMetadata(
    emailId: string,
    existing: Record<string, any> | null | undefined,
    status: 'deleted' | 'active',
  ): Promise<void> {
    const next = mergeEmailStatusMetadata(existing, status);
    const shouldUpdate =
      !existing ||
      existing.status !== next.status ||
      existing.deletedAt !== next.deletedAt;

    if (!shouldUpdate) {
      return;
    }

    try {
      await this.prisma.email.update({
        where: { id: emailId },
        data: {
          metadata: next,
        },
      });
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.warn(`Failed to update metadata for email ${emailId}: ${message}`);
    }
  }


  /**
   * Process a single Gmail message and persist it locally.
   * Kept for incremental/webhook paths when batch data is not available.
   */
  private async processMessage(
    gmail: gmail_v1.Gmail,
    messageId: string,
    providerId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const messages = await this.fetchMessagesBatch(gmail, [messageId], 'full');
      if (!messages.length) return false;

      const result = await this.processMessagesBatch(messages, providerId, tenantId);
      return result.processed > 0;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.verbose(
          `Gmail returned 404 for message ${messageId}; marking local record as deleted if present.`,
        );
        await this.handleMissingRemoteMessage(providerId, tenantId, messageId);
        return true;
      }

      this.logger.error(`Failed to process message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Fetch Gmail messages in batch (batchGet if available, otherwise parallel get).
   */
  private async fetchMessagesBatch(
    gmail: gmail_v1.Gmail,
    ids: string[],
    format: gmail_v1.Params$Resource$Users$Messages$Get['format'] = 'full',
  ): Promise<gmail_v1.Schema$Message[]> {
    if (!ids.length) return [];

    const batchGet = (gmail.users.messages as any)?.batchGet;
    if (typeof batchGet === 'function') {
      try {
        const batchResponse = await this.withRetry<any>(() =>
          batchGet.call(gmail.users.messages, {
            userId: 'me',
            ids,
            format,
          }),
        );

        const responses = batchResponse.data.responses || [];
        return responses
          .map((r: { message?: gmail_v1.Schema$Message }) => r.message)
          .filter(
            (msg: gmail_v1.Schema$Message | undefined | null): msg is gmail_v1.Schema$Message =>
              !!msg?.id,
          );
      } catch (error) {
        this.logger.warn(
          `Gmail batchGet failed, falling back to parallel gets: ${this.extractErrorMessage(error)}`,
        );
      }
    }

    const chunkResponses = await Promise.all(
      ids.map((id) =>
        this.withRetry(() =>
          gmail.users.messages
            .get({ userId: 'me', id, format })
            .then((res) => res.data)
            .catch(() => null),
        ),
      ),
    );
    return chunkResponses.filter((msg): msg is gmail_v1.Schema$Message => !!msg?.id);
  }

  private parseGmailMessage(
    message: gmail_v1.Schema$Message,
  ): {
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
  } | null {
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
        const isInline = part.headers?.some((h: any) =>
          h.name === 'Content-Disposition' && h.value?.startsWith('inline')
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

    const snippet = message.snippet || this.truncateText(bodyText, 200);
    const sentAt = dateStr ? new Date(dateStr) : new Date(message.internalDate ? parseInt(message.internalDate) : Date.now());
    const labelIds = message.labelIds ?? [];
    const folder = this.determineFolderFromLabels(labelIds);
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
      headers: headers.reduce((acc, h) => ({ ...acc, [h.name || '']: h.value }), {} as Record<string, any>),
      metadataStatus: isDeleted ? 'deleted' : 'active',
      attachments,
    };
  }

  /**
   * Download attachment data from Gmail API
   */
  private async downloadGmailAttachment(
    gmail: gmail_v1.Gmail,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer | null> {
    try {
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      if (!response.data.data) {
        return null;
      }

      // Gmail returns base64url-encoded data, need to convert to Buffer
      return Buffer.from(response.data.data, 'base64');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to download attachment ${attachmentId} for message ${messageId}: ${err.message}`,
      );
      return null;
    }
  }

  /**
   * Process and store attachments for an email
   */
  private async processEmailAttachments(
    gmail: gmail_v1.Gmail,
    emailId: string,
    externalId: string,
    attachments: GmailAttachmentMeta[],
    tenantId: string,
    providerId: string,
  ): Promise<void> {
    if (!attachments.length) {
      return;
    }

    try {
      // Delete existing attachments for this email (in case of re-sync)
      await this.prisma.emailAttachment.deleteMany({
        where: { emailId },
      });

      // Process each attachment
      for (const attachment of attachments) {
        try {
          // Download attachment data
          const data = await this.downloadGmailAttachment(
            gmail,
            externalId,
            attachment.attachmentId,
          );

          if (!data) {
            this.logger.warn(
              `Skipping attachment ${attachment.filename} for email ${emailId} - download failed`,
            );
            continue;
          }

          // Upload to S3/MinIO
          const uploaded = await this.attachmentStorage.uploadAttachment(
            tenantId,
            providerId,
            {
              filename: attachment.filename,
              content: data,
              contentType: attachment.mimeType,
            },
          );

          // Save attachment metadata to database
          await this.prisma.emailAttachment.create({
            data: {
              emailId,
              filename: uploaded.filename,
              mimeType: uploaded.mimeType,
              size: uploaded.size,
              contentId: attachment.contentId,
              storageType: uploaded.storageType,
              storagePath: uploaded.storagePath,
              isInline: attachment.isInline,
            },
          });

          this.logger.debug(
            `Stored attachment ${attachment.filename} (${attachment.size} bytes) for email ${emailId}`,
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error(
            `Failed to process attachment ${attachment.filename} for email ${emailId}: ${error.message}`,
          );
          // Continue processing other attachments
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Failed to process attachments for email ${emailId}: ${error.message}`,
      );
    }
  }

  private async processParsedMessagesBatch(
    mapped: Array<NonNullable<ReturnType<GoogleSyncService['parseGmailMessage']>>>,
    providerId: string,
    tenantId: string,
  ): Promise<{ processed: number; created: number }> {
    if (!mapped.length) {
      return { processed: 0, created: 0 };
    }

    const safeMapped = mapped;

    const externalIds = safeMapped.map((m) => m.externalId);
    const existing = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId: { in: externalIds },
      },
      select: {
        id: true,
        externalId: true,
        metadata: true,
      },
    });
    const existingMap = new Map(existing.map((e) => [e.externalId, e]));

    const creates = safeMapped.filter((m) => !existingMap.has(m.externalId));
    const updates = safeMapped.filter((m) => existingMap.has(m.externalId));

    if (creates.length) {
      await this.prisma.email.createMany({
        data: creates.map((m) => ({
          tenantId,
          providerId,
          externalId: m.externalId,
          threadId: m.threadId,
          messageId: m.messageIdHeader,
          inReplyTo: m.inReplyTo,
          references: m.references,
          from: m.from,
          to: m.to,
          cc: m.cc,
          bcc: m.bcc,
          subject: m.subject,
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          snippet: m.snippet,
          folder: m.folder,
          labels: m.labels,
          isRead: m.isRead,
          isStarred: m.isStarred,
          isDeleted: m.isDeleted,
          sentAt: m.sentAt,
          receivedAt: m.receivedAt,
          size: m.size,
          headers: m.headers,
          metadata: mergeEmailStatusMetadata(null, m.metadataStatus),
        })),
        skipDuplicates: true,
      });
    }

    if (updates.length) {
      await Promise.all(
        updates.map(async (m) => {
          const existingEmail = existingMap.get(m.externalId);
          if (!existingEmail) return;

          const metadata = mergeEmailStatusMetadata(
            existingEmail.metadata as Record<string, any> | null,
            m.metadataStatus,
          );

          await this.prisma.email.update({
            where: { id: existingEmail.id },
            data: {
              labels: m.labels,
              folder: m.folder,
              isRead: m.isRead,
              isStarred: m.isStarred,
              isDeleted: m.isDeleted,
              metadata,
            },
          });
        }),
      );
    }

    // Fetch persisted records to drive embedding enqueue and attachment processing
    const persisted = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId: { in: externalIds },
      },
      select: {
        id: true,
        externalId: true,
        receivedAt: true,
      },
    });
    const persistedMap = new Map(persisted.map((p) => [p.externalId, p]));

    // Get Gmail client for attachment downloads (if there are any attachments)
    const hasAttachments = mapped.some((m) => m.attachments.length > 0);
    let gmail: gmail_v1.Gmail | null = null;

    if (hasAttachments) {
      try {
        const provider = await this.prisma.providerConfig.findUnique({
          where: { id: providerId },
        });

        if (provider?.accessToken && provider.tokenEncryptionIv) {
          const accessToken = this.crypto.decrypt(
            provider.accessToken,
            provider.tokenEncryptionIv,
          );
          gmail = this.createGmailClient(accessToken);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error(
          `Failed to create Gmail client for attachments: ${error.message}`,
        );
      }
    }

    const embeddingJobs: EmailEmbeddingJob[] = [];
    const attachmentPromises: Promise<void>[] = [];

    for (const m of mapped) {
      const persistedEmail = persistedMap.get(m.externalId);
      if (!persistedEmail) continue;

      // Enqueue embedding job
      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(
        tenantId,
        persistedEmail.id,
      );
      if (!alreadyEmbedded) {
        embeddingJobs.push({
          tenantId,
          providerId,
          emailId: persistedEmail.id,
          subject: m.subject,
          snippet: m.snippet,
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          from: m.from,
          receivedAt: persistedEmail.receivedAt,
        });
      }

      // Process attachments if any
      if (m.attachments.length > 0 && gmail) {
        attachmentPromises.push(
          this.processEmailAttachments(
            gmail,
            persistedEmail.id,
            m.externalId,
            m.attachments,
            tenantId,
            providerId,
          ),
        );
      }
    }

    // Process attachments and embeddings in parallel
    const results = await Promise.allSettled([
      ...attachmentPromises,
      embeddingJobs.length > 0
        ? this.emailEmbeddingQueue.enqueueMany(embeddingJobs)
        : Promise.resolve(),
    ]);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to process attachment or embedding (index ${index}): ${result.reason}`,
        );
      }
    });

    return {
      processed: mapped.length,
      created: creates.length,
    };
  }

  private async processMessagesBatch(
    messages: gmail_v1.Schema$Message[],
    providerId: string,
    tenantId: string,
  ): Promise<{ processed: number; created: number }> {
    const parsed = messages
      .map((m) => this.parseGmailMessage(m))
      .filter((m): m is NonNullable<typeof m> => !!m);

    return this.processParsedMessagesBatch(parsed, providerId, tenantId);
  }

  private async handleMissingRemoteMessage(
    providerId: string,
    tenantId: string,
    messageId: string,
  ): Promise<void> {
    const existing = await this.prisma.email.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: messageId,
        },
      },
      select: {
        id: true,
        folder: true,
        isDeleted: true,
        labels: true,
        metadata: true,
      },
    });

    if (!existing) {
      return;
    }

    await this.enforceTrashState(existing, tenantId, true);

    this.notifyGmailMailboxChange(tenantId, providerId, 'message-deleted', {
      emailId: existing.id,
      externalId: messageId,
    });
  }

  /**
   * Sync Gmail labels as folders
   */
  async syncGmailFolders(tenantId: string, providerId: string): Promise<void> {
    this.logger.log(`Starting Gmail folder (labels) sync for provider ${providerId}`);

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider not found or missing access token');
      }

      // Decrypt access token
      const accessToken = this.crypto.decrypt(
        provider.accessToken,
        provider.tokenEncryptionIv,
      );

      // Create Gmail client
      const gmail = this.createGmailClient(accessToken);

      // List all labels
      const labelsResponse = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = labelsResponse.data.labels || [];
      this.logger.log(`Found ${labels.length} Gmail labels for provider ${providerId}`);

      // Get existing folders
      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set<string>(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set<string>(labels.map((l) => l.id).filter((id): id is string => !!id));

      // Delete folders that no longer exist
      const deletedPaths: string[] = [];
      existingPaths.forEach((path) => {
        if (!newPaths.has(path)) {
          deletedPaths.push(path);
        }
      });

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Gmail labels`);
        await (this.prisma as any).folder.deleteMany({
          where: {
            providerId,
            path: { in: deletedPaths },
          },
        });
      }

      // Sync each label as a folder
      for (const label of labels) {
        if (!label.id || !label.name) continue;

        // Determine special use
        const specialUse = this.determineFolderTypeFromLabelId(label.id);

        // Determine if selectable
        const isSelectable = label.type !== 'system' || specialUse !== undefined;

        await (this.prisma as any).folder.upsert({
          where: {
            providerId_path: {
              providerId,
              path: label.id,
            },
          },
          create: {
            tenantId,
            providerId,
            path: label.id,
            name: label.name,
            delimiter: '/',
            specialUse,
            isSelectable,
            totalCount: label.messagesTotal || 0,
            unreadCount: label.messagesUnread || 0,
            level: 0,
          },
          update: {
            name: label.name,
            specialUse,
            isSelectable,
            totalCount: label.messagesTotal || 0,
            unreadCount: label.messagesUnread || 0,
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.log(`Synced ${labels.length} Gmail labels as folders for provider ${providerId}`);
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error syncing Gmail folders for provider ${providerId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Determine folder type from Gmail label ID
   */
  private determineFolderTypeFromLabelId(labelId: string): string | undefined {
    const labelMap: Record<string, string | undefined> = {
      'INBOX': 'INBOX',
      'SENT': 'SENT',
      'DRAFT': 'DRAFTS',
      'TRASH': 'TRASH',
      'SPAM': 'JUNK',
      'STARRED': 'FLAGGED',
      'IMPORTANT': 'IMPORTANT',
      'UNREAD': undefined, // Not a folder, it's a filter
      'CATEGORY_PERSONAL': undefined,
      'CATEGORY_SOCIAL': undefined,
      'CATEGORY_PROMOTIONS': undefined,
      'CATEGORY_UPDATES': undefined,
      'CATEGORY_FORUMS': undefined,
    };

    return labelMap[labelId];
  }

  private notifyGmailMailboxChange(
    tenantId: string,
    providerId: string,
    reason: EmailEventReason,
    payload?: { emailId?: string; externalId?: string; folder?: string },
  ): void {
    // Gmail-specific wrapper with suppressMessageEvents support
    this.realtimeEvents.notifyMailboxChange(tenantId, providerId, reason, payload, {
      suppressMessageEvents: this.suppressMessageEvents,
    });
  }
}
