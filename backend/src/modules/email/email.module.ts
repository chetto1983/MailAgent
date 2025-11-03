import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { ImapSyncService } from './services/imap-sync.service';
import { EmailsService } from './services/emails.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailConfigController } from './controllers/email-config.controller';
import { EmailsController } from './controllers/emails.controller';
import { CryptoService } from '../../common/services/crypto.service';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, ImapSyncService, EmailsService, CryptoService],
  controllers: [EmailConfigController, EmailsController],
  exports: [EmailService, ImapSyncService, EmailsService],
})
export class EmailModule {}
