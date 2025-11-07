import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailsService } from './services/emails.service';
import { EmailFetchService } from './services/email-fetch.service';
import { EmailRetentionService } from './services/email-retention.service';
import { EmailSendService } from './services/email-send.service';
import { EmailSyncBackService } from './services/email-sync-back.service';
import { EmailCleanupService } from './services/email-cleanup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { AiModule } from '../ai/ai.module';
import { EmailsController } from './controllers/emails.controller';

@Module({
  imports: [PrismaModule, ProvidersModule, AiModule],
  providers: [
    EmailService,
    EmailsService,
    EmailRetentionService,
    EmailFetchService,
    EmailSendService,
    EmailSyncBackService,
    EmailCleanupService,
  ],
  controllers: [EmailsController],
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
