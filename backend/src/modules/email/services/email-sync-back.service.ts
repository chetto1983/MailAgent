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

  private async executeWithRetry<T>(
    action: () => Promise<T>,
    description: string,
    maxAttempts = 5,
    baseDelayMs = 500,
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < maxAttempts) {
      try {
        return await action();
      } catch (error: any) {
        lastError = error;
        const status = error?.code || error?.status || error?.response?.status;
        const message = error?.message || '';
        const is429 =
          status === 429 ||
          message.includes('rateLimitExceeded') ||
          message.includes('Too many concurrent requests');

        attempt += 1;
        if (!is429 || attempt >= maxAttempts) {
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Retrying ${description} after rate limit (attempt ${attempt}/${maxAttempts}, wait ${delay}ms)`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  }

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
        await this.executeWithRetry(
          () =>
            gmail.users.messages.modify({
              userId: 'me',
              id: operation.externalId,
              requestBody: {
                addLabelIds: [labelToAdd],
              },
            }),
          `gmail modify ${operation.operation} ${operation.externalId}`,
        );
        break;

      case 'markRead':
        await this.executeWithRetry(
          () =>
            gmail.users.messages.modify({
              userId: 'me',
              id: operation.externalId,
              requestBody: {
                removeLabelIds: ['UNREAD'],
              },
            }),
          `gmail markRead ${operation.externalId}`,
        );
        break;

      case 'markUnread':
        await this.executeWithRetry(
          () =>
            gmail.users.messages.modify({
              userId: 'me',
              id: operation.externalId,
              requestBody: {
                addLabelIds: ['UNREAD'],
              },
            }),
          `gmail markUnread ${operation.externalId}`,
        );
        break;

      case 'star':
        await this.executeWithRetry(
          () =>
            gmail.users.messages.modify({
              userId: 'me',
              id: operation.externalId,
              requestBody: {
                addLabelIds: ['STARRED'],
              },
            }),
          `gmail star ${operation.externalId}`,
        );
        break;

      case 'unstar':
        await this.executeWithRetry(
          () =>
            gmail.users.messages.modify({
              userId: 'me',
              id: operation.externalId,
              requestBody: {
                removeLabelIds: ['STARRED'],
              },
            }),
          `gmail unstar ${operation.externalId}`,
        );
        break;

      case 'hardDelete':
        await this.executeWithRetry(
          () =>
            gmail.users.messages.delete({
              userId: 'me',
              id: operation.externalId,
            }),
          `gmail delete ${operation.externalId}`,
        );
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
    if (!operations.length) return;

    const gmailByProvider = new Map<string, EmailSyncOperation[]>();
    const microsoftByProvider = new Map<string, EmailSyncOperation[]>();
    const otherOps: EmailSyncOperation[] = [];

    for (const op of operations) {
      if (!op.providerId) {
        otherOps.push(op);
        continue;
      }
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: op.providerId },
        select: { id: true, providerType: true },
      });
      const type = provider?.providerType?.toUpperCase();
      if (type === 'GOOGLE') {
        const list = gmailByProvider.get(op.providerId) ?? [];
        list.push(op);
        gmailByProvider.set(op.providerId, list);
      } else if (type === 'MICROSOFT') {
        const list = microsoftByProvider.get(op.providerId) ?? [];
        list.push(op);
        microsoftByProvider.set(op.providerId, list);
      } else {
        otherOps.push(op);
      }
    }

    for (const [providerId, ops] of gmailByProvider) {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });
      if (!provider) {
        otherOps.push(...ops);
        continue;
      }
      await this.syncGmailBatch(provider, ops);
    }

    for (const [providerId, ops] of microsoftByProvider) {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });
      if (!provider) {
        otherOps.push(...ops);
        continue;
      }
      await this.syncMicrosoftBatch(provider, ops);
    }

    if (otherOps.length) {
      const promises = otherOps.map((op) => this.syncOperationToProvider(op));
      await Promise.allSettled(promises);
    }
  }

  /**
   * Gmail batch handling to reduce concurrent requests (429)
   */
  private async syncGmailBatch(provider: any, ops: EmailSyncOperation[]) {
    if (!ops.length) return;

    const accessToken = await this.getValidAccessToken(provider);
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const hardDeleteIds: string[] = [];
    const markReadIds: string[] = [];
    const markUnreadIds: string[] = [];
    const starIds: string[] = [];
    const unstarIds: string[] = [];
    const moveToTrashIds: string[] = [];

    for (const op of ops) {
      switch (op.operation) {
        case 'delete':
          moveToTrashIds.push(op.externalId);
          break;
        case 'hardDelete':
          hardDeleteIds.push(op.externalId);
          break;
        case 'markRead':
          markReadIds.push(op.externalId);
          break;
        case 'markUnread':
          markUnreadIds.push(op.externalId);
          break;
        case 'star':
          starIds.push(op.externalId);
          break;
        case 'unstar':
          unstarIds.push(op.externalId);
          break;
        case 'moveToFolder':
          if (op.folder === 'TRASH') {
            moveToTrashIds.push(op.externalId);
          } else {
            // For non-TRASH folders fallback to per-item modify to honor specific label
            await this.syncOperationToProvider(op);
          }
          break;
        default:
          await this.syncOperationToProvider(op);
      }
    }

    // batchDelete supports up to 1000 ids
    for (const ids of this.chunk(hardDeleteIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchDelete({
            userId: 'me',
            requestBody: { ids },
          }),
        `gmail batchDelete (${ids.length})`,
      );
    }

    // Trash via batchModify add TRASH
    for (const ids of this.chunk(moveToTrashIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids,
              addLabelIds: ['TRASH'],
            },
          }),
        `gmail batchMoveToTrash (${ids.length})`,
      );
    }

    // Mark read/unread via batchModify
    for (const ids of this.chunk(markReadIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids,
              removeLabelIds: ['UNREAD'],
            },
          }),
        `gmail batchMarkRead (${ids.length})`,
      );
    }

    for (const ids of this.chunk(markUnreadIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids,
              addLabelIds: ['UNREAD'],
            },
          }),
        `gmail batchMarkUnread (${ids.length})`,
      );
    }

    // Star / unstar via batchModify
    for (const ids of this.chunk(starIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids,
              addLabelIds: ['STARRED'],
            },
          }),
        `gmail batchStar (${ids.length})`,
      );
    }

    for (const ids of this.chunk(unstarIds, 900)) {
      await this.executeWithRetry(
        () =>
          gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids,
              removeLabelIds: ['STARRED'],
            },
          }),
        `gmail batchUnstar (${ids.length})`,
      );
    }
  }

  /**
   * Microsoft batch handling via Graph $batch (max 20 requests)
   */
  private async syncMicrosoftBatch(provider: any, ops: EmailSyncOperation[]) {
    if (!ops.length) return;

    const accessToken = await this.getValidAccessToken(provider);
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const folderMap: Record<string, string> = {
      INBOX: 'inbox',
      SENT: 'sentitems',
      DRAFTS: 'drafts',
      TRASH: 'deleteditems',
      JUNK: 'junkemail',
      SPAM: 'junkemail',
      ARCHIVE: 'archive',
    };

    const requests: { method: string; url: string; id: string; headers?: any; body?: any }[] = [];
    let reqId = 1;

    const enqueue = (method: string, url: string, body?: any) => {
      requests.push({
        id: `${reqId++}`,
        method,
        url,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body } : {}),
      });
    };

    for (const op of ops) {
      switch (op.operation) {
        case 'delete':
          enqueue('POST', `/me/messages/${op.externalId}/move`, { destinationId: 'deleteditems' });
          break;
        case 'hardDelete':
          enqueue('DELETE', `/me/messages/${op.externalId}`);
          break;
        case 'markRead':
          enqueue('PATCH', `/me/messages/${op.externalId}`, { isRead: true });
          break;
        case 'markUnread':
          enqueue('PATCH', `/me/messages/${op.externalId}`, { isRead: false });
          break;
        case 'star':
          enqueue('PATCH', `/me/messages/${op.externalId}`, { flag: { flagStatus: 'flagged' } });
          break;
        case 'unstar':
          enqueue('PATCH', `/me/messages/${op.externalId}`, { flag: { flagStatus: 'notFlagged' } });
          break;
        case 'moveToFolder': {
          const dest = op.folder ? folderMap[op.folder] : undefined;
          if (dest) {
            enqueue('POST', `/me/messages/${op.externalId}/move`, { destinationId: dest });
          } else {
            // Unknown folder: fallback to per-item sync to resolve id
            await this.syncOperationToProvider(op);
          }
          break;
        }
        default:
          await this.syncOperationToProvider(op);
      }
    }

    if (!requests.length) return;

    const batches = this.chunk(requests, 20);
    for (const batch of batches) {
      await this.executeWithRetry(
        () => client.api('/$batch').post({ requests: batch }),
        `ms batch (${batch.length})`,
      );
    }
  }
}
