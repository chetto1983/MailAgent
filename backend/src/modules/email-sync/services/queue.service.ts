import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, QueueEvents, JobType } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { SyncJobData, SyncStatus } from '../interfaces/sync-job.interface';

type QueuePriority = 'high' | 'normal' | 'low';

export interface QueueMetricsSummary {
  queue: QueuePriority;
  completed: number;
  failed: number;
  lastError?: string;
  lastCompletedAt?: string;
  lastFailedAt?: string;
  averageDurationMs: number;
  lastDurationMs?: number;
}

interface InternalQueueMetrics {
  completed: number;
  failed: number;
  processed: number;
  totalDurationMs: number;
  lastDurationMs?: number;
  lastCompletedAt?: string;
  lastFailedAt?: string;
  lastError?: string;
  lastJobId?: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redisConnection: Redis;

  public highQueue: Queue<SyncJobData>;
  public normalQueue: Queue<SyncJobData>;
  public lowQueue: Queue<SyncJobData>;

  private queueEvents: QueueEvents[] = [];
  private readonly metrics: Record<QueuePriority, InternalQueueMetrics> = {
    high: {
      completed: 0,
      failed: 0,
      processed: 0,
      totalDurationMs: 0,
    },
    normal: {
      completed: 0,
      failed: 0,
      processed: 0,
      totalDurationMs: 0,
    },
    low: {
      completed: 0,
      failed: 0,
      processed: 0,
      totalDurationMs: 0,
    },
  };
  private workerToken?: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Initialize Redis connection
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    this.workerToken = this.configService.get<string>('EMAIL_SYNC_WORKER_TOKEN');

    this.redisConnection = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

    // Initialize HIGH priority queue
    this.highQueue = new Queue<SyncJobData>('email-sync-high', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: this.getAttempts('HIGH'),
        backoff: this.getBackoff('HIGH'),
        removeOnComplete: this.getRemoveOnComplete('HIGH'),
        removeOnFail: this.getRemoveOnFail('HIGH'),
      },
    });

    // Initialize NORMAL priority queue
    this.normalQueue = new Queue<SyncJobData>('email-sync-normal', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: this.getAttempts('NORMAL'),
        backoff: this.getBackoff('NORMAL'),
        removeOnComplete: this.getRemoveOnComplete('NORMAL'),
      },
    });

    // Initialize LOW priority queue
    this.lowQueue = new Queue<SyncJobData>('email-sync-low', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: this.getAttempts('LOW'),
        backoff: this.getBackoff('LOW'),
        removeOnComplete: this.getRemoveOnComplete('LOW'),
      },
    });

    // Setup queue events for monitoring
    this.setupQueueEvents();

    this.logger.log('Email sync queues initialized successfully');
  }

  private setupQueueEvents() {
    const queues = [
      { name: 'high', queue: this.highQueue },
      { name: 'normal', queue: this.normalQueue },
      { name: 'low', queue: this.lowQueue },
    ];

    for (const { name, queue } of queues) {
      const queueEvents = new QueueEvents(queue.name, {
        connection: this.redisConnection,
      });

      queueEvents.on('completed', ({ jobId }) => {
        this.logger.debug(`[${name}] Job ${jobId} completed`);
        this.recordCompletion(name as QueuePriority, queue, jobId).catch((error) => {
          this.logger.debug(
            `[${name}] Failed to record metrics for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`[${name}] Job ${jobId} failed: ${failedReason}`);
        this.recordFailure(name as QueuePriority, failedReason, jobId);
      });

      this.queueEvents.push(queueEvents);
    }
  }

  async addSyncJob(data: SyncJobData): Promise<void> {
    const queue = this.getQueueByPriority(data.priority);
    const jobData = this.withJobToken(data);

    // Dedup job per provider + syncType to avoid bursts
    const jobId = `${data.providerId}-${data.syncType || 'delta'}`;
    const existing = await queue.getJob(jobId);
    if (existing) {
      this.logger.verbose(`Job ${jobId} already queued, skipping duplicate`);
      return;
    }

    // Soft guard: skip if any job for provider is in waiting/active/delayed
    if (await this.hasPendingJob(data.providerId, data.tenantId)) {
      this.logger.verbose(`Provider ${data.providerId} already has a pending job; skipping new enqueue`);
      return;
    }

    await queue.add(
      `sync-${jobData.providerType}-${jobData.email}`,
      jobData,
      {
        jobId,
        delay: 0, // Immediate execution
      },
    );

    this.logger.log(`Added ${data.priority} priority sync job for ${data.email} (${data.providerType}) [jobId=${jobId}]`);
  }

  async addBulkSyncJobs(jobs: SyncJobData[]): Promise<void> {
    // Group jobs by priority
    const jobsByPriority: { [key: string]: SyncJobData[] } = {
      high: [],
      normal: [],
      low: [],
    };

    for (const job of jobs) {
      jobsByPriority[job.priority].push(job);
    }

    // Add jobs to respective queues
    for (const [priority, priorityJobs] of Object.entries(jobsByPriority)) {
      if (priorityJobs.length === 0) continue;

      const queue = this.getQueueByPriority(priority as any);

      // Filter out jobs that already have pending work for the same provider
      const filteredJobs: SyncJobData[] = [];
      for (const job of priorityJobs) {
        if (await this.hasPendingJob(job.providerId, job.tenantId)) {
          this.logger.verbose(`Provider ${job.providerId} already has pending job; skipping bulk enqueue`);
          continue;
        }
        filteredJobs.push(this.withJobToken(job));
      }

      if (filteredJobs.length === 0) {
        continue;
      }

      const bullJobs = filteredJobs.map((job, index) => ({
        name: `sync-${job.providerType}-${job.email}`,
        data: job,
        opts: {
          jobId: `${job.providerId}-${job.syncType || 'delta'}`,
          delay: index * 100, // Stagger jobs by 100ms
        },
      }));

      await queue.addBulk(bullJobs);

      this.logger.log(`Added ${bullJobs.length} ${priority} priority jobs (filtered from ${priorityJobs.length})`);
    }
  }

  async getQueueStatus(): Promise<SyncStatus[]> {
    const queues = [
      { name: 'high', queue: this.highQueue },
      { name: 'normal', queue: this.normalQueue },
      { name: 'low', queue: this.lowQueue },
    ];

    const statuses: SyncStatus[] = [];

    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts();

      statuses.push({
        queueName: `email-sync-${name}`,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      });
    }

    return statuses;
  }

  async pauseQueue(priority: 'high' | 'normal' | 'low'): Promise<void> {
    const queue = this.getQueueByPriority(priority);
    await queue.pause();
    this.logger.log(`Paused ${priority} priority queue`);
  }

  async resumeQueue(priority: 'high' | 'normal' | 'low'): Promise<void> {
    const queue = this.getQueueByPriority(priority);
    await queue.resume();
    this.logger.log(`Resumed ${priority} priority queue`);
  }

  async obliterateQueue(priority: 'high' | 'normal' | 'low'): Promise<void> {
    const queue = this.getQueueByPriority(priority);
    await queue.obliterate({ force: true });
    this.logger.warn(`Obliterated ${priority} priority queue - all jobs deleted`);
  }

  async removeJobsForTenant(tenantId: string): Promise<number> {
    const queues = [
      { name: 'high', queue: this.highQueue },
      { name: 'normal', queue: this.normalQueue },
      { name: 'low', queue: this.lowQueue },
    ];

    const removableStates: JobType[] = ['waiting', 'delayed', 'paused', 'waiting-children'];
    let removed = 0;

    for (const { name, queue } of queues) {
      const jobs = await queue.getJobs(removableStates, 0, -1);
      let removedFromQueue = 0;

      for (const job of jobs) {
        if (job?.data?.tenantId === tenantId) {
          await job.remove();
          removed += 1;
          removedFromQueue += 1;
        }
      }

      if (removedFromQueue > 0) {
        this.logger.verbose(
          `Removed pending ${name} priority sync jobs for tenant ${tenantId}.`,
        );
      }
    }

    return removed;
  }

  async removeJobsForProvider(providerId: string): Promise<number> {
    const queues = [
      { name: 'high', queue: this.highQueue },
      { name: 'normal', queue: this.normalQueue },
      { name: 'low', queue: this.lowQueue },
    ];

    const removableStates: JobType[] = ['waiting', 'delayed', 'paused', 'waiting-children'];
    let removed = 0;

    for (const { name, queue } of queues) {
      const jobs = await queue.getJobs(removableStates, 0, -1);
      let removedFromQueue = 0;

      for (const job of jobs) {
        if (job?.data?.providerId === providerId) {
          await job.remove();
          removed += 1;
          removedFromQueue += 1;
        }
      }

      if (removedFromQueue > 0) {
        this.logger.verbose(
          `Removed pending ${name} priority sync jobs for provider ${providerId}.`,
        );
      }
    }

    return removed;
  }

  private withJobToken(job: SyncJobData): SyncJobData {
    if (!this.workerToken) {
      return job;
    }

    return {
      ...job,
      authToken: this.workerToken,
    };
  }

  private getQueueByPriority(priority: 'high' | 'normal' | 'low'): Queue<SyncJobData> {
    switch (priority) {
      case 'high':
        return this.highQueue;
      case 'normal':
        return this.normalQueue;
      case 'low':
        return this.lowQueue;
      default:
        return this.normalQueue;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing queue connections...');

    // Close queue events
    for (const queueEvent of this.queueEvents) {
      await queueEvent.close();
    }

    // Close queues
    await this.highQueue.close();
    await this.normalQueue.close();
    await this.lowQueue.close();

    // Close Redis connection
    await this.redisConnection.quit();

    this.logger.log('All queue connections closed');
  }

  getQueueMetricsSummary(): QueueMetricsSummary[] {
    return (['high', 'normal', 'low'] as QueuePriority[]).map((priority) => {
      const metric = this.metrics[priority];
      const averageDuration =
        metric.processed > 0 ? Math.round(metric.totalDurationMs / metric.processed) : 0;

      return {
        queue: priority,
        completed: metric.completed,
        failed: metric.failed,
        lastError: metric.lastError,
        lastCompletedAt: metric.lastCompletedAt,
        lastFailedAt: metric.lastFailedAt,
        averageDurationMs: averageDuration,
        lastDurationMs: metric.lastDurationMs,
      };
    });
  }

  private async recordCompletion(priority: QueuePriority, queue: Queue<SyncJobData>, jobId?: string) {
    const metric = this.metrics[priority];
    metric.completed += 1;
    metric.lastCompletedAt = new Date().toISOString();
    metric.lastJobId = jobId;

    if (!jobId) {
      return;
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job || job.processedOn == null || job.finishedOn == null) {
        return;
      }

      const duration = job.finishedOn - job.processedOn;
      if (Number.isFinite(duration) && duration >= 0) {
        metric.processed += 1;
        metric.totalDurationMs += duration;
        metric.lastDurationMs = duration;
      }
    } catch (error) {
      this.logger.debug(
        `[${priority}] Unable to fetch job ${jobId} for duration metrics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private recordFailure(priority: QueuePriority, failedReason?: string, _jobId?: string) {
    const metric = this.metrics[priority];
    metric.failed += 1;
    metric.lastFailedAt = new Date().toISOString();
    metric.lastError = failedReason;
    metric.lastJobId = undefined;
  }

  private getAttempts(level: 'HIGH' | 'NORMAL' | 'LOW'): number {
    switch (level) {
      case 'HIGH':
        return this.configService.get<number>('QUEUE_HIGH_ATTEMPTS', 3);
      case 'NORMAL':
        return this.configService.get<number>('QUEUE_NORMAL_ATTEMPTS', 2);
      case 'LOW':
        return this.configService.get<number>('QUEUE_LOW_ATTEMPTS', 1);
      default:
        return 1;
    }
  }

  private getBackoff(level: 'HIGH' | 'NORMAL' | 'LOW'):
    | { type: 'exponential'; delay: number }
    | undefined {
    switch (level) {
      case 'HIGH':
        return {
          type: 'exponential',
          delay: this.configService.get<number>('QUEUE_HIGH_BACKOFF_MS', 5000),
        };
      case 'NORMAL':
        return {
          type: 'exponential',
          delay: this.configService.get<number>('QUEUE_NORMAL_BACKOFF_MS', 10000),
        };
      case 'LOW':
        return undefined;
      default:
        return undefined;
    }
  }

  private getRemoveOnComplete(level: 'HIGH' | 'NORMAL' | 'LOW'): boolean | { count?: number; age?: number } {
    switch (level) {
      case 'HIGH':
        return {
          count: this.configService.get<number>('QUEUE_HIGH_REMOVE_ON_COMPLETE_COUNT', 50),
          age: this.configService.get<number>('QUEUE_HIGH_REMOVE_ON_COMPLETE_AGE', 3600),
        };
      case 'NORMAL':
      case 'LOW':
        return true;
      default:
        return true;
    }
  }

  private getRemoveOnFail(level: 'HIGH' | 'NORMAL' | 'LOW'): boolean | { count?: number } {
    switch (level) {
      case 'HIGH':
        return {
          count: this.configService.get<number>('QUEUE_HIGH_REMOVE_ON_FAIL_COUNT', 100),
        };
      case 'NORMAL':
      case 'LOW':
        return true;
      default:
        return true;
    }
  }
  private async hasPendingJob(providerId: string, tenantId?: string): Promise<boolean> {
    const queues = [this.highQueue, this.normalQueue, this.lowQueue];
    const states: JobType[] = ['waiting', 'active', 'delayed', 'paused', 'waiting-children'];

    // Soft guard: skip if any job for provider is in waiting/active/delayed
    for (const queue of queues) {
      const jobs = await queue.getJobs(states, 0, -1);
      if (
        jobs.some(
          (job) =>
            job?.data?.providerId === providerId &&
            (!tenantId || job?.data?.tenantId === tenantId),
        )
      ) {
        return true;
      }
    }

    // Hard guard: check in Redis keys for any job referencing providerId
    const keyPattern = `bull:*:jobs:*`;
    const keys = await this.redisConnection.keys(keyPattern);
    return keys.some(
      (k) => k.includes(providerId) && (!tenantId || k.includes(tenantId)),
    );
  }
}
