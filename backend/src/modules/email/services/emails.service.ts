import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EmailSyncBackService } from './email-sync-back.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

export interface EmailListFilters {
  folder?: string;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
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

  constructor(
    private prisma: PrismaService,
    private emailSyncBack: EmailSyncBackService,
    private knowledgeBaseService: KnowledgeBaseService,
    private realtimeEvents: RealtimeEventsService,
  ) {}

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
      ...(filters.folder && { folder: { equals: filters.folder, mode: 'insensitive' } }),
      // Only show deleted emails if we're viewing the TRASH folder
      ...(!filters.folder || filters.folder.toUpperCase() !== 'TRASH' ? { isDeleted: false } : {}),
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      ...(filters.isStarred !== undefined && { isStarred: filters.isStarred }),
      ...(filters.hasAttachments
        ? { attachments: { some: {} } }
        : undefined),
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
          providerId: true,
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
          attachments: {
            select: {
              id: true,
              filename: true,
              size: true,
              mimeType: true,
              isInline: true,
            },
          },
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
   * Update email flags - syncs back to provider
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

    // Update in database first
    const updated = await this.prisma.email.update({
      where: { id },
      data,
    });

    const targetFolder = data.folder ?? email.folder;

    // Emit realtime update event
    this.realtimeEvents.emitEmailUpdate(tenantId, {
      emailId: updated.id,
      providerId: updated.providerId,
      folder: targetFolder,
      updates: data,
      reason: 'message-processed',
    });

    // Emit unread count update if isRead changed
    if (data.isRead !== undefined || data.folder) {
      // Current/target folder
      const unreadCountTarget = await this.prisma.email.count({
        where: {
          providerId: email.providerId,
          folder: targetFolder,
          isRead: false,
        },
      });
      this.realtimeEvents.emitUnreadCountUpdate(tenantId, {
        folder: targetFolder,
        count: unreadCountTarget,
        providerId: email.providerId,
      });

      // If folder changed, update source folder as well
      if (data.folder && data.folder !== email.folder) {
        const unreadCountSource = await this.prisma.email.count({
          where: {
            providerId: email.providerId,
            folder: email.folder,
            isRead: false,
          },
        });
        this.realtimeEvents.emitUnreadCountUpdate(tenantId, {
          folder: email.folder,
          count: unreadCountSource,
          providerId: email.providerId,
        });
      }
    }

    // Sync changes back to provider (async, don't wait)
    this.syncChangesToProvider(email, data).catch((error) => {
      this.logger.error(`Failed to sync email update to provider: ${error.message}`);
    });

    return updated;
  }

  /**
   * Sync email changes back to provider
   */
  private async syncChangesToProvider(
    email: any,
    changes: { isRead?: boolean; isStarred?: boolean; folder?: string },
  ) {
    const operations = [];

    // Handle read/unread
    if (changes.isRead !== undefined) {
      operations.push({
        emailId: email.id,
        externalId: email.externalId,
        providerId: email.providerId,
        tenantId: email.tenantId,
        operation: changes.isRead ? ('markRead' as const) : ('markUnread' as const),
      });
    }

    // Handle star/unstar
    if (changes.isStarred !== undefined) {
      operations.push({
        emailId: email.id,
        externalId: email.externalId,
        providerId: email.providerId,
        tenantId: email.tenantId,
        operation: changes.isStarred ? ('star' as const) : ('unstar' as const),
      });
    }

    // Handle folder move
    if (changes.folder) {
      operations.push({
        emailId: email.id,
        externalId: email.externalId,
        providerId: email.providerId,
        tenantId: email.tenantId,
        operation: 'moveToFolder' as const,
        folder: changes.folder,
      });
    }

    // Sync all operations
    if (operations.length > 0) {
      await this.emailSyncBack.syncOperationsBatch(operations);
    }
  }

  /**
   * Delete email - Mark as deleted and move to TRASH
   * Syncs to provider immediately
   */
  async deleteEmail(id: string, tenantId: string) {
    const email = await this.prisma.email.findFirst({
      where: { id, tenantId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // If the email is already in trash, perform a permanent delete
    if (email.folder === 'TRASH' && email.isDeleted) {
      await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, id);
      await this.prisma.email.delete({ where: { id } });

      this.emailSyncBack
        .syncOperationToProvider({
          emailId: email.id,
          externalId: email.externalId,
          providerId: email.providerId,
          tenantId: email.tenantId,
          operation: 'hardDelete',
        })
        .catch((error) => {
          this.logger.error(`Failed to sync permanent email deletion to provider: ${error.message}`);
        });

      this.logger.log(`Email ${id} permanently deleted and synced to provider`);
      return { success: true };
    }

    // Mark as deleted and move to TRASH folder
    await this.prisma.email.update({
      where: { id },
      data: {
        isDeleted: true,
        folder: 'TRASH',
      },
    });

    await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, id);

    // Sync delete to provider (async, don't wait)
    this.emailSyncBack
      .syncOperationToProvider({
        emailId: email.id,
        externalId: email.externalId,
        providerId: email.providerId,
        tenantId: email.tenantId,
        operation: 'delete',
        folder: 'TRASH',
      })
      .catch((error) => {
        this.logger.error(`Failed to sync email deletion to provider: ${error.message}`);
      });

    this.logger.log(`Email ${id} marked as deleted and synced to provider`);
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
        _count: { id: true },
      }),
    ]);

    return {
      total,
      unread,
      starred,
      byFolder: byFolder.reduce((acc, item) => {
        acc[item.folder] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Save or update a draft (autosave)
   */
  async saveDraft(
    tenantId: string,
    dto: {
      id?: string;
      providerId: string;
      to?: string[];
      cc?: string[];
      bcc?: string[];
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      attachments?: {
        filename: string;
        contentType: string;
        size?: number;
        contentBase64?: string;
      }[];
    },
  ) {
    const draftAttachments = dto.attachments ?? [];
    const data: Prisma.EmailUncheckedCreateInput = {
      id: dto.id ?? undefined,
      tenantId,
      providerId: dto.providerId,
      externalId: dto.id ?? `draft-${Date.now()}`,
      threadId: null,
      messageId: null,
      inReplyTo: null,
      references: null,
      from: '',
      to: dto.to ?? [],
      cc: dto.cc ?? [],
      bcc: dto.bcc ?? [],
      replyTo: null,
      subject: dto.subject ?? '',
      bodyText: dto.bodyText ?? '',
      bodyHtml: dto.bodyHtml ?? '',
      snippet: null,
      folder: 'DRAFTS',
      labels: [],
      isRead: true,
      isStarred: false,
      isFlagged: false,
      isDraft: true,
      isDeleted: false,
      isArchived: false,
      sentAt: new Date(),
      receivedAt: new Date(),
      size: null,
      headers: Prisma.DbNull,
      metadata: {
        draftAttachments,
      },
      crossProviderLinkId: null,
    };

    if (dto.id) {
      await this.prisma.email.update({
        where: { id: dto.id },
        data,
      });
      return this.prisma.email.findUnique({ where: { id: dto.id } });
    }

    return this.prisma.email.create({ data });
  }

  /**
   * Get draft by ID
   */
  async getDraft(id: string, tenantId: string) {
    const draft = await this.prisma.email.findFirst({
      where: { id, tenantId, isDraft: true },
    });
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  /**
   * Delete draft
   */
  async deleteDraft(id: string, tenantId: string) {
    await this.prisma.email.deleteMany({
      where: { id, tenantId, isDraft: true },
    });
  }

  /**
   * Mark multiple emails as read/unread - syncs to provider
   */
  async bulkUpdateRead(
    emailIds: string[],
    tenantId: string,
    isRead: boolean,
  ) {
    // Get emails for syncing
    const emails = await this.prisma.email.findMany({
      where: {
        id: { in: emailIds },
        tenantId,
      },
      select: {
        id: true,
        externalId: true,
        providerId: true,
        tenantId: true,
      },
    });

    // Update in database
    const result = await this.prisma.email.updateMany({
      where: {
        id: { in: emailIds },
        tenantId,
      },
      data: { isRead },
    });

    // Sync to provider (async, don't wait)
    const operations = emails.map((email) => ({
      emailId: email.id,
      externalId: email.externalId,
      providerId: email.providerId,
      tenantId: email.tenantId,
      operation: isRead ? ('markRead' as const) : ('markUnread' as const),
    }));

    this.emailSyncBack.syncOperationsBatch(operations).catch((error) => {
      this.logger.error(`Failed to sync bulk read update to provider: ${error.message}`);
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
      isDeleted: false,
      folder: { notIn: ['TRASH', 'SPAM'] },
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
        providerId: true,
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

  /**
   * Get attachment download URL or file data
   */
  async getAttachmentDownloadUrl(
    emailId: string,
    attachmentId: string,
    tenantId: string,
  ) {
    // Verify email belongs to tenant
    const email = await this.prisma.email.findFirst({
      where: {
        id: emailId,
        tenantId,
        isDeleted: false,
      },
      include: {
        attachments: {
          where: {
            id: attachmentId,
          },
        },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    const attachment = email.attachments[0];
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Return attachment with storage information
    // The controller should handle actual file streaming based on storageType
    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      storageType: attachment.storageType,
      storagePath: attachment.storagePath,
      isInline: attachment.isInline,
      contentId: attachment.contentId,
    };
  }
}
