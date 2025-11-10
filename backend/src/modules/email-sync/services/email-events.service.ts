import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type EmailRealtimeReason =
  | 'message-processed'
  | 'message-deleted'
  | 'labels-updated'
  | 'sync-complete';

interface InternalEmailEvent {
  tenantId: string;
  type: 'emailUpdate' | 'heartbeat';
  data: Record<string, unknown>;
}

export interface EmailMutationEventPayload {
  reason: EmailRealtimeReason;
  providerId: string;
  emailId?: string;
  externalId?: string;
  folder?: string;
  timestamp?: string;
}

@Injectable()
export class EmailEventsService {
  private readonly logger = new Logger(EmailEventsService.name);
  private readonly events$ = new Subject<InternalEmailEvent>();

  streamForTenant(tenantId: string): Observable<MessageEvent> {
    const updates$ = this.events$.pipe(
      filter((event) => event.tenantId === tenantId),
      map((event): MessageEvent => ({
        data: event.data,
        type: event.type,
      })),
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

  emitMailboxMutation(tenantId: string, payload: EmailMutationEventPayload): void {
    const event: InternalEmailEvent = {
      tenantId,
      type: 'emailUpdate',
      data: {
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      },
    };

    this.events$.next(event);
  }
}
