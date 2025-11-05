import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailSyncModule } from '../email-sync/email-sync.module';

@Module({
  imports: [PrismaModule, EmailSyncModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
