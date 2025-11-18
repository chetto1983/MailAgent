import { Module, forwardRef } from '@nestjs/common';
import { ContactsController } from './controllers/contacts.controller';
import { ContactsWebhookController } from './controllers/contacts-webhook.controller';
import { ContactsService } from './services/contacts.service';
import { GoogleContactsSyncService } from './services/google-contacts-sync.service';
import { MicrosoftContactsSyncService } from './services/microsoft-contacts-sync.service';
import { GoogleContactsWebhookService } from './services/google-contacts-webhook.service';
import { MicrosoftContactsWebhookService } from './services/microsoft-contacts-webhook.service';
import { ContactsProviderFactory } from './contacts-provider.factory';
import { GoogleContactsProvider } from './providers/google-contacts.provider';
import { MicrosoftContactsProvider } from './providers/microsoft-contacts.provider';
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
  ],
  providers: [
    ContactsService,
    GoogleContactsSyncService,
    MicrosoftContactsSyncService,
    GoogleContactsWebhookService,
    MicrosoftContactsWebhookService,
    ContactsProviderFactory,
    GoogleContactsProvider,
    MicrosoftContactsProvider,
  ],
  exports: [
    ContactsService,
    GoogleContactsSyncService,
    MicrosoftContactsSyncService,
    GoogleContactsWebhookService,
    MicrosoftContactsWebhookService,
    ContactsProviderFactory,
  ],
})
export class ContactsModule {}
