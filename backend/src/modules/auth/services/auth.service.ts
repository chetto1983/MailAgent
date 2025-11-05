import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  GoneException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { nanoid } from 'nanoid';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const normalizedEmail = data.email.trim();
    const tenantSlug = normalizedEmail.toLowerCase();

    let tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    const tenantExisted = Boolean(tenant);

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: normalizedEmail,
          slug: tenantSlug,
          description: `Workspace for ${normalizedEmail}`,
          isActive: true,
        },
      });
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: normalizedEmail,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isMfaEnabled: true,
        role: tenantExisted ? undefined : 'admin',
      },
    });

    // Send OTP for email verification (non-blocking - continue even if email fails)
    try {
      await this.sendOtpCode(normalizedEmail, tenant.slug);
    } catch (error) {
      this.logger.warn(`Failed to send OTP email to ${normalizedEmail}: ${error instanceof Error ? error.message : String(error)}`);
      // Continue anyway - in development, email might not be configured
    }

    this.logger.log(`User registered: ${user.email}`);

    return {
      success: true,
      message: 'User registered successfully. Check your email for OTP code to verify your account.',
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
  }

  /**
   * Generate and send OTP code
   */
  async sendOtpCode(email: string, tenantSlug?: string) {
    const normalizedEmail = email.trim();
    const slug = (tenantSlug || normalizedEmail).toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    });

    if (!user) {
      // For security, don't reveal if user exists - just return success
      this.logger.warn(`OTP requested for non-existent user: ${normalizedEmail}`);
      return { success: true, message: 'If the email exists, an OTP has been sent' };
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear previous OTP codes for this user
    await this.prisma.mfaCode.deleteMany({
      where: { userId: user.id, type: 'email', isUsed: false },
    });

    // Create OTP record
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRATION || '900000'));
    await this.prisma.mfaCode.create({
      data: {
        userId: user.id,
        code,
        type: 'email',
        expiresAt,
      },
    });

    // Send email with OTP (non-blocking - continue even if email fails)
    try {
      await this.emailService.sendOtp(user.email, code);
      this.logger.log(`OTP sent to: ${user.email}`);
    } catch (error) {
      this.logger.warn(`Failed to send OTP email to ${user.email}: ${error instanceof Error ? error.message : String(error)}`);
      // Continue anyway - in development, email might not be configured
    }

    return {
      success: true,
      message: 'OTP code generated. Check your email for the code.',
    };
  }


  /**
   * Verify OTP code
   * Verifies the OTP and returns an access token on success
   */
  async verifyOtpCode(email: string, code: string, tenantSlug?: string) {
    const normalizedEmail = email.trim();
    const slug = (tenantSlug || normalizedEmail).toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or code');
    }

    // Find valid OTP code
    const otpRecord = await this.prisma.mfaCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'email',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      this.logger.warn(`OTP verification failed for user: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Mark OTP as used
    await this.prisma.mfaCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    const sessionId = nanoid();

    // Generate JWT token
    const token = this.jwtService.sign({
      sessionId,
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    this.logger.log(`OTP verified for user: ${user.email}`);

    return {
      success: true,
      message: 'OTP verified successfully',
      accessToken: token,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: tenant.id,
      },
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string, tenantSlug?: string) {
    const normalizedEmail = email.trim();
    const slug = (tenantSlug || normalizedEmail).toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If MFA is enabled, request OTP
    if (user.isMfaEnabled) {
      await this.sendOtpCode(normalizedEmail, slug);
      return {
        mfaRequired: true,
        message: 'OTP code has been sent to your email',
      };
    }

    const sessionId = nanoid();

    // Generate JWT token
    const token = this.jwtService.sign({
      sessionId,
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      accessToken: token,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: tenant.id,
      },
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, tenantSlug?: string) {
    const normalizedEmail = email.trim();
    const slug = (tenantSlug || normalizedEmail).toLowerCase();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    });

    if (!user) {
      // For security, don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      };
    }

    // Generate reset token
    const token = this.jwtService.sign(
      { email: user.email, type: 'password-reset' },
      { expiresIn: '15m' },
    );

    // Store reset token in database
    const expiresAt = new Date(Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRATION || '900000'));
    await this.prisma.passwordResetToken.create({
      data: {
        userEmail: normalizedEmail,
        token,
        tenantId: tenant.id,
        expiresAt,
      },
    });

    // Send reset email
    await this.emailService.sendPasswordReset(normalizedEmail, token);

    this.logger.log(`Password reset requested for: ${email}`);

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, _tenantSlug?: string) {
    // Verify token
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Check if token exists in database and not used
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: resetToken.tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: resetToken.userEmail } },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Mark reset token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isUsed: true },
    });

    this.logger.log(`Password reset completed for: ${user.email}`);

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Logout user
   */
  async logout(sessionId?: string | null) {
    if (!sessionId) {
      this.logger.warn('Logout called without a valid sessionId');
      return;
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    }).catch(() => {
      // Session already deleted, ignore
    });

    this.logger.log(`User logged out: ${sessionId}`);
  }

  /**
   * Handle Google OAuth
   */
  async handleGoogleOAuth(_code: string, _tenantSlug?: string) {
    throw new GoneException({
      message:
        "Questo metodo è stato deprecato. Richiedi l'URL OAuth tramite /providers/google/auth-url e completa la procedura con /providers/google/connect.",
      documentation: 'docs/implementation/PROVIDER_INTEGRATION_GUIDE.md',
    });
  }

  /**
   * Handle Microsoft OAuth
   */
  async handleMicrosoftOAuth(_code: string, _tenantSlug?: string) {
    throw new GoneException({
      message:
        "Questo metodo è stato deprecato. Usa /providers/microsoft/auth-url e /providers/microsoft/connect per completare l'OAuth.",
      documentation: 'docs/implementation/PROVIDER_INTEGRATION_GUIDE.md',
    });
  }
}
