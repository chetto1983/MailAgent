import { Controller, Get, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * Get current user profile
   * GET /users/me
   */
  @Get('me')
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getUserProfile(req.user.userId);
  }

  /**
   * Update user profile
   * PUT /users/me
   */
  @Put('me')
  async updateMyProfile(@Request() req: AuthenticatedRequest, @Body() body: { firstName?: string; lastName?: string }) {
    return this.usersService.updateUserProfile(req.user.userId, body);
  }

  /**
   * Delete account (GDPR)
   * DELETE /users/me
   */
  @Delete('me')
  async deleteMyAccount(@Request() req: AuthenticatedRequest) {
    return this.usersService.deleteUserAccount(req.user.userId);
  }

  /**
   * Get user's messages
   * GET /users/me/messages
   */
  @Get('me/messages')
  async getMyMessages(@Request() req: AuthenticatedRequest) {
    return this.usersService.getUserMessages(req.user.userId, req.user.tenantId);
  }
}
