
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('emails')
  async getEmailAnalytics(@Request() req: AuthenticatedRequest) {
    return this.analyticsService.getEmailAnalytics(req.user.tenantId);
  }
}
