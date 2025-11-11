import { Injectable, Logger } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { CalendarEventsService } from './calendar-events.service';

export interface GoogleCalendarSyncResult {
  success: boolean;
  providerId: string;
  eventsProcessed: number;
  newEvents: number;
  updatedEvents: number;
  deletedEvents: number;
  syncDuration: number;
}

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly calendarEvents: CalendarEventsService,
  ) {}

  /**
   * Sync calendar events from Google Calendar
   * Syncs events from last 60 days to next 60 days (120 days total)
   */
  async syncCalendar(providerId: string): Promise<GoogleCalendarSyncResult> {
    const startTime = Date.now();
    this.logger.log(`Starting Google Calendar sync for provider ${providerId}`);

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

        const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

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
      } else if (!provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider missing access token');
      } else {
        accessToken = this.crypto.decrypt(
          provider.accessToken,
          provider.tokenEncryptionIv,
        );
      }

      // Create Google Calendar client
      const calendar = this.createCalendarClient(accessToken);

      // Calculate time range: last 60 days to next 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const sixtyDaysAhead = new Date();
      sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);

      this.logger.debug(
        `Fetching Google Calendar events from ${sixtyDaysAgo.toISOString()} to ${sixtyDaysAhead.toISOString()}`,
      );

      let eventsProcessed = 0;
      let newEvents = 0;
      let updatedEvents = 0;
      let deletedEvents = 0;

      // Get list of calendars
      const calendarList = await calendar.calendarList.list();
      const calendars = calendarList.data.items || [];

      this.logger.debug(`Found ${calendars.length} calendars for provider ${providerId}`);

      // Sync events from each calendar
      for (const cal of calendars) {
        if (!cal.id) {
          continue;
        }

        try {
          const result = await this.syncCalendarEvents(
            calendar,
            cal.id,
            providerId,
            provider.tenantId,
            sixtyDaysAgo.toISOString(),
            sixtyDaysAhead.toISOString(),
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
        `Google Calendar sync completed for provider ${providerId}: ${eventsProcessed} events processed, ${newEvents} new, ${updatedEvents} updated, ${deletedEvents} deleted in ${syncDuration}ms`,
      );

      if (newEvents > 0 || updatedEvents > 0 || deletedEvents > 0) {
        this.calendarEvents.emitCalendarMutation(provider.tenantId, {
          providerId,
          reason: 'sync-complete',
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
      this.logger.error(`Google Calendar sync failed for provider ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Sync events from a specific calendar
   */
  private async syncCalendarEvents(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    providerId: string,
    tenantId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<{
    eventsProcessed: number;
    newEvents: number;
    updatedEvents: number;
    deletedEvents: number;
  }> {
    let eventsProcessed = 0;
    let newEvents = 0;
    let updatedEvents = 0;
    let deletedEvents = 0;

    let pageToken: string | undefined;

    do {
      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken,
      });

      const events = eventsResponse.data.items || [];

      for (const event of events) {
        if (!event.id) {
          continue;
        }

        try {
          const result = await this.processCalendarEvent(
            event,
            calendarId,
            providerId,
            tenantId,
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

      pageToken = eventsResponse.data.nextPageToken || undefined;
    } while (pageToken);

    // TODO: Handle deleted events (compare with database)

    return {
      eventsProcessed,
      newEvents,
      updatedEvents,
      deletedEvents,
    };
  }

  /**
   * Process a single calendar event from Google
   */
  private async processCalendarEvent(
    event: calendar_v3.Schema$Event,
    calendarId: string,
    providerId: string,
    tenantId: string,
  ): Promise<'created' | 'updated'> {
    const eventId = event.id!;

    // Extract event data
    const title = event.summary || '(No Title)';
    const description = event.description || null;
    const location = event.location || null;
    const organizer = event.organizer?.email || null;
    const attendees = event.attendees || null;

    // Handle all-day events vs timed events
    const isAllDay = !!(event.start?.date && !event.start?.dateTime);
    const startTime = isAllDay
      ? new Date(event.start!.date!)
      : new Date(event.start!.dateTime!);
    const endTime = isAllDay
      ? new Date(event.end!.date!)
      : new Date(event.end!.dateTime!);
    const timeZone = event.start?.timeZone || event.end?.timeZone || 'UTC';

    // Recurrence
    const recurrence = event.recurrence || [];
    const recurringEventId = event.recurringEventId || null;

    // Status
    const status = event.status || 'confirmed';
    const visibility = event.visibility || 'default';
    const isCancelled = status === 'cancelled';

    // Reminders
    const reminders = event.reminders || null;

    // Metadata
    const htmlLink = event.htmlLink || null;
    const iCalUID = event.iCalUID || null;

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
      reminders: reminders ? (reminders as any) : undefined,
      htmlLink,
      metadata: {
        googleCalendarId: calendarId,
        etag: event.etag,
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
   * Create Google Calendar client
   */
  private createCalendarClient(accessToken: string): calendar_v3.Calendar {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }
}
