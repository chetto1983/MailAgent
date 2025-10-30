import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { ImapSyncService } from './services/imap-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailConfigController } from './controllers/email-config.controller';
import { CryptoService } from '../../common/services/crypto.service';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, ImapSyncService, CryptoService],
  controllers: [EmailConfigController],
  exports: [EmailService, ImapSyncService],
})
export class EmailModule {}
