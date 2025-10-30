import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { ImapSyncService } from '../services/imap-sync.service';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('email-configs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmailConfigController {
  constructor(
    private prisma: PrismaService,
    private imapSyncService: ImapSyncService,
  ) {}

  /**
   * Get all email configs for tenant
   */
  @Get()
  async getEmailConfigs(@Request() req: AuthenticatedRequest) {
    return this.prisma.emailConfig.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        type: true,
        isDefault: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Add new email config
   */
  @Post()
  async createEmailConfig(@Request() req: AuthenticatedRequest, @Body() body: any) {
    // TODO: Validate and create email config
    // For IMAP: encrypt password
    // For OAuth: handle OAuth flow first
    return this.prisma.emailConfig.create({
      data: {
        tenantId: req.user.tenantId,
        email: body.email,
        type: body.type,
        displayName: body.displayName,
        isActive: true,
      },
    });
  }

  /**
   * Sync emails now
   */
  @Post(':id/sync')
  async syncEmails(@Request() req: AuthenticatedRequest, @Param('id') configId: string) {
    const config = await this.prisma.emailConfig.findFirst({
      where: {
        id: configId,
        tenantId: req.user.tenantId,
      },
    });

    if (!config) {
      throw new Error('Email config not found');
    }

    // Queue sync job
    // This would typically use BullMQ
    await this.imapSyncService.syncEmailsFromImap(configId);

    return { success: true, message: 'Sync started' };
  }

  /**
   * Delete email config
   */
  @Delete(':id')
  async deleteEmailConfig(@Request() req: AuthenticatedRequest, @Param('id') configId: string) {
    return this.prisma.emailConfig.delete({
      where: {
        id: configId,
      },
    });
  }
}
