import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';

interface MicrosoftMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  toRecipients: { emailAddress: { address: string; name: string } }[];
  receivedDateTime: string;
  isRead: boolean;
}

@Injectable()
export class MicrosoftSyncService {
  private readonly logger = new Logger(MicrosoftSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private microsoftOAuth: MicrosoftOAuthService,
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

      // Get last delta link from metadata (for incremental sync)
      const metadata = (provider.metadata as any) || {};
      const lastDeltaLink = metadata.lastSyncToken;

      let messagesProcessed = 0;
      let newMessages = 0;
      let newDeltaLink: string | undefined;

      // Validate deltaLink is a proper URL (not corrupted data like date strings)
      let isValidDeltaLink = false;
      if (lastDeltaLink) {
        try {
          new URL(lastDeltaLink);
          isValidDeltaLink = true;
        } catch (error) {
          this.logger.warn(`⚠️ Invalid deltaLink detected for ${email}: "${lastDeltaLink}". Forcing full sync.`);
          isValidDeltaLink = false;
        }
      }

      if (syncType === 'incremental' && lastDeltaLink && isValidDeltaLink) {
        // Incremental sync using deltaLink
        const deltaResult = await this.syncIncremental(
          accessToken,
          lastDeltaLink,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = deltaResult.messagesProcessed;
        newMessages = deltaResult.newMessages;
        newDeltaLink = deltaResult.newDeltaLink;
      } else {
        // Full sync - fetch recent messages
        const fullResult = await this.syncFull(
          accessToken,
          email,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = fullResult.messagesProcessed;
        newMessages = fullResult.newMessages;
        newDeltaLink = fullResult.deltaLink;
      }

      return {
        success: true,
        providerId,
        email,
        messagesProcessed,
        newMessages,
        syncDuration: 0, // Will be set by worker
        lastSyncToken: newDeltaLink,
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
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    newDeltaLink: string;
  }> {
    this.logger.debug(`Incremental sync using deltaLink`);

    try {
      // Call delta link to get changes
      const response = await axios.get(deltaLink, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const messages: MicrosoftMessage[] = response.data.value || [];
      const newDeltaLink = response.data['@odata.deltaLink'];

      let messagesProcessed = 0;
      let newMessages = 0;

      for (const message of messages) {
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

      return {
        messagesProcessed,
        newMessages,
        newDeltaLink: newDeltaLink || deltaLink,
      };
    } catch (error) {
      this.logger.error('Incremental sync error:', error);
      throw error;
    }
  }

  /**
   * Full sync - fetch recent messages (last 100) and initialize delta sync
   */
  private async syncFull(
    accessToken: string,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    deltaLink: string;
  }> {
    this.logger.debug('Full sync - fetching recent messages and initializing delta');

    try {
      // Step 1: Fetch recent messages to process
      const messagesUrl = `${this.GRAPH_API_BASE}/me/messages?$top=100&$orderby=receivedDateTime desc`;

      const messagesResponse = await axios.get(messagesUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const messages: MicrosoftMessage[] = messagesResponse.data.value || [];

      let messagesProcessed = 0;
      let newMessages = 0;

      for (const message of messages) {
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

      // Step 2: Initialize delta sync for Inbox folder
      // Microsoft requires delta tracking per folder (not global /me/messages)
      this.logger.debug('Initializing delta sync for Inbox folder...');

      let deltaLink: string | undefined;

      try {
        let deltaUrl = `${this.GRAPH_API_BASE}/me/mailFolders/inbox/messages/delta`;
        let pageCount = 0;
        const MAX_PAGES = 50; // Safety limit to prevent infinite loops

        while (deltaUrl && !deltaLink && pageCount < MAX_PAGES) {
          const deltaResponse = await axios.get(deltaUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          // Check if we have the deltaLink
          deltaLink = deltaResponse.data['@odata.deltaLink'];

          if (!deltaLink) {
            // Get next page URL
            deltaUrl = deltaResponse.data['@odata.nextLink'];
            pageCount++;
          }
        }

        if (deltaLink) {
          this.logger.debug(`✅ Successfully obtained deltaLink for Inbox after ${pageCount + 1} pages`);
        } else {
          this.logger.warn(`Could not obtain deltaLink after ${pageCount} pages`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to initialize delta sync: ${errorMessage}`);
      }

      // Fallback: use timestamp if deltaLink not obtained
      if (!deltaLink) {
        const lastMessageDate = messages.length > 0
          ? messages[messages.length - 1].receivedDateTime
          : new Date().toISOString();
        deltaLink = lastMessageDate;
        this.logger.debug(`Using timestamp fallback: ${deltaLink}`);
      }

      return {
        messagesProcessed,
        newMessages,
        deltaLink,
      };
    } catch (error) {
      this.logger.error('Full sync error:', error);
      throw error;
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

      // Extract folder from parentFolderId (simplified - would need folder lookup for actual name)
      const folder = message.isDraft ? 'DRAFTS' : 'INBOX';

      // Categories as labels
      const labels = message.categories || [];

      // Save to database with upsert to prevent duplicates
      await this.prisma.email.upsert({
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

      return true;
    } catch (error) {
      this.logger.error(`Failed to process message ${messageId}:`, error);
      return false;
    }
  }
}
