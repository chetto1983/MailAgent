import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async enableShutdownHooks(app: INestApplication) {
    // Use process event instead of Prisma's $on for type safety
    process.on('SIGINT', async () => {
      await this.$disconnect();
      await app.close();
    });

    process.on('SIGTERM', async () => {
      await this.$disconnect();
      await app.close();
    });
  }
}
