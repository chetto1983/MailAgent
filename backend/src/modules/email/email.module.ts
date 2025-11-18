import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailsService } from './services/emails.service';
import { EmailFetchService } from './services/email-fetch.service';
import { EmailRetentionService } from './services/email-retention.service';
import { EmailSendService } from './services/email-send.service';
import { EmailSyncBackService } from './services/email-sync-back.service';
import { EmailCleanupService } from './services/email-cleanup.service';
import { AttachmentStorageService } from './services/attachment.storage';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { AiModule } from '../ai/ai.module';
import { EmailsController } from './controllers/emails.controller';
import { FoldersController } from './controllers/folders.controller';
import { EmailSyncModule } from '../email-sync/email-sync.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    PrismaModule,
    ProvidersModule,
    AiModule,
    forwardRef(() => EmailSyncModule),
    RealtimeModule,
  ],
  providers: [
    EmailService,
    EmailsService,
    EmailRetentionService,
    EmailFetchService,
    EmailSendService,
    EmailSyncBackService,
    EmailCleanupService,
    AttachmentStorageService,
    StorageService,
  ],
  controllers: [EmailsController, FoldersController],
  exports: [
    EmailService,
    EmailsService,
    EmailRetentionService,
    EmailFetchService,
    EmailSendService,
    EmailSyncBackService,
    EmailCleanupService,
  ],
})
export class EmailModule {}
