import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GdprService } from './services/gdpr.service';
import { GdprController } from './controllers/gdpr.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GdprController],
  providers: [GdprService],
})
export class ComplianceModule {}
