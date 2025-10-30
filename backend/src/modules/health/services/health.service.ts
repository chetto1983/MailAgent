import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { createClient } from 'redis';

@Injectable()
export class HealthService {
  private logger = new Logger(HealthService.name);
  private redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  constructor(private prisma: PrismaService) {
    this.redisClient.connect().catch(() => {
      this.logger.warn('Redis health check client failed to connect');
    });
  }

  /**
   * Check overall system health
   */
  async getSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {} as any,
    };

    // Check Database
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      health.services.database = { status: 'up', responseTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      health.services.database = { status: 'down', error: errorMessage };
      health.status = 'degraded';
    }

    // Check Redis
    try {
      const start = Date.now();
      await this.redisClient.ping();
      const responseTime = Date.now() - start;
      health.services.redis = { status: 'up', responseTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      health.services.redis = { status: 'down', error: errorMessage };
      health.status = 'degraded';
    }

    // Check Mistral API
    try {
      const start = Date.now();
      // TODO: Quick check to Mistral API
      const responseTime = Date.now() - start;
      health.services.mistral = { status: 'up', responseTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      health.services.mistral = { status: 'down', error: errorMessage };
    }

    return health;
  }
}
