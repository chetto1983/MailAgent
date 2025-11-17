import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';

interface DeletedEmailRecord {
  id: string;
  tenantId: string;
  metadata: Record<string, any> | null;
}

@Injectable()
export class EmailEmbeddingCleanupService {
  private readonly logger = new Logger(EmailEmbeddingCleanupService.name);
  private readonly BATCH_SIZE = 200;
  private readonly jobsEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly configService: ConfigService,
  ) {
    this.jobsEnabled =
      (this.configService.get<string>('JOBS_ENABLED') || 'true').toLowerCase() !== 'false';
    if (!this.jobsEnabled) {
      this.logger.warn('EmailEmbeddingCleanupService disabled via JOBS_ENABLED=false');
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupDeletedEmailEmbeddings(): Promise<void> {
    if (!this.jobsEnabled) {
      return;
    }

    const emails = await this.prisma.email.findMany({
      where: {
        isDeleted: true,
        NOT: {
          metadata: {
            path: ['embeddingCleanup', 'status'],
            equals: 'done',
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
        metadata: true,
      },
      take: this.BATCH_SIZE,
    });

    if (emails.length === 0) {
      return;
    }

    this.logger.debug(
      `Cleaning embeddings for ${emails.length} deleted email(s).`,
    );

    for (const email of emails) {
      await this.cleanupForEmail(email as DeletedEmailRecord);
    }
  }

  private async cleanupForEmail(email: DeletedEmailRecord): Promise<void> {
    const nowIso = new Date().toISOString();
    const existingMetadata = (email.metadata ?? {});

    try {
      const removed = await this.knowledgeBaseService.deleteEmbeddingsForEmail(
        email.tenantId,
        email.id,
      );

      const updatedMetadata = {
        ...existingMetadata,
        embeddingCleanup: {
          status: 'done',
          removedVectors: removed,
          lastRunAt: nowIso,
        },
      };

      await this.prisma.email.update({
        where: { id: email.id },
        data: {
          metadata: updatedMetadata,
        },
      });

      if (removed > 0) {
        this.logger.verbose(
          `Removed ${removed} embeddings for deleted email ${email.id} (tenant ${email.tenantId}).`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to cleanup embeddings for email ${email.id}: ${message}`,
      );

      const updatedMetadata = {
        ...existingMetadata,
        embeddingCleanup: {
          status: 'error',
          lastRunAt: nowIso,
          error: message,
        },
      };

      try {
        await this.prisma.email.update({
          where: { id: email.id },
          data: {
            metadata: updatedMetadata,
          },
        });
      } catch (metadataError) {
        const metadataMessage =
          metadataError instanceof Error ? metadataError.message : String(metadataError);
        this.logger.warn(
          `Failed to record cleanup error for email ${email.id}: ${metadataMessage}`,
        );
      }
    }
  }
}
