import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, QueueEvents, JobType } from 'bullmq';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { SyncJobData, SyncStatus } from '../interfaces/sync-job.interface';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redisConnection: Redis;

  public highQueue: Queue<SyncJobData>;
  public normalQueue: Queue<SyncJobData>;
  public lowQueue: Queue<SyncJobData>;

  private queueEvents: QueueEvents[] = [];

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
    this.highQueue = new Queue<SyncJobData>('email-sync-high', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 50, // Keep last 50 completed jobs
          age: 3600, // Keep for 1 hour
        },
        removeOnFail: {
          count: 100, // Keep last 100 failures
        },
      },
    });

    // Initialize NORMAL priority queue
    this.normalQueue = new Queue<SyncJobData>('email-sync-normal', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: true,
      },
    });

    // Initialize LOW priority queue
    this.lowQueue = new Queue<SyncJobData>('email-sync-low', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
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
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`[${name}] Job ${jobId} failed: ${failedReason}`);
      });

      this.queueEvents.push(queueEvents);
    }
  }

  async addSyncJob(data: SyncJobData): Promise<void> {
    const queue = this.getQueueByPriority(data.priority);

    await queue.add(
      `sync-${data.providerType}-${data.email}`,
      data,
      {
        jobId: `${data.providerId}-${Date.now()}`,
        delay: 0, // Immediate execution
      },
    );

    this.logger.log(`Added ${data.priority} priority sync job for ${data.email} (${data.providerType})`);
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

      const bullJobs = priorityJobs.map((job, index) => ({
        name: `sync-${job.providerType}-${job.email}`,
        data: job,
        opts: {
          jobId: `${job.providerId}-${Date.now()}-${index}`,
          delay: index * 100, // Stagger jobs by 100ms
        },
      }));

      await queue.addBulk(bullJobs);

      this.logger.log(`Added ${priorityJobs.length} ${priority} priority jobs`);
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

      for (const job of jobs) {
        if (job?.data?.tenantId === tenantId) {
          await job.remove();
          removed += 1;
        }
      }

      if (removed > 0) {
        this.logger.verbose(
          `Removed pending ${name} priority sync jobs for tenant ${tenantId}.`,
        );
      }
    }

    return removed;
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
}
