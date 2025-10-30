import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Tenant Guard: Ensures tenant is properly identified and user has access
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract tenant from JWT or header or subdomain
    let tenantId = request.user?.tenantId;

    if (!tenantId) {
      // Try to get from header
      tenantId = request.headers['x-tenant-id'];
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.isActive) {
      throw new BadRequestException('Invalid or inactive tenant');
    }

    // Attach tenant to request
    request.tenant = tenant;

    return true;
  }
}
