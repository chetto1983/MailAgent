import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

export interface EmailSyncOperation {
  emailId: string;
  externalId: string;
  providerId: string;
  tenantId: string;
  operation: 'delete' | 'hardDelete' | 'markRead' | 'markUnread' | 'star' | 'unstar' | 'moveToFolder';
  folder?: string;
}

/**
 * Service for syncing email changes back to providers (Gmail/Outlook)
 * Implements bidirectional sync - pushes local changes to remote servers
 */
@Injectable()
export class EmailSyncBackService {
  private readonly logger = new Logger(EmailSyncBackService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private googleOAuth: GoogleOAuthService,
    private microsoftOAuth: MicrosoftOAuthService,
  ) {}

  /**
   * Sync an email operation back to the provider
   */
  async syncOperationToProvider(operation: EmailSyncOperation): Promise<void> {
    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: operation.providerId },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(provider);

      // Sync based on provider type (case-insensitive)
      const providerType = provider.providerType?.toUpperCase();

      switch (providerType) {
        case 'GOOGLE':
          await this.syncToGmail(operation, accessToken);
          break;
        case 'MICROSOFT':
          await this.syncToMicrosoft(operation, accessToken);
          break;
        case 'IMAP':
          // IMAP sync would go here
          this.logger.warn('IMAP bidirectional sync not yet implemented');
          break;
        default:
          this.logger.warn(`Unsupported provider type: ${provider.providerType}`);
      }

      this.logger.log(`✅ Synced ${operation.operation} for email ${operation.emailId} to ${provider.providerType}`);
    } catch (error) {
      this.logger.error(`❌ Failed to sync operation to provider:`, error);
      throw error;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getValidAccessToken(provider: any): Promise<string> {
    const now = new Date();
    const isExpired = provider.tokenExpiresAt && now > new Date(provider.tokenExpiresAt);

    if (isExpired && provider.refreshToken && provider.refreshTokenEncryptionIv) {
      this.logger.log(`🔄 Token expired, refreshing...`);

      const refreshToken = this.crypto.decrypt(
        provider.refreshToken,
        provider.refreshTokenEncryptionIv,
      );

      const providerType = provider.providerType?.toUpperCase();

      if (providerType === 'GOOGLE') {
        const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);

        // Update token in database
        const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
        await this.prisma.providerConfig.update({
          where: { id: provider.id },
          data: {
            accessToken: encryptedAccess.encrypted,
            tokenEncryptionIv: encryptedAccess.iv,
            tokenExpiresAt: refreshed.expiresAt,
          },
        });

        return refreshed.accessToken;
      } else if (providerType === 'MICROSOFT') {
        const refreshed = await this.microsoftOAuth.refreshAccessToken(refreshToken);

        // Update token in database
        const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
        await this.prisma.providerConfig.update({
          where: { id: provider.id },
          data: {
            accessToken: encryptedAccess.encrypted,
            tokenEncryptionIv: encryptedAccess.iv,
            tokenExpiresAt: refreshed.expiresAt,
          },
        });

        return refreshed.accessToken;
      }
    }

    // Token is still valid, decrypt and return
    return this.crypto.decrypt(provider.accessToken, provider.tokenEncryptionIv);
  }

  /**
   * Sync operation to Gmail
   */
  private async syncToGmail(operation: EmailSyncOperation, accessToken: string): Promise<void> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    switch (operation.operation) {
      case 'delete':
      case 'moveToFolder':
        // Move to TRASH or specified folder
        const labelToAdd = operation.folder === 'TRASH' ? 'TRASH' : (operation.folder || 'INBOX');
        await gmail.users.messages.modify({
          userId: 'me',
          id: operation.externalId,
          requestBody: {
            addLabelIds: [labelToAdd],
          },
        });
        break;

      case 'markRead':
        await gmail.users.messages.modify({
          userId: 'me',
          id: operation.externalId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
        break;

      case 'markUnread':
        await gmail.users.messages.modify({
          userId: 'me',
          id: operation.externalId,
          requestBody: {
            addLabelIds: ['UNREAD'],
          },
        });
        break;

      case 'star':
        await gmail.users.messages.modify({
          userId: 'me',
          id: operation.externalId,
          requestBody: {
            addLabelIds: ['STARRED'],
          },
        });
        break;

      case 'unstar':
        await gmail.users.messages.modify({
          userId: 'me',
          id: operation.externalId,
          requestBody: {
            removeLabelIds: ['STARRED'],
          },
        });
        break;

      case 'hardDelete':
        await gmail.users.messages.delete({
          userId: 'me',
          id: operation.externalId,
        });
        break;
    }
  }

  /**
   * Sync operation to Microsoft Outlook
   */
  private async syncToMicrosoft(operation: EmailSyncOperation, accessToken: string): Promise<void> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    switch (operation.operation) {
      case 'delete':
        // Move to deleted items
        await client
          .api(`/me/messages/${operation.externalId}/move`)
          .post({
            destinationId: 'deleteditems',
          });
        break;

      case 'moveToFolder':
        // Map folder names to Outlook folder IDs
        const folderMap: Record<string, string> = {
          'INBOX': 'inbox',
          'SENT': 'sentitems',
          'DRAFTS': 'drafts',
          'TRASH': 'deleteditems',
        };

        const destinationId = folderMap[operation.folder || ''] || 'inbox';
        await client
          .api(`/me/messages/${operation.externalId}/move`)
          .post({
            destinationId,
          });
        break;

      case 'markRead':
        await client
          .api(`/me/messages/${operation.externalId}`)
          .patch({
            isRead: true,
          });
        break;

      case 'markUnread':
        await client
          .api(`/me/messages/${operation.externalId}`)
          .patch({
            isRead: false,
          });
        break;

      case 'star':
        await client
          .api(`/me/messages/${operation.externalId}`)
          .patch({
            flag: {
              flagStatus: 'flagged',
            },
          });
        break;

      case 'unstar':
        await client
          .api(`/me/messages/${operation.externalId}`)
          .patch({
            flag: {
              flagStatus: 'notFlagged',
            },
          });
        break;

      case 'hardDelete':
        await client.api(`/me/messages/${operation.externalId}`).delete();
        break;
    }
  }

  /**
   * Batch sync multiple operations
   */
  async syncOperationsBatch(operations: EmailSyncOperation[]): Promise<void> {
    const promises = operations.map(op => this.syncOperationToProvider(op));
    await Promise.allSettled(promises);
  }
}
