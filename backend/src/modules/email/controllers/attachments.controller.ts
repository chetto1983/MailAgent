import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AttachmentOnDemandService } from '../services/attachment-on-demand.service';

/**
 * HTTP API endpoints for email attachments
 *
 * Provides:
 * - On-demand attachment downloads (with S3 signed URL redirect)
 * - Attachment metadata queries
 *
 * Authorization: All endpoints require JWT authentication
 * Tenant isolation: Enforced via req.user.tenantId
 */
@Controller('email/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(
    private readonly attachmentOnDemandService: AttachmentOnDemandService,
  ) {}

  /**
   * Download an attachment
   *
   * Flow:
   * 1. Check if attachment is already in S3 → return signed URL (fast path)
   * 2. If metadata-only (storageType='pending'):
   *    - Fetch from provider (Gmail/Microsoft/IMAP)
   *    - Upload to S3
   *    - Update database record
   *    - Return signed URL
   * 3. Redirect browser to S3 signed URL (user downloads directly from S3)
   *
   * @param id - Attachment ID
   * @param req - HTTP request (contains authenticated user)
   * @param res - HTTP response (for redirect)
   *
   * @example
   * GET /email/attachments/abc-123/download
   * → 302 Redirect to https://s3.amazonaws.com/bucket/file?signature=...
   * → Browser downloads file directly from S3
   */
  @Get(':id/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const tenantId = req.user.tenantId;

      this.logger.log(
        `[AttachmentsController] Attachment download requested: ${id} by tenant ${tenantId}`,
      );

      // Get signed download URL (may trigger on-demand fetch from provider)
      const result = await this.attachmentOnDemandService.downloadAttachment(
        id,
        tenantId,
      );

      // Redirect to S3 signed URL (browser downloads directly from S3)
      // This avoids proxying large files through the backend
      this.logger.log(
        `[AttachmentsController] Redirecting to S3 signed URL for attachment ${id}: ${result.filename}`,
      );

      res.redirect(result.url);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (error instanceof NotFoundException) {
        this.logger.warn(
          `Attachment not found or access denied: ${id} by tenant ${req.user.tenantId}`,
        );
        throw error;
      }

      this.logger.error(
        `Failed to download attachment ${id}: ${err.message}`,
        err.stack,
      );

      throw error;
    }
  }

  /**
   * Get attachment metadata (without downloading)
   *
   * Returns:
   * - filename
   * - mimeType
   * - size
   * - isInS3 (true if already cached in S3, false if pending download)
   *
   * Use cases:
   * - Display attachment info in UI without triggering download
   * - Check if attachment needs to be fetched from provider
   * - Show file size before user decides to download
   *
   * @param id - Attachment ID
   * @param req - HTTP request (contains authenticated user)
   *
   * @example
   * GET /email/attachments/abc-123/metadata
   * → { filename: "report.pdf", mimeType: "application/pdf", size: 1048576, isInS3: false }
   */
  @Get(':id/metadata')
  async getAttachmentMetadata(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{
    filename: string;
    mimeType: string;
    size: number;
    isInS3: boolean;
  }> {
    try {
      const tenantId = req.user.tenantId;

      const metadata =
        await this.attachmentOnDemandService.getAttachmentMetadata(id, tenantId);

      this.logger.debug(
        `Attachment metadata retrieved: ${id} (${metadata.filename}, ${(metadata.size / 1024 / 1024).toFixed(2)}MB, isInS3=${metadata.isInS3})`,
      );

      return metadata;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (error instanceof NotFoundException) {
        this.logger.warn(
          `Attachment not found or access denied: ${id} by tenant ${req.user.tenantId}`,
        );
        throw error;
      }

      this.logger.error(
        `Failed to get attachment metadata for ${id}: ${err.message}`,
        err.stack,
      );

      throw error;
    }
  }
}
