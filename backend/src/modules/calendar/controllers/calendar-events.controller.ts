import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CalendarEventsService } from '../services/calendar-events.service';
import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly calendarEvents: CalendarEventsService) {}

  @Sse('stream')
  stream(@Req() req: Request): Observable<MessageEvent> {
    const tenantId = (req as any).user?.tenantId;
    return this.calendarEvents.streamForTenant(tenantId);
  }
}
