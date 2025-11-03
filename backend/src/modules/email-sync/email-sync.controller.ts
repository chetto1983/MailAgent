import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from './services/queue.service';
import { SyncSchedulerService } from './services/sync-scheduler.service';

@ApiTags('Email Sync')
@Controller('email-sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailSyncController {
  constructor(
    private queueService: QueueService,
    private schedulerService: SyncSchedulerService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get email sync system status' })
  @ApiResponse({ status: 200, description: 'Returns sync system status' })
  async getStatus() {
    return await this.schedulerService.getSyncStats();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get queue status' })
  @ApiResponse({ status: 200, description: 'Returns status of all queues' })
  async getQueueStatus() {
    return await this.queueService.getQueueStatus();
  }

  @Post('sync/:providerId')
  @ApiOperation({ summary: 'Manually trigger sync for a provider' })
  @ApiResponse({ status: 200, description: 'Sync job queued successfully' })
  async syncProvider(
    @Request() req: any,
    @Param('providerId') providerId: string,
  ) {
    await this.schedulerService.syncProviderNow(providerId, 'high');

    return {
      success: true,
      message: `Sync job queued for provider ${providerId}`,
    };
  }

  @Post('queues/:priority/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue(@Param('priority') priority: 'high' | 'normal' | 'low') {
    await this.queueService.pauseQueue(priority);

    return {
      success: true,
      message: `Queue ${priority} paused`,
    };
  }

  @Post('queues/:priority/resume')
  @ApiOperation({ summary: 'Resume a queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('priority') priority: 'high' | 'normal' | 'low') {
    await this.queueService.resumeQueue(priority);

    return {
      success: true,
      message: `Queue ${priority} resumed`,
    };
  }

  @Post('queues/:priority/clear')
  @ApiOperation({ summary: 'Clear all jobs from a queue (DANGEROUS)' })
  @ApiResponse({ status: 200, description: 'Queue cleared successfully' })
  async clearQueue(@Param('priority') priority: 'high' | 'normal' | 'low') {
    await this.queueService.obliterateQueue(priority);

    return {
      success: true,
      message: `Queue ${priority} cleared - all jobs deleted`,
    };
  }
}
