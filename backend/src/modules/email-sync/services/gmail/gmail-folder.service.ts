import { Injectable, Logger } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CryptoService } from '../../../../common/services/crypto.service';

/**
 * Gmail-specific folder (labels) management service
 * Handles Gmail label synchronization and folder determination logic
 *
 * Architectural pattern: Pluggable adapter (inspired by Mail-0/Zero)
 * - Provider-specific implementation for Gmail labels
 * - Clear separation from core sync logic
 * - Injectable dependencies for testability
 */
@Injectable()
export class GmailFolderService {
  private readonly logger = new Logger(GmailFolderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Determine primary folder from Gmail label IDs
   * Gmail uses labels instead of folders, this maps labels to folder names
   *
   * @param labelIds - Array of Gmail label IDs
   * @param fallback - Fallback folder name if no match found
   * @returns Folder name (INBOX, SENT, TRASH, etc.)
   */
  determineFolderFromLabels(labelIds?: string[], fallback?: string): string {
    if (!labelIds || labelIds.length === 0) {
      return fallback ?? 'INBOX';
    }

    if (labelIds.includes('TRASH')) {
      return 'TRASH';
    }

    if (labelIds.includes('SPAM')) {
      return 'SPAM';
    }

    if (labelIds.includes('SENT')) {
      return 'SENT';
    }

    if (labelIds.includes('DRAFT') || labelIds.includes('DRAFTS')) {
      return 'DRAFTS';
    }

    // Check for Gmail categories BEFORE generic INBOX
    // Gmail adds both INBOX and CATEGORY_ labels, so we prioritize categories
    const categoryLabel = labelIds.find((label) => label.startsWith('CATEGORY_'));
    if (categoryLabel) {
      switch (categoryLabel) {
        case 'CATEGORY_PERSONAL':
          return 'INBOX';
        case 'CATEGORY_SOCIAL':
          return 'SOCIAL';
        case 'CATEGORY_PROMOTIONS':
          return 'PROMOTIONS';
        case 'CATEGORY_UPDATES':
          return 'UPDATES';
        case 'CATEGORY_FORUMS':
          return 'FORUMS';
        default:
          break;
      }
    }

    if (labelIds.includes('INBOX')) {
      return 'INBOX';
    }

    return fallback ?? 'INBOX';
  }

  /**
   * Sync Gmail labels as folders
   * Fetches all labels from Gmail API and syncs them to the database
   *
   * @param gmail - Gmail API client
   * @param tenantId - Tenant ID
   * @param providerId - Provider config ID
   */
  async syncGmailFolders(
    gmail: gmail_v1.Gmail,
    tenantId: string,
    providerId: string,
  ): Promise<void> {
    this.logger.log(`Starting Gmail folder (labels) sync for provider ${providerId}`);

    try {
      // List all labels
      const labelsResponse = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = labelsResponse.data.labels || [];
      this.logger.log(`Found ${labels.length} Gmail labels for provider ${providerId}`);

      // Get existing folders
      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set<string>(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set<string>(labels.map((l) => l.id).filter((id): id is string => !!id));

      // Delete folders that no longer exist
      const deletedPaths: string[] = [];
      existingPaths.forEach((path) => {
        if (!newPaths.has(path)) {
          deletedPaths.push(path);
        }
      });

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Gmail labels`);
        await (this.prisma as any).folder.deleteMany({
          where: {
            providerId,
            path: { in: deletedPaths },
          },
        });
      }

      // Sync each label as a folder
      for (const label of labels) {
        if (!label.id || !label.name) continue;

        // Determine special use
        const specialUse = this.determineFolderTypeFromLabelId(label.id);

        // Determine if selectable
        const isSelectable = label.type !== 'system' || specialUse !== undefined;

        await (this.prisma as any).folder.upsert({
          where: {
            providerId_path: {
              providerId,
              path: label.id,
            },
          },
          create: {
            tenantId,
            providerId,
            path: label.id,
            name: label.name,
            delimiter: '/',
            specialUse,
            isSelectable,
            totalCount: label.messagesTotal || 0,
            unreadCount: label.messagesUnread || 0,
            level: 0,
          },
          update: {
            name: label.name,
            specialUse,
            isSelectable,
            totalCount: label.messagesTotal || 0,
            unreadCount: label.messagesUnread || 0,
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.log(`Synced ${labels.length} Gmail labels as folders for provider ${providerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error syncing Gmail folders for provider ${providerId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Determine folder type (specialUse) from Gmail label ID
   * Maps Gmail system labels to standard folder types
   *
   * @param labelId - Gmail label ID (e.g., 'INBOX', 'SENT', 'TRASH')
   * @returns Folder type or undefined for non-standard labels
   */
  private determineFolderTypeFromLabelId(labelId: string): string | undefined {
    const labelMap: Record<string, string | undefined> = {
      'INBOX': 'INBOX',
      'SENT': 'SENT',
      'DRAFT': 'DRAFTS',
      'TRASH': 'TRASH',
      'SPAM': 'JUNK',
      'STARRED': 'FLAGGED',
      'IMPORTANT': 'IMPORTANT',
      'UNREAD': undefined, // Not a folder, it's a filter
      'CATEGORY_PERSONAL': undefined,
      'CATEGORY_SOCIAL': undefined,
      'CATEGORY_PROMOTIONS': undefined,
      'CATEGORY_UPDATES': undefined,
      'CATEGORY_FORUMS': undefined,
    };

    return labelMap[labelId];
  }
}
