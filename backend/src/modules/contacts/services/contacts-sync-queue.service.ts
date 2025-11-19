import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface ContactsSyncJobData {
  tenantId: string;
  providerId: string;
  providerType: 'google' | 'microsoft';
  email: string;
  priority: 'high' | 'normal' | 'low';
  lastSyncedAt?: Date;
}

export interface ContactsSyncJobResult {
  success: boolean;
  providerId: string;
  contactsProcessed: number;
  newContacts: number;
  updatedContacts: number;
  syncDuration: number;
}

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
export class ContactsSyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContactsSyncQueueService.name);
  private redisConnection: Redis;

  public highQueue: Queue<ContactsSyncJobData>;
  public normalQueue: Queue<ContactsSyncJobData>;
  public lowQueue: Queue<ContactsSyncJobData>;

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

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Initialize Redis connection
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

    this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

    // Initialize HIGH priority queue
    this.highQueue = new Queue<ContactsSyncJobData>('contacts-sync-high', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: false, // Keep failed jobs for debugging
      },
    });

    // Initialize NORMAL priority queue
    this.normalQueue = new Queue<ContactsSyncJobData>('contacts-sync-normal', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: false,
      },
    });

    // Initialize LOW priority queue
    this.lowQueue = new Queue<ContactsSyncJobData>('contacts-sync-low', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s, 20s
        },
        removeOnComplete: {
          count: 50,
        },
        removeOnFail: false,
      },
    });

    // Setup queue events for monitoring
    this.setupQueueEvents();

    this.logger.log('Contacts sync queues initialized successfully');
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

      // Track metrics
      queueEvents.on('completed', ({ jobId, returnvalue }) => {
        const priority = name as QueuePriority;
        this.metrics[priority].completed++;
        this.metrics[priority].processed++;
        this.metrics[priority].lastCompletedAt = new Date().toISOString();
        this.metrics[priority].lastJobId = jobId;

        // returnvalue can be string or object depending on job result
        if (returnvalue && typeof returnvalue === 'object') {
          const result = returnvalue as Record<string, any>;
          if ('syncDuration' in result && typeof result.syncDuration === 'number') {
            this.metrics[priority].lastDurationMs = result.syncDuration;
            this.metrics[priority].totalDurationMs += result.syncDuration;
          }
        }
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        const priority = name as QueuePriority;
        this.metrics[priority].failed++;
        this.metrics[priority].lastFailedAt = new Date().toISOString();
        this.metrics[priority].lastError = failedReason;
        this.metrics[priority].lastJobId = jobId;
      });

      this.queueEvents.push(queueEvents);
    }

    this.logger.log('Queue event listeners attached');
  }

  async onModuleDestroy() {
    this.logger.log('Closing contacts sync queue connections...');

    // Close queue events
    for (const queueEvents of this.queueEvents) {
      await queueEvents.close();
    }

    // Close queues
    await this.highQueue.close();
    await this.normalQueue.close();
    await this.lowQueue.close();

    // Close Redis connection
    await this.redisConnection.quit();

    this.logger.log('Contacts sync queue connections closed');
  }

  /**
   * Add a single sync job to the appropriate queue
   */
  async addSyncJob(jobData: ContactsSyncJobData): Promise<void> {
    const queue = this.getQueue(jobData.priority);
    await queue.add(`sync-${jobData.providerId}`, jobData, {
      jobId: `contacts-sync-${jobData.providerId}-${Date.now()}`,
    });

    this.logger.debug(`Added contacts sync job for ${jobData.email} to ${jobData.priority} queue`);
  }

  /**
   * Add multiple sync jobs in bulk
   */
  async addBulkSyncJobs(jobs: ContactsSyncJobData[]): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    // Group jobs by priority
    const highPriorityJobs = jobs.filter((j) => j.priority === 'high');
    const normalPriorityJobs = jobs.filter((j) => j.priority === 'normal');
    const lowPriorityJobs = jobs.filter((j) => j.priority === 'low');

    // Add jobs to respective queues in bulk
    const promises: Promise<any>[] = [];

    if (highPriorityJobs.length > 0) {
      promises.push(
        this.highQueue.addBulk(
          highPriorityJobs.map((job) => ({
            name: `sync-${job.providerId}`,
            data: job,
            opts: {
              jobId: `contacts-sync-${job.providerId}-${Date.now()}`,
            },
          })),
        ),
      );
    }

    if (normalPriorityJobs.length > 0) {
      promises.push(
        this.normalQueue.addBulk(
          normalPriorityJobs.map((job) => ({
            name: `sync-${job.providerId}`,
            data: job,
            opts: {
              jobId: `contacts-sync-${job.providerId}-${Date.now()}`,
            },
          })),
        ),
      );
    }

    if (lowPriorityJobs.length > 0) {
      promises.push(
        this.lowQueue.addBulk(
          lowPriorityJobs.map((job) => ({
            name: `sync-${job.providerId}`,
            data: job,
            opts: {
              jobId: `contacts-sync-${job.providerId}-${Date.now()}`,
            },
          })),
        ),
      );
    }

    await Promise.all(promises);

    this.logger.log(
      `Added ${jobs.length} contacts sync jobs (High: ${highPriorityJobs.length}, Normal: ${normalPriorityJobs.length}, Low: ${lowPriorityJobs.length})`,
    );
  }

  /**
   * Get queue by priority
   */
  private getQueue(priority: QueuePriority): Queue<ContactsSyncJobData> {
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

  /**
   * Get queue status and metrics
   */
  async getQueueStatus() {
    const [highCounts, normalCounts, lowCounts] = await Promise.all([
      this.highQueue.getJobCounts(),
      this.normalQueue.getJobCounts(),
      this.lowQueue.getJobCounts(),
    ]);

    return {
      high: {
        ...highCounts,
        metrics: this.getMetricsSummary('high'),
      },
      normal: {
        ...normalCounts,
        metrics: this.getMetricsSummary('normal'),
      },
      low: {
        ...lowCounts,
        metrics: this.getMetricsSummary('low'),
      },
    };
  }

  /**
   * Get metrics summary for a queue
   */
  getMetricsSummary(queue: QueuePriority): QueueMetricsSummary {
    const metrics = this.metrics[queue];
    return {
      queue,
      completed: metrics.completed,
      failed: metrics.failed,
      lastError: metrics.lastError,
      lastCompletedAt: metrics.lastCompletedAt,
      lastFailedAt: metrics.lastFailedAt,
      averageDurationMs:
        metrics.completed > 0 ? Math.round(metrics.totalDurationMs / metrics.completed) : 0,
      lastDurationMs: metrics.lastDurationMs,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): QueueMetricsSummary[] {
    return [
      this.getMetricsSummary('high'),
      this.getMetricsSummary('normal'),
      this.getMetricsSummary('low'),
    ];
  }
}
