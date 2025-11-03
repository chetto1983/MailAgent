import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';

// Services
import { QueueService } from './services/queue.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { GoogleSyncService } from './services/google-sync.service';
import { MicrosoftSyncService } from './services/microsoft-sync.service';
import { ImapSyncService } from './services/imap-sync.service';

// Workers
import { SyncWorker } from './workers/sync.worker';

// Controller
import { EmailSyncController } from './email-sync.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    ProvidersModule, // For OAuth services and crypto
  ],
  controllers: [EmailSyncController],
  providers: [
    // Queue management
    QueueService,

    // Scheduler
    SyncSchedulerService,

    // Sync services
    GoogleSyncService,
    MicrosoftSyncService,
    ImapSyncService,

    // Workers
    SyncWorker,
  ],
  exports: [
    QueueService,
    SyncSchedulerService,
  ],
})
export class EmailSyncModule {}
