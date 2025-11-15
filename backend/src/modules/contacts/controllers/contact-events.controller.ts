import { Controller, Sse, UseGuards, Req, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContactEventsService } from '../services/contact-events.service';

/**
 * Controller per esporre lo stream SSE degli eventi contatti
 *
 * Endpoint: GET /contact-events/stream
 *
 * Protetto da JWT - il tenantId viene estratto dal token
 * I client ricevono solo eventi relativi al loro tenant
 */
@Controller('contact-events')
export class ContactEventsController {
  private readonly logger = new Logger(ContactEventsController.name);

  constructor(private readonly contactEvents: ContactEventsService) {}

  /**
   * Stream SSE per eventi contatti real-time
   *
   * Il client si connette a questo endpoint e riceve:
   * - Eventi contact-created quando vengono aggiunti nuovi contatti
   * - Eventi contact-updated quando i contatti vengono modificati
   * - Eventi contact-deleted quando i contatti vengono eliminati
   * - Eventi sync-complete quando una sincronizzazione è completata
   * - Heartbeat ogni 25 secondi per mantenere la connessione attiva
   *
   * Esempio client:
   * ```typescript
   * const eventSource = new EventSource('/contact-events/stream', {
   *   headers: { Authorization: `Bearer ${token}` }
   * });
   *
   * eventSource.onmessage = (event) => {
   *   const data = JSON.parse(event.data);
   *   if (data.type === 'contactUpdate') {
   *     console.log('Contact changed:', data);
   *   }
   * };
   * ```
   */
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  streamContactEvents(@Req() req: any): Observable<MessageEvent> {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      this.logger.error('No tenantId found in JWT token');
      throw new Error('Invalid authentication - missing tenantId');
    }

    this.logger.log(`Contact events stream opened for tenant: ${tenantId}`);

    return this.contactEvents.streamForTenant(tenantId);
  }
}
