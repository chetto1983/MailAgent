import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type ContactRealtimeReason =
  | 'contact-created'
  | 'contact-updated'
  | 'contact-deleted'
  | 'sync-complete';

interface InternalContactEvent {
  tenantId: string;
  type: 'contactUpdate' | 'heartbeat';
  data: Record<string, unknown>;
}

export interface ContactMutationEventPayload {
  reason: ContactRealtimeReason;
  providerId: string;
  contactId?: string;
  externalId?: string;
  timestamp?: string;
}

/**
 * Service per emettere eventi SSE relativi ai contatti
 *
 * Questo servizio permette ai client di sottoscriversi a un stream Server-Sent Events
 * per ricevere notifiche in realtime quando i contatti vengono creati, aggiornati o eliminati.
 *
 * Pattern:
 * - SSE stream per ogni tenant (isolamento)
 * - Heartbeat ogni 25 secondi per mantenere la connessione attiva
 * - Eventi tipizzati per contact mutations
 */
@Injectable()
export class ContactEventsService {
  private readonly logger = new Logger(ContactEventsService.name);
  private readonly events$ = new Subject<InternalContactEvent>();

  /**
   * Crea uno stream SSE filtrato per un tenant specifico
   * Include heartbeat automatico ogni 25 secondi
   */
  streamForTenant(tenantId: string): Observable<MessageEvent> {
    const heartbeatInterval = 25000; // 25 secondi

    // Stream di heartbeat
    const heartbeat$ = new Observable<InternalContactEvent>((observer) => {
      const interval = setInterval(() => {
        observer.next({
          tenantId,
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
        });
      }, heartbeatInterval);

      return () => clearInterval(interval);
    });

    // Combina eventi reali con heartbeat, filtra per tenant
    const combinedStream$ = new Observable<InternalContactEvent>((observer) => {
      const eventsSub = this.events$.subscribe((event) => {
        if (event.tenantId === tenantId) {
          observer.next(event);
        }
      });

      const heartbeatSub = heartbeat$.subscribe((event) => observer.next(event));

      return () => {
        eventsSub.unsubscribe();
        heartbeatSub.unsubscribe();
      };
    });

    // Converte in formato MessageEvent per SSE
    return combinedStream$.pipe(
      map((event) => {
        const messageEvent = {
          data: JSON.stringify({
            type: event.type,
            ...event.data,
          }),
        } as MessageEvent;
        return messageEvent;
      }),
    );
  }

  /**
   * Emette un evento di modifica contatto (create, update, delete)
   */
  emitContactMutation(tenantId: string, payload: ContactMutationEventPayload): void {
    this.logger.debug(
      `Emitting contact mutation event for tenant ${tenantId}: ${payload.reason}`,
    );

    this.events$.next({
      tenantId,
      type: 'contactUpdate',
      data: {
        reason: payload.reason,
        providerId: payload.providerId,
        contactId: payload.contactId,
        externalId: payload.externalId,
        timestamp: payload.timestamp || new Date().toISOString(),
      },
    });
  }
}
