import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmailRetentionService {
  private readonly logger = new Logger(EmailRetentionService.name);
  private readonly RETENTION_DAYS = 30; // Keep full content for 30 days

  constructor(private prisma: PrismaService) {}

  /**
   * Run retention policy daily at 2 AM
   * Archives emails older than 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runRetentionPolicy() {
    this.logger.log('Starting email retention policy...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      const result = await this.archiveOldEmails(cutoffDate);

      this.logger.log(
        `Retention policy completed. Archived ${result.count} emails older than ${cutoffDate.toISOString()}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to run retention policy:', error);
      throw error;
    }
  }

  /**
   * Archive emails older than the given date
   * Keeps: ID, metadata, subject, from, to, snippet, embeddings
   * Removes: bodyText, bodyHtml, headers (to save space)
   */
  async archiveOldEmails(cutoffDate: Date) {
    this.logger.debug(`Archiving emails older than ${cutoffDate.toISOString()}...`);

    // Find emails that should be archived
    const emailsToArchive = await this.prisma.email.findMany({
      where: {
        receivedAt: {
          lt: cutoffDate,
        },
        isArchived: false,
        isDeleted: false, // Don't archive deleted emails
      },
      select: {
        id: true,
        subject: true,
        receivedAt: true,
      },
    });

    if (emailsToArchive.length === 0) {
      this.logger.debug('No emails to archive');
      return { count: 0, emailIds: [] };
    }

    this.logger.log(`Found ${emailsToArchive.length} emails to archive`);

    // Archive emails by removing body content
    const result = await this.prisma.email.updateMany({
      where: {
        id: {
          in: emailsToArchive.map((e) => e.id),
        },
      },
      data: {
        isArchived: true,
        bodyText: null,
        bodyHtml: null,
        headers: Prisma.JsonNull, // Clear headers to save even more space
      },
    });

    const archivedIds = emailsToArchive.map((e) => e.id);

    this.logger.log(`Successfully archived ${result.count} emails`);

    return {
      count: result.count,
      emailIds: archivedIds,
    };
  }

  /**
   * Manually trigger retention policy (for testing or admin use)
   */
  async runManualRetention(retentionDays: number = this.RETENTION_DAYS) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.archiveOldEmails(cutoffDate);
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats() {
    const [totalEmails, archivedEmails, recentEmails, oldUnarchived] = await Promise.all([
      this.prisma.email.count(),
      this.prisma.email.count({
        where: { isArchived: true },
      }),
      this.prisma.email.count({
        where: {
          receivedAt: {
            gte: new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.email.count({
        where: {
          receivedAt: {
            lt: new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
          isArchived: false,
          isDeleted: false,
        },
      }),
    ]);

    // Calculate space saved (rough estimate)
    const avgBodySize = 10000; // Assume average body is ~10KB
    const spaceSavedMB = Math.round((archivedEmails * avgBodySize) / (1024 * 1024));

    return {
      totalEmails,
      archivedEmails,
      recentEmails,
      oldUnarchived,
      retentionDays: this.RETENTION_DAYS,
      estimatedSpaceSavedMB: spaceSavedMB,
    };
  }
}
