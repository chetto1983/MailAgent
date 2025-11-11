import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type CalendarRealtimeReason =
  | 'event-created'
  | 'event-updated'
  | 'event-deleted'
  | 'sync-complete';

interface InternalCalendarEvent {
  tenantId: string;
  type: 'calendarUpdate' | 'heartbeat';
  data: Record<string, unknown>;
}

export interface CalendarMutationEventPayload {
  reason: CalendarRealtimeReason;
  providerId: string;
  eventId?: string;
  externalId?: string;
  calendarId?: string;
  timestamp?: string;
}

@Injectable()
export class CalendarEventsService {
  private readonly logger = new Logger(CalendarEventsService.name);
  private readonly events$ = new Subject<InternalCalendarEvent>();

  streamForTenant(tenantId: string): Observable<MessageEvent> {
    const updates$ = this.events$.pipe(
      filter((event) => event.tenantId === tenantId),
      map(
        (event): MessageEvent => ({
          data: event.data,
          type: event.type,
        }),
      ),
    );

    const heartbeat$ = interval(25000).pipe(
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
        }),
      ),
    );

    return merge(updates$, heartbeat$) as Observable<MessageEvent>;
  }

  emitCalendarMutation(tenantId: string, payload: CalendarMutationEventPayload): void {
    if (!tenantId) {
      this.logger.warn('Attempted to emit calendar mutation without tenantId');
      return;
    }

    const event: InternalCalendarEvent = {
      tenantId,
      type: 'calendarUpdate',
      data: {
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      },
    };

    this.events$.next(event);
  }
}
