import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ImapService } from '../../providers/services/imap.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { Folder } from '@prisma/client';
import axios from 'axios';
import { google } from 'googleapis';

export interface FolderInfo {
  path: string;
  name: string;
  delimiter: string;
  attributes: string[];
  specialUse?: string;
  parent?: string;
}

@Injectable()
export class FolderSyncService {
  private readonly logger = new Logger(FolderSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly imapService: ImapService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Sync folders for any provider type
   */
  async syncProviderFolders(tenantId: string, providerId: string): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    if (provider.providerType === 'generic') {
      await this.syncImapFolders(tenantId, providerId);
    } else if (provider.providerType === 'google') {
      await this.syncGmailFolders(tenantId, providerId);
    } else if (provider.providerType === 'microsoft') {
      await this.syncMicrosoftFolders(tenantId, providerId);
    } else {
      throw new Error(`Unsupported provider type: ${provider.providerType}`);
    }
  }

  /**
   * Synchronize folders from IMAP server to database
   */
  async syncImapFolders(
    tenantId: string,
    providerId: string,
  ): Promise<Folder[]> {
    this.logger.log(
      `Starting IMAP folder sync for provider ${providerId} (tenant: ${tenantId})`,
    );

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      if (provider.providerType !== 'generic') {
        throw new Error(
          `Provider ${providerId} is not a generic IMAP provider`,
        );
      }

      // Decrypt IMAP credentials
      if (!provider.imapHost || !provider.imapPort || !provider.imapUsername ||
          !provider.imapPassword || !provider.imapEncryptionIv) {
        throw new Error('Provider missing IMAP configuration');
      }

      const imapPassword = this.crypto.decrypt(
        provider.imapPassword,
        provider.imapEncryptionIv,
      );

      // List folders from IMAP server
      const imapFolders = await this.imapService.listFolders({
        host: provider.imapHost,
        port: provider.imapPort,
        username: provider.imapUsername,
        password: imapPassword,
        useTls: provider.imapUseTls,
      });

      this.logger.log(
        `Found ${imapFolders.length} folders on IMAP server for provider ${providerId}`,
      );

      // Parse folder information
      const folderInfos = this.parseImapFolders(imapFolders);

      // Sync folders to database
      const syncedFolders = await this.syncFoldersToDatabase(
        tenantId,
        providerId,
        folderInfos,
      );

      // Update last synced timestamp
      await this.prisma.providerConfig.update({
        where: { id: providerId },
        data: { lastSyncedAt: new Date() },
      });

      this.logger.log(
        `Synced ${syncedFolders.length} folders for provider ${providerId}`,
      );

      return syncedFolders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error syncing IMAP folders for provider ${providerId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Parse IMAP folder list response
   */
  private parseImapFolders(imapFolders: any[]): FolderInfo[] {
    const folderInfos: FolderInfo[] = [];

    for (const folder of imapFolders) {
      // folder.path is the full path
      // folder.delimiter is the delimiter (usually "/")
      // folder.attributes is an array of attributes

      const path = folder.path;
      const delimiter = folder.delimiter || '/';
      const attributes = folder.attributes || [];

      // Extract folder name from path
      const parts = path.split(delimiter);
      const name = parts[parts.length - 1] || path;

      // Determine parent folder path
      let parent: string | undefined;
      if (parts.length > 1) {
        parent = parts.slice(0, -1).join(delimiter);
      }

      // Determine special use based on folder name and attributes
      const specialUse = this.determineSpecialUse(path, name, attributes);

      // Check if folder is selectable
      const isSelectable = !attributes.some(
        (attr: string) =>
          attr === '\\Noselect' ||
          attr === '\\NonExistent' ||
          attr.toLowerCase() === '\\noselect',
      );

      folderInfos.push({
        path,
        name,
        delimiter,
        attributes,
        specialUse,
        parent,
      });
    }

    return folderInfos;
  }

  /**
   * Determine special folder use based on path, name and attributes
   */
  private determineSpecialUse(
    path: string,
    name: string,
    attributes: string[],
  ): string | undefined {
    // Check IMAP special-use attributes (RFC 6154)
    const specialUseMap: Record<string, string> = {
      '\\All': 'ALL',
      '\\Archive': 'ARCHIVE',
      '\\Drafts': 'DRAFTS',
      '\\Flagged': 'FLAGGED',
      '\\Junk': 'JUNK',
      '\\Sent': 'SENT',
      '\\Trash': 'TRASH',
      '\\Important': 'IMPORTANT',
    };

    for (const attr of attributes) {
      if (specialUseMap[attr]) {
        return specialUseMap[attr];
      }
    }

    // Fallback: detect based on folder name (case-insensitive)
    const lowerPath = path.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerPath === 'inbox' || lowerName === 'inbox') {
      return 'INBOX';
    } else if (
      lowerName === 'sent' ||
      lowerName === 'sent items' ||
      lowerName === 'sent mail'
    ) {
      return 'SENT';
    } else if (lowerName === 'drafts') {
      return 'DRAFTS';
    } else if (
      lowerName === 'trash' ||
      lowerName === 'deleted' ||
      lowerName === 'deleted items'
    ) {
      return 'TRASH';
    } else if (lowerName === 'spam' || lowerName === 'junk') {
      return 'JUNK';
    } else if (lowerName === 'archive') {
      return 'ARCHIVE';
    } else if (lowerName === 'starred' || lowerName === 'flagged') {
      return 'FLAGGED';
    }

    return undefined;
  }

  /**
   * Sync folders to database
   */
  private async syncFoldersToDatabase(
    tenantId: string,
    providerId: string,
    folderInfos: FolderInfo[],
  ): Promise<Folder[]> {
    const syncedFolders: Folder[] = [];

    // Get existing folders from database
    const existingFolders = await this.prisma.folder.findMany({
      where: { providerId, tenantId },
    });

    const existingPaths = new Set(existingFolders.map((f) => f.path));
    const newPaths = new Set(folderInfos.map((f) => f.path));

    // Delete folders that no longer exist on server
    const deletedPaths = Array.from(existingPaths).filter(
      (path) => !newPaths.has(path),
    );

    if (deletedPaths.length > 0) {
      this.logger.log(`Deleting ${deletedPaths.length} removed folders`);
      await this.prisma.folder.deleteMany({
        where: {
          providerId,
          path: { in: deletedPaths },
        },
      });
    }

    // Build a map of path to parent folder ID
    const pathToIdMap = new Map<string, string>();

    // First pass: create/update all folders without parent relationships
    for (const folderInfo of folderInfos) {
      const level = folderInfo.path.split(folderInfo.delimiter).length - 1;

      const folder = await this.prisma.folder.upsert({
        where: {
          providerId_path: {
            providerId,
            path: folderInfo.path,
          },
        },
        create: {
          tenantId,
          providerId,
          path: folderInfo.path,
          name: folderInfo.name,
          delimiter: folderInfo.delimiter,
          attributes: folderInfo.attributes,
          specialUse: folderInfo.specialUse,
          level,
          isSelectable: !folderInfo.attributes.some(
            (attr) =>
              attr === '\\Noselect' ||
              attr === '\\NonExistent' ||
              attr.toLowerCase() === '\\noselect',
          ),
        },
        update: {
          name: folderInfo.name,
          delimiter: folderInfo.delimiter,
          attributes: folderInfo.attributes,
          specialUse: folderInfo.specialUse,
          level,
          isSelectable: !folderInfo.attributes.some(
            (attr) =>
              attr === '\\Noselect' ||
              attr === '\\NonExistent' ||
              attr.toLowerCase() === '\\noselect',
          ),
          lastSyncedAt: new Date(),
        },
      });

      pathToIdMap.set(folderInfo.path, folder.id);
      syncedFolders.push(folder);
    }

    // Second pass: update parent relationships
    for (const folderInfo of folderInfos) {
      if (folderInfo.parent && pathToIdMap.has(folderInfo.parent)) {
        const parentId = pathToIdMap.get(folderInfo.parent);
        const folderId = pathToIdMap.get(folderInfo.path);

        if (folderId && parentId) {
          await this.prisma.folder.update({
            where: { id: folderId },
            data: { parentId },
          });
        }
      }
    }

    return syncedFolders;
  }

  /**
   * Sync Gmail labels as folders
   */
  async syncGmailFolders(tenantId: string, providerId: string): Promise<void> {
    this.logger.log(`Starting Gmail folder (labels) sync for provider ${providerId}`);

    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider not found or missing access token');
      }

      const accessToken = this.crypto.decrypt(provider.accessToken, provider.tokenEncryptionIv);

      const gmail = google.gmail({ version: 'v1', auth: accessToken });
      const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
      const labels = labelsResponse.data.labels || [];

      this.logger.log(`Found ${labels.length} Gmail labels for provider ${providerId}`);

      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set<string>(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set<string>(labels.map((l) => l.id).filter((id): id is string => !!id));

      const deletedPaths: string[] = [];
      existingPaths.forEach((path) => {
        if (!newPaths.has(path)) {
          deletedPaths.push(path);
        }
      });

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Gmail labels`);
        await (this.prisma as any).folder.deleteMany({
          where: { providerId, path: { in: deletedPaths } },
        });
      }

      for (const label of labels) {
        if (!label.id || !label.name) continue;

        const specialUse = this.determineFolderTypeFromLabelId(label.id);
        const isSelectable = label.type !== 'system' || specialUse !== undefined;

        await (this.prisma as any).folder.upsert({
          where: { providerId_path: { providerId, path: label.id } },
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
      this.logger.error(`Error syncing Gmail folders for provider ${providerId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Sync Microsoft mail folders
   */
  async syncMicrosoftFolders(tenantId: string, providerId: string): Promise<void> {
    this.logger.log(`Starting Microsoft folder sync for provider ${providerId}`);

    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider not found or missing access token');
      }

      const accessToken = this.crypto.decrypt(provider.accessToken, provider.tokenEncryptionIv);

      const url = `${this.GRAPH_API_BASE}/me/mailFolders`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const folders = response.data.value || [];
      this.logger.log(`Found ${folders.length} Microsoft folders for provider ${providerId}`);

      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set<string>(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set<string>(folders.map((f: any) => f.id as string));

      const deletedPaths: string[] = [];
      existingPaths.forEach((path) => {
        if (!newPaths.has(path)) {
          deletedPaths.push(path);
        }
      });

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Microsoft folders`);
        await (this.prisma as any).folder.deleteMany({
          where: { providerId, path: { in: deletedPaths } },
        });
      }

      for (const folder of folders) {
        if (!folder.id || !folder.displayName) continue;

        const specialUse = this.determineMicrosoftFolderType(folder.displayName);

        await (this.prisma as any).folder.upsert({
          where: { providerId_path: { providerId, path: folder.id } },
          create: {
            tenantId,
            providerId,
            path: folder.id,
            name: folder.displayName,
            delimiter: '/',
            specialUse,
            isSelectable: true,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            level: folder.parentFolderId ? 1 : 0,
          },
          update: {
            name: folder.displayName,
            specialUse,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.log(`Synced ${folders.length} Microsoft folders for provider ${providerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error syncing Microsoft folders for provider ${providerId}: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private determineFolderTypeFromLabelId(labelId: string): string | undefined {
    const labelMap: Record<string, string | undefined> = {
      'INBOX': 'INBOX',
      'SENT': 'SENT',
      'DRAFT': 'DRAFTS',
      'TRASH': 'TRASH',
      'SPAM': 'JUNK',
      'STARRED': 'FLAGGED',
      'IMPORTANT': 'IMPORTANT',
    };
    return labelMap[labelId];
  }

  private determineMicrosoftFolderType(folderName: string): string | undefined {
    const lowerName = folderName.toLowerCase();
    if (lowerName === 'inbox') return 'INBOX';
    if (lowerName === 'sent items' || lowerName === 'sentitems') return 'SENT';
    if (lowerName === 'drafts') return 'DRAFTS';
    if (lowerName === 'deleted items' || lowerName === 'deleteditems' || lowerName === 'trash') return 'TRASH';
    if (lowerName === 'junk email' || lowerName === 'junk' || lowerName === 'spam') return 'JUNK';
    if (lowerName === 'archive') return 'ARCHIVE';
    return undefined;
  }

  /**
   * Get all folders for a provider
   */
  async getFolders(
    tenantId: string,
    providerId: string,
  ): Promise<Folder[]> {
    return this.prisma.folder.findMany({
      where: { tenantId, providerId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get folder by path
   */
  async getFolderByPath(
    providerId: string,
    path: string,
  ): Promise<Folder | null> {
    return this.prisma.folder.findUnique({
      where: {
        providerId_path: {
          providerId,
          path,
        },
      },
    });
  }

  /**
   * Update folder counts (total and unread)
   */
  async updateFolderCounts(
    providerId: string,
    folderPath: string,
  ): Promise<void> {
    const folder = await this.getFolderByPath(providerId, folderPath);

    if (!folder) {
      this.logger.warn(
        `Folder not found: ${folderPath} (provider: ${providerId})`,
      );
      return;
    }

    // Count total emails in folder
    const totalCount = await this.prisma.email.count({
      where: {
        providerId,
        folder: folderPath,
      },
    });

    // Count unread emails in folder
    const unreadCount = await this.prisma.email.count({
      where: {
        providerId,
        folder: folderPath,
        isRead: false,
      },
    });

    // Update folder counts
    await this.prisma.folder.update({
      where: { id: folder.id },
      data: {
        totalCount,
        unreadCount,
      },
    });
  }

  /**
   * Update all folder counts for a provider
   */
  async updateAllFolderCounts(providerId: string): Promise<void> {
    this.logger.log(`Updating folder counts for provider ${providerId}`);

    const folders = await this.prisma.folder.findMany({
      where: { providerId },
    });

    for (const folder of folders) {
      await this.updateFolderCounts(providerId, folder.path);
    }

    this.logger.log(
      `Updated counts for ${folders.length} folders (provider: ${providerId})`,
    );
  }
}
