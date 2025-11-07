import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailsService, EmailListFilters } from '../services/emails.service';
import { EmailRetentionService } from '../services/email-retention.service';
import { EmailFetchService } from '../services/email-fetch.service';
import { EmailSendService } from '../services/email-send.service';
import { EmailCleanupService } from '../services/email-cleanup.service';
import {
  ReplyForwardEmailRequestDto,
  SendEmailRequestDto,
  type EmailAttachmentDto,
} from '../dto/send-email.dto';

const decodeAttachments = (attachments?: EmailAttachmentDto[]) =>
  attachments?.map((attachment) => {
    const [, base64 = attachment.contentBase64] =
      attachment.contentBase64.split(',');

    return {
      filename: attachment.filename,
      contentType: attachment.contentType,
      content: Buffer.from(base64, 'base64'),
    };
  });

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(
    private emailsService: EmailsService,
    private retentionService: EmailRetentionService,
    private fetchService: EmailFetchService,
    private emailSendService: EmailSendService,
    private cleanupService: EmailCleanupService,
  ) {}

  /**
   * GET /emails - List emails with pagination and filters
   */
  @Get()
  async listEmails(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('providerId') providerId?: string,
    @Query('folder') folder?: string,
    @Query('isRead') isRead?: string,
    @Query('isStarred') isStarred?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;

    const filters: EmailListFilters = {};
    if (folder) filters.folder = folder;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (isStarred !== undefined) filters.isStarred = isStarred === 'true';
    if (search) filters.search = search;
    if (from) filters.from = from;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.emailsService.listEmails({
      tenantId,
      providerId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      filters,
    });
  }

  /**
   * GET /emails/stats - Get email statistics
   */
  @Get('stats')
  async getStats(@Req() req: any, @Query('providerId') providerId?: string) {
    const tenantId = req.user.tenantId;
    return this.emailsService.getStats(tenantId, providerId);
  }

  /**
   * GET /emails/search - Search emails
   */
  @Get('search')
  async searchEmails(
    @Req() req: any,
    @Query('q') query: string,
    @Query('providerId') providerId?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    const emails = await this.emailsService.searchEmails(
      tenantId,
      query,
      providerId,
      limit ? parseInt(limit) : 20,
    );

    return { emails };
  }

  /**
   * GET /emails/conversations - Get conversation view (threaded emails)
   */
  @Get('conversations')
  async getConversations(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('providerId') providerId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.emailsService.getConversations({
      tenantId,
      providerId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  /**
   * GET /emails/thread/:threadId - Get all emails in a thread
   */
  @Get('thread/:threadId')
  async getThread(@Req() req: any, @Param('threadId') threadId: string) {
    const tenantId = req.user.tenantId;
    return this.emailsService.getThread(threadId, tenantId);
  }

  /**
   * GET /emails/:id - Get email by ID
   */
  @Get(':id')
  async getEmail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.emailsService.getEmailById(id, tenantId);
  }

  /**
   * POST /emails/send - Send a new email
   */
  @Post('send')
  async sendEmail(@Req() req: any, @Body() body: SendEmailRequestDto) {
    const tenantId = req.user.tenantId;
    const { providerId, attachments, ...rest } = body;

    return this.emailSendService.sendEmail({
      tenantId,
      providerId,
      ...rest,
      attachments: decodeAttachments(attachments),
    });
  }

  /**
   * POST /emails/:id/reply - Reply to an email
   */
  @Post(':id/reply')
  async replyToEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ReplyForwardEmailRequestDto,
  ) {
    const tenantId = req.user.tenantId;

    return this.emailSendService.replyToEmail(id, tenantId, {
      ...body,
      attachments: decodeAttachments(body.attachments),
    });
  }

  /**
   * POST /emails/:id/forward - Forward an email
   */
  @Post(':id/forward')
  async forwardEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ReplyForwardEmailRequestDto,
  ) {
    const tenantId = req.user.tenantId;

    return this.emailSendService.forwardEmail(id, tenantId, {
      ...body,
      attachments: decodeAttachments(body.attachments),
    });
  }

  /**
   * PATCH /emails/:id - Update email flags
   */
  @Patch(':id')
  async updateEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { isRead?: boolean; isStarred?: boolean; folder?: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.emailsService.updateEmail(id, tenantId, data);
  }

  /**
   * DELETE /emails/:id - Delete email
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    await this.emailsService.deleteEmail(id, tenantId);
  }

  /**
   * PATCH /emails/bulk/read - Mark multiple emails as read/unread
   */
  @Patch('bulk/read')
  async bulkUpdateRead(
    @Req() req: any,
    @Body() data: { emailIds: string[]; isRead: boolean },
  ) {
    const tenantId = req.user.tenantId;
    return this.emailsService.bulkUpdateRead(
      data.emailIds,
      tenantId,
      data.isRead,
    );
  }

  /**
   * POST /emails/:id/fetch-archived - Fetch archived email from server
   */
  @Post(':id/fetch-archived')
  async fetchArchivedEmail(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.fetchService.fetchArchivedEmail(id, tenantId);
  }

  /**
   * POST /emails/maintenance/cleanup - Remove duplicates and purge deleted emails for current tenant
   */
  @Post('maintenance/cleanup')
  async runTenantCleanup(@Req() req: any) {
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
      throw new ForbiddenException('Administrator access required');
    }

    return this.cleanupService.runTenantMaintenance(req.user.tenantId);
  }

  /**
   * GET /emails/retention/stats - Get retention statistics
   */
  @Get('retention/stats')
  async getRetentionStats() {
    return this.retentionService.getRetentionStats();
  }

  /**
   * POST /emails/retention/run - Manually run retention policy
   */
  @Post('retention/run')
  async runRetentionPolicy(@Body() data?: { retentionDays?: number }) {
    return this.retentionService.runManualRetention(data?.retentionDays);
  }
}
