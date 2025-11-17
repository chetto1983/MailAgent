import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import {
  AIEventPayload,
  CalendarEventPayload,
  ContactEventPayload,
  EmailEventPayload,
  HITLEventPayload,
  KnownRealtimeEvent,
  RealtimeEventPayloads,
  buildTenantRoom,
} from '../types/realtime.types';

export type {
  AIEventPayload,
  CalendarEventPayload,
  ContactEventPayload,
  EmailEventPayload,
  HITLEventPayload,
} from '../types/realtime.types';

/**
 * Servizio per emettere eventi realtime ai client WebSocket
 *
 * Questo servizio è chiamato dai worker di sincronizzazione, dai controller
 * e dai servizi AI per notificare i client di modifiche in realtime.
 *
 * Tutti gli eventi sono isolati per tenant tramite rooms.
 */
@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);
  private gateway: RealtimeGateway;
  private emailEventBuffer = new Map<
    string,
    { event: KnownRealtimeEvent; tenantId: string; payload: EmailEventPayload }
  >();
  private emailBufferTimer?: NodeJS.Timeout;
  private readonly EMAIL_BUFFER_MS = 200;
  private readonly EMAIL_BUFFER_MAX = 500;

  /**
   * Setter per iniettare il gateway (per evitare circular dependency)
   */
  setGateway(gateway: RealtimeGateway) {
    this.gateway = gateway;
  }

  /**
   * EMAIL EVENTS
   */

  /**
   * Emette evento per nuova email ricevuta
   */
  emitEmailNew(tenantId: string, payload: EmailEventPayload) {
    this.bufferEmailEvent(tenantId, 'email:new', payload);
  }

  /**
   * Emette evento per email aggiornata (es. letta, starred, labels)
   */
  emitEmailUpdate(tenantId: string, payload: EmailEventPayload) {
    this.bufferEmailEvent(tenantId, 'email:update', payload);
  }

  /**
   * Emette evento per email eliminata
   */
  emitEmailDelete(tenantId: string, payload: EmailEventPayload) {
    this.bufferEmailEvent(tenantId, 'email:delete', payload);
  }

  /**
   * Emette evento per aggiornamento contatore non lette
   */
  emitUnreadCountUpdate(
    tenantId: string,
    payload: RealtimeEventPayloads['email:unread_count_update'],
  ) {
    this.emitToTenant(tenantId, 'email:unread_count_update', payload);
  }

  /**
   * Emette evento per aggiornamento conteggio cartelle (totale + non lette)
   */
  emitFolderCountsUpdate(
    tenantId: string,
    payload: RealtimeEventPayloads['email:folder_counts_update'],
  ) {
    this.emitToTenant(tenantId, 'email:folder_counts_update', payload);
  }

  /**
   * Emette evento per aggiornamento thread
   */
  emitThreadUpdate(
    tenantId: string,
    payload: RealtimeEventPayloads['email:thread_update'],
  ) {
    this.emitToTenant(tenantId, 'email:thread_update', payload);
  }

  /**
   * CALENDAR EVENTS
   */

  /**
   * Emette evento per nuovo evento calendario
   */
  emitCalendarEventNew(tenantId: string, payload: CalendarEventPayload) {
    this.emitToTenant(tenantId, 'calendar:event_new', payload);
  }

  /**
   * Emette evento per evento calendario aggiornato
   */
  emitCalendarEventUpdate(tenantId: string, payload: CalendarEventPayload) {
    this.emitToTenant(tenantId, 'calendar:event_update', payload);
  }

  /**
   * Emette evento per evento calendario eliminato
   */
  emitCalendarEventDelete(tenantId: string, payload: CalendarEventPayload) {
    this.emitToTenant(tenantId, 'calendar:event_delete', payload);
  }

  /**
   * CONTACT EVENTS
   */

  /**
   * Emette evento per nuovo contatto
   */
  emitContactNew(tenantId: string, payload: ContactEventPayload) {
    this.emitToTenant(tenantId, 'contact:new', payload);
  }

  /**
   * Emette evento per contatto aggiornato
   */
  emitContactUpdate(tenantId: string, payload: ContactEventPayload) {
    this.emitToTenant(tenantId, 'contact:update', payload);
  }

  /**
   * Emette evento per contatto eliminato
   */
  emitContactDelete(tenantId: string, payload: ContactEventPayload) {
    this.emitToTenant(tenantId, 'contact:delete', payload);
  }

  /**
   * AI EVENTS
   */

  /**
   * Emette evento per classificazione AI completata
   */
  emitAIClassification(tenantId: string, payload: AIEventPayload) {
    this.emitToTenant(tenantId, 'ai:classification_done', payload);
  }

  /**
   * Emette evento per suggerimento task da AI
   */
  emitAITaskSuggest(tenantId: string, payload: AIEventPayload) {
    this.emitToTenant(tenantId, 'ai:task_suggest', payload);
  }

  /**
   * Emette evento per insight AI
   */
  emitAIInsight(tenantId: string, payload: AIEventPayload) {
    this.emitToTenant(tenantId, 'ai:insight', payload);
  }

  /**
   * HITL EVENTS
   */

  /**
   * Emette evento per richiesta approvazione umana
   */
  emitHITLApprovalRequired(tenantId: string, payload: HITLEventPayload) {
    this.emitToTenant(tenantId, 'hitl:approval_required', payload);
  }

  /**
   * Emette evento per approvazione concessa
   */
  emitHITLApprovalGranted(tenantId: string, payload: HITLEventPayload) {
    this.emitToTenant(tenantId, 'hitl:approval_granted', payload);
  }

  /**
   * Emette evento per approvazione negata
   */
  emitHITLApprovalDenied(tenantId: string, payload: HITLEventPayload) {
    this.emitToTenant(tenantId, 'hitl:approval_denied', payload);
  }

  /**
   * SYNC STATUS EVENTS
   */

  /**
   * Emette evento per stato sincronizzazione provider
   */
  emitSyncStatus(tenantId: string, payload: RealtimeEventPayloads['sync:status']) {
    this.emitToTenant(tenantId, 'sync:status', payload);
  }

  /**
   * GENERIC EMIT
   */

  /**
   * Emette un evento generico alla room del tenant
   */
  private emitToTenant<E extends KnownRealtimeEvent>(
    tenantId: string,
    event: E,
    payload: RealtimeEventPayloads[E],
  ) {
    if (!this.gateway || !this.gateway.server) {
      this.logger.warn(`Gateway not initialized, cannot emit event: ${event}`);
      return;
    }

    const room = buildTenantRoom(tenantId);
    this.emitToRoom(room, event, payload);
  }

  private emitToTenantImmediate<E extends KnownRealtimeEvent>(
    tenantId: string,
    event: E,
    payload: RealtimeEventPayloads[E],
  ) {
    this.emitInternal(buildTenantRoom(tenantId), event, payload);
  }

  /**
   * Emette evento a una room specifica (es. thread-based)
   */
  emitToRoom<E extends KnownRealtimeEvent>(room: string, event: E, payload: RealtimeEventPayloads[E]) {
    this.emitInternal(room, event, payload);
  }

  /**
   * Emette evento a tutti i client connessi (usare con cautela)
   */
  emitToAll<E extends KnownRealtimeEvent>(event: E, payload: RealtimeEventPayloads[E]) {
    this.emitInternal('all', event, payload, true);
  }

  /**
   * Bufferizza eventi email per ridurre spam su bulk (sync/import/move).
   */
  private bufferEmailEvent(tenantId: string, event: KnownRealtimeEvent, payload: EmailEventPayload) {
    const dedupeKey = `${tenantId}:${event}:${payload.externalId ?? payload.emailId ?? ''}`;
    this.emailEventBuffer.set(dedupeKey, { event, tenantId, payload });

    if (this.emailEventBuffer.size >= this.EMAIL_BUFFER_MAX) {
      void this.flushEmailEvents();
      return;
    }

    if (!this.emailBufferTimer) {
      this.emailBufferTimer = setTimeout(() => {
        this.flushEmailEvents().catch((err) =>
          this.logger.warn(
            `Failed flushing email events buffer: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }, this.EMAIL_BUFFER_MS);
    }
  }

  private async flushEmailEvents() {
    if (this.emailBufferTimer) {
      clearTimeout(this.emailBufferTimer);
      this.emailBufferTimer = undefined;
    }

    if (!this.emailEventBuffer.size) {
      return;
    }

    const events = Array.from(this.emailEventBuffer.values());
    this.emailEventBuffer.clear();

    for (const item of events) {
      this.emitToTenantImmediate(item.tenantId, item.event, item.payload as any);
    }

    this.logger.debug(`Flushed ${events.length} buffered email event(s)`);
  }

  private emitInternal<E extends KnownRealtimeEvent>(
    room: string,
    event: E,
    payload: RealtimeEventPayloads[E],
    toAll = false,
  ) {
    if (!this.gateway || !this.gateway.server) {
      this.logger.warn(`Gateway not initialized, cannot emit event: ${event}`);
      return;
    }

    const enriched = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    if (toAll) {
      this.gateway.server.emit(event, enriched);
      this.logger.debug(`Emitted ${event} to all clients`, payload);
    } else {
      this.gateway.server.to(room).emit(event, enriched);
      this.logger.debug(`Emitted ${event} to room ${room}`, payload);
    }
  }
}
