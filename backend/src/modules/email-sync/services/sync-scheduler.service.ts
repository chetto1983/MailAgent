import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
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

  // Smart Sync Configuration - Adaptive Polling Intervals
  private readonly SYNC_INTERVALS = {
    HIGH: 3 * 60 * 1000, // 3 minutes (Priority 1)
    MEDIUM_HIGH: 15 * 60 * 1000, // 15 minutes (Priority 2)
    MEDIUM: 30 * 60 * 1000, // 30 minutes (Priority 3)
    LOW: 2 * 60 * 60 * 1000, // 2 hours (Priority 4)
    VERY_LOW: 6 * 60 * 60 * 1000, // 6 hours (Priority 5)
  };

  // Activity thresholds (emails per hour)
  private readonly ACTIVITY_THRESHOLDS = {
    HIGH: 4, // 4+ emails/hour = High activity (Priority 1)
    MEDIUM_HIGH: 2, // 2-4 emails/hour = Medium-High (Priority 2)
    MEDIUM: 0.5, // 0.5-2 emails/hour = Medium (Priority 3)
    LOW: 0.1, // 0.1-0.5 emails/hour = Low (Priority 4)
    // < 0.1 emails/hour = Very Low (Priority 5)
  };

  private readonly schedulerEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    const enabled =
      (this.configService.get<string>('EMAIL_SYNC_SCHEDULER_ENABLED') || 'true').toLowerCase() !==
      'false';
    this.schedulerEnabled = enabled;
    if (!enabled) {
      this.logger.warn('SyncSchedulerService disabled via EMAIL_SYNC_SCHEDULER_ENABLED=false');
    }
  }

  /**
   * Main scheduler - runs every 5 minutes
   * Selects providers to sync and adds them to queues
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleSyncJobs() {
    if (!this.schedulerEnabled) {
      return;
    }

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
   * - nextSyncAt is in the past (or null for never synced)
   * - Order by priority (high first), then nextSyncAt (oldest first)
   * - Limit to batch size
   */
  private async getProvidersToSync() {
    const now = new Date();

    const providers = await this.prisma.providerConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { nextSyncAt: null }, // Never synced
          { nextSyncAt: { lte: now } }, // Due for sync
        ],
      },
      include: {
        tenant: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { syncPriority: 'asc' }, // Priority 1 first (high priority)
        { nextSyncAt: 'asc' }, // Then oldest due first
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
   * Determine job priority based on syncPriority field
   * Smart Sync: Uses pre-calculated priority based on activity rate
   */
  private determinePriority(provider: any): 'high' | 'normal' | 'low' {
    const priority = provider.syncPriority ?? 3; // Default to medium

    // Map syncPriority (1-5) to queue priority (high/normal/low)
    if (priority === 1) {
      return 'high'; // Very active accounts
    } else if (priority === 2 || priority === 3) {
      return 'normal'; // Medium activity
    } else {
      return 'low'; // Low activity or inactive
    }
  }

  /**
   * Calculate sync priority based on activity rate
   * Priority 1 (High) -> 5 (Very Low) based on emails per hour
   */
  private calculateSyncPriority(avgActivityRate: number): number {
    if (avgActivityRate >= this.ACTIVITY_THRESHOLDS.HIGH) {
      return 1; // High activity
    } else if (avgActivityRate >= this.ACTIVITY_THRESHOLDS.MEDIUM_HIGH) {
      return 2; // Medium-High activity
    } else if (avgActivityRate >= this.ACTIVITY_THRESHOLDS.MEDIUM) {
      return 3; // Medium activity
    } else if (avgActivityRate >= this.ACTIVITY_THRESHOLDS.LOW) {
      return 4; // Low activity
    } else {
      return 5; // Very low activity / inactive
    }
  }

  /**
   * Calculate next sync time based on priority
   */
  private calculateNextSyncTime(priority: number): Date {
    const now = Date.now();
    let interval: number;

    switch (priority) {
      case 1:
        interval = this.SYNC_INTERVALS.HIGH; // 3 min
        break;
      case 2:
        interval = this.SYNC_INTERVALS.MEDIUM_HIGH; // 15 min
        break;
      case 3:
        interval = this.SYNC_INTERVALS.MEDIUM; // 30 min
        break;
      case 4:
        interval = this.SYNC_INTERVALS.LOW; // 2 hours
        break;
      case 5:
      default:
        interval = this.SYNC_INTERVALS.VERY_LOW; // 6 hours
        break;
    }

    return new Date(now + interval);
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
   * Update activity rate and sync priority for a provider
   * Called after each successful sync
   */
  async updateProviderActivity(providerId: string): Promise<void> {
    try {
      // Count emails received in last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const emailCount = await this.prisma.email.count({
        where: {
          providerId,
          receivedAt: { gte: last24Hours },
          folder: 'INBOX', // Only count inbox emails for activity
        },
      });

      // Get current provider data
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
        select: { avgActivityRate: true, syncPriority: true },
      });

      // Calculate new activity rate (emails per hour)
      const newActivityRate = emailCount / 24;

      // Use exponential moving average for smoothing (70% new, 30% old)
      const currentRate = provider?.avgActivityRate ?? 0;
      const avgActivityRate = currentRate > 0
        ? newActivityRate * 0.7 + currentRate * 0.3
        : newActivityRate;

      // Calculate new priority based on activity
      const syncPriority = this.calculateSyncPriority(avgActivityRate);

      // Calculate next sync time
      const nextSyncAt = this.calculateNextSyncTime(syncPriority);

      // Update provider
      await this.prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          avgActivityRate,
          syncPriority,
          nextSyncAt,
          emailsReceivedLast24h: emailCount,
          lastActivityCheck: new Date(),
          errorStreak: 0, // Reset error streak on successful sync
        },
      });

      this.logger.debug(
        `Updated activity for ${providerId}: ${avgActivityRate.toFixed(2)} emails/hr, priority ${syncPriority}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error updating provider activity: ${errorMessage}`);
    }
  }

  /**
   * Update error streak for a provider (called on sync failure)
   */
  async incrementErrorStreak(providerId: string): Promise<void> {
    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
        select: { errorStreak: true, syncPriority: true },
      });

      if (!provider) {
        this.logger.warn(`Provider ${providerId} not found while incrementing error streak; skipping update.`);
        return;
      }

    const errorStreak = (provider?.errorStreak ?? 0) + 1;

    // If too many errors, lower priority
    let syncPriority = provider?.syncPriority ?? 3;
      if (errorStreak >= 3 && syncPriority < 5) {
        syncPriority = Math.min(5, syncPriority + 1); // Demote priority
        this.logger.warn(
          `Provider ${providerId} has ${errorStreak} consecutive errors, lowering priority to ${syncPriority}`,
        );
      }

      const nextSyncAt = this.calculateNextSyncTime(syncPriority);

      await this.prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          errorStreak,
          syncPriority,
          nextSyncAt,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error incrementing error streak: ${errorMessage}`);
    }
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

    // Smart Sync statistics
    const priorityDistribution = await this.prisma.providerConfig.groupBy({
      by: ['syncPriority'],
      where: { isActive: true },
      _count: true,
    });

    const providersWithErrors = await this.prisma.providerConfig.count({
      where: {
        isActive: true,
        errorStreak: { gt: 0 },
      },
    });

    const avgActivityRate = await this.prisma.providerConfig.aggregate({
      where: { isActive: true },
      _avg: { avgActivityRate: true },
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
      smartSync: {
        priorityDistribution: priorityDistribution.map((p) => ({
          priority: p.syncPriority ?? 0,
          count: p._count,
          description: this.getPriorityDescription(p.syncPriority ?? 0),
        })),
        avgActivityRate: avgActivityRate._avg.avgActivityRate ?? 0,
        providersWithErrors,
      },
    };
  }

  /**
   * Get human-readable description for priority level
   */
  private getPriorityDescription(priority: number): string {
    switch (priority) {
      case 1:
        return 'High (3 min)';
      case 2:
        return 'Medium-High (15 min)';
      case 3:
        return 'Medium (30 min)';
      case 4:
        return 'Low (2 hours)';
      case 5:
        return 'Very Low (6 hours)';
      default:
        return 'Unknown';
    }
  }
}
