import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../../common/types/request.types';
import { RegisterDto } from '../dtos/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   * POST /auth/register
   */
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  /**
   * Send OTP code via email
   * POST /auth/send-otp
   */
  @Post('send-otp')
  async sendOtp(@Body() body: { email: string; tenantSlug?: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.sendOtpCode(body.email, body.tenantSlug);
  }

  /**
   * Verify OTP code
   * POST /auth/verify-otp
   */
  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; code: string; tenantSlug?: string }) {
    if (!body.email || !body.code) {
      throw new BadRequestException('Email and code are required');
    }
    return this.authService.verifyOtpCode(body.email, body.code, body.tenantSlug);
  }

  /**
   * Login user with email and password
   * POST /auth/login
   */
  @Post('login')
  async login(@Body() body: { email: string; password: string; tenantSlug?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(body.email, body.password, body.tenantSlug);
  }

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string; tenantSlug?: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.requestPasswordReset(body.email, body.tenantSlug);
  }

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string; tenantSlug?: string }) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException('Token and newPassword are required');
    }
    return this.authService.resetPassword(body.token, body.newPassword, body.tenantSlug);
  }

  /**
   * Get current logged-in user
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrentUser(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Request() req: AuthenticatedRequest) {
    await this.authService.logout(req.user.sessionId);
    return { message: 'Successfully logged out' };
  }

  /**
   * Google OAuth callback
   * POST /auth/google/callback
   */
  @Post('google/callback')
  async googleCallback(@Body() body: { code: string; tenantSlug?: string }) {
    throw new GoneException({
      message: 'Questo endpoint è stato deprecato. Utilizza /providers/google/{auth-url,connect}.',
      documentation: 'docs/implementation/PROVIDER_INTEGRATION_GUIDE.md',
    });
  }

  /**
   * Microsoft OAuth callback
   * POST /auth/microsoft/callback
   */
  @Post('microsoft/callback')
  async microsoftCallback(@Body() body: { code: string; tenantSlug?: string }) {
    throw new GoneException({
      message: 'Questo endpoint è stato deprecato. Utilizza /providers/microsoft/{auth-url,connect}.',
      documentation: 'docs/implementation/PROVIDER_INTEGRATION_GUIDE.md',
    });
  }
}
