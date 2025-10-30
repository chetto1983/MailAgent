import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  /**
   * Get system health status
   * GET /health
   */
  @Get()
  async getHealth() {
    return this.healthService.getSystemHealth();
  }

  /**
   * Ready probe
   */
  @Get('ready')
  async getReadiness() {
    return { status: 'ready' };
  }

  /**
   * Liveness probe
   */
  @Get('live')
  async getLiveness() {
    return { status: 'alive' };
  }
}
