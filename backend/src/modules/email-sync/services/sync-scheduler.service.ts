import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from './queue.service';
import { SyncJobData } from '../interfaces/sync-job.interface';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private isRunning = false;

  // Configuration - OPTIMIZED FOR 1000+ TENANTS (Plan B)
  private readonly BATCH_SIZE = 200; // Process 200 providers per cycle (was 50)
  private readonly SYNC_INTERVAL_MINUTES = 5; // Sync every 5 minutes
  private readonly INCREMENTAL_THRESHOLD_HOURS = 6; // Use incremental if last sync < 6h ago (was 1h - more aggressive)

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  /**
   * Main scheduler - runs every 5 minutes
   * Selects providers to sync and adds them to queues
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleSyncJobs() {
    if (this.isRunning) {
      this.logger.warn('Previous sync schedule still running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Starting sync scheduler...');

      // Get providers that need syncing
      const providers = await this.getProvidersToSync();

      if (providers.length === 0) {
        this.logger.log('No providers need syncing at this time');
        return;
      }

      // Convert to sync jobs
      const syncJobs = this.createSyncJobs(providers);

      // Add to queues
      await this.queueService.addBulkSyncJobs(syncJobs);

      this.logger.log(`Scheduled ${syncJobs.length} sync jobs`);
    } catch (error) {
      this.logger.error('Error in sync scheduler:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get providers that need syncing
   * Criteria:
   * - Active providers
   * - Not synced in last 5 minutes (or never synced)
   * - Order by last sync time (oldest first)
   * - Limit to batch size
   */
  private async getProvidersToSync() {
    const cutoffTime = new Date(Date.now() - this.SYNC_INTERVAL_MINUTES * 60 * 1000);

    const providers = await this.prisma.providerConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { lastSyncedAt: null }, // Never synced
          { lastSyncedAt: { lt: cutoffTime } }, // Not synced recently
        ],
      },
      include: {
        tenant: {
          select: {
            id: true,
            // Add tenant priority field if you have it
            // tier: true,
          },
        },
      },
      orderBy: [
        { lastSyncedAt: 'asc' }, // Oldest first
      ],
      take: this.BATCH_SIZE,
    });

    return providers;
  }

  /**
   * Convert database providers to sync jobs with priority
   */
  private createSyncJobs(providers: any[]): SyncJobData[] {
    const jobs: SyncJobData[] = [];

    for (const provider of providers) {
      const priority = this.determinePriority(provider);
      const syncType = this.determineSyncType(provider);

      jobs.push({
        tenantId: provider.tenantId,
        providerId: provider.id,
        providerType: provider.providerType,
        email: provider.email,
        priority,
        syncType,
        lastSyncedAt: provider.lastSyncedAt ?? undefined,
      });
    }

    return jobs;
  }

  /**
   * Determine job priority based on tenant tier and sync history
   * OPTIMIZED: More aggressive prioritization for better throughput
   */
  private determinePriority(provider: any): 'high' | 'normal' | 'low' {
    // Check if tenant has premium tier (if you implement this)
    // if (provider.tenant.tier === 'premium') {
    //   return 'high';
    // }

    // If never synced, use high priority for fast onboarding
    if (!provider.lastSyncedAt) {
      return 'high';
    }

    // Check how long since last sync
    const hoursSinceLastSync =
      (Date.now() - provider.lastSyncedAt.getTime()) / (1000 * 60 * 60);

    // OPTIMIZED: More balanced distribution across queues
    if (hoursSinceLastSync > 48) {
      // Not synced in 48 hours - low priority (inactive user)
      return 'low';
    } else if (hoursSinceLastSync > 6) {
      // Not synced in 6 hours - normal priority
      return 'normal';
    } else {
      // Synced recently - high priority (active user)
      return 'high';
    }
  }

  /**
   * Determine if sync should be full or incremental
   */
  private determineSyncType(provider: any): 'full' | 'incremental' {
    if (!provider.lastSyncedAt) {
      return 'full'; // First sync is always full
    }

    const hoursSinceLastSync =
      (Date.now() - provider.lastSyncedAt.getTime()) / (1000 * 60 * 60);

    // If last sync was within threshold, use incremental
    if (hoursSinceLastSync < this.INCREMENTAL_THRESHOLD_HOURS) {
      return 'incremental';
    }

    return 'full';
  }

  /**
   * Manual trigger for syncing a specific provider
   */
  async syncProviderNow(
    providerId: string,
    priority: 'high' | 'normal' | 'low' = 'high',
  ): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    if (!provider.isActive) {
      throw new Error(`Provider ${providerId} is not active`);
    }

    const syncJob: SyncJobData = {
      tenantId: provider.tenantId,
      providerId: provider.id,
      providerType: provider.providerType as any,
      email: provider.email,
      priority,
      syncType: this.determineSyncType(provider),
      lastSyncedAt: provider.lastSyncedAt ?? undefined,
    };

    await this.queueService.addSyncJob(syncJob);

    this.logger.log(`Manually triggered sync for provider ${provider.email}`);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const queueStatus = await this.queueService.getQueueStatus();

    const activeProviders = await this.prisma.providerConfig.count({
      where: { isActive: true },
    });

    const neverSynced = await this.prisma.providerConfig.count({
      where: {
        isActive: true,
        lastSyncedAt: null,
      },
    });

    const syncedToday = await this.prisma.providerConfig.count({
      where: {
        isActive: true,
        lastSyncedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      queues: queueStatus,
      providers: {
        total: activeProviders,
        neverSynced,
        syncedToday,
      },
      scheduler: {
        isRunning: this.isRunning,
        batchSize: this.BATCH_SIZE,
        intervalMinutes: this.SYNC_INTERVAL_MINUTES,
      },
    };
  }
}
