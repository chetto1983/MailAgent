import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

interface MicrosoftEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { address: string; name: string } };
  attendees?: Array<{
    emailAddress: { address: string; name: string };
    status: { response: string; time: string };
    type: string;
  }>;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
  recurrence?: any;
  seriesMasterId?: string;
  iCalUId?: string;
  showAs?: string;
  sensitivity?: string;
  isCancelled?: boolean;
  webLink?: string;
  lastModifiedDateTime?: string;
}

interface MicrosoftEventsResponse {
  value?: MicrosoftEvent[];
  '@odata.nextLink'?: string;
}

export interface MicrosoftCalendarSyncResult {
  success: boolean;
  providerId: string;
  eventsProcessed: number;
  newEvents: number;
  updatedEvents: number;
  deletedEvents: number;
  syncDuration: number;
}

@Injectable()
export class MicrosoftCalendarSyncService {
  private readonly logger = new Logger(MicrosoftCalendarSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
  private readonly calendarEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly configService: ConfigService,
  ) {
    this.calendarEnabled =
      (this.configService.get<string>('CALENDAR_SYNC_ENABLED') || 'true').toLowerCase() !== 'false';
    if (!this.calendarEnabled) {
      this.logger.warn('MicrosoftCalendarSyncService disabled via CALENDAR_SYNC_ENABLED=false');
    }
  }

  /**
   * Sync calendar events from Microsoft Calendar
   * Syncs events from last 60 days to next 60 days (120 days total)
   */
  async syncCalendar(providerId: string): Promise<MicrosoftCalendarSyncResult> {
    if (!this.calendarEnabled) {
      this.logger.warn(
        `Skipping Microsoft calendar sync for ${providerId} (CALENDAR_SYNC_ENABLED=false)`,
      );
      return {
        success: true,
        providerId,
        eventsProcessed: 0,
        newEvents: 0,
        updatedEvents: 0,
        deletedEvents: 0,
        syncDuration: 0,
      };
    }
    const startTime = Date.now();
    this.logger.log(`Starting Microsoft Calendar sync for provider ${providerId}`);

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.supportsCalendar) {
        throw new Error('Provider not found or does not support calendar');
      }

      // Check if token is expired and needs refresh
      const now = new Date();
      const isExpired = provider.tokenExpiresAt && now > new Date(provider.tokenExpiresAt);

      let accessToken: string;

      if (isExpired && provider.refreshToken && provider.refreshTokenEncryptionIv) {
        this.logger.log(`Access token expired for provider ${providerId}, refreshing...`);

        const refreshToken = this.crypto.decrypt(
          provider.refreshToken,
          provider.refreshTokenEncryptionIv,
        );

        const refreshed = await this.microsoftOAuth.refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

        // Save new token to database
        const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
        const updateData: any = {
          accessToken: encryptedAccess.encrypted,
          tokenEncryptionIv: encryptedAccess.iv,
          tokenExpiresAt: refreshed.expiresAt,
        };

        if (refreshed.refreshToken) {
          const encryptedRefresh = this.crypto.encrypt(refreshed.refreshToken);
          updateData.refreshToken = encryptedRefresh.encrypted;
          updateData.refreshTokenEncryptionIv = encryptedRefresh.iv;
        }

        await this.prisma.providerConfig.update({
          where: { id: providerId },
          data: updateData,
        });
      } else if (!provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider missing access token');
      } else {
        accessToken = this.crypto.decrypt(
          provider.accessToken,
          provider.tokenEncryptionIv,
        );
      }

      // Calculate time range: last 60 days to next 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const sixtyDaysAhead = new Date();
      sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);

      this.logger.debug(
        `Fetching Microsoft Calendar events from ${sixtyDaysAgo.toISOString()} to ${sixtyDaysAhead.toISOString()}`,
      );

      let eventsProcessed = 0;
      let newEvents = 0;
      let updatedEvents = 0;
      let deletedEvents = 0;

      // Get list of calendars
      const calendarsUrl = `${this.GRAPH_API_BASE}/me/calendars`;
      const calendarsResponse = await axios.get<{ value: Array<{ id: string; name: string }> }>(
        calendarsUrl,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const calendars = calendarsResponse.data.value || [];
      this.logger.debug(`Found ${calendars.length} calendars for provider ${providerId}`);

      await this.backfillCalendarNames(providerId, calendars);

      // Sync events from each calendar
      for (const cal of calendars) {
        try {
          const result = await this.syncCalendarEvents(
            accessToken,
            cal.id,
            providerId,
            provider.tenantId,
            sixtyDaysAgo.toISOString(),
            sixtyDaysAhead.toISOString(),
            cal.name,
          );

          eventsProcessed += result.eventsProcessed;
          newEvents += result.newEvents;
          updatedEvents += result.updatedEvents;
          deletedEvents += result.deletedEvents;
        } catch (calError) {
          this.logger.warn(
            `Failed to sync calendar ${cal.id}: ${calError instanceof Error ? calError.message : String(calError)}`,
          );
        }
      }

      const syncDuration = Date.now() - startTime;

      this.logger.log(
        `Microsoft Calendar sync completed for provider ${providerId}: ${eventsProcessed} events processed, ${newEvents} new, ${updatedEvents} updated, ${deletedEvents} deleted in ${syncDuration}ms`,
      );

      if (newEvents > 0 || updatedEvents > 0 || deletedEvents > 0) {
        // WebSocket events
        this.realtimeEvents.emitSyncStatus(provider.tenantId, {
          providerId,
          status: 'completed',
        });
      }

      return {
        success: true,
        providerId,
        eventsProcessed,
        newEvents,
        updatedEvents,
        deletedEvents,
        syncDuration,
      };
    } catch (error) {
      this.logger.error(`Microsoft Calendar sync failed for provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Sync events from a specific calendar
   */
  private async syncCalendarEvents(
    accessToken: string,
    calendarId: string,
    providerId: string,
    tenantId: string,
    startDateTime: string,
    endDateTime: string,
    calendarName?: string | null,
  ): Promise<{
    eventsProcessed: number;
    newEvents: number;
    updatedEvents: number;
    deletedEvents: number;
  }> {
    let eventsProcessed = 0;
    let newEvents = 0;
    let updatedEvents = 0;
    const deletedEvents = 0;

    const params = new URLSearchParams({
      startDateTime,
      endDateTime,
      $top: '100',
      $orderby: 'start/dateTime',
    });

    let eventsUrl: string | undefined = `${this.GRAPH_API_BASE}/me/calendars/${calendarId}/calendarView?${params.toString()}`;

    while (eventsUrl) {
      const eventsResponse: AxiosResponse<MicrosoftEventsResponse> = await axios.get(eventsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const events = eventsResponse.data.value || [];

      for (const event of events) {
        try {
          const result = await this.processCalendarEvent(
            event,
            calendarId,
            providerId,
            tenantId,
            calendarName ?? calendarId,
          );

          eventsProcessed++;
          if (result === 'created') {
            newEvents++;
          } else if (result === 'updated') {
            updatedEvents++;
          }
        } catch (eventError) {
          this.logger.warn(
            `Failed to process event ${event.id}: ${eventError instanceof Error ? eventError.message : String(eventError)}`,
          );
        }
      }

      eventsUrl = eventsResponse.data['@odata.nextLink'];
    }

    // TODO: Handle deleted events (compare with database)

    return {
      eventsProcessed,
      newEvents,
      updatedEvents,
      deletedEvents,
    };
  }

  /**
   * Process a single calendar event from Microsoft
   */
  private async processCalendarEvent(
    event: MicrosoftEvent,
    calendarId: string,
    providerId: string,
    tenantId: string,
    calendarName: string,
  ): Promise<'created' | 'updated'> {
    const eventId = event.id;

    // Extract event data
    const title = event.subject || '(No Title)';
    const description = event.body?.content || event.bodyPreview || null;
    const location = event.location?.displayName || null;
    const organizer = event.organizer?.emailAddress?.address || null;
    const attendees = event.attendees || null;

    // Time and recurrence
    const isAllDay = event.isAllDay || false;
    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    const timeZone = event.start.timeZone || event.end.timeZone || 'UTC';
    const recurrence = event.recurrence ? [JSON.stringify(event.recurrence)] : [];
    const recurringEventId = event.seriesMasterId || null;

    // Status
    const status = event.isCancelled ? 'cancelled' : 'confirmed';
    const visibility = this.mapMicrosoftSensitivity(event.sensitivity || 'normal');
    const isCancelled = event.isCancelled || false;

    // Metadata
    const htmlLink = event.webLink || null;
    const iCalUID = event.iCalUId || null;

    // Upsert event
    const existing = await this.prisma.calendarEvent.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: eventId,
        },
      },
    });

    const eventData = {
      tenantId,
      providerId,
      externalId: eventId,
      calendarId,
      calendarName,
      iCalUID,
      title,
      description,
      location,
      organizer,
      attendees: attendees ? (attendees as any) : undefined,
      startTime,
      endTime,
      isAllDay,
      timeZone,
      recurrence,
      recurringEventId,
      status,
      visibility,
      isCancelled,
      isDeleted: isCancelled,
      reminders: undefined, // Microsoft reminders would need separate mapping
      htmlLink,
      metadata: {
        microsoftCalendarId: calendarId,
        lastModifiedDateTime: event.lastModifiedDateTime,
        showAs: event.showAs,
      } as any,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      await this.prisma.calendarEvent.update({
        where: { id: existing.id },
        data: {
          ...eventData,
          syncVersion: existing.syncVersion + 1,
        },
      });
      return 'updated';
    } else {
      await this.prisma.calendarEvent.create({
        data: eventData,
      });
      return 'created';
    }
  }

  /**
   * Map Microsoft sensitivity to Google visibility
   */
  private mapMicrosoftSensitivity(sensitivity: string): string {
    switch (sensitivity.toLowerCase()) {
      case 'private':
        return 'private';
      case 'confidential':
        return 'confidential';
      case 'personal':
        return 'private';
      default:
        return 'default';
    }
  }

  /**
   * Populate calendar names for historical events so the UI displays friendly labels.
   */
  private async backfillCalendarNames(
    providerId: string,
    calendars: Array<{ id: string; name?: string | null }>,
  ): Promise<void> {
    const updates = calendars
      .filter((cal) => !!cal.id)
      .map((cal) =>
        this.prisma.calendarEvent.updateMany({
          where: {
            providerId,
            calendarId: cal.id,
          },
          data: {
            calendarName: cal.name || cal.id,
          },
        }),
      );

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }
}
