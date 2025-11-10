import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { AiModule } from '../ai/ai.module';

// Services
import { QueueService } from './services/queue.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';
import { GoogleSyncService } from './services/google-sync.service';
import { MicrosoftSyncService } from './services/microsoft-sync.service';
import { ImapSyncService } from './services/imap-sync.service';
import { EmailEmbeddingCleanupService } from './services/email-embedding-cleanup.service';

// Webhook Services (Strategy 2: Real-time Sync)
import { GmailWebhookService } from './services/gmail-webhook.service';
import { MicrosoftWebhookService } from './services/microsoft-webhook.service';
import { WebhookLifecycleService } from './services/webhook-lifecycle.service';

// Cross-Provider Sync Services
import { CrossProviderDedupService } from './services/cross-provider-dedup.service';
import { CrossProviderConflictService } from './services/cross-provider-conflict.service';
import { CrossProviderSyncService } from './services/cross-provider-sync.service';

// Workers
import { SyncWorker } from './workers/sync.worker';

// Controllers
import { EmailSyncController } from './email-sync.controller';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    forwardRef(() => ProvidersModule), // For OAuth services and crypto
    AiModule,
  ],
  controllers: [
    EmailSyncController,
    WebhookController, // Real-time webhook endpoint
  ],
  providers: [
    // Queue management
    QueueService,

    // Scheduler
    SyncSchedulerService,

    // Sync services
    GoogleSyncService,
    MicrosoftSyncService,
    ImapSyncService,
    EmailEmbeddingCleanupService,

    // Webhook services (Strategy 2: Real-time)
    GmailWebhookService,
    MicrosoftWebhookService,
    WebhookLifecycleService,

    // Cross-Provider Sync services
    CrossProviderDedupService,
    CrossProviderConflictService,
    CrossProviderSyncService,

    // Workers
    SyncWorker,
  ],
  exports: [
    QueueService,
    SyncSchedulerService,
    GmailWebhookService,
    MicrosoftWebhookService,
    WebhookLifecycleService,
    CrossProviderSyncService,
  ],
})
export class EmailSyncModule {}
