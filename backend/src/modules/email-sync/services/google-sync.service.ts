import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';

@Injectable()
export class GoogleSyncService {
  private readonly logger = new Logger(GoogleSyncService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private googleOAuth: GoogleOAuthService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
  ) {}

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType, lastSyncedAt } = jobData;

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
      // Get profile to get current historyId
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const currentHistoryId = profile.data.historyId!;

      // If no changes since last sync
      if (currentHistoryId === startHistoryId) {
        return {
          messagesProcessed: 0,
          newMessages: 0,
          newHistoryId: currentHistoryId,
        };
      }

      // Get history changes
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded', 'messageDeleted'],
      });

      const history = historyResponse.data.history || [];

      let messagesProcessed = 0;
      let newMessages = 0;

      for (const record of history) {
        // Process new messages
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            await this.processMessage(gmail, added.message!.id!, providerId, tenantId);
            messagesProcessed++;
            newMessages++;
          }
        }

        // Handle deleted messages
        if (record.messagesDeleted) {
          for (const deleted of record.messagesDeleted) {
            // TODO: Mark message as deleted in database
            messagesProcessed++;
          }
        }
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
   * Full sync - fetch recent messages (last 100)
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
    this.logger.debug('Full sync - fetching recent messages');

    try {
      // Get profile for historyId
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const historyId = profile.data.historyId!;

      // List recent messages (last 100)
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        q: 'in:inbox OR in:sent', // Only inbox and sent
      });

      const messages = messagesResponse.data.messages || [];

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
   * Process a single Gmail message
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
          folder: message.labelIds?.includes('SENT') ? 'SENT' : 'INBOX',
          labels: message.labelIds || [],
          isRead: !message.labelIds?.includes('UNREAD'),
          isStarred: message.labelIds?.includes('STARRED'),
          sentAt,
          receivedAt: new Date(parseInt(message.internalDate || Date.now().toString())),
          size: message.sizeEstimate,
          headers: headers.reduce((acc, h) => ({ ...acc, [h.name || '']: h.value }), {} as Record<string, any>),
        },
        update: {
          // Update flags and labels in case they changed
          labels: message.labelIds || [],
          isRead: !message.labelIds?.includes('UNREAD'),
          isStarred: message.labelIds?.includes('STARRED'),
        },
      });

      this.logger.debug(`Saved email: ${subject} from ${from}`);

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(tenantId, emailRecord.id);

      if (alreadyEmbedded) {
        this.logger.verbose(
          `Skipping embedding enqueue for Gmail message ${messageId} - embedding already exists.`,
        );
      } else {
        try {
          await this.emailEmbeddingQueue.enqueue({
            tenantId,
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
      this.logger.error(`Failed to process message ${messageId}:`, error);
      return false;
    }
  }
}
