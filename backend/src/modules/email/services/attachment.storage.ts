import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from './storage.service';

export interface AttachmentUploadInput {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface UploadedAttachment {
  storageType: 's3';
  storagePath: string;
  size: number;
  mimeType: string;
  filename: string;
}

@Injectable()
export class AttachmentStorageService {
  constructor(private readonly storage: StorageService) {}

  /**
   * Upload attachment to S3/Minio with a deterministic path.
   */
  async uploadAttachment(
    tenantId: string,
    providerId: string,
    attachment: AttachmentUploadInput,
  ): Promise<UploadedAttachment> {
    const key = this.buildObjectKey(tenantId, providerId, attachment.filename);
    await this.storage.putObject(key, attachment.content, attachment.contentType);
    return {
      storageType: 's3',
      storagePath: key,
      size: attachment.content.byteLength,
      mimeType: attachment.contentType,
      filename: attachment.filename,
    };
  }

  private buildObjectKey(tenantId: string, providerId: string, filename: string): string {
    const safeName = filename.replace(/[^\w.\-]/g, '_');
    return `tenants/${tenantId}/providers/${providerId}/attachments/${randomUUID()}-${safeName}`;
  }
}
