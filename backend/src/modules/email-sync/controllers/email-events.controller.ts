import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailEventsService } from '../services/email-events.service';
import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

@Controller('email-events')
@UseGuards(JwtAuthGuard)
export class EmailEventsController {
  constructor(private readonly emailEvents: EmailEventsService) {}

  @Sse('stream')
  stream(@Req() req: Request): Observable<MessageEvent> {
    const tenantId = (req as any).user?.tenantId;
    return this.emailEvents.streamForTenant(tenantId);
  }
}
