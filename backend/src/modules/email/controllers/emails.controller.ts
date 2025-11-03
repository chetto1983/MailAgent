import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailsService, EmailListFilters } from '../services/emails.service';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(private emailsService: EmailsService) {}

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
    return this.emailsService.searchEmails(
      tenantId,
      query,
      providerId,
      limit ? parseInt(limit) : 20,
    );
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
}
