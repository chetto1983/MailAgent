import { Module, forwardRef } from '@nestjs/common';
import { ContactsController } from './controllers/contacts.controller';
import { ContactsWebhookController } from './controllers/contacts-webhook.controller';
import { ContactEventsController } from './controllers/contact-events.controller';
import { ContactsService } from './services/contacts.service';
import { GoogleContactsSyncService } from './services/google-contacts-sync.service';
import { MicrosoftContactsSyncService } from './services/microsoft-contacts-sync.service';
import { GoogleContactsWebhookService } from './services/google-contacts-webhook.service';
import { MicrosoftContactsWebhookService } from './services/microsoft-contacts-webhook.service';
import { ContactEventsService } from './services/contact-events.service';
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
    ContactsController,
    ContactsWebhookController,
    ContactEventsController, // SSE stream endpoint
  ],
  providers: [
    ContactsService,
    GoogleContactsSyncService,
    MicrosoftContactsSyncService,
    GoogleContactsWebhookService,
    MicrosoftContactsWebhookService,
    ContactEventsService, // SSE service
  ],
  exports: [
    ContactsService,
    GoogleContactsSyncService,
    MicrosoftContactsSyncService,
    GoogleContactsWebhookService,
    MicrosoftContactsWebhookService,
    ContactEventsService,
  ],
})
export class ContactsModule {}
