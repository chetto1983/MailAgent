import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { EmailsService } from './services/emails.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailsController } from './controllers/emails.controller';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, EmailsService],
  controllers: [EmailsController],
  exports: [EmailService, EmailsService],
})
export class EmailModule {}
