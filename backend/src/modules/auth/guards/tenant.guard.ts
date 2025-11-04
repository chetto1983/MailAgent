import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Tenant Guard: Ensures tenant is properly identified and user has access
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('User context missing from request.');
    }

    const headerTenantRaw = request.headers['x-tenant-id'];
    const headerTenantId = Array.isArray(headerTenantRaw)
      ? headerTenantRaw[0]
      : headerTenantRaw;

    const providedTenantIdentifier = headerTenantId || user.tenantId;

    if (!providedTenantIdentifier) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    // Look up tenant by id or slug
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { id: providedTenantIdentifier },
          { slug: providedTenantIdentifier },
        ],
      },
    });

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Invalid or inactive tenant');
    }

    const resolvedTenantId = tenant.id;
    const isCrossTenant = user.tenantId && user.tenantId !== resolvedTenantId;

    if (isCrossTenant && user.role !== 'super-admin') {
      throw new ForbiddenException('Cross-tenant access requires super-admin privileges.');
    }

    // Attach tenant to request
    request.tenant = tenant;
    request.activeTenantId = resolvedTenantId;
    request.user = {
      ...user,
      originalTenantId: user.originalTenantId ?? user.tenantId,
      tenantId: resolvedTenantId,
    };

    return true;
  }
}
