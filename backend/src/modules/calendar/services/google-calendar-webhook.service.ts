import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';
import { nanoid } from 'nanoid';

export interface GoogleCalendarPushNotification {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

@Injectable()
export class GoogleCalendarWebhookService {
  private readonly logger = new Logger(GoogleCalendarWebhookService.name);
  private readonly WEBHOOK_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly calendarSync: GoogleCalendarSyncService,
  ) {
    const backendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3000');
    this.WEBHOOK_URL = `${backendUrl}/webhooks/calendar/google/push`;
  }

  /**
   * Setup Google Calendar Push Notifications for a provider
   * Similar to Gmail watch, but for Calendar API
   */
  async setupWatch(providerId: string): Promise<void> {
    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.supportsCalendar || !provider.accessToken) {
        throw new Error('Provider not found or does not support calendar');
      }

      const accessToken = this.crypto.decrypt(
        provider.accessToken,
        provider.tokenEncryptionIv!,
      );

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get list of calendars to watch
      const calendarList = await calendar.calendarList.list();
      const calendars = calendarList.data.items || [];

      // Setup watch for each calendar (primary calendar for now)
      for (const cal of calendars.filter((c) => c.primary)) {
        const channelId = `calendar-${providerId}-${nanoid()}`;
        const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        const watchResponse = await calendar.events.watch({
          calendarId: cal.id!,
          requestBody: {
            id: channelId,
            type: 'web_hook',
            address: this.WEBHOOK_URL,
            expiration: expiration.toString(),
          },
        });

        // Store webhook subscription info
        await this.prisma.webhookSubscription.upsert({
          where: { providerId },
          create: {
            providerId,
            providerType: 'google',
            subscriptionId: channelId,
            resourcePath: `/calendar/v3/calendars/${cal.id}/events`,
            webhookUrl: this.WEBHOOK_URL,
            isActive: true,
            expiresAt: new Date(expiration),
            metadata: {
              resourceId: watchResponse.data.resourceId,
              calendarId: cal.id,
            },
          },
          update: {
            subscriptionId: channelId,
            resourcePath: `/calendar/v3/calendars/${cal.id}/events`,
            expiresAt: new Date(expiration),
            isActive: true,
            lastRenewedAt: new Date(),
            metadata: {
              resourceId: watchResponse.data.resourceId,
              calendarId: cal.id,
            },
          },
        });

        this.logger.log(
          `Setup Google Calendar watch for provider ${providerId}, channel ${channelId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to setup Google Calendar watch for provider ${providerId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle Google Calendar push notification
   */
  async handleNotification(headers: Record<string, string>): Promise<void> {
    try {
      const channelId = headers['x-goog-channel-id'];
      const resourceId = headers['x-goog-resource-id'];
      const resourceState = headers['x-goog-resource-state'];

      if (!channelId || !resourceId) {
        this.logger.warn('Received Google Calendar notification without required headers');
        return;
      }

      this.logger.log(
        `Google Calendar notification: channel=${channelId}, state=${resourceState}`,
      );

      // Find provider by channel ID
      const subscription = await this.prisma.webhookSubscription.findFirst({
        where: {
          subscriptionId: channelId,
          providerType: 'google',
          isActive: true,
        },
      });

      if (!subscription) {
        this.logger.warn(`No active subscription found for channel ${channelId}`);
        return;
      }

      // Update subscription stats
      await this.prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          lastNotificationAt: new Date(),
          notificationCount: { increment: 1 },
        },
      });

      // Trigger calendar sync for this provider
      if (resourceState === 'sync' || resourceState === 'exists') {
        await this.calendarSync.syncCalendar(subscription.providerId);
      }
    } catch (error) {
      this.logger.error('Error handling Google Calendar notification:', error);
      throw error;
    }
  }

  /**
   * Renew watch subscriptions that are about to expire
   */
  async renewExpiringSoon(): Promise<number> {
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const expiring = await this.prisma.webhookSubscription.findMany({
      where: {
        providerType: 'google',
        isActive: true,
        expiresAt: {
          lte: oneDayFromNow,
        },
      },
    });

    let renewed = 0;

    for (const subscription of expiring) {
      try {
        await this.setupWatch(subscription.providerId);
        renewed++;
      } catch (error) {
        this.logger.error(
          `Failed to renew Google Calendar watch for ${subscription.providerId}:`,
          error,
        );
      }
    }

    return renewed;
  }

  /**
   * Stop watching a calendar
   */
  async stopWatch(providerId: string): Promise<void> {
    try {
      const subscription = await this.prisma.webhookSubscription.findUnique({
        where: { providerId },
      });

      if (!subscription || subscription.providerType !== 'google') {
        return;
      }

      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.accessToken) {
        return;
      }

      const accessToken = this.crypto.decrypt(
        provider.accessToken,
        provider.tokenEncryptionIv!,
      );

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const metadata = subscription.metadata as any;
      const channelId = subscription.subscriptionId;
      const resourceId = metadata?.resourceId;

      if (channelId && resourceId) {
        await calendar.channels.stop({
          requestBody: {
            id: channelId,
            resourceId,
          },
        });
      }

      // Mark subscription as inactive
      await this.prisma.webhookSubscription.update({
        where: { providerId },
        data: { isActive: false },
      });

      this.logger.log(`Stopped Google Calendar watch for provider ${providerId}`);
    } catch (error) {
      this.logger.error(`Failed to stop Google Calendar watch for ${providerId}:`, error);
    }
  }

  /**
   * Get webhook statistics
   */
  async getStats(): Promise<any> {
    const total = await this.prisma.webhookSubscription.count({
      where: { providerType: 'google', isActive: true },
    });

    const recentNotifications = await this.prisma.webhookSubscription.findMany({
      where: {
        providerType: 'google',
        isActive: true,
        lastNotificationAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
        },
      },
      select: {
        providerId: true,
        notificationCount: true,
        lastNotificationAt: true,
      },
    });

    return {
      activeSubscriptions: total,
      recentNotifications: recentNotifications.length,
      lastNotifications: recentNotifications,
    };
  }
}
