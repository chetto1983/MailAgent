import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderTokenService } from '../../email-sync/services/provider-token.service';
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

interface MicrosoftEventAttachment {
  '@odata.type': string;
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  lastModifiedDateTime?: string;
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
    private readonly providerTokenService: ProviderTokenService,
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
      // Get provider and access token (handles refresh automatically)
      const { provider, accessToken } = await this.providerTokenService.getProviderWithToken(
        providerId,
      );

      if (!provider.supportsCalendar) {
        throw new Error('Provider does not support calendar');
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
    let deletedEvents = 0;
    const currentExternalIds = new Set<string>();

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
          currentExternalIds.add(event.id);

          const result = await this.processCalendarEvent(
            event,
            calendarId,
            providerId,
            tenantId,
            calendarName ?? calendarId,
            accessToken,
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

    // Handle deleted events (compare with database)
    deletedEvents = await this.handleDeletedEvents(
      providerId,
      calendarId,
      currentExternalIds,
      startDateTime,
      endDateTime,
    );

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
    accessToken: string,
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

    // Process attachments (OneDrive/SharePoint files or inline attachments)
    // Note: Microsoft Graph API requires a separate call to get attachments
    try {
      await this.processEventAttachments(dbEventId, eventId, accessToken);
    } catch (attachmentError) {
      this.logger.warn(
        `Failed to process attachments for event ${eventId}: ${attachmentError instanceof Error ? attachmentError.message : String(attachmentError)}`,
      );
    }

    return result;
  }

  /**
   * Process attachments for a Microsoft Calendar event
   * Microsoft Graph API requires a separate call to get event attachments
   */
  private async processEventAttachments(
    dbEventId: string,
    msEventId: string,
    accessToken: string,
  ): Promise<void> {
    try {
      // Fetch attachments from Microsoft Graph API
      const attachmentsUrl = `${this.GRAPH_API_BASE}/me/events/${msEventId}/attachments`;
      const response = await axios.get<{ value: MicrosoftEventAttachment[] }>(attachmentsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const attachments = response.data.value || [];

      // Delete existing attachments for this event
      await this.prisma.calendarEventAttachment.deleteMany({
        where: { eventId: dbEventId },
      });

      // Create new attachment records
      for (const attachment of attachments) {
        try {
          // Determine attachment type and extract metadata
          const isOneDrive = attachment['@odata.type'] === '#microsoft.graph.referenceAttachment';
          const fileUrl = isOneDrive ? (attachment as any).sourceUrl : null;
          const size = attachment.size || 0;

          await this.prisma.calendarEventAttachment.create({
            data: {
              eventId: dbEventId,
              filename: attachment.name || 'Untitled',
              mimeType: attachment.contentType || 'application/octet-stream',
              size,
              storageType: 'reference', // All attachments stored as references for now
              fileUrl,
              fileId: null,
              iconLink: null,
              isGoogleDrive: false,
              isOneDrive,
              storagePath: null,
            },
          });

          this.logger.debug(
            `Created attachment reference for event ${dbEventId}: ${attachment.name} (${isOneDrive ? 'OneDrive' : 'File'})`,
          );
        } catch (attachmentError) {
          this.logger.warn(
            `Failed to create attachment for event ${dbEventId}: ${attachmentError instanceof Error ? attachmentError.message : String(attachmentError)}`,
          );
        }
      }

      if (attachments.length > 0) {
        this.logger.verbose(`Processed ${attachments.length} attachments for event ${dbEventId}`);
      }
    } catch (error) {
      // Don't throw - just log and continue
      // Some events might not have attachment permissions
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.debug(`No attachments endpoint for event ${msEventId} (404)`);
      } else {
        this.logger.warn(
          `Failed to fetch attachments for event ${msEventId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
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
   * Handle deleted events by marking events that were in the database but not in the sync as deleted
   */
  private async handleDeletedEvents(
    providerId: string,
    calendarId: string,
    currentExternalIds: Set<string>,
    startDateTime: string,
    endDateTime: string,
  ): Promise<number> {
    // Find events in the database that are within the sync range and not seen in current sync
    const existingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        providerId,
        calendarId,
        startTime: {
          gte: new Date(startDateTime),
          lte: new Date(endDateTime),
        },
        isDeleted: false, // Only consider events that aren't already marked as deleted
      },
      select: {
        id: true,
        externalId: true,
      },
    });

    // Filter to events not seen in current sync
    const deletedEventIds = existingEvents
      .filter((event) => !currentExternalIds.has(event.externalId))
      .map((event) => event.id);

    if (deletedEventIds.length > 0) {
      // Mark as deleted
      await this.prisma.calendarEvent.updateMany({
        where: {
          id: { in: deletedEventIds },
        },
        data: {
          isDeleted: true,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.debug(
        `Marked ${deletedEventIds.length} events as deleted in calendar ${calendarId}`,
      );
    }

    return deletedEventIds.length;
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
