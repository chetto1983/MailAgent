import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user profile
   */
  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isMfaEnabled: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Delete user account (GDPR - right to be forgotten)
   */
  async deleteUserAccount(userId: string) {
    // Soft delete user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`User deleted (soft): ${userId}`);

    // TODO: Schedule background job to permanently delete:
    // - User data (anonymize sensitive info)
    // - Messages and embeddings
    // - Email configurations
    // - Sessions and tokens

    return { success: true, message: 'Account deletion initiated' };
  }

  /**
   * Get user's messages
   */
  async getUserMessages(userId: string, tenantId: string, limit: number = 100) {
    return this.prisma.message.findMany({
      where: {
        userId,
        tenantId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
