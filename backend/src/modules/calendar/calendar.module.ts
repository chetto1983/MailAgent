import { Module, forwardRef } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarWebhookController } from './controllers/calendar-webhook.controller';
import { CalendarEventsController } from './controllers/calendar-events.controller';
import { CalendarService } from './services/calendar.service';
import { GoogleCalendarSyncService } from './services/google-calendar-sync.service';
import { MicrosoftCalendarSyncService } from './services/microsoft-calendar-sync.service';
import { GoogleCalendarWebhookService } from './services/google-calendar-webhook.service';
import { MicrosoftCalendarWebhookService } from './services/microsoft-calendar-webhook.service';
import { CalendarEventsService } from './services/calendar-events.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ProvidersModule),
  ],
  controllers: [
    CalendarController,
    CalendarWebhookController,
    CalendarEventsController,
  ],
  providers: [
    CalendarService,
    GoogleCalendarSyncService,
    MicrosoftCalendarSyncService,
    GoogleCalendarWebhookService,
    MicrosoftCalendarWebhookService,
    CalendarEventsService,
  ],
  exports: [
    CalendarService,
    GoogleCalendarSyncService,
    MicrosoftCalendarSyncService,
    GoogleCalendarWebhookService,
    MicrosoftCalendarWebhookService,
    CalendarEventsService,
  ],
})
export class CalendarModule {}
