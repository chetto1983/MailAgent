import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async logAudit(
    tenantId: string,
    userId: string | null,
    action: string,
    entity: string,
    entityId: string,
    changes?: any,
    ipAddress?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          entity,
          entityId,
          changes,
          ipAddress,
        },
      });

      this.logger.log(`Audit logged: ${action} on ${entity} (${entityId})`);
    } catch (error) {
      this.logger.error('Failed to log audit:', error);
    }
  }
}
