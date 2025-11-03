import { Job, Queue, Worker } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBaseService } from './knowledge-base.service';

export interface EmailEmbeddingJob {
  tenantId: string;
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

  constructor(
    private readonly config: ConfigService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<number>('REDIS_PORT', 6379)),
      password: this.config.get<string>('REDIS_PASSWORD'),
    };

    this.queue = new Queue<EmailEmbeddingJob>('email-embedding', { connection });
    this.worker = new Worker<EmailEmbeddingJob, boolean>(
      'email-embedding',
      async (job: Job<EmailEmbeddingJob>) => {
        this.logger.debug(`Processing email embedding job ${job.id}`);
        return this.knowledgeBaseService.createEmbeddingForEmail(job.data);
      },
      {
        connection,
        concurrency: 2,
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
  }

  async enqueue(job: EmailEmbeddingJob) {
    await this.queue.add('create', job, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
