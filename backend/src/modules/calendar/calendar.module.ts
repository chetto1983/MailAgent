import { Module, forwardRef } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarWebhookController } from './controllers/calendar-webhook.controller';
import { CalendarService } from './services/calendar.service';
import { GoogleCalendarSyncService } from './services/google-calendar-sync.service';
import { MicrosoftCalendarSyncService } from './services/microsoft-calendar-sync.service';
import { GoogleCalendarWebhookService } from './services/google-calendar-webhook.service';
import { MicrosoftCalendarWebhookService } from './services/microsoft-calendar-webhook.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ProvidersModule),
    RealtimeModule, // WebSocket events
  ],
  controllers: [
    CalendarController,
    CalendarWebhookController,
  ],
  providers: [
    CalendarService,
    GoogleCalendarSyncService,
    MicrosoftCalendarSyncService,
    GoogleCalendarWebhookService,
    MicrosoftCalendarWebhookService,
  ],
  exports: [
    CalendarService,
    GoogleCalendarSyncService,
    MicrosoftCalendarSyncService,
    GoogleCalendarWebhookService,
    MicrosoftCalendarWebhookService,
  ],
})
export class CalendarModule {}
