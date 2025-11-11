import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { GoogleCalendarWebhookService } from '../services/google-calendar-webhook.service';
import { MicrosoftCalendarWebhookService, MicrosoftCalendarNotification } from '../services/microsoft-calendar-webhook.service';

@Controller('webhooks/calendar')
export class CalendarWebhookController {
  private readonly logger = new Logger(CalendarWebhookController.name);

  constructor(
    private readonly googleCalendarWebhook: GoogleCalendarWebhookService,
    private readonly microsoftCalendarWebhook: MicrosoftCalendarWebhookService,
  ) {}

  /**
   * Google Calendar Push Notifications endpoint
   * Receives push notifications from Google Calendar API
   */
  @Post('google/push')
  @HttpCode(HttpStatus.OK)
  async handleGoogleCalendarPush(@Headers() headers: Record<string, string>) {
    try {
      this.logger.log('Received Google Calendar push notification');

      // Process the notification
      await this.googleCalendarWebhook.handleNotification(headers);

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling Google Calendar webhook:', error);
      // Return 200 anyway to prevent retries
      return { success: false, error: 'Processing failed' };
    }
  }

  /**
   * Microsoft Graph Calendar webhook endpoint
   * Receives notifications from Microsoft Graph API
   * Handles both validation and notifications
   */
  @Post('microsoft/notifications')
  @HttpCode(HttpStatus.OK)
  async handleMicrosoftCalendarNotification(
    @Body() payload: { value?: MicrosoftCalendarNotification[] },
    @Query('validationToken') validationToken?: string,
  ) {
    try {
      // Handle subscription validation (initial setup)
      if (validationToken) {
        this.logger.log('Microsoft Calendar webhook validation requested');
        // Return the validation token in plain text
        return validationToken;
      }

      // Handle notification
      this.logger.log(
        `Received Microsoft Calendar notification with ${payload.value?.length || 0} items`,
      );

      if (!payload.value || payload.value.length === 0) {
        this.logger.warn('No notifications in Microsoft Calendar payload');
        return { success: true };
      }

      // Process each notification
      await this.microsoftCalendarWebhook.handleNotifications(payload.value);

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling Microsoft Calendar webhook:', error);
      // Return error to Microsoft for retry
      throw error;
    }
  }

  /**
   * Health check endpoint for calendar webhook service
   */
  @Get('health')
  async getWebhookHealth() {
    const googleStats = await this.googleCalendarWebhook.getStats();
    const microsoftStats = await this.microsoftCalendarWebhook.getStats();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      google: googleStats,
      microsoft: microsoftStats,
    };
  }
}
