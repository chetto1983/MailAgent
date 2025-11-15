import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from './queue.service';
import {
  MicrosoftGraphNotification,
  MicrosoftGraphSubscription,
  CreateWebhookOptions,
  WebhookStats,
} from '../interfaces/webhook.interface';
import { SyncJobData } from '../interfaces/sync-job.interface';
import axios, { AxiosError } from 'axios';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import type { ProviderConfig } from '@prisma/client';

export const MICROSOFT_MAIL_RESOURCE = '/me/mailFolders/inbox/messages';

@Injectable()
export class MicrosoftWebhookService {
  private readonly logger = new Logger(MicrosoftWebhookService.name);

  // Microsoft Graph subscriptions expire after max 4230 minutes (~ 3 days)
  private readonly DEFAULT_EXPIRATION_MINUTES = 4230;
  private readonly GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private microsoftOAuthService: MicrosoftOAuthService,
  ) {}

  /**
   * Handle incoming Microsoft Graph notifications
   */
  async handleNotifications(
    notifications: MicrosoftGraphNotification[],
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        await this.handleSingleNotification(notification);
      } catch (error) {
        this.logger.error(
          `Error processing notification ${notification.subscriptionId}:`,
          error,
        );
      }
    }
  }

  /**
   * Process a single Microsoft Graph notification
   */
  private async handleSingleNotification(
    notification: MicrosoftGraphNotification,
  ): Promise<void> {
    this.logger.log(
      `Microsoft notification: ${notification.changeType} for subscription ${notification.subscriptionId}`,
    );

    // Find subscription in database
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: {
        subscriptionId: notification.subscriptionId,
        providerType: 'microsoft',
        isActive: true,
      },
    });

    if (!subscription) {
      this.logger.warn(
        `No active subscription found for ${notification.subscriptionId}`,
      );
      return;
    }

    // Update subscription stats
    await this.updateSubscriptionStats(subscription.providerId);

    // Get provider
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: subscription.providerId },
    });

    if (!provider) {
      this.logger.warn(`Provider not found for subscription ${subscription.id}`);
      return;
    }

    // Trigger incremental sync based on change type
    if (['created', 'updated'].includes(notification.changeType)) {
      const syncJob: SyncJobData = {
        tenantId: provider.tenantId,
        providerId: provider.id,
        providerType: 'microsoft',
        email: provider.email,
        priority: 'high', // Webhook triggers are high priority
        syncType: 'incremental',
        lastSyncedAt: provider.lastSyncedAt ?? undefined,
      };

      await this.queueService.addSyncJob(syncJob);

      this.logger.log(
        `Triggered incremental sync for ${provider.email} via webhook`,
      );
    }
  }

  /**
   * Create a Microsoft Graph subscription for a provider
   */
  async createSubscription(options: CreateWebhookOptions): Promise<void> {
    const { providerId, webhookUrl } = options;

    if (!webhookUrl) {
      throw new Error('webhookUrl is required for Microsoft Graph subscriptions');
    }

    try {
      // Get provider credentials
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || provider.providerType !== 'microsoft') {
        throw new Error('Invalid Microsoft provider');
      }

      const accessToken = await this.getFreshAccessToken(provider);

      // Generate a unique client state for validation
      const clientState = this.generateClientState(providerId);

      // Calculate expiration (max 4230 minutes for mailFolder resource)
      const expirationDateTime = new Date(
        Date.now() + this.DEFAULT_EXPIRATION_MINUTES * 60 * 1000,
      ).toISOString();

      // Create subscription via Microsoft Graph API
      const subscriptionData = {
        changeType: 'created,updated',
        notificationUrl: webhookUrl,
        resource: MICROSOFT_MAIL_RESOURCE, // Watch inbox messages
        expirationDateTime,
        clientState,
      };

      const response = await axios.post<MicrosoftGraphSubscription>(
        `${this.GRAPH_API_URL}/subscriptions`,
        subscriptionData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const subscription = response.data;

      // Save subscription to database
      await this.prisma.webhookSubscription.upsert({
        where: {
          providerId_resourcePath: {
            providerId,
            resourcePath: MICROSOFT_MAIL_RESOURCE,
          },
        },
        create: {
          tenantId: provider.tenantId,
          providerId,
          providerType: 'microsoft',
          subscriptionId: subscription.id,
          webhookUrl,
          resourcePath: subscription.resource,
          isActive: true,
          expiresAt: new Date(subscription.expirationDateTime),
          metadata: {
            clientState,
            changeType: subscription.changeType,
          },
        },
        update: {
          subscriptionId: subscription.id,
          webhookUrl,
          resourcePath: subscription.resource,
          isActive: true,
          expiresAt: new Date(subscription.expirationDateTime),
          lastRenewedAt: new Date(),
          metadata: {
            clientState,
            changeType: subscription.changeType,
          },
        },
      });

      this.logger.log(
        `Created Microsoft Graph subscription for ${provider.email}, expires at ${subscription.expirationDateTime}`,
      );
    } catch (error) {
      const errorMessage = this.getAxiosErrorMessage(error);
      this.logger.error(
        `Error creating Microsoft subscription: ${errorMessage}`,
      );

      // Log error in subscription record
      await this.prisma.webhookSubscription
        .update({
          where: {
            providerId_resourcePath: {
              providerId,
              resourcePath: MICROSOFT_MAIL_RESOURCE,
            },
          },
          data: {
            isActive: false,
            lastError: errorMessage,
            errorCount: { increment: 1 },
          },
        })
        .catch(() => {}); // Ignore if doesn't exist

      throw error;
    }
  }

  /**
   * Renew expiring Microsoft Graph subscriptions
   * Should be called daily via cron
   */
  async renewExpiringSubscriptions(): Promise<void> {
    try {
      // Find subscriptions expiring in next 24 hours
      const expiringSubscriptions =
        await this.prisma.webhookSubscription.findMany({
          where: {
            providerType: 'microsoft',
            resourcePath: MICROSOFT_MAIL_RESOURCE,
            isActive: true,
            expiresAt: {
              lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24h
            },
          },
        });

      this.logger.log(
        `Found ${expiringSubscriptions.length} Microsoft subscriptions to renew`,
      );

      for (const subscription of expiringSubscriptions) {
        try {
          await this.renewSubscription(subscription.subscriptionId, subscription.providerId);
        } catch (error) {
          this.logger.error(
            `Failed to renew subscription ${subscription.subscriptionId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error renewing Microsoft subscriptions:', error);
    }
  }

  /**
   * Renew a specific Microsoft Graph subscription
   */
  private async renewSubscription(
    subscriptionId: string,
    providerId: string,
  ): Promise<void> {
    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || provider.providerType !== 'microsoft') {
        throw new Error('Invalid provider');
      }

      const accessToken = await this.getFreshAccessToken(provider);

      // Calculate new expiration
      const expirationDateTime = new Date(
        Date.now() + this.DEFAULT_EXPIRATION_MINUTES * 60 * 1000,
      ).toISOString();

      // Update subscription via Microsoft Graph API
      const response = await axios.patch<MicrosoftGraphSubscription>(
        `${this.GRAPH_API_URL}/subscriptions/${subscriptionId}`,
        { expirationDateTime },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const updatedSubscription = response.data;

      // Update database
      await this.prisma.webhookSubscription.update({
        where: {
          providerId_resourcePath: {
            providerId,
            resourcePath: MICROSOFT_MAIL_RESOURCE,
          },
        },
        data: {
          expiresAt: new Date(updatedSubscription.expirationDateTime),
          lastRenewedAt: new Date(),
        },
      });

      this.logger.log(
        `Renewed Microsoft subscription ${subscriptionId}, new expiration: ${updatedSubscription.expirationDateTime}`,
      );
    } catch (error) {
      const errorMessage = this.getAxiosErrorMessage(error);
      this.logger.error(
        `Error renewing subscription ${subscriptionId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Cancel a Microsoft Graph subscription
   */
  async cancelSubscription(providerId: string): Promise<void> {
    try {
      const subscription = await this.prisma.webhookSubscription.findFirst({
        where: {
          providerId,
          resourcePath: MICROSOFT_MAIL_RESOURCE,
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || provider.providerType !== 'microsoft') {
        throw new Error('Invalid provider or missing token');
      }

      const accessToken = await this.getFreshAccessToken(provider);

      // Delete subscription via Microsoft Graph API
      await axios.delete(
        `${this.GRAPH_API_URL}/subscriptions/${subscription.subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Update database
      await this.prisma.webhookSubscription.update({
        where: {
          providerId_resourcePath: {
            providerId,
            resourcePath: MICROSOFT_MAIL_RESOURCE,
          },
        },
        data: { isActive: false },
      });

      this.logger.log(
        `Cancelled Microsoft subscription for provider ${providerId}`,
      );
    } catch (error) {
      const errorMessage = this.getAxiosErrorMessage(error);
      this.logger.error(
        `Error cancelling Microsoft subscription: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Update subscription statistics after receiving notification
   */
  private async updateSubscriptionStats(providerId: string): Promise<void> {
    try {
      await this.prisma.webhookSubscription.update({
        where: {
          providerId_resourcePath: {
            providerId,
            resourcePath: MICROSOFT_MAIL_RESOURCE,
          },
        },
        data: {
          lastNotificationAt: new Date(),
          notificationCount: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.debug(`Could not update stats for ${providerId}`);
    }
  }

  /**
   * Generate a random client state for subscription validation
   */
  private generateClientState(providerId: string): string {
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${providerId}-${randomString}`;
  }

  /**
   * Ensure we have a decrypted, non-expired Microsoft access token
   */
  private async getFreshAccessToken(provider: ProviderConfig): Promise<string> {
    if (!provider.accessToken || !provider.tokenEncryptionIv) {
      throw new Error('Provider has no stored access token');
    }

    let accessToken = this.cryptoService.decrypt(
      provider.accessToken,
      provider.tokenEncryptionIv,
    );

    const expiresSoon =
      !provider.tokenExpiresAt ||
      provider.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

    if (!expiresSoon) {
      return accessToken;
    }

    if (!provider.refreshToken || !provider.refreshTokenEncryptionIv) {
      throw new Error('Access token expired and no refresh token is available');
    }

    const refreshToken = this.cryptoService.decrypt(
      provider.refreshToken,
      provider.refreshTokenEncryptionIv,
    );

    const refreshed = await this.microsoftOAuthService.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;

    const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);
    const updateData: Record<string, any> = {
      accessToken: encryptedAccess.encrypted,
      tokenEncryptionIv: encryptedAccess.iv,
      tokenExpiresAt: refreshed.expiresAt,
    };

    if (refreshed.refreshToken) {
      const encryptedRefresh = this.cryptoService.encrypt(refreshed.refreshToken);
      updateData.refreshToken = encryptedRefresh.encrypted;
      updateData.refreshTokenEncryptionIv = encryptedRefresh.iv;
    }

    await this.prisma.providerConfig.update({
      where: { id: provider.id },
      data: updateData,
    });

    return accessToken;
  }

  private getAxiosErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      const status = axiosError.response?.status;
      const data =
        typeof axiosError.response?.data === 'string'
          ? axiosError.response.data
          : JSON.stringify(axiosError.response?.data);
      return status ? `HTTP ${status}: ${data}` : axiosError.message;
    }

    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Get Microsoft webhook statistics
   */
  async getStats(): Promise<Partial<WebhookStats>> {
    const total = await this.prisma.webhookSubscription.count({
      where: { providerType: 'microsoft', resourcePath: MICROSOFT_MAIL_RESOURCE },
    });

    const active = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'microsoft',
        resourcePath: MICROSOFT_MAIL_RESOURCE,
        isActive: true,
      },
    });

    const expiring = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'microsoft',
        resourcePath: MICROSOFT_MAIL_RESOURCE,
        isActive: true,
        expiresAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const last1h = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'microsoft',
        resourcePath: MICROSOFT_MAIL_RESOURCE,
        lastNotificationAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    const withErrors = await this.prisma.webhookSubscription.count({
      where: {
        providerType: 'microsoft',
        resourcePath: MICROSOFT_MAIL_RESOURCE,
        errorCount: { gt: 0 },
      },
    });

    return {
      totalSubscriptions: total,
      activeSubscriptions: active,
      expiringWithin24h: expiring,
      recentNotifications: {
        last1h,
        last24h: 0,
      },
      errors: {
        totalErrors: 0,
        providersWithErrors: withErrors,
      },
    };
  }
}
