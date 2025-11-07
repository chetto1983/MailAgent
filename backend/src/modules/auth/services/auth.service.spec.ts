import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { CryptoService } from '../../../common/services/crypto.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-session-id-12345'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let cryptoService: jest.Mocked<CryptoService>;

  // Mock data
  const mockTenant = {
    id: 'tenant-id-123',
    name: 'test@example.com',
    slug: 'test@example.com',
    description: 'Workspace for test@example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-id-123',
    tenantId: 'tenant-id-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    isMfaEnabled: true,
    role: 'admin',
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtpRecord = {
    id: 'otp-id-123',
    userId: 'user-id-123',
    code: '123456',
    type: 'email' as const,
    isUsed: false,
    expiresAt: new Date(Date.now() + 900000), // 15 minutes from now
    createdAt: new Date(),
  };

  const mockSession = {
    id: 'mock-session-id-12345',
    userId: 'user-id-123',
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    userAgent: 'unknown',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaService = {
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      mfaCode: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockEmailService = {
      sendOtp: jest.fn(),
      sendPasswordReset: jest.fn(),
    };

    const mockCryptoService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    cryptoService = module.get(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('register', () => {
    it('should register a new user with new tenant', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);
      prismaService.tenant.create.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'User registered successfully. Check your email for OTP code to verify your account.',
        userId: 'user-id-123',
        tenantId: 'tenant-id-123',
        tenantSlug: 'test@example.com',
      });
      expect(prismaService.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'test@example.com',
          slug: 'test@example.com',
          description: 'Workspace for test@example.com',
          isActive: true,
        },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-id-123',
          email: 'test@example.com',
          passwordHash: '$2b$10$hashedPassword',
          firstName: 'Test',
          lastName: 'User',
          isMfaEnabled: true,
          role: 'admin', // First user becomes admin
        },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    });

    it('should register a new user with existing tenant', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
      prismaService.user.create.mockResolvedValue({ ...mockUser, role: 'user' });
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(prismaService.tenant.create).not.toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-id-123',
          email: 'test@example.com',
          passwordHash: '$2b$10$hashedPassword',
          firstName: undefined,
          lastName: undefined,
          isMfaEnabled: true,
          role: undefined, // Not the first user, no admin role
        },
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Execute & Assert
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('User already exists with this email');
    });

    it('should normalize email by trimming whitespace', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);
      prismaService.tenant.create.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      await service.register({
        email: '  test@example.com  ',
        password: 'Password123!',
      });

      // Assert
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com', // Trimmed
          }),
        }),
      );
    });

    it('should continue registration even if OTP email fails', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockRejectedValue(new Error('Email service unavailable'));

      // Execute
      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
      });

      // Assert - Should still succeed
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-id-123');
    });

    it('should hash password with bcrypt salt rounds of 10', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      await service.register({
        email: 'test@example.com',
        password: 'MySecurePassword123!',
      });

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('MySecurePassword123!', 10);
    });
  });

  describe('sendOtpCode', () => {
    it('should generate and send OTP code to user', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      const result = await service.sendOtpCode('test@example.com', 'test@example.com');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'OTP code generated. Check your email for the code.',
      });
      expect(prismaService.mfaCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', type: 'email', isUsed: false },
      });
      expect(prismaService.mfaCode.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id-123',
          code: expect.stringMatching(/^\d{6}$/), // 6-digit code
          type: 'email',
          expiresAt: expect.any(Date),
        },
      });
      expect(emailService.sendOtp).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('should throw BadRequestException if tenant not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.sendOtpCode('test@example.com', 'nonexistent')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendOtpCode('test@example.com', 'nonexistent')).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should return success without sending OTP if user not found (security)', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Execute
      const result = await service.sendOtpCode('nonexistent@example.com', 'test@example.com');

      // Assert - Should not reveal that user doesn't exist
      expect(result).toEqual({
        success: true,
        message: 'If the email exists, an OTP has been sent',
      });
      expect(emailService.sendOtp).not.toHaveBeenCalled();
    });

    it('should clear previous OTP codes before creating new one', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 2 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      await service.sendOtpCode('test@example.com', 'test@example.com');

      // Assert
      expect(prismaService.mfaCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', type: 'email', isUsed: false },
      });
      // Verify deleteMany was called before create
      const deleteManyCallOrder = prismaService.mfaCode.deleteMany.mock.invocationCallOrder[0];
      const createCallOrder = prismaService.mfaCode.create.mock.invocationCallOrder[0];
      expect(deleteManyCallOrder).toBeLessThan(createCallOrder);
    });

    it('should continue even if email sending fails', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockRejectedValue(new Error('SMTP server unavailable'));

      // Execute
      const result = await service.sendOtpCode('test@example.com', 'test@example.com');

      // Assert - Should still succeed
      expect(result.success).toBe(true);
    });

    it('should generate different 6-digit OTP codes', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute multiple times
      await service.sendOtpCode('test@example.com', 'test@example.com');
      await service.sendOtpCode('test@example.com', 'test@example.com');
      await service.sendOtpCode('test@example.com', 'test@example.com');

      // Assert - All codes should be 6 digits
      const calls = prismaService.mfaCode.create.mock.calls;
      calls.forEach((call) => {
        const code = call[0].data.code;
        expect(code).toMatch(/^\d{6}$/);
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThanOrEqual(999999);
      });
    });
  });

  describe('verifyOtpCode', () => {
    it('should verify valid OTP and return access token', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.findFirst.mockResolvedValue(mockOtpRecord);
      prismaService.mfaCode.update.mockResolvedValue({ ...mockOtpRecord, isUsed: true });
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      // Execute
      const result = await service.verifyOtpCode('test@example.com', '123456', 'test@example.com');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'OTP verified successfully',
        accessToken: 'mock-jwt-token',
        sessionId: 'mock-session-id-12345',
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          tenantId: 'tenant-id-123',
        },
      });
      expect(prismaService.mfaCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-id-123' },
        data: { isUsed: true },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sessionId: 'mock-session-id-12345',
        userId: 'user-id-123',
        tenantId: 'tenant-id-123',
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException if tenant not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.verifyOtpCode('test@example.com', '123456', 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.verifyOtpCode('nonexistent@example.com', '123456', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifyOtpCode('nonexistent@example.com', '123456', 'test@example.com'),
      ).rejects.toThrow('Invalid email or code');
    });

    it('should throw UnauthorizedException if OTP is invalid', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.findFirst.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.verifyOtpCode('test@example.com', '999999', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifyOtpCode('test@example.com', '999999', 'test@example.com'),
      ).rejects.toThrow('Invalid or expired OTP code');
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.findFirst.mockResolvedValue(null); // Expired OTP won't be found

      // Execute & Assert
      await expect(
        service.verifyOtpCode('test@example.com', '123456', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should create session with 24-hour expiration', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.findFirst.mockResolvedValue(mockOtpRecord);
      prismaService.mfaCode.update.mockResolvedValue({ ...mockOtpRecord, isUsed: true });
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      // Execute
      await service.verifyOtpCode('test@example.com', '123456', 'test@example.com');

      // Assert
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-session-id-12345',
          userId: 'user-id-123',
          token: 'mock-jwt-token',
          expiresAt: expect.any(Date),
          ipAddress: '127.0.0.1',
          userAgent: 'unknown',
        },
      });

      // Check that expiresAt is ~24 hours from now
      const createCall = prismaService.session.create.mock.calls[0];
      const expiresAt = createCall[0].data.expiresAt as Date;
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);
      expect(expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000);
    });

    it('should update user lastLogin timestamp', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.mfaCode.findFirst.mockResolvedValue(mockOtpRecord);
      prismaService.mfaCode.update.mockResolvedValue({ ...mockOtpRecord, isUsed: true });
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      // Execute
      await service.verifyOtpCode('test@example.com', '123456', 'test@example.com');

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('login', () => {
    it('should login user without MFA and return access token', async () => {
      // Setup
      const userWithoutMfa = { ...mockUser, isMfaEnabled: false };
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(userWithoutMfa);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...userWithoutMfa, lastLogin: new Date() });

      // Execute
      const result = await service.login('test@example.com', 'Password123!', 'test@example.com');

      // Assert
      expect(result).toEqual({
        success: true,
        accessToken: 'mock-jwt-token',
        sessionId: 'mock-session-id-12345',
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          tenantId: 'tenant-id-123',
        },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('Password123!', '$2b$10$hashedPassword');
    });

    it('should login user with MFA and request OTP', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser); // MFA enabled
      mockedBcrypt.compare.mockResolvedValue(true as never);
      prismaService.mfaCode.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.mfaCode.create.mockResolvedValue(mockOtpRecord);
      emailService.sendOtp.mockResolvedValue(undefined);

      // Execute
      const result = await service.login('test@example.com', 'Password123!', 'test@example.com');

      // Assert
      expect(result).toEqual({
        mfaRequired: true,
        message: 'OTP code has been sent to your email',
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(prismaService.session.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if tenant not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.login('test@example.com', 'Password123!', 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.login('nonexistent@example.com', 'Password123!', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login('nonexistent@example.com', 'Password123!', 'test@example.com'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Execute & Assert
      await expect(
        service.login('test@example.com', 'WrongPassword', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login('test@example.com', 'WrongPassword', 'test@example.com'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should normalize email by trimming whitespace', async () => {
      // Setup
      const userWithoutMfa = { ...mockUser, isMfaEnabled: false };
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(userWithoutMfa);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...userWithoutMfa, lastLogin: new Date() });

      // Execute
      await service.login('  test@example.com  ', 'Password123!', 'test@example.com');

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { tenantId_email: { tenantId: 'tenant-id-123', email: 'test@example.com' } },
      });
    });

    it('should update lastLogin timestamp on successful login', async () => {
      // Setup
      const userWithoutMfa = { ...mockUser, isMfaEnabled: false };
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(userWithoutMfa);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      prismaService.session.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue({ ...userWithoutMfa, lastLogin: new Date() });

      // Execute
      await service.login('test@example.com', 'Password123!', 'test@example.com');

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and send email', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-reset-token');
      prismaService.passwordResetToken.create.mockResolvedValue({
        id: 'reset-token-id-123',
        userEmail: 'test@example.com',
        token: 'mock-reset-token',
        tenantId: 'tenant-id-123',
        isUsed: false,
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
      });
      emailService.sendPasswordReset.mockResolvedValue(undefined);

      // Execute
      const result = await service.requestPasswordReset('test@example.com', 'test@example.com');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: 'test@example.com', type: 'password-reset' },
        { expiresIn: '15m' },
      );
      expect(prismaService.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userEmail: 'test@example.com',
          token: 'mock-reset-token',
          tenantId: 'tenant-id-123',
          expiresAt: expect.any(Date),
        },
      });
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        'mock-reset-token',
      );
    });

    it('should throw BadRequestException if tenant not found', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.requestPasswordReset('test@example.com', 'nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return success without sending email if user not found (security)', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Execute
      const result = await service.requestPasswordReset(
        'nonexistent@example.com',
        'test@example.com',
      );

      // Assert - Should not reveal that user doesn't exist
      expect(result).toEqual({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should create reset token with 15-minute expiration', async () => {
      // Setup
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-reset-token');
      prismaService.passwordResetToken.create.mockResolvedValue({
        id: 'reset-token-id-123',
        userEmail: 'test@example.com',
        token: 'mock-reset-token',
        tenantId: 'tenant-id-123',
        isUsed: false,
        expiresAt: new Date(Date.now() + 900000),
        createdAt: new Date(),
      });
      emailService.sendPasswordReset.mockResolvedValue(undefined);

      // Execute
      await service.requestPasswordReset('test@example.com', 'test@example.com');

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), { expiresIn: '15m' });
    });
  });

  describe('resetPassword', () => {
    const mockResetToken = {
      id: 'reset-token-id-123',
      userEmail: 'test@example.com',
      token: 'valid-reset-token',
      tenantId: 'tenant-id-123',
      isUsed: false,
      expiresAt: new Date(Date.now() + 900000), // 15 minutes from now
      createdAt: new Date(),
    };

    it('should reset password with valid token', async () => {
      // Setup
      jwtService.verify.mockReturnValue({ email: 'test@example.com', type: 'password-reset' });
      prismaService.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValue('$2b$10$newHashedPassword' as never);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newHashedPassword',
      });
      prismaService.passwordResetToken.update.mockResolvedValue({
        ...mockResetToken,
        isUsed: true,
      });

      // Execute
      const result = await service.resetPassword('valid-reset-token', 'NewPassword123!');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Password has been reset successfully',
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid-reset-token');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { passwordHash: '$2b$10$newHashedPassword' },
      });
      expect(prismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'reset-token-id-123' },
        data: { isUsed: true },
      });
    });

    it('should throw UnauthorizedException if JWT token is invalid', async () => {
      // Setup
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute & Assert
      await expect(service.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });

    it('should throw UnauthorizedException if reset token not found in database', async () => {
      // Setup
      jwtService.verify.mockReturnValue({ email: 'test@example.com', type: 'password-reset' });
      prismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.resetPassword('unknown-token', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if reset token is already used', async () => {
      // Setup
      jwtService.verify.mockReturnValue({ email: 'test@example.com', type: 'password-reset' });
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        ...mockResetToken,
        isUsed: true,
      });

      // Execute & Assert
      await expect(service.resetPassword('used-token', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if reset token is expired', async () => {
      // Setup
      jwtService.verify.mockReturnValue({ email: 'test@example.com', type: 'password-reset' });
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        ...mockResetToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      // Execute & Assert
      await expect(service.resetPassword('expired-token', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      // Setup
      jwtService.verify.mockReturnValue({ email: 'test@example.com', type: 'password-reset' });
      prismaService.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.resetPassword('valid-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should delete session on logout', async () => {
      // Setup
      prismaService.session.delete.mockResolvedValue(mockSession);

      // Execute
      await service.logout('mock-session-id-12345');

      // Assert
      expect(prismaService.session.delete).toHaveBeenCalledWith({
        where: { id: 'mock-session-id-12345' },
      });
    });

    it('should handle logout without sessionId gracefully', async () => {
      // Execute
      await service.logout(null);

      // Assert
      expect(prismaService.session.delete).not.toHaveBeenCalled();
    });

    it('should handle logout when session is already deleted', async () => {
      // Setup
      prismaService.session.delete.mockRejectedValue(new Error('Session not found'));

      // Execute & Assert - Should not throw
      await expect(service.logout('non-existent-session')).resolves.not.toThrow();
    });
  });

  describe('Deprecated OAuth Methods', () => {
    it('should throw GoneException for handleGoogleOAuth', async () => {
      // Execute & Assert
      await expect(service.handleGoogleOAuth('auth-code', 'tenant')).rejects.toThrow(
        GoneException,
      );
      await expect(service.handleGoogleOAuth('auth-code', 'tenant')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('deprecato'),
        }),
      );
    });

    it('should throw GoneException for handleMicrosoftOAuth', async () => {
      // Execute & Assert
      await expect(service.handleMicrosoftOAuth('auth-code', 'tenant')).rejects.toThrow(
        GoneException,
      );
      await expect(service.handleMicrosoftOAuth('auth-code', 'tenant')).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('deprecato'),
        }),
      );
    });
  });
});
