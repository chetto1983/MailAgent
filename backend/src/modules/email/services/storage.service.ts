import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageType = 's3';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.bucket = this.config.get<string>('S3_BUCKET', 'mailagent-attachments');

    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint,
      forcePathStyle: this.config.get<boolean>('S3_FORCE_PATH_STYLE', true),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  /**
   * Generate a pre-signed GET URL for S3 object
   */
  async getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.client.send(command);
  }
}
