import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../services/queue.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { ImapSyncService } from '../services/imap-sync.service';
import { SyncSchedulerService } from '../services/sync-scheduler.service';
import { FolderSyncService } from '../services/folder-sync.service';
import { SyncAuthService } from '../services/sync-auth.service';
import { ProviderFactory } from '../../providers/factory/provider.factory';
import { ProviderConfig, IEmailProvider } from '../../providers/interfaces/email-provider.interface';

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
    private imapSync: ImapSyncService, // Only IMAP still uses legacy service (fallback)
    @Inject(forwardRef(() => SyncSchedulerService))
    private syncScheduler: SyncSchedulerService,
    private folderSyncService: FolderSyncService,
    private readonly syncAuth: SyncAuthService,
  ) {}

  async onModuleInit() {
    const workersEnabled =
      (this.configService.get<string>('EMAIL_SYNC_WORKERS_ENABLED') || 'true').toLowerCase() !==
      'false';
    if (!workersEnabled) {
      this.logger.warn('Email sync workers are disabled via EMAIL_SYNC_WORKERS_ENABLED=false');
      return;
    }

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
        // Long-running syncs need generous lock to avoid "missing lock" stalls
        lockDuration: this.configService.get<number>('SYNC_WORKER_LOCK_MS', 300000),
        stalledInterval: Math.max(
          1000,
          this.configService.get<number>('SYNC_WORKER_STALLED_INTERVAL_MS', 120000),
        ),
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

    // Optional job token validation to align with webhook handshake pattern
    this.syncAuth.validateJobToken(job.data.authToken);

    this.logger.log(`Processing ${syncType} sync for ${email} (${providerType})`);

    const startTime = Date.now();
    let result: SyncJobResult;

    try {
      // NEW: Try using ProviderFactory pattern first
      // This is the new architecture that eliminates switch-case anti-pattern
      try {
        const provider = await this.createProvider(providerId, providerType);

        // Prepare sync options from job data
        const syncOptions = {
          syncType: syncType === 'full' ? 'full' as const : 'incremental' as const,
          maxMessages: this.configService.get<number>('SYNC_MAX_MESSAGES_PER_JOB', 200),
          // Provider-specific sync tokens will be handled internally
        };

        const providerResult = await provider.syncEmails(syncOptions);

        // Convert provider result to SyncJobResult format
        result = {
          success: providerResult.success,
          providerId,
          email,
          messagesProcessed: providerResult.emailsSynced,
          newMessages: providerResult.newEmails,
          errors: providerResult.errors?.map(e => e.message) || [],
          lastSyncToken: providerResult.nextHistoryId || providerResult.nextDeltaLink,
          metadata: {
            updatedEmails: providerResult.updatedEmails,
            deletedEmails: providerResult.deletedEmails,
          },
          syncDuration: 0, // Will be set at the end
        };

        this.logger.debug(`✅ Used ProviderFactory for ${providerType} sync`);
      } catch (factoryError) {
        // FALLBACK: Only for IMAP provider which is not yet fully implemented
        // Google and Microsoft providers are complete and no longer need fallback
        const errorMessage = factoryError instanceof Error ? factoryError.message : String(factoryError);

        if (errorMessage.includes('NOT_IMPLEMENTED') && providerType === 'generic') {
          this.logger.warn(`⚠️  IMAP provider not implemented, falling back to legacy ImapSyncService`);
          result = await this.imapSync.syncProvider(job.data);
        } else {
          // Re-throw all other errors (including errors from complete providers)
          throw factoryError;
        }
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

  /**
   * Create ProviderConfig from database
   * Helper method to convert database ProviderConfig to IEmailProvider config
   */
  private async createProviderConfigFromDb(providerId: string): Promise<ProviderConfig> {
    const dbProvider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        userId: true,
        providerType: true,
        email: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
      },
    });

    if (!dbProvider) {
      throw new Error(`Provider ${providerId} not found in database`);
    }

    if (!dbProvider.userId) {
      throw new Error(`Provider ${providerId} has no userId`);
    }

    // Decrypt tokens if needed (assuming they're stored encrypted)
    const accessToken = dbProvider.accessToken || '';
    const refreshToken = dbProvider.refreshToken || '';

    return {
      userId: dbProvider.userId,
      providerId: dbProvider.id,
      providerType: dbProvider.providerType as 'google' | 'microsoft' | 'imap',
      email: dbProvider.email,
      accessToken,
      refreshToken,
      expiresAt: dbProvider.tokenExpiresAt || undefined,
    };
  }

  /**
   * Create email provider instance using ProviderFactory
   * This replaces the old switch-case pattern
   */
  private async createProvider(providerId: string, providerType: string): Promise<IEmailProvider> {
    const config = await this.createProviderConfigFromDb(providerId);
    return ProviderFactory.create(providerType, config);
  }

  async onModuleDestroy() {
    const workersEnabled =
      (this.configService.get<string>('EMAIL_SYNC_WORKERS_ENABLED') || 'true').toLowerCase() !==
      'false';
    if (!workersEnabled) {
      return;
    }

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
