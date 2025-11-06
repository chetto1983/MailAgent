import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailsService } from './services/emails.service';
import { EmailRetentionService } from './services/email-retention.service';
import { EmailFetchService } from './services/email-fetch.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { EmailsController } from './controllers/emails.controller';

@Module({
  imports: [PrismaModule, ProvidersModule],
  providers: [
    EmailService,
    EmailsService,
    EmailRetentionService,
    EmailFetchService,
  ],
  controllers: [EmailsController],
  exports: [
    EmailService,
    EmailsService,
    EmailRetentionService,
    EmailFetchService,
  ],
})
export class EmailModule {}
