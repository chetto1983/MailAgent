import { Module } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TenantsController } from './controllers/tenants.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TenantService],
  controllers: [TenantsController],
  exports: [TenantService],
})
export class TenantsModule {}
