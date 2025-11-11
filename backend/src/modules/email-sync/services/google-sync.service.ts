import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';
import {
  EmailEventsService,
  EmailRealtimeReason,
} from './email-events.service';

@Injectable()
export class GoogleSyncService {
  private readonly logger = new Logger(GoogleSyncService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private googleOAuth: GoogleOAuthService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
    private knowledgeBaseService: KnowledgeBaseService,
    private emailEvents: EmailEventsService,
  ) {}

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
      const MAX_PAGES = 25;

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
              const processed = await this.processMessage(gmail, messageId, providerId, tenantId);
              if (processed) {
                messagesProcessed++;
                newMessages++;
              }
            }
          }

          if (record.labelsAdded) {
            for (const labelChange of record.labelsAdded) {
              const messageId = labelChange.message?.id;
              if (!messageId) {
                continue;
              }
              await this.refreshMessageMetadata(gmail, messageId, providerId, tenantId);
              messagesProcessed++;
            }
          }

          if (record.labelsRemoved) {
            for (const labelChange of record.labelsRemoved) {
              const messageId = labelChange.message?.id;
              if (!messageId) {
                continue;
              }
              await this.refreshMessageMetadata(gmail, messageId, providerId, tenantId);
              messagesProcessed++;
            }
          }

          if (record.messagesDeleted) {
            for (const deleted of record.messagesDeleted) {
              const messageId = deleted.message?.id;
              if (!messageId) {
                continue;
              }
              await this.handleMessageDeletion(gmail, messageId, providerId, tenantId);
              messagesProcessed++;
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

      for (const message of messages) {
        const processed = await this.processMessage(gmail, message.id!, providerId, tenantId);
        if (processed) {
          messagesProcessed++;
          newMessages++;
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
      const metadata = this.mergeEmailStatusMetadata(
        existing.metadata as Record<string, any> | null,
        isDeleted ? 'deleted' : 'active',
      );

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
      const metadata = this.mergeEmailStatusMetadata(
        existing.metadata as Record<string, any> | null,
        'deleted',
      );

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

    if (labelIds.includes('INBOX')) {
      return 'INBOX';
    }

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
   */
  private async processMessage(
    gmail: gmail_v1.Gmail,
    messageId: string,
    providerId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      // Get full message with more details
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // Get full message including body
      });

      const message = messageResponse.data;

      // Extract metadata from headers
      const headers = message.payload?.headers || [];
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const to = headers.find((h) => h.name === 'To')?.value?.split(',').map((e) => e.trim()) || [];
      const cc = headers.find((h) => h.name === 'Cc')?.value?.split(',').map((e) => e.trim()) || [];
      const bcc = headers.find((h) => h.name === 'Bcc')?.value?.split(',').map((e) => e.trim()) || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
      const dateStr = headers.find((h) => h.name === 'Date')?.value;
      const messageIdHeader = headers.find((h) => h.name === 'Message-ID')?.value;
      const inReplyTo = headers.find((h) => h.name === 'In-Reply-To')?.value;
      const references = headers.find((h) => h.name === 'References')?.value;

      // Extract body
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

      // Create snippet
      const snippet = message.snippet || bodyText.substring(0, 200);

      // Parse date
      const sentAt = dateStr ? new Date(dateStr) : new Date(message.internalDate ? parseInt(message.internalDate) : Date.now());

      const labelIds = message.labelIds ?? [];
      const folder = this.determineFolderFromLabels(labelIds);
      const isRead = !labelIds.includes('UNREAD');
      const isStarred = labelIds.includes('STARRED');
      const isDeleted = labelIds.includes('TRASH');

      // Check if email already exists (upsert)
      const emailRecord = await this.prisma.email.upsert({
        where: {
          providerId_externalId: {
            providerId,
            externalId: messageId,
          },
        },
        create: {
          tenantId,
          providerId,
          externalId: messageId,
          threadId: message.threadId,
          messageId: messageIdHeader,
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
          metadata: this.mergeEmailStatusMetadata(null, isDeleted ? 'deleted' : 'active'),
        },
        update: {
          // Update flags and labels in case they changed
          labels: labelIds,
          folder,
          isRead,
          isStarred,
          isDeleted,
        },
      });

      this.logger.debug(`Saved email: ${subject} from ${from}`);

      await this.applyStatusMetadata(
        emailRecord.id,
        emailRecord.metadata as Record<string, any> | null,
        isDeleted ? 'deleted' : 'active',
      );

      this.notifyMailboxChange(tenantId, providerId, 'message-processed', {
        emailId: emailRecord.id,
        externalId: messageId,
        folder,
      });

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(tenantId, emailRecord.id);

      if (alreadyEmbedded) {
        this.logger.verbose(
          `Skipping embedding enqueue for Gmail message ${messageId} - embedding already exists.`,
        );
      } else {
        try {
          await this.emailEmbeddingQueue.enqueue({
            tenantId,
            providerId,
            emailId: emailRecord.id,
            subject,
            snippet,
            bodyText,
            bodyHtml,
            from,
            receivedAt: emailRecord.receivedAt,
          });
          this.logger.verbose(`Queued embedding job for Gmail message ${messageId}`);
        } catch (queueError) {
          const queueMessage = queueError instanceof Error ? queueError.message : String(queueError);
          this.logger.warn(
            `Failed to enqueue embedding job for Gmail message ${messageId}: ${queueMessage}`,
          );
        }
      }

      return true;
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

  private notifyMailboxChange(
    tenantId: string,
    providerId: string,
    reason: EmailRealtimeReason,
    payload?: { emailId?: string; externalId?: string; folder?: string },
  ): void {
    try {
      this.emailEvents.emitMailboxMutation(tenantId, {
        providerId,
        reason,
        ...payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to emit mailbox event for ${tenantId}: ${message}`);
    }
  }
}
