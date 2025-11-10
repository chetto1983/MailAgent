import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from './queue.service';
import {
  GmailPubSubMessage,
  GmailPubSubData,
  GmailWatchResponse,
  CreateWebhookOptions,
  WebhookStats,
} from '../interfaces/webhook.interface';
import { SyncJobData } from '../interfaces/sync-job.interface';
import { google, gmail_v1 } from 'googleapis';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { CryptoService } from '../../../common/services/crypto.service';

@Injectable()
export class GmailWebhookService {
  private readonly logger = new Logger(GmailWebhookService.name);

  // Gmail watch() expires after 7 days max
  private readonly DEFAULT_EXPIRATION_DAYS = 7;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private configService: ConfigService,
    private googleOAuthService: GoogleOAuthService,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Handle incoming Gmail Pub/Sub notification
   */
  async handleNotification(message: GmailPubSubMessage): Promise<void> {
    try {
      // Decode the base64-encoded data
      const decodedData = Buffer.from(message.message.data, 'base64').toString(
        'utf-8',
      );
      const data: GmailPubSubData = JSON.parse(decodedData);

      this.logger.log(
        `Gmail notification for ${data.emailAddress}, historyId: ${data.historyId}`,
      );

      // Find provider by email
      const provider = await this.prisma.providerConfig.findFirst({
        where: {
          email: data.emailAddress,
          providerType: 'google',
          isActive: true,
        },
      });

      if (!provider) {
        this.logger.warn(
          `No active Gmail provider found for ${data.emailAddress}`,
        );
        return;
      }

      // Update webhook subscription stats
      await this.updateSubscriptionStats(provider.id);

      // Trigger incremental sync with high priority
      const syncJob: SyncJobData = {
        tenantId: provider.tenantId,
        providerId: provider.id,
        providerType: 'google',
        email: provider.email,
        priority: 'high', // Webhook triggers are high priority
        syncType: 'incremental',
        lastSyncedAt: provider.lastSyncedAt ?? undefined,
      };

      await this.queueService.addSyncJob(syncJob);

      this.logger.log(
        `Triggered incremental sync for ${provider.email} via webhook`,
      );
    } catch (error) {
      this.logger.error('Error processing Gmail notification:', error);
      throw error;
    }
  }

  /**
   * Get fresh access token for a provider (decrypt + refresh if needed)
   */
  private async getFreshAccessToken(providerId: string): Promise<string> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.providerType !== 'google') {
      throw new Error('Invalid Gmail provider');
    }

    if (!provider.accessToken || !provider.tokenEncryptionIv) {
      throw new Error('Provider has no access token');
    }

    // Decrypt access token
    let accessToken = this.cryptoService.decrypt(
      provider.accessToken,
      provider.tokenEncryptionIv,
    );

    // Check if token needs refresh (expires in less than 1 minute)
    const needsRefresh =
      !provider.tokenExpiresAt ||
      provider.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

    if (needsRefresh && provider.refreshToken && provider.refreshTokenEncryptionIv) {
      this.logger.log(`Refreshing expired access token for provider ${providerId}`);

      try {
        const refreshToken = this.cryptoService.decrypt(
          provider.refreshToken,
          provider.refreshTokenEncryptionIv,
        );

        const refreshed = await this.googleOAuthService.refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

        // Save refreshed token to database
        const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);

        await this.prisma.providerConfig.update({
          where: { id: provider.id },
          data: {
            accessToken: encryptedAccess.encrypted,
            tokenEncryptionIv: encryptedAccess.iv,
            tokenExpiresAt: refreshed.expiresAt,
          },
        });

        this.logger.log(`Successfully refreshed token for provider ${providerId}, expires at ${refreshed.expiresAt.toISOString()}`);
      } catch (error) {
        this.logger.error(
          `Failed to refresh Google access token for provider ${provider.id}: ${error instanceof Error ? error.message : error}`,
        );
        throw new Error('Failed to refresh access token');
      }
    }

    return accessToken;
  }

  /**
   * Create a Gmail watch subscription for a provider
   */
  async createSubscription(
    options: CreateWebhookOptions,
  ): Promise<void> {
    const { providerId } = options;

    try {
      // Get provider info
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || provider.providerType !== 'google') {
        throw new Error('Invalid Gmail provider');
      }

      // Get fresh access token (decrypt + refresh if needed)
      const accessToken = await this.getFreshAccessToken(providerId);

      // Get Pub/Sub topic name from config
      const topicName = this.configService.get<string>(
        'GOOGLE_PUBSUB_TOPIC',
        'projects/YOUR_PROJECT/topics/gmail-notifications',
      );

      // Initialize Gmail API client with fresh token
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const configuredLabels = this.configService.get<string>('GMAIL_WATCH_LABELS');
      const requestBody: gmail_v1.Schema$WatchRequest = {
        topicName,
        labelFilterAction: 'include',
      };

      if (configuredLabels) {
        requestBody.labelIds = configuredLabels
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean);
      }

      // Call Gmail watch() API
      const response = await gmail.users.watch({
        userId: 'me',
        requestBody,
      });

      const watchResponse: GmailWatchResponse = response.data as any;

      // Calculate expiration (Gmail returns Unix timestamp in milliseconds)
      const expiresAt = new Date(parseInt(watchResponse.expiration));

      // Save subscription to database
      await this.prisma.webhookSubscription.upsert({
        where: { providerId },
        create: {
          providerId,
          providerType: 'google',
          subscriptionId: watchResponse.historyId,
          isActive: true,
          expiresAt,
          metadata: {
            topicName,
            historyId: watchResponse.historyId,
          },
        },
        update: {
          subscriptionId: watchResponse.historyId,
          isActive: true,
          expiresAt,
          lastRenewedAt: new Date(),
          metadata: {
            topicName,
            historyId: watchResponse.historyId,
          },
        },
      });

      this.logger.log(
        `Created Gmail watch subscription for ${provider.email}, expires at ${expiresAt}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error creating Gmail subscription: ${errorMessage}`);

      // Log error in subscription record
      await this.prisma.webhookSubscription.update({
        where: { providerId },
        data: {
          isActive: false,
          lastError: errorMessage,
          errorCount: { increment: 1 },
        },
      }).catch(() => {}); // Ignore if doesn't exist

      throw error;
    }
  }

  /**
   * Renew expiring Gmail watch subscriptions
   * Should be called daily via cron
   */
  async renewExpiringSubscriptions(): Promise<void> {
    try {
      // Find subscriptions expiring in next 24 hours
      const expiringSubscriptions = await this.prisma.webhookSubscription.findMany({
        where: {
          providerType: 'google',
          isActive: true,
          expiresAt: {
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24h
          },
        },
      });

      this.logger.log(
        `Found ${expiringSubscriptions.length} Gmail subscriptions to renew`,
      );

      for (const subscription of expiringSubscriptions) {
        try {
          await this.createSubscription({
            providerId: subscription.providerId,
            providerType: 'google',
          });
        } catch (error) {
          this.logger.error(
            `Failed to renew subscription for provider ${subscription.providerId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error renewing Gmail subscriptions:', error);
    }
  }

  /**
   * Cancel a Gmail watch subscription
   */
  async cancelSubscription(providerId: string): Promise<void> {
    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Get fresh access token (decrypt + refresh if needed)
      const accessToken = await this.getFreshAccessToken(providerId);

      // Initialize Gmail API client with fresh token
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Call Gmail stop() API
      await gmail.users.stop({ userId: 'me' });

      // Update database
      await this.prisma.webhookSubscription.update({
        where: { providerId },
        data: { isActive: false },
      });

      this.logger.log(`Cancelled Gmail watch for ${provider.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error cancelling Gmail subscription: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Update subscription statistics after receiving notification
   */
  private async updateSubscriptionStats(providerId: string): Promise<void> {
    try {
      await this.prisma.webhookSubscription.update({
        where: { providerId },
        data: {
          lastNotificationAt: new Date(),
          notificationCount: { increment: 1 },
        },
      });
    } catch (error) {
      // Ignore if subscription doesn't exist
      this.logger.debug(`Could not update stats for ${providerId}`);
    }
  }

  /**
   * Get Gmail webhook statistics
   */
  async getStats(): Promise<Partial<WebhookStats>> {
    const total = await this.prisma.webhookSubscription.count({
      where: { providerType: 'google' },
    });

    const active = await this.prisma.webhookSubscription.count({
      where: { providerType: 'google', isActive: true },
    });

    const expiring = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'google',
        isActive: true,
        expiresAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const last1h = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'google',
        lastNotificationAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    const withErrors = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'google',
        errorCount: { gt: 0 },
      },
    });

    return {
      totalSubscriptions: total,
      activeSubscriptions: active,
      expiringWithin24h: expiring,
      recentNotifications: {
        last1h,
        last24h: 0, // Would need separate query
      },
      errors: {
        totalErrors: 0, // Would need aggregate
        providersWithErrors: withErrors,
      },
    };
  }
}
