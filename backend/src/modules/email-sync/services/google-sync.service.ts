import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingJob, EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { EmailEventReason } from '../../realtime/types/realtime.types';
import { mergeEmailStatusMetadata } from '../utils/email-metadata.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleSyncService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSyncService.name);
  private GMAIL_BATCH_GET_SIZE: number;
  private GMAIL_HISTORY_MAX_PAGES: number;
  private suppressMessageEvents = false;
  private RETRY_MAX_ATTEMPTS = 3;
  private RETRY_429_DELAY_MS = 2000;
  private RETRY_5XX_DELAY_MS = 2000;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private googleOAuth: GoogleOAuthService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
    private knowledgeBaseService: KnowledgeBaseService,
    private realtimeEvents: RealtimeEventsService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.GMAIL_BATCH_GET_SIZE = this.config.get<number>('GMAIL_BATCH_GET_SIZE', 100);
    this.GMAIL_HISTORY_MAX_PAGES = this.config.get<number>('GMAIL_HISTORY_MAX_PAGES', 25);
    this.suppressMessageEvents = this.config.get<boolean>('REALTIME_SUPPRESS_MESSAGE_EVENTS', false);
    this.RETRY_MAX_ATTEMPTS = this.config.get<number>('GMAIL_RETRY_MAX_ATTEMPTS', 3);
    this.RETRY_429_DELAY_MS = this.config.get<number>('GMAIL_RETRY_429_DELAY_MS', 2000);
    this.RETRY_5XX_DELAY_MS = this.config.get<number>('GMAIL_RETRY_5XX_DELAY_MS', 2000);
  }

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType } = jobData;

    this.logger.log(`Starting ${syncType} Gmail sync for ${email}`);

    try {
      // Get provider config with tokens
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Check if token is expired and needs refresh
      const now = new Date();
      const isExpired = provider.tokenExpiresAt && now > new Date(provider.tokenExpiresAt);

      let accessToken: string;

      if (isExpired && provider.refreshToken && provider.refreshTokenEncryptionIv) {
        // Token expired - refresh it using GoogleOAuthService
        this.logger.log(`🔄 Access token expired for ${email}, refreshing...`);

        try {
          const refreshToken = this.crypto.decrypt(
            provider.refreshToken,
            provider.refreshTokenEncryptionIv,
          );

          const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);
          accessToken = refreshed.accessToken;

          this.logger.log(`✅ Token refreshed successfully, new expiry: ${refreshed.expiresAt}`);

          // Save new token to database
          const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
          await this.prisma.providerConfig.update({
            where: { id: providerId },
            data: {
              accessToken: encryptedAccess.encrypted,
              tokenEncryptionIv: encryptedAccess.iv,
              tokenExpiresAt: refreshed.expiresAt,
            },
          });

          this.logger.log(`💾 Updated token saved to database`);
        } catch (refreshError) {
          this.logger.error(`❌ Failed to refresh token for ${email}:`, refreshError);
          throw new Error(
            'Access token expired and refresh failed. User needs to re-authenticate.'
          );
        }
      } else if (!provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider missing access token');
      } else {
        // Token is still valid, use it
        accessToken = this.crypto.decrypt(
          provider.accessToken,
          provider.tokenEncryptionIv,
        );

        if (isExpired) {
          this.logger.warn(`⚠️ Token expired but no refresh token available for ${email}`);
        } else {
          this.logger.debug(`✓ Using existing valid access token for ${email}`);
        }
      }

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
    let attempt = 0;
    let lastError: any;

    while (attempt < this.RETRY_MAX_ATTEMPTS) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const status =
          (error as any)?.response?.status ??
          (error as any)?.response?.statusCode ??
          (error as any)?.code ??
          (error as any)?.statusCode;

        attempt += 1;

        if (status === 429) {
          const delay = this.RETRY_429_DELAY_MS * attempt;
          this.logger.warn(`Gmail 429 on attempt ${attempt}/${this.RETRY_MAX_ATTEMPTS}, retry in ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        if (status && status >= 500 && status < 600) {
          const delay = this.RETRY_5XX_DELAY_MS * attempt;
          this.logger.warn(`Gmail ${status} on attempt ${attempt}/${this.RETRY_MAX_ATTEMPTS}, retry in ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
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
      for (let i = 0; i < addedIds.length; i += this.GMAIL_BATCH_GET_SIZE) {
        const chunkIds = addedIds.slice(i, i + this.GMAIL_BATCH_GET_SIZE);
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
   * Full sync - fetch messages from last 60 days (max 1000)
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
    this.logger.debug('Full sync - fetching messages from last 60 days');

    try {
      // Get profile for historyId
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const historyId = profile.data.historyId!;

      // Calculate date 60 days ago in Gmail query format (YYYY/MM/DD)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const afterDate = sixtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');

      this.logger.debug(`Fetching Gmail messages after ${afterDate}`);

      // List messages from last 60 days (max 1000)
      // Remove folder restriction to sync all folders (inbox, sent, drafts, etc.)
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 500, // Gmail API max per request
        q: `after:${afterDate}`, // All folders from last 60 days
      });

      let messages = messagesResponse.data.messages || [];
      let pageToken = messagesResponse.data.nextPageToken;

      // Fetch additional pages if needed (up to 1000 total)
      while (pageToken && messages.length < 1000) {
        const nextResponse = await gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(500, 1000 - messages.length),
          q: `after:${afterDate}`,
          pageToken,
        });

        messages = [...messages, ...(nextResponse.data.messages || [])];
        pageToken = nextResponse.data.nextPageToken;

        if (!pageToken || messages.length >= 1000) {
          break;
        }
      }

      this.logger.debug(`Found ${messages.length} Gmail messages in last 60 days`);

      let messagesProcessed = 0;
      let newMessages = 0;

      for (let i = 0; i < messages.length; i += this.GMAIL_BATCH_GET_SIZE) {
        const chunkIds = messages.slice(i, i + this.GMAIL_BATCH_GET_SIZE).map((m) => m.id!).filter(Boolean);
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

        this.notifyMailboxChange(tenantId, providerId, 'labels-updated', {
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

        this.notifyMailboxChange(tenantId, providerId, 'message-deleted', {
          emailId: existing.id,
          externalId: messageId,
        });
      } else {
        const message = error instanceof Error ? error.message : String(error);
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
        const message = error instanceof Error ? error.message : String(error);
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
    const metadata = this.mergeEmailStatusMetadata(existing.metadata, 'deleted');

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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to soft-delete Gmail message ${existing.id} locally: ${message}`,
      );
    }
  }

  private async removeEmailPermanently(emailId: string, tenantId: string): Promise<void> {
    try {
      await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, emailId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to delete embeddings for email ${emailId} during hard-delete: ${message}`,
      );
    }

    try {
      await this.prisma.email.delete({
        where: { id: emailId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
    const next = this.mergeEmailStatusMetadata(existing, status);
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to update metadata for email ${emailId}: ${message}`);
    }
  }

  private mergeEmailStatusMetadata(
    existing: Record<string, any> | null | undefined,
    status: 'deleted' | 'active',
  ): Record<string, any> {
    const metadata = { ...(existing ?? {}) };

    metadata.status = status;

    if (status === 'deleted') {
      if (!metadata.deletedAt) {
        metadata.deletedAt = new Date().toISOString();
      }
    } else if (metadata.deletedAt) {
      delete metadata.deletedAt;
    }

    return metadata;
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const anyError = error as any;

    const status =
      anyError?.status ??
      anyError?.statusCode ??
      anyError?.code ??
      anyError?.response?.status ??
      anyError?.response?.statusCode;

    return status === 404;
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
          `Gmail batchGet failed, falling back to parallel gets: ${
            error instanceof Error ? error.message : String(error)
          }`,
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

    const extractBody = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };

    if (message.payload) {
      extractBody(message.payload);
    }

    const snippet = message.snippet || bodyText.substring(0, 200);
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
    };
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
          metadata: this.mergeEmailStatusMetadata(null, m.metadataStatus),
        })),
        skipDuplicates: true,
      });
    }

    if (updates.length) {
      await Promise.all(
        updates.map(async (m) => {
          const existingEmail = existingMap.get(m.externalId);
          if (!existingEmail) return;

          const metadata = this.mergeEmailStatusMetadata(
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

    // Fetch persisted records to drive embedding enqueue (jobId uniqueness avoids duplicates)
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

    const embeddingJobs: EmailEmbeddingJob[] = [];
    for (const m of mapped) {
      const persistedEmail = persistedMap.get(m.externalId);
      if (!persistedEmail) continue;

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(
        tenantId,
        persistedEmail.id,
      );
      if (alreadyEmbedded) {
        continue;
      }

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

    if (embeddingJobs.length) {
      await this.emailEmbeddingQueue.enqueueMany(embeddingJobs);
    }

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

    this.notifyMailboxChange(tenantId, providerId, 'message-deleted', {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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

  private notifyMailboxChange(
    tenantId: string,
    providerId: string,
    reason: EmailEventReason,
    payload?: { emailId?: string; externalId?: string; folder?: string },
  ): void {
    try {
      // Emit WebSocket event
      const eventPayload = {
        providerId,
        reason,
        ...payload,
      };

      if (this.suppressMessageEvents && (reason === 'message-processed' || reason === 'labels-updated' || reason === 'message-deleted')) {
        return;
      }

      switch (reason) {
        case 'message-processed':
          this.realtimeEvents.emitEmailNew(tenantId, eventPayload);
          break;
        case 'labels-updated':
          this.realtimeEvents.emitEmailUpdate(tenantId, eventPayload);
          break;
        case 'message-deleted':
          this.realtimeEvents.emitEmailDelete(tenantId, eventPayload);
          break;
        case 'sync-complete':
          this.realtimeEvents.emitSyncStatus(tenantId, {
            providerId,
            status: 'completed',
          });
          break;
        default:
          this.realtimeEvents.emitEmailUpdate(tenantId, eventPayload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to emit mailbox event for ${tenantId}: ${message}`);
    }
  }
}
