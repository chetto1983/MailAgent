import { Injectable, Logger } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderTokenService } from '../../email-sync/services/provider-token.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { ConfigService } from '@nestjs/config';

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
  private readonly calendarEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerTokenService: ProviderTokenService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly configService: ConfigService,
  ) {
    this.calendarEnabled =
      (this.configService.get<string>('CALENDAR_SYNC_ENABLED') || 'true').toLowerCase() !== 'false';
    if (!this.calendarEnabled) {
      this.logger.warn('GoogleCalendarSyncService disabled via CALENDAR_SYNC_ENABLED=false');
    }
  }

  /**
   * Sync calendar events from Google Calendar
   * Syncs events from last 60 days to next 60 days (120 days total)
   */
  async syncCalendar(providerId: string): Promise<GoogleCalendarSyncResult> {
    if (!this.calendarEnabled) {
      this.logger.warn(
        `Skipping Google calendar sync for ${providerId} (CALENDAR_SYNC_ENABLED=false)`,
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
    this.logger.log(`Starting Google Calendar sync for provider ${providerId}`);

    try {
      // Get provider and access token (handles refresh automatically)
      const { provider, accessToken } = await this.providerTokenService.getProviderWithToken(
        providerId,
      );

      if (!provider.supportsCalendar) {
        throw new Error('Provider does not support calendar');
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

      await this.backfillCalendarNames(providerId, calendars);

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
            cal.summaryOverride || cal.summary || cal.description || cal.id,
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
    let deletedEvents = 0;

    let pageToken: string | undefined;
    const allGoogleEventIds = new Set<string>();

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

        // Collect event ID for deleted events check
        allGoogleEventIds.add(event.id);

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

      pageToken = eventsResponse.data.nextPageToken || undefined;
    } while (pageToken);

    // Handle deleted events: mark events in DB that are no longer in Google Calendar as deleted
    try {
      const dbEvents = await this.prisma.calendarEvent.findMany({
        where: {
          providerId,
          calendarId,
          isDeleted: false,
        },
        select: {
          id: true,
          externalId: true,
        },
      });

      // Mark events as deleted if they're not in Google's response
      for (const dbEvent of dbEvents) {
        if (!allGoogleEventIds.has(dbEvent.externalId)) {
          await this.prisma.calendarEvent.update({
            where: { id: dbEvent.id },
            data: { isDeleted: true },
          });
          deletedEvents++;
        }
      }
    } catch (deleteError) {
      this.logger.warn(
        `Failed to process deleted events: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
      );
    }

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
    calendarName: string,
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
      reminders: reminders ? (reminders as any) : undefined,
      htmlLink,
      metadata: {
        googleCalendarId: calendarId,
        etag: event.etag,
      } as any,
      lastSyncedAt: new Date(),
    };

    let dbEventId: string;
    let result: 'created' | 'updated';

    if (existing) {
      await this.prisma.calendarEvent.update({
        where: { id: existing.id },
        data: {
          ...eventData,
          syncVersion: existing.syncVersion + 1,
        },
      });
      dbEventId = existing.id;
      result = 'updated';
    } else {
      const created = await this.prisma.calendarEvent.create({
        data: eventData,
      });
      dbEventId = created.id;
      result = 'created';
    }

    // Process attachments (Google Drive files attached to calendar events)
    if (event.attachments && event.attachments.length > 0) {
      await this.processEventAttachments(dbEventId, event.attachments);
    }

    return result;
  }

  /**
   * Process attachments for a calendar event
   * Google Calendar attachments are references to Google Drive files
   */
  private async processEventAttachments(
    eventId: string,
    attachments: calendar_v3.Schema$EventAttachment[],
  ): Promise<void> {
    try {
      // Delete existing attachments for this event
      await this.prisma.calendarEventAttachment.deleteMany({
        where: { eventId },
      });

      // Create new attachment records
      for (const attachment of attachments) {
        if (!attachment.fileUrl) {
          this.logger.warn(`Skipping attachment without fileUrl for event ${eventId}`);
          continue;
        }

        try {
          await this.prisma.calendarEventAttachment.create({
            data: {
              eventId,
              filename: attachment.title || 'Untitled',
              mimeType: attachment.mimeType || 'application/octet-stream',
              size: 0, // Google Calendar API doesn't provide size
              storageType: 'reference', // These are Google Drive references, not stored locally
              fileUrl: attachment.fileUrl,
              fileId: attachment.fileId || null,
              iconLink: attachment.iconLink || null,
              isGoogleDrive: true,
              isOneDrive: false,
            },
          });

          this.logger.debug(
            `Created attachment reference for event ${eventId}: ${attachment.title} (Google Drive)`,
          );
        } catch (attachmentError) {
          this.logger.warn(
            `Failed to create attachment for event ${eventId}: ${attachmentError instanceof Error ? attachmentError.message : String(attachmentError)}`,
          );
        }
      }

      this.logger.verbose(
        `Processed ${attachments.length} attachments for event ${eventId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process attachments for event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
      );
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

  /**
   * Ensure existing events have user-friendly calendar names after schema change.
   * This updates historical rows so the UI stops showing raw calendar IDs.
   */
  private async backfillCalendarNames(
    providerId: string,
    calendars: calendar_v3.Schema$CalendarListEntry[],
  ): Promise<void> {
    const updates = calendars
      .filter((cal): cal is calendar_v3.Schema$CalendarListEntry & { id: string } => !!cal.id)
      .map((cal) =>
        this.prisma.calendarEvent.updateMany({
          where: {
            providerId,
            calendarId: cal.id,
          },
          data: {
            calendarName: cal.summaryOverride || cal.summary || cal.description || cal.id,
          },
        }),
      );

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }
}
