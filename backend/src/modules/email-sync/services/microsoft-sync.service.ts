import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';
import {
  EmailEventsService,
  EmailRealtimeReason,
} from './email-events.service';

interface MicrosoftMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  toRecipients: { emailAddress: { address: string; name: string } }[];
  receivedDateTime: string;
  isRead: boolean;
}

interface MicrosoftDeltaResponse<T = Partial<MicrosoftMessage>> {
  value?: T[];
  '@odata.deltaLink'?: string;
  '@odata.nextLink'?: string;
}

type MicrosoftDeltaItem = Partial<MicrosoftMessage> & {
  id?: string;
  '@removed'?: {
    reason?: string;
  };
};

type MicrosoftSyncMode = 'delta' | 'timestamp';

interface MicrosoftIncrementalDeltaResult {
  messagesProcessed: number;
  newMessages: number;
  newDeltaLink: string;
  latestReceivedDate?: string;
}

interface MicrosoftIncrementalTimestampResult {
  messagesProcessed: number;
  newMessages: number;
  newTimestamp: string;
}

interface MicrosoftFullSyncInitResult {
  messagesProcessed: number;
  newMessages: number;
  syncToken: string;
  mode: MicrosoftSyncMode;
  latestTimestamp?: string;
}

@Injectable()
export class MicrosoftSyncService {
  private readonly logger = new Logger(MicrosoftSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private microsoftOAuth: MicrosoftOAuthService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
    private emailEvents: EmailEventsService,
  ) {}

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType, lastSyncedAt } = jobData;

    this.logger.log(`Starting ${syncType} Microsoft sync for ${email}`);

    try {
      // Get provider config
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
        // Token expired - refresh it using MicrosoftOAuthService
        this.logger.log(`🔄 Access token expired for ${email}, refreshing...`);

        try {
          const refreshToken = this.crypto.decrypt(
            provider.refreshToken,
            provider.refreshTokenEncryptionIv,
          );

          const refreshed = await this.microsoftOAuth.refreshAccessToken(refreshToken);
          accessToken = refreshed.accessToken;

          this.logger.log(`✅ Token refreshed successfully, new expiry: ${refreshed.expiresAt}`);

          // Save new token to database
          const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
          const updateData: any = {
            accessToken: encryptedAccess.encrypted,
            tokenEncryptionIv: encryptedAccess.iv,
            tokenExpiresAt: refreshed.expiresAt,
          };

          // If Microsoft provided a new refresh token, save it too
          if (refreshed.refreshToken) {
            this.logger.log('📝 Microsoft issued new refresh token, updating...');
            const encryptedRefresh = this.crypto.encrypt(refreshed.refreshToken);
            updateData.refreshToken = encryptedRefresh.encrypted;
            updateData.refreshTokenEncryptionIv = encryptedRefresh.iv;
          }

          await this.prisma.providerConfig.update({
            where: { id: providerId },
            data: updateData,
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

      // Get tracking metadata
      const metadata = (provider.metadata as any) || {};
      const lastDeltaLink =
        typeof metadata.lastSyncToken === 'string' ? (metadata.lastSyncToken as string) : undefined;
      const deltaMode: MicrosoftSyncMode | undefined = metadata.microsoftDeltaMode;
      const lastTimestamp =
        typeof metadata.microsoftLastSyncTimestamp === 'string'
          ? (metadata.microsoftLastSyncTimestamp as string)
          : undefined;
      const lastSyncedIso = this.normalizeTimestamp(lastSyncedAt);

      let messagesProcessed = 0;
      let newMessages = 0;
      let metadataUpdates: Record<string, any> = {};
      let incrementalHandled = false;
      let shouldRunFull = syncType === 'full';

      if (!shouldRunFull && syncType === 'incremental') {
        const canUseDelta =
          deltaMode !== 'timestamp' &&
          !!lastDeltaLink &&
          lastDeltaLink.includes('graph.microsoft.com');

        if (canUseDelta) {
          this.logger.log(`Using incremental delta sync for ${email}`);

          try {
            const deltaResult = await this.syncIncremental(
              accessToken,
              lastDeltaLink,
              providerId,
              provider.tenantId,
            );

            messagesProcessed = deltaResult.messagesProcessed;
            newMessages = deltaResult.newMessages;
            metadataUpdates = {
              lastSyncToken: deltaResult.newDeltaLink,
              microsoftDeltaMode: 'delta' as MicrosoftSyncMode,
            };

            if (deltaResult.latestReceivedDate) {
              metadataUpdates.microsoftLastSyncTimestamp = deltaResult.latestReceivedDate;
            }

            incrementalHandled = true;
          } catch (deltaError) {
            if (this.isDeltaUnsupportedError(deltaError)) {
              this.logger.warn(
                `Microsoft delta sync is not supported for ${email}; switching to timestamp-based incremental sync.`,
              );
              shouldRunFull = true; // Will fall back to timestamp strategy during full sync
            } else {
              throw deltaError;
            }
          }
        }

        if (!shouldRunFull && !incrementalHandled) {
          const sinceTimestamp =
            lastTimestamp ||
            (lastDeltaLink && !lastDeltaLink.includes('graph.microsoft.com')
              ? lastDeltaLink
              : lastSyncedIso);

          if (sinceTimestamp) {
            this.logger.log(`Using incremental timestamp sync for ${email} since ${sinceTimestamp}`);

            const timestampResult = await this.syncIncrementalByTimestamp(
              accessToken,
              sinceTimestamp,
              providerId,
              provider.tenantId,
            );

            messagesProcessed = timestampResult.messagesProcessed;
            newMessages = timestampResult.newMessages;
            metadataUpdates = {
              lastSyncToken: timestampResult.newTimestamp,
              microsoftDeltaMode: 'timestamp' as MicrosoftSyncMode,
              microsoftLastSyncTimestamp: timestampResult.newTimestamp,
            };

            incrementalHandled = true;
          } else {
            shouldRunFull = true;
          }
        }
      }

      if (!incrementalHandled) {
        this.logger.log(
          `Running full Microsoft sync for ${email} (this may take a while for large mailboxes)`,
        );

        const fullResult = await this.syncFullAndInitializeDelta(
          accessToken,
          email,
          providerId,
          provider.tenantId,
        );

        messagesProcessed = fullResult.messagesProcessed;
        newMessages = fullResult.newMessages;
        metadataUpdates = {
          lastSyncToken: fullResult.syncToken,
          microsoftDeltaMode: fullResult.mode,
        };

        if (fullResult.latestTimestamp) {
          metadataUpdates.microsoftLastSyncTimestamp = fullResult.latestTimestamp;
        }
      }

      return {
        success: true,
        providerId,
        email,
        messagesProcessed,
        newMessages,
        syncDuration: 0, // Will be set by worker
        lastSyncToken: metadataUpdates.lastSyncToken,
        metadata: metadataUpdates,
      };
    } catch (error) {
      this.logger.error(`Microsoft sync failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Incremental sync using Microsoft Graph Delta API
   */
  private async syncIncremental(
    accessToken: string,
    deltaLink: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftIncrementalDeltaResult> {
    this.logger.debug(`Incremental sync using deltaLink`);

    try {
      let nextLink: string | undefined = deltaLink;
      let newDeltaLink: string | undefined;
      let messagesProcessed = 0;
      let newMessages = 0;
      let latestReceivedDate: string | undefined;
      let page = 0;
      const maxPages = 25;

      while (nextLink) {
        if (page++ >= maxPages) {
          this.logger.warn(
            `Delta pagination exceeded ${maxPages} pages for provider ${providerId}; stop processing early.`,
          );
          break;
        }

        const response: AxiosResponse<MicrosoftDeltaResponse<MicrosoftDeltaItem>> =
          await axios.get<MicrosoftDeltaResponse<MicrosoftDeltaItem>>(nextLink, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

        const items = response.data.value ?? [];

        for (const item of items) {
          const messageId = item?.id;
          const itemReceived = item?.receivedDateTime;

          if (item && item['@removed']) {
            if (messageId) {
              await this.handleRemoteRemoval(providerId, tenantId, messageId);
              messagesProcessed++;
            }
            continue;
          }

          if (!messageId) {
            continue;
          }

          const processed = await this.processMessage(
            messageId,
            accessToken,
            providerId,
            tenantId,
          );

          if (processed) {
            messagesProcessed++;
            newMessages++;

            if (itemReceived) {
              if (!latestReceivedDate) {
                latestReceivedDate = itemReceived;
              } else if (new Date(itemReceived).getTime() > new Date(latestReceivedDate).getTime()) {
                latestReceivedDate = itemReceived;
              }
            }
          }
        }

        const delta = response.data['@odata.deltaLink'];
        const next = response.data['@odata.nextLink'];

        if (delta) {
          newDeltaLink = delta;
        }

        nextLink = next || undefined;

        if (!nextLink) {
          break;
        }
      }

      return {
        messagesProcessed,
        newMessages,
        newDeltaLink: newDeltaLink || deltaLink,
        latestReceivedDate,
      };
    } catch (error) {
      this.logger.error('Incremental sync error:', error);
      throw error;
    }
  }

  private async syncIncrementalByTimestamp(
    accessToken: string,
    sinceTimestamp: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftIncrementalTimestampResult> {
    this.logger.debug(`Incremental sync using timestamp since ${sinceTimestamp}`);

    let sinceDate = new Date(sinceTimestamp);
    if (Number.isNaN(sinceDate.getTime())) {
      this.logger.warn(
        `Invalid timestamp "${sinceTimestamp}" provided for incremental sync; defaulting to epoch.`,
      );
      sinceDate = new Date(0);
    }
    const sinceIso = sinceDate.toISOString();

    const params = new URLSearchParams({
      $filter: `receivedDateTime ge ${sinceIso}`,
      $orderby: 'receivedDateTime asc',
      $top: '50',
    });

    let nextLink: string | undefined = `${this.GRAPH_API_BASE}/me/messages?${params.toString()}`;
    let page = 0;
    const maxPages = 25;

    let messagesProcessed = 0;
    let newMessages = 0;
    let latestTimestamp = sinceIso;

    while (nextLink) {
      if (page++ >= maxPages) {
        this.logger.warn(
          `Timestamp pagination exceeded ${maxPages} pages for provider ${providerId}; stopping early.`,
        );
        break;
      }

      const response: AxiosResponse<MicrosoftDeltaResponse<MicrosoftMessage>> =
        await axios.get<MicrosoftDeltaResponse<MicrosoftMessage>>(nextLink, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

      const messages = response.data.value ?? [];

      for (const message of messages) {
        if (!message?.id) {
          continue;
        }

        const processed = await this.processMessage(
          message.id,
          accessToken,
          providerId,
          tenantId,
        );

        if (processed) {
          messagesProcessed++;
          newMessages++;

          if (message.receivedDateTime) {
            latestTimestamp = message.receivedDateTime;
          }
        }
      }

      const next = response.data['@odata.nextLink'];
      nextLink = next || undefined;

      if (!nextLink) {
        break;
      }
    }

    if (messagesProcessed === 0 && newMessages === 0) {
      latestTimestamp = new Date().toISOString();
    }

    return {
      messagesProcessed,
      newMessages,
      newTimestamp: latestTimestamp,
    };
  }

  /**
   * Full sync - fetch messages from last 60 days (max 1000)
   */
  private async syncFull(
    accessToken: string,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    latestReceivedDate?: string;
  }> {
    this.logger.debug('Full sync - fetching messages from last 60 days');

    try {
      // Calculate date 60 days ago
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sinceIso = sixtyDaysAgo.toISOString();

      this.logger.debug(`Fetching Microsoft messages since ${sinceIso}`);

      // Fetch messages from last 60 days with pagination (max 1000)
      const params = new URLSearchParams({
        $filter: `receivedDateTime ge ${sinceIso}`,
        $orderby: 'receivedDateTime desc',
        $top: '100', // Microsoft Graph API max per request
      });

      let messagesUrl: string | undefined = `${this.GRAPH_API_BASE}/me/messages?${params.toString()}`;
      let allMessages: MicrosoftMessage[] = [];
      let page = 0;
      const maxPages = 10; // 10 pages * 100 = max 1000 messages

      // Fetch all pages up to limit
      while (messagesUrl && page < maxPages) {
        const messagesResponse: AxiosResponse<MicrosoftDeltaResponse<MicrosoftMessage>> = await axios.get(messagesUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const messages: MicrosoftMessage[] = messagesResponse.data.value || [];
        allMessages = [...allMessages, ...messages];

        this.logger.debug(`Fetched page ${page + 1}: ${messages.length} messages (total: ${allMessages.length})`);

        // Check for next page
        messagesUrl = messagesResponse.data['@odata.nextLink'];
        page++;

        if (allMessages.length >= 1000) {
          break;
        }
      }

      this.logger.debug(`Found ${allMessages.length} Microsoft messages in last 60 days`);

      let messagesProcessed = 0;
      let newMessages = 0;

      for (const message of allMessages) {
        const processed = await this.processMessage(
          message.id,
          accessToken,
          providerId,
          tenantId,
        );
        if (processed) {
          messagesProcessed++;
          newMessages++;
        }
      }

      const latestReceivedDate = allMessages.length > 0 ? allMessages[0].receivedDateTime : undefined;

      if (latestReceivedDate) {
        this.logger.debug(`Most recent message timestamp: ${latestReceivedDate}`);
      }

      return {
        messagesProcessed,
        newMessages,
        latestReceivedDate,
      };
    } catch (error) {
      this.logger.error('Full sync error:', error);
      throw error;
    }
  }

  private async syncFullAndInitializeDelta(
    accessToken: string,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftFullSyncInitResult> {
    const fullResult = await this.syncFull(accessToken, email, providerId, tenantId);

    let syncToken: string;
    let mode: MicrosoftSyncMode = 'delta';
    let latestTimestamp = fullResult.latestReceivedDate;

    try {
      syncToken = await this.initializeDeltaLink(accessToken);
      this.logger.debug('Initialized Microsoft delta link after full sync');
    } catch (error) {
      mode = 'timestamp';
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.isDeltaUnsupportedError(error)) {
        this.logger.warn(
          'Microsoft account does not support change tracking; using timestamp fallback for incremental sync.',
        );
      } else {
        this.logger.warn(
          `Failed to initialize delta link via Microsoft Graph (reason: ${errorMessage}); falling back to timestamp tracking.`,
        );
      }

      if (!latestTimestamp) {
        latestTimestamp = new Date().toISOString();
      }
      syncToken = latestTimestamp;
    }

    return {
      messagesProcessed: fullResult.messagesProcessed,
      newMessages: fullResult.newMessages,
      syncToken,
      mode,
      latestTimestamp,
    };
  }

  private isDeltaUnsupportedError(error: any): boolean {
    const message: string | undefined =
      error?.response?.data?.error?.message || error?.message || error?.toString?.();
    const code: string | undefined = error?.response?.data?.error?.code;

    if (typeof message === 'string' && message.toLowerCase().includes('change tracking is not supported')) {
      return true;
    }

    if (typeof code === 'string' && code.toLowerCase().includes('changetracking')) {
      return true;
    }

    return false;
  }

  private normalizeTimestamp(timestamp?: Date | string): string | undefined {
    if (!timestamp) {
      return undefined;
    }

    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed.toISOString();
  }

  private async initializeDeltaLink(accessToken: string): Promise<string> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    let requestUrl = `${this.GRAPH_API_BASE}/me/messages/delta?$select=id&$top=50`;
    let page = 0;
    const maxPages = 50;

    while (true) {
      if (page++ >= maxPages) {
        throw new Error(
          `Delta initialization exceeded ${maxPages} pages without receiving a delta link`,
        );
      }

      const response: AxiosResponse<MicrosoftDeltaResponse> =
        await axios.get<MicrosoftDeltaResponse>(requestUrl, { headers });
      const deltaLink = response.data['@odata.deltaLink'];
      const nextLink = response.data['@odata.nextLink'];

      if (deltaLink) {
        return deltaLink;
      }

      if (!nextLink) {
        throw new Error('Delta initialization ended without delta or next links from Microsoft Graph');
      }

      requestUrl = nextLink;
    }
  }

  /**
   * Determine folder name from Microsoft folder ID
   */
  private async determineFolderFromParentId(
    parentFolderId: string | undefined,
    providerId: string,
    isDraft: boolean,
  ): Promise<string> {
    // Default fallback
    if (!parentFolderId) {
      return isDraft ? 'DRAFTS' : 'INBOX';
    }

    try {
      // Lookup folder in database
      const folder = await this.prisma.folder.findFirst({
        where: {
          providerId,
          path: parentFolderId,
        },
        select: {
          specialUse: true,
          name: true,
        },
      });

      if (!folder) {
        return isDraft ? 'DRAFTS' : 'INBOX';
      }

      // Use specialUse if available (already normalized to INBOX, SENT, TRASH, etc.)
      if (folder.specialUse) {
        return folder.specialUse.replace('\\', '').toUpperCase();
      }

      // Normalize Italian folder names to standard names
      const normalized = folder.name.toLowerCase().trim();
      if (normalized === 'posta in arrivo' || normalized === 'inbox') return 'INBOX';
      if (normalized === 'posta inviata' || normalized === 'sent' || normalized === 'inviata') return 'SENT';
      if (normalized === 'posta eliminata' || normalized === 'trash' || normalized === 'cestino' || normalized === 'eliminata') return 'TRASH';
      if (normalized === 'bozze' || normalized === 'draft' || normalized === 'drafts') return 'DRAFTS';
      if (normalized === 'posta indesiderata' || normalized === 'spam' || normalized === 'junk') return 'SPAM';
      if (normalized === 'archive' || normalized === 'archivia' || normalized === 'archivio') return 'ARCHIVE';
      if (normalized === 'posta in uscita' || normalized === 'outbox') return 'OUTBOX';

      // Return original name if no mapping found
      return folder.name.toUpperCase();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to determine folder from parentId ${parentFolderId}: ${errorMessage}`);
      return isDraft ? 'DRAFTS' : 'INBOX';
    }
  }

  /**
   * Process a single Microsoft message
   */
  private async processMessage(
    messageId: string,
    accessToken: string,
    providerId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      // Fetch full message details including body
      const messageUrl = `${this.GRAPH_API_BASE}/me/messages/${messageId}`;
      const response = await axios.get(messageUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const message = response.data;

      // Extract email addresses
      const from = message.from?.emailAddress?.address || '';
      const to = (message.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
      const cc = (message.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
      const bcc = (message.bccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);

      // Extract subject and body
      const subject = message.subject || '(No Subject)';
      const bodyText = message.body?.contentType === 'text' ? message.body.content : '';
      const bodyHtml = message.body?.contentType === 'html' ? message.body.content : message.body?.content || '';
      const snippet = message.bodyPreview || bodyText.substring(0, 200);

      // Extract dates
      const sentAt = message.sentDateTime ? new Date(message.sentDateTime) : new Date();
      const receivedAt = message.receivedDateTime ? new Date(message.receivedDateTime) : new Date();

      // Extract folder from parentFolderId using database lookup
      const folder = await this.determineFolderFromParentId(
        message.parentFolderId,
        providerId,
        message.isDraft || false,
      );

      // Categories as labels
      const labels = message.categories || [];

      // Save to database with upsert to prevent duplicates
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
          threadId: message.conversationId,
          messageId: message.internetMessageId,
          inReplyTo: null, // Microsoft API doesn't expose this directly
          references: null, // Microsoft API doesn't expose this directly
          from,
          to,
          cc,
          bcc,
          subject,
          bodyText,
          bodyHtml,
          snippet,
          folder,
          labels,
          isRead: message.isRead || false,
          isStarred: message.flag?.flagStatus === 'flagged',
          sentAt,
          receivedAt,
          size: message.size,
          headers: {
            importance: message.importance,
            hasAttachments: message.hasAttachments,
          } as Record<string, any>,
        },
        update: {
          // Update flags and labels in case they changed
          labels,
          isRead: message.isRead || false,
          isStarred: message.flag?.flagStatus === 'flagged',
        },
      });

      this.logger.debug(`Saved email: ${subject} from ${from}`);

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(tenantId, emailRecord.id);

      this.notifyMailboxChange(tenantId, providerId, 'message-processed', {
        emailId: emailRecord.id,
        externalId: messageId,
        folder,
      });

      if (alreadyEmbedded) {
        this.logger.verbose(
          `Skipping embedding enqueue for Microsoft message ${messageId} - embedding already exists.`,
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
          this.logger.verbose(`Queued embedding job for Microsoft message ${messageId}`);
        } catch (queueError) {
          const queueMessage = queueError instanceof Error ? queueError.message : String(queueError);
          this.logger.warn(
            `Failed to enqueue embedding job for Microsoft message ${messageId}: ${queueMessage}`,
          );
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to process message ${messageId}:`, error);
      return false;
    }
  }

  private async handleRemoteRemoval(
    providerId: string,
    tenantId: string,
    externalId: string,
  ): Promise<void> {
    const affected = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId,
      },
      select: {
        id: true,
      },
    });

    if (affected.length === 0) {
      return;
    }

    await this.prisma.email.updateMany({
      where: {
        providerId,
        externalId,
      },
      data: {
        isDeleted: true,
        folder: 'TRASH',
      },
    });

    for (const record of affected) {
      this.notifyMailboxChange(tenantId, providerId, 'message-deleted', {
        emailId: record.id,
        externalId,
      });
    }
  }

  /**
   * Sync Microsoft mail folders
   */
  async syncMicrosoftFolders(tenantId: string, providerId: string): Promise<void> {
    this.logger.log(`Starting Microsoft folder sync for provider ${providerId}`);

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

      // Fetch folders from Microsoft Graph
      const url = `${this.GRAPH_API_BASE}/me/mailFolders`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const folders = response.data.value || [];
      this.logger.log(`Found ${folders.length} Microsoft folders for provider ${providerId}`);

      // Get existing folders
      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set(folders.map((f: any) => f.id as string));

      // Delete folders that no longer exist
      const deletedPaths = Array.from(existingPaths).filter(
        (path) => !newPaths.has(path),
      );

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Microsoft folders`);
        await (this.prisma as any).folder.deleteMany({
          where: {
            providerId,
            path: { in: deletedPaths },
          },
        });
      }

      // Sync each folder
      for (const folder of folders) {
        if (!folder.id || !folder.displayName) continue;

        // Determine special use based on well-known folder names
        const specialUse = this.determineMicrosoftFolderType(folder.displayName);

        await (this.prisma as any).folder.upsert({
          where: {
            providerId_path: {
              providerId,
              path: folder.id,
            },
          },
          create: {
            tenantId,
            providerId,
            path: folder.id,
            name: folder.displayName,
            delimiter: '/',
            specialUse,
            isSelectable: true,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            level: folder.parentFolderId ? 1 : 0,
          },
          update: {
            name: folder.displayName,
            specialUse,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.log(`Synced ${folders.length} Microsoft folders for provider ${providerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error syncing Microsoft folders for provider ${providerId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Determine folder type from Microsoft folder name
   */
  private determineMicrosoftFolderType(folderName: string): string | undefined {
    const lowerName = folderName.toLowerCase();

    // Well-known Microsoft folder names
    if (lowerName === 'inbox') return 'INBOX';
    if (lowerName === 'sent items' || lowerName === 'sentitems') return 'SENT';
    if (lowerName === 'drafts') return 'DRAFTS';
    if (lowerName === 'deleted items' || lowerName === 'deleteditems' || lowerName === 'trash') return 'TRASH';
    if (lowerName === 'junk email' || lowerName === 'junk' || lowerName === 'spam') return 'JUNK';
    if (lowerName === 'archive') return 'ARCHIVE';
    if (lowerName === 'outbox') return undefined; // Outbox is temporary

    return undefined;
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
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to emit Microsoft mailbox event: ${message}`);
    }
  }
}
