import { Job, Queue, Worker } from 'bullmq';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBaseService } from './knowledge-base.service';

export interface EmailEmbeddingJob {
  tenantId: string;
  providerId?: string;
  emailId: string;
  subject: string;
  snippet?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  from?: string | null;
  receivedAt?: string | Date | null;
}

@Injectable()
export class EmailEmbeddingQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailEmbeddingQueueService.name);
  private queue!: Queue<EmailEmbeddingJob>;
  private worker!: Worker<EmailEmbeddingJob, boolean>;
  private pending: EmailEmbeddingJob[] = [];
  private flushTimer?: NodeJS.Timeout;
  private readonly BULK_SIZE: number;
  private readonly FLUSH_MS: number;
  private readonly seenIds = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => KnowledgeBaseService))
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {
    this.BULK_SIZE = this.config.get<number>('EMBEDDING_BULK_SIZE', 50);
    this.FLUSH_MS = this.config.get<number>('EMBEDDING_FLUSH_MS', 200);
  }

  onModuleInit() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<number>('REDIS_PORT', 6379)),
      password: this.config.get<string>('REDIS_PASSWORD'),
    };

    this.queue = new Queue<EmailEmbeddingJob>('email-embedding', {
      connection,
      defaultJobOptions: {
        attempts: 6,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });

    this.worker = new Worker<EmailEmbeddingJob, boolean>(
      'email-embedding',
      async (job: Job<EmailEmbeddingJob>) => {
        this.logger.debug(`Processing email embedding job ${job.id}`);
        try {
          return await this.knowledgeBaseService.createEmbeddingForEmail(job.data);
        } catch (error) {
          if (this.isRateLimitError(error)) {
            const delayMs = this.computeBackoffDelay(job.attemptsMade);
            this.logger.warn(
              `Rate limit hit for email embedding job ${job.id}. Retry ${job.attemptsMade + 1} in ${delayMs}ms`,
            );
            await job.updateProgress({
              status: 'rate_limited',
              retryInMs: delayMs,
            });
          }
          throw error;
        }
      },
      {
        connection,
        concurrency: 3, // Process up to 3 emails concurrently for better throughput
        limiter: {
          max: 10, // Allow some concurrency with bulk embeddings
          duration: 1000,
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.verbose(`Email embedding job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      const jobId = job?.id ?? 'unknown';
      this.logger.warn(`Email embedding job ${jobId} failed: ${error?.message ?? error}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
  }

  async enqueue(job: EmailEmbeddingJob) {
    await this.enqueueMany([job]);
  }

  async enqueueMany(jobs: EmailEmbeddingJob[]) {
    if (!jobs.length) return;

    for (const job of jobs) {
      if (job.emailId && this.seenIds.has(job.emailId)) {
        continue;
      }
      if (job.emailId) {
        this.seenIds.add(job.emailId);
      }
      this.pending.push(job);
    }

    if (this.pending.length >= this.BULK_SIZE) {
      await this.flushPending();
    } else {
      this.scheduleFlush();
    }
  }

  private async flushPending() {
    if (!this.pending.length || !this.queue) {
      this.flushTimer = undefined;
      return;
    }

    const jobs = this.pending.splice(0, this.pending.length);
    this.flushTimer = undefined;
    this.seenIds.clear();

    const bullJobs = jobs.map((job) => ({
      name: 'create',
      data: job,
      opts: {
        jobId: job.emailId,
        attempts: 6,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }));

    await this.queue.addBulk(bullJobs);
    this.logger.verbose(`Queued ${bullJobs.length} embedding job(s) in bulk`);
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      void this.flushPending().catch((err) =>
        this.logger.warn(
          `Failed to flush embedding jobs: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, this.FLUSH_MS);
  }

  async removeJobsForTenant(tenantId: string): Promise<number> {
    if (!this.queue) {
      return 0;
    }

    const removableStates: Array<'waiting' | 'delayed' | 'paused' | 'waiting-children'> = [
      'waiting',
      'delayed',
      'paused',
      'waiting-children',
    ];

    const jobs = await this.queue.getJobs(removableStates, 0, -1);
    let removed = 0;

    for (const job of jobs) {
      if (job?.data?.tenantId === tenantId) {
        await job.remove();
        removed += 1;
      }
    }

    this.logger.verbose(
      `Removed ${removed} pending email embedding job(s) for tenant ${tenantId}.`,
    );

    return removed;
  }

  async removeJobsForProvider(providerId: string): Promise<number> {
    if (!this.queue) {
      return 0;
    }

    const removableStates: Array<'waiting' | 'delayed' | 'paused' | 'waiting-children'> = [
      'waiting',
      'delayed',
      'paused',
      'waiting-children',
    ];

    const jobs = await this.queue.getJobs(removableStates, 0, -1);
    let removed = 0;

    for (const job of jobs) {
      if (job?.data?.providerId === providerId) {
        await job.remove();
        removed += 1;
      }
    }

    if (removed > 0) {
      this.logger.verbose(
        `Removed ${removed} pending email embedding job(s) for provider ${providerId}.`,
      );
    }

    return removed;
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const possibleStatus =
      (error as any)?.status ??
      (error as any)?.statusCode ??
      (error as any)?.response?.status ??
      (error as any)?.response?.statusCode;

    if (typeof possibleStatus === 'number') {
      return possibleStatus === 429;
    }

    if (error instanceof Error && typeof error.message === 'string') {
      return error.message.includes('429');
    }

    return false;
  }

  private computeBackoffDelay(attemptsMade: number): number {
    const baseDelay = 1000;
    const exponent = Math.max(0, attemptsMade);
    const delay = baseDelay * Math.pow(2, exponent);
    // Cap delay at 30 seconds to avoid runaway waits
    return Math.min(delay, 30000);
  }
}
