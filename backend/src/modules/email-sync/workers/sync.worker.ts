import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../services/queue.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { GoogleSyncService } from '../services/google-sync.service';
import { MicrosoftSyncService } from '../services/microsoft-sync.service';
import { ImapSyncService } from '../services/imap-sync.service';
import { SyncSchedulerService } from '../services/sync-scheduler.service';
import { FolderSyncService } from '../services/folder-sync.service';

@Injectable()
export class SyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncWorker.name);
  private redisConnection: Redis;
  private workers: Worker[] = [];

  // Worker configuration - OPTIMIZED FOR 1000+ TENANTS
  private readonly WORKER_CONFIG = {
    high: {
      concurrency: 17, // 17 jobs simultaneously (was 5)
    },
    normal: {
      concurrency: 10, // 10 jobs simultaneously (was 3)
    },
    low: {
      concurrency: 7, // 7 jobs simultaneously (was 2)
    },
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private queueService: QueueService,
    private googleSync: GoogleSyncService,
    private microsoftSync: MicrosoftSyncService,
    private imapSync: ImapSyncService,
    @Inject(forwardRef(() => SyncSchedulerService))
    private syncScheduler: SyncSchedulerService,
    private folderSyncService: FolderSyncService,
  ) {}

  async onModuleInit() {
    // Initialize Redis connection for workers
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redisConnection = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Start workers for each priority queue
    this.startWorker('high', this.WORKER_CONFIG.high.concurrency);
    this.startWorker('normal', this.WORKER_CONFIG.normal.concurrency);
    this.startWorker('low', this.WORKER_CONFIG.low.concurrency);

    this.logger.log('Email sync workers started successfully');
  }

  private startWorker(priority: 'high' | 'normal' | 'low', concurrency: number) {
    const queueName = `email-sync-${priority}`;

    const worker = new Worker<SyncJobData, SyncJobResult>(
      queueName,
      async (job: Job<SyncJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: this.redisConnection,
        concurrency,
        limiter: {
          max: concurrency * 2, // Max jobs processed
          duration: 60000, // per minute
        },
      },
    );

    worker.on('completed', (job, result) => {
      this.logger.log(
        `[${priority}] Job ${job.id} completed: ${result.messagesProcessed} messages, ${result.newMessages} new`,
      );
    });

    worker.on('failed', (job, error) => {
      this.logger.error(
        `[${priority}] Job ${job?.id} failed for ${job?.data?.email}: ${error.message}`,
      );
    });

    worker.on('error', (error) => {
      this.logger.error(`[${priority}] Worker error: ${error.message}`);
    });

    this.workers.push(worker);
    this.logger.log(`Started ${priority} priority worker with concurrency ${concurrency}`);
  }

  private async processJob(job: Job<SyncJobData>): Promise<SyncJobResult> {
    const { providerId, providerType, email, syncType } = job.data;

    this.logger.log(`Processing ${syncType} sync for ${email} (${providerType})`);

    const startTime = Date.now();
    let result: SyncJobResult;

    try {
      // Route to appropriate sync service based on provider type
      switch (providerType) {
        case 'google':
          result = await this.googleSync.syncProvider(job.data);
          break;

        case 'microsoft':
          result = await this.microsoftSync.syncProvider(job.data);
          break;

        case 'generic':
          result = await this.imapSync.syncProvider(job.data);
          break;

        default:
          throw new Error(`Unknown provider type: ${providerType}`);
      }

      // Update last synced timestamp in database
      const metadataUpdates: Record<string, any> = {
        ...(result.metadata || {}),
      };

      if (result.lastSyncToken && metadataUpdates.lastSyncToken === undefined) {
        metadataUpdates.lastSyncToken = result.lastSyncToken;
      }

      const shouldUpdateMetadata = Object.keys(metadataUpdates).length > 0;
      let mergedMetadata: Record<string, any> | undefined;

      if (shouldUpdateMetadata) {
        const existingMetadata = await this.getProviderMetadata(providerId);
        mergedMetadata = {
          ...existingMetadata,
          ...metadataUpdates,
        };
      }

      await this.prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          lastSyncedAt: new Date(),
          ...(shouldUpdateMetadata ? { metadata: mergedMetadata } : {}),
        },
      });

      // Update activity rate and sync priority (Smart Sync)
      await this.syncScheduler.updateProviderActivity(providerId);

      // Refresh folder counts and emit realtime updates
      await this.folderSyncService.updateAllFolderCounts(providerId);

      result.syncDuration = Date.now() - startTime;
      return result;
    } catch (error) {
      this.logger.error(`Sync failed for ${email}:`, error);

      // Increment error streak (Smart Sync)
      await this.syncScheduler.incrementErrorStreak(providerId);

      // Return error result
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        providerId,
        email,
        messagesProcessed: 0,
        newMessages: 0,
        errors: [errorMessage],
        syncDuration: Date.now() - startTime,
      };
    }
  }

  private async getProviderMetadata(providerId: string): Promise<any> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
      select: { metadata: true },
    });

    return provider?.metadata || {};
  }

  async onModuleDestroy() {
    this.logger.log('Stopping email sync workers...');

    // Stop all workers
    for (const worker of this.workers) {
      await worker.close();
    }

    // Close Redis connection
    await this.redisConnection.quit();

    this.logger.log('All workers stopped successfully');
  }
}
