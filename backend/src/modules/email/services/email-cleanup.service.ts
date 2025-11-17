import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';

interface CleanupResult {
  removed: number;
}

@Injectable()
export class EmailCleanupService {
  private readonly logger = new Logger(EmailCleanupService.name);
  private readonly purgeAfterHours = 24;
  private readonly jobsEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly configService: ConfigService,
  ) {
    this.jobsEnabled =
      (this.configService.get<string>('JOBS_ENABLED') || 'true').toLowerCase() !== 'false';
    if (!this.jobsEnabled) {
      this.logger.warn('EmailCleanupService disabled via JOBS_ENABLED=false');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeDeletedEmailsCron() {
    if (!this.jobsEnabled) {
      return;
    }
    await this.purgeSoftDeletedEmails();
  }

  @Cron('0 30 3 * * *')
  async removeDuplicateEmailsCron() {
    if (!this.jobsEnabled) {
      return;
    }
    await this.removeDuplicateEmails();
  }

  async runTenantMaintenance(tenantId: string) {
    const [duplicates, purged] = await Promise.all([
      this.removeDuplicateEmails(tenantId),
      this.purgeSoftDeletedEmails(tenantId, 0),
    ]);

    return {
      duplicatesRemoved: duplicates.removed,
      permanentlyDeleted: purged.removed,
    };
  }

  async purgeSoftDeletedEmails(
    tenantId?: string,
    olderThanHours: number = this.purgeAfterHours,
  ): Promise<CleanupResult> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const staleEmails = await this.prisma.email.findMany({
      where: {
        isDeleted: true,
        ...(tenantId ? { tenantId } : {}),
        updatedAt: { lt: cutoff },
      },
      select: { id: true, tenantId: true },
    });

    for (const email of staleEmails) {
      await this.permanentlyDeleteEmail(email.id, email.tenantId);
    }

    if (staleEmails.length) {
      this.logger.log(
        `Purged ${staleEmails.length} deleted emails${
          tenantId ? ` for tenant ${tenantId}` : ''
        }`,
      );
    }

    return { removed: staleEmails.length };
  }

  async removeDuplicateEmails(tenantId?: string): Promise<CleanupResult> {
    const duplicates = await this.prisma.$queryRaw<
      Array<{ id: string; tenantId: string }>
    >(
      Prisma.sql`
        WITH ranked AS (
          SELECT id, "tenantId",
                 ROW_NUMBER() OVER (
                   PARTITION BY "tenantId", "messageId"
                   ORDER BY "updatedAt" DESC, "id" DESC
                 ) AS rn
          FROM "emails"
          WHERE "messageId" IS NOT NULL
          ${tenantId ? Prisma.sql`AND "tenantId" = ${tenantId}` : Prisma.sql``}
        )
        SELECT id, "tenantId"
        FROM ranked
        WHERE rn > 1
      `,
    );

    for (const duplicate of duplicates) {
      await this.permanentlyDeleteEmail(duplicate.id, duplicate.tenantId);
    }

    if (duplicates.length) {
      this.logger.warn(
        `Removed ${duplicates.length} duplicate emails${
          tenantId ? ` for tenant ${tenantId}` : ''
        }`,
      );
    }

    return { removed: duplicates.length };
  }

  private async permanentlyDeleteEmail(id: string, tenantId: string) {
    await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, id);
    await this.prisma.email.delete({
      where: { id },
    });
  }
}
