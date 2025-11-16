import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FolderSyncService } from '../../email-sync/services/folder-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Folders')
@Controller('folders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoldersController {
  constructor(
    @Inject(forwardRef(() => FolderSyncService))
    private readonly folderSyncService: FolderSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all folders for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of folders' })
  async getFolders(@Request() req: any) {
    const tenantId = req.user.tenantId;

    // Get all provider configs for this tenant
    const providers = await this.prisma.providerConfig.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // Refresh counts before returning folders
    for (const provider of providers) {
      await this.folderSyncService.updateAllFolderCounts(provider.id);
    }

    // Get folders for all providers
    const foldersByProvider: Record<string, any[]> = {};

    for (const provider of providers) {
      const folders = await (this.prisma as any).folder.findMany({
        where: {
          tenantId,
          providerId: provider.id,
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      });

      foldersByProvider[provider.id] = folders;
    }

    return {
      providers,
      foldersByProvider,
    };
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Get folders for a specific provider' })
  @ApiResponse({ status: 200, description: 'Returns list of folders' })
  async getFoldersByProvider(
    @Request() req: any,
    @Param('providerId') providerId: string,
  ) {
    const tenantId = req.user.tenantId;

    // Verify provider belongs to tenant
    const provider = await this.prisma.providerConfig.findFirst({
      where: {
        id: providerId,
        tenantId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found or access denied');
    }

    // Refresh counts before returning folders
    await this.folderSyncService.updateAllFolderCounts(provider.id);

    const folders = await (this.prisma as any).folder.findMany({
      where: {
        tenantId,
        providerId,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return {
      provider,
      folders,
    };
  }

  @Post('sync/:providerId')
  @ApiOperation({ summary: 'Sync folders for a specific provider' })
  @ApiResponse({ status: 200, description: 'Folders synced successfully' })
  async syncFolders(
    @Request() req: any,
    @Param('providerId') providerId: string,
  ) {
    const tenantId = req.user.tenantId;

    // Verify provider belongs to tenant
    const provider = await this.prisma.providerConfig.findFirst({
      where: {
        id: providerId,
        tenantId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found or access denied');
    }

    // Sync folders via FolderSyncService
    await this.folderSyncService.syncProviderFolders(tenantId, providerId);

    // Get synced folders
    const syncedFolders = await (this.prisma as any).folder.findMany({
      where: { tenantId, providerId },
    });

    return {
      success: true,
      foldersCount: syncedFolders.length,
      folders: syncedFolders,
    };
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync folders for all providers' })
  @ApiResponse({ status: 200, description: 'Folders synced for all providers' })
  async syncAllFolders(@Request() req: any) {
    const tenantId = req.user.tenantId;

    // Get all active providers for this tenant
    const providers = await this.prisma.providerConfig.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const results: any[] = [];

    for (const provider of providers) {
      try {
        // Sync folders via FolderSyncService
        await this.folderSyncService.syncProviderFolders(tenantId, provider.id);

        const folders = await (this.prisma as any).folder.findMany({
          where: { tenantId, providerId: provider.id },
        });

        results.push({
          providerId: provider.id,
          providerEmail: provider.email,
          success: true,
          foldersCount: folders.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          providerId: provider.id,
          providerEmail: provider.email,
          success: false,
          error: errorMessage,
        });
      }
    }

    return {
      success: true,
      results,
    };
  }

  @Post('update-counts/:providerId')
  @ApiOperation({ summary: 'Update folder counts for a provider' })
  @ApiResponse({
    status: 200,
    description: 'Folder counts updated successfully',
  })
  async updateFolderCounts(
    @Request() req: any,
    @Param('providerId') providerId: string,
  ) {
    const tenantId = req.user.tenantId;

    // Verify provider belongs to tenant
    const provider = await this.prisma.providerConfig.findFirst({
      where: {
        id: providerId,
        tenantId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found or access denied');
    }

    // Update folder counts
    await this.folderSyncService.updateAllFolderCounts(providerId);

    return {
      success: true,
      message: 'Folder counts updated successfully',
    };
  }
}
