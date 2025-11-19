import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';
import { getFeatureFlagConfig } from '../../config/features.config';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.get<string>(FEATURE_FLAG_KEY, context.getHandler());
    if (!feature) {
      return true;
    }

    const featureConfig = getFeatureFlagConfig(feature);
    if (!featureConfig || !featureConfig.enabled) {
      return false;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest | undefined>();
    const tenantId = request?.user?.tenantId;

    if (featureConfig.allowedTenants.length > 0) {
      if (!tenantId || !featureConfig.allowedTenants.includes(tenantId)) {
        return false;
      }
    }

    if (featureConfig.rolloutPercentage < 100) {
      const hashScore = this.hashTenantId(tenantId || '');
      if (hashScore >= featureConfig.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  // Deterministic hash keeps tenant rollout stable between restarts.
  private hashTenantId(tenantId: string): number {
    let hash = 0;
    for (let i = 0; i < tenantId.length; i += 1) {
      hash = (hash << 5) - hash + tenantId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 100);
  }
}
