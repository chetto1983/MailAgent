import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { AttachmentStorageService } from './attachment.storage';

@Injectable()
export class AttachmentOnDemandService {
  private readonly logger = new Logger(AttachmentOnDemandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly attachmentStorage: AttachmentStorageService,
  ) {}

  /**
   * Download attachment on-demand
   * - If already in S3: return signed URL
   * - If pending: fetch from provider, upload to S3, return signed URL
   */
  async downloadAttachment(
    attachmentId: string,
    tenantId: string,
  ): Promise<{ url: string; filename: string; mimeType: string }> {
    const attachment = await this.prisma.emailAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        email: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    // Verify tenant access
    if (attachment.email.tenantId !== tenantId) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    // If already in S3, return signed URL
    if (attachment.storageType === 's3' && attachment.storagePath) {
      const url = await this.storage.getSignedDownloadUrl(attachment.storagePath, 300);
      this.logger.debug(`Returning cached S3 URL for attachment ${attachmentId}`);
      return {
        url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      };
    }

    // Otherwise, fetch from provider and upload to S3
    this.logger.log(
      `Downloading attachment ${attachmentId} from provider ${attachment.email.provider.providerType}`,
    );

    // Parse the storagePath to get provider reference
    // Format: "providerId/externalMessageId/externalAttachmentId"
    const reference = this.attachmentStorage.parsePendingReference(attachment.storagePath || '');
    if (!reference) {
      throw new Error(`Invalid attachment storage path: ${attachment.storagePath}`);
    }

    // Download from provider
    const buffer = await this.fetchFromProvider(
      attachment.email.provider.providerType as 'google' | 'microsoft' | 'imap',
      reference.externalMessageId,
      reference.externalAttachmentId,
      attachment.email.providerId,
    );

    // Upload to S3
    const uploaded = await this.attachmentStorage.uploadAttachment(
      tenantId,
      attachment.email.providerId,
      {
        filename: attachment.filename,
        content: buffer,
        contentType: attachment.mimeType,
      },
    );

    // Update attachment record
    await this.prisma.emailAttachment.update({
      where: { id: attachmentId },
      data: {
        storageType: 's3',
        storagePath: uploaded.storagePath,
      },
    });

    // Return signed URL
    const url = await this.storage.getSignedDownloadUrl(uploaded.storagePath, 300);
    this.logger.log(`Successfully downloaded and cached attachment ${attachmentId}`);

    return {
      url,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    };
  }

  /**
   * Fetch attachment from provider
   * This is a placeholder - actual implementation depends on having access to sync services
   */
  private async fetchFromProvider(
    providerType: 'google' | 'microsoft' | 'imap',
    externalMessageId: string,
    externalAttachmentId: string,
    providerId: string,
  ): Promise<Buffer> {
    // TODO: This needs to be implemented by injecting the appropriate sync services
    // or by creating provider-specific attachment downloaders
    throw new Error(
      `On-demand attachment download not yet implemented for ${providerType}. ` +
        `Provider ID: ${providerId}, Message: ${externalMessageId}, Attachment: ${externalAttachmentId}`,
    );
  }

  /**
   * Get attachment metadata without downloading
   */
  async getAttachmentMetadata(
    attachmentId: string,
    tenantId: string,
  ): Promise<{
    filename: string;
    mimeType: string;
    size: number;
    isInS3: boolean;
  }> {
    const attachment = await this.prisma.emailAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        filename: true,
        mimeType: true,
        size: true,
        storageType: true,
        email: {
          select: { tenantId: true },
        },
      },
    });

    if (!attachment || attachment.email.tenantId !== tenantId) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      isInS3: attachment.storageType === 's3',
    };
  }
}
