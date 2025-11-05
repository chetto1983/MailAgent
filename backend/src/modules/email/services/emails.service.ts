import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface EmailListFilters {
  folder?: string;
  isRead?: boolean;
  isStarred?: boolean;
  search?: string;
  from?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface EmailListParams {
  tenantId: string;
  providerId?: string;
  page?: number;
  limit?: number;
  filters?: EmailListFilters;
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get paginated list of emails with filters
   */
  async listEmails(params: EmailListParams) {
    const {
      tenantId,
      providerId,
      page = 1,
      limit = 50,
      filters = {},
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EmailWhereInput = {
      tenantId,
      ...(providerId && { providerId }),
      ...(filters.folder && { folder: filters.folder }),
      // Only show deleted emails if we're viewing the TRASH folder
      ...(!filters.folder || filters.folder !== 'TRASH' ? { isDeleted: false } : {}),
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      ...(filters.isStarred !== undefined && { isStarred: filters.isStarred }),
      ...(filters.from && { from: { contains: filters.from, mode: 'insensitive' } }),
      ...(filters.search && {
        OR: [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { from: { contains: filters.search, mode: 'insensitive' } },
          { bodyText: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.startDate && { receivedAt: { gte: filters.startDate } }),
      ...(filters.endDate && { receivedAt: { lte: filters.endDate } }),
    };

    // Get total count and emails
    const [total, emails] = await Promise.all([
      this.prisma.email.count({ where }),
      this.prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalId: true,
          threadId: true,
          from: true,
          to: true,
          subject: true,
          snippet: true,
          folder: true,
          labels: true,
          isRead: true,
          isStarred: true,
          sentAt: true,
          receivedAt: true,
          size: true,
          provider: {
            select: {
              id: true,
              email: true,
              providerType: true,
            },
          },
        },
      }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get email by ID
   */
  async getEmailById(id: string, tenantId: string) {
    const email = await this.prisma.email.findFirst({
      where: { id, tenantId },
      include: {
        provider: {
          select: {
            id: true,
            email: true,
            providerType: true,
          },
        },
        attachments: true,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return email;
  }

  /**
   * Update email flags
   */
  async updateEmail(
    id: string,
    tenantId: string,
    data: { isRead?: boolean; isStarred?: boolean; folder?: string },
  ) {
    const email = await this.prisma.email.findFirst({
      where: { id, tenantId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.prisma.email.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete email - Mark as deleted and move to TRASH
   * This will be synced to the server on next sync
   */
  async deleteEmail(id: string, tenantId: string) {
    const email = await this.prisma.email.findFirst({
      where: { id, tenantId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Mark as deleted and move to TRASH folder
    await this.prisma.email.update({
      where: { id },
      data: {
        isDeleted: true,
        folder: 'TRASH',
      },
    });

    this.logger.log(`Email ${id} marked as deleted and moved to TRASH`);
    return { success: true };
  }

  /**
   * Get email statistics
   */
  async getStats(tenantId: string, providerId?: string) {
    const where: Prisma.EmailWhereInput = {
      tenantId,
      ...(providerId && { providerId }),
    };

    const [total, unread, starred, byFolder] = await Promise.all([
      this.prisma.email.count({ where }),
      this.prisma.email.count({ where: { ...where, isRead: false } }),
      this.prisma.email.count({ where: { ...where, isStarred: true } }),
      this.prisma.email.groupBy({
        by: ['folder'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      unread,
      starred,
      byFolder: byFolder.reduce((acc, item) => {
        acc[item.folder] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Mark multiple emails as read/unread
   */
  async bulkUpdateRead(
    emailIds: string[],
    tenantId: string,
    isRead: boolean,
  ) {
    const result = await this.prisma.email.updateMany({
      where: {
        id: { in: emailIds },
        tenantId,
      },
      data: { isRead },
    });

    return { updated: result.count };
  }

  /**
   * Search emails
   */
  async searchEmails(
    tenantId: string,
    query: string,
    providerId?: string,
    limit: number = 20,
  ) {
    const where: Prisma.EmailWhereInput = {
      tenantId,
      ...(providerId && { providerId }),
      OR: [
        { subject: { contains: query, mode: 'insensitive' } },
        { from: { contains: query, mode: 'insensitive' } },
        { bodyText: { contains: query, mode: 'insensitive' } },
      ],
    };

    const emails = await this.prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        from: true,
        subject: true,
        snippet: true,
        receivedAt: true,
        isRead: true,
      },
    });

    return emails;
  }

  /**
   * Get conversations - emails grouped by threadId from all folders
   */
  async getConversations(params: {
    tenantId: string;
    providerId?: string;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, providerId, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    // Get all non-deleted emails, excluding TRASH and SPAM
    const where: Prisma.EmailWhereInput = {
      tenantId,
      ...(providerId && { providerId }),
      isDeleted: false,
      folder: { notIn: ['TRASH', 'SPAM'] },
    };

    // Get emails grouped by thread - find the latest email in each thread
    const emails = await this.prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        externalId: true,
        threadId: true,
        from: true,
        to: true,
        subject: true,
        snippet: true,
        folder: true,
        labels: true,
        isRead: true,
        isStarred: true,
        isFlagged: true,
        receivedAt: true,
        sentAt: true,
      },
    });

    // Group by threadId or messageId (for emails without threadId)
    const threadsMap = new Map<string, any[]>();
    for (const email of emails) {
      const key = email.threadId || email.id;
      if (!threadsMap.has(key)) {
        threadsMap.set(key, []);
      }
      threadsMap.get(key)!.push(email);
    }

    // Convert to array of conversations, sorted by most recent email
    const conversations = Array.from(threadsMap.values())
      .map((thread) => {
        // Sort emails in thread by date
        thread.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

        const latestEmail = thread[0];
        const hasUnread = thread.some((e) => !e.isRead);

        return {
          threadId: latestEmail.threadId || latestEmail.id,
          subject: latestEmail.subject,
          from: latestEmail.from,
          to: latestEmail.to,
          snippet: latestEmail.snippet,
          folder: latestEmail.folder,
          labels: latestEmail.labels,
          isRead: !hasUnread,
          isStarred: thread.some((e) => e.isStarred),
          isFlagged: thread.some((e) => e.isFlagged),
          receivedAt: latestEmail.receivedAt,
          sentAt: latestEmail.sentAt,
          emailCount: thread.length,
          latestEmailId: latestEmail.id,
        };
      })
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    // Paginate
    const total = conversations.length;
    const paginatedConversations = conversations.slice(skip, skip + limit);

    return {
      conversations: paginatedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all emails in a thread/conversation
   */
  async getThread(threadId: string, tenantId: string) {
    const emails = await this.prisma.email.findMany({
      where: {
        tenantId,
        OR: [
          { threadId },
          { id: threadId }, // In case threadId is actually an email ID
        ],
        isDeleted: false,
      },
      orderBy: { receivedAt: 'asc' },
      include: {
        attachments: true,
      },
    });

    if (emails.length === 0) {
      throw new NotFoundException('Thread not found');
    }

    return emails;
  }
}
