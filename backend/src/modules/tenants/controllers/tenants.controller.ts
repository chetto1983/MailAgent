import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private tenantService: TenantService) {}

  /**
   * Get all tenants (super-admin only)
   */
  @Get()
  async getAllTenants() {
    return this.tenantService.getAllTenants();
  }

  /**
   * Get tenant by ID
   */
  @Get(':id')
  async getTenantById(@Param('id') tenantId: string) {
    return this.tenantService.getTenantById(tenantId);
  }

  /**
   * Create new tenant (super-admin only)
   */
  @Post()
  async createTenant(@Body() body: { name: string; slug: string; description?: string }) {
    return this.tenantService.createTenant(body);
  }

  /**
   * Update tenant
   */
  @Put(':id')
  async updateTenant(@Param('id') tenantId: string, @Body() body: any) {
    return this.tenantService.updateTenant(tenantId, body);
  }

  /**
   * Delete tenant
   */
  @Delete(':id')
  async deleteTenant(@Param('id') tenantId: string) {
    return this.tenantService.deleteTenant(tenantId);
  }
}
