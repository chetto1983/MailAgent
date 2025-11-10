import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderConfigService } from './provider-config.service';

describe('ProviderConfigService', () => {
  let prisma: any;
  let crypto: any;
  let googleOAuth: any;
  let microsoftOAuth: any;
  let imap: any;
  let caldav: any;
  let syncScheduler: any;
  let webhookLifecycle: any;
  let queueService: any;
  let service: ProviderConfigService;

  const TENANT_ID = 'tenant-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    prisma = {
      providerConfig: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      email: {
        deleteMany: jest.fn(),
      },
    };

    crypto = {
      encrypt: jest.fn().mockReturnValue({ encrypted: 'cipher', iv: 'iv' }),
      decrypt: jest.fn().mockReturnValue('plain'),
    };

    googleOAuth = {
      exchangeCodeForTokens: jest.fn(),
    };

    microsoftOAuth = {
      exchangeCodeForTokens: jest.fn(),
    };

    imap = {
      testConnection: jest.fn(),
      testSmtpConnection: jest.fn(),
      listFolders: jest.fn(),
      fetchMessages: jest.fn(),
    };

    caldav = {
      testCalDavConnection: jest.fn(),
      testCardDavConnection: jest.fn(),
    };

    syncScheduler = {
      syncProviderNow: jest.fn().mockResolvedValue(undefined),
    };

    webhookLifecycle = {
      autoCreateWebhook: jest.fn().mockResolvedValue(true),
      removeWebhookForProvider: jest.fn().mockResolvedValue(undefined),
    };

    queueService = {
      removeJobsForProvider: jest.fn().mockResolvedValue(0),
    };

    service = new ProviderConfigService(
      prisma,
      crypto,
      googleOAuth,
      microsoftOAuth,
      imap,
      caldav,
      syncScheduler,
      webhookLifecycle,
      queueService,
    );
  });

  describe('connectGoogleProvider', () => {
    const dto = {
      email: 'user@example.com',
      authorizationCode: 'auth-code',
      supportsCalendar: true,
      supportsContacts: false,
      isDefault: true,
    };

    it('creates or updates provider config with sanitized response', async () => {
      googleOAuth.exchangeCodeForTokens.mockResolvedValue({
        email: dto.email,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
      });

      prisma.providerConfig.upsert.mockResolvedValue({
        id: 'config-1',
        email: dto.email,
        providerType: 'google',
        accessToken: 'cipher',
        refreshToken: 'cipher',
        tokenEncryptionIv: 'iv',
      });

      const result = await service.connectGoogleProvider(TENANT_ID, USER_ID, dto);

      expect(googleOAuth.exchangeCodeForTokens).toHaveBeenCalledWith(dto.authorizationCode);
      expect(prisma.providerConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_email_providerType: {
              tenantId: TENANT_ID,
              email: dto.email,
              providerType: 'google',
            },
          },
        }),
      );
      expect(result).toEqual({
        id: 'config-1',
        email: dto.email,
        providerType: 'google',
      });
      expect(syncScheduler.syncProviderNow).toHaveBeenCalledWith('config-1', 'high');
      expect(webhookLifecycle.autoCreateWebhook).toHaveBeenCalledWith('config-1');
    });

    it('throws when emails mismatch', async () => {
      googleOAuth.exchangeCodeForTokens.mockResolvedValue({
        email: 'different@example.com',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(),
      });

      await expect(
        service.connectGoogleProvider(TENANT_ID, USER_ID, dto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.providerConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('connectGenericProvider', () => {
    const dto = {
      email: 'generic@example.com',
      displayName: 'Generic Provider',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapUsername: 'generic@example.com',
      imapPassword: 'secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUsername: 'generic@example.com',
      smtpPassword: 'smtp-secret',
      caldavUrl: 'https://caldav.example.com',
      caldavUsername: 'generic@example.com',
      caldavPassword: 'caldav-secret',
      carddavUrl: 'https://carddav.example.com',
      carddavUsername: 'generic@example.com',
      carddavPassword: 'carddav-secret',
      supportsCalendar: true,
      supportsContacts: true,
      isDefault: true,
    };

    it('tests connections, encrypts secrets, and stores config', async () => {
      imap.testConnection.mockResolvedValue(true);
      imap.testSmtpConnection.mockResolvedValue(true);
      caldav.testCalDavConnection.mockResolvedValue(true);
      caldav.testCardDavConnection.mockResolvedValue(true);
      prisma.providerConfig.upsert.mockResolvedValue({
        id: 'generic-1',
        email: dto.email,
        providerType: 'generic',
        imapPassword: 'cipher',
        imapEncryptionIv: 'iv',
      });

      const result = await service.connectGenericProvider(TENANT_ID, USER_ID, dto);

      expect(imap.testConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          host: dto.imapHost,
          username: dto.imapUsername,
          password: dto.imapPassword,
        }),
      );
      expect(crypto.encrypt).toHaveBeenCalledWith(dto.imapPassword);
      expect(prisma.providerConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            email: dto.email,
            smtpHost: dto.smtpHost,
            caldavUrl: dto.caldavUrl,
          }),
        }),
      );
      expect(result).toEqual({
        id: 'generic-1',
        email: dto.email,
        providerType: 'generic',
      });
      expect(syncScheduler.syncProviderNow).toHaveBeenCalledWith('generic-1', 'high');
      expect(webhookLifecycle.autoCreateWebhook).not.toHaveBeenCalled();
    });
  });

  describe('testImapConnection', () => {
    it('throws when provider not found', async () => {
      prisma.providerConfig.findFirst.mockResolvedValue(null);

      await expect(
        service.testImapConnection(TENANT_ID, 'provider-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('tests IMAP connection with decrypted credentials', async () => {
      prisma.providerConfig.findFirst.mockResolvedValue({
        id: 'provider-x',
        tenantId: TENANT_ID,
        providerType: 'generic',
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapUsername: 'generic@example.com',
        imapPassword: 'cipher',
        imapEncryptionIv: 'iv',
        imapUseTls: true,
      });
      imap.testConnection.mockResolvedValue(true);

      const result = await service.testImapConnection(TENANT_ID, 'provider-x');

      expect(crypto.decrypt).toHaveBeenCalledWith('cipher', 'iv');
      expect(imap.testConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'imap.example.com',
          username: 'generic@example.com',
          password: 'plain',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'IMAP connection successful',
        host: 'imap.example.com',
        port: 993,
      });
    });
  });

  describe('deleteProviderConfig', () => {
    it('removes jobs, webhooks, emails, and provider record', async () => {
      prisma.providerConfig.findFirst.mockResolvedValue({
        id: 'provider-x',
        tenantId: TENANT_ID,
        providerType: 'google',
      });

      await service.deleteProviderConfig(TENANT_ID, 'provider-x');

      expect(queueService.removeJobsForProvider).toHaveBeenCalledWith('provider-x');
      expect(webhookLifecycle.removeWebhookForProvider).toHaveBeenCalledWith('provider-x');
      expect(prisma.email.deleteMany).toHaveBeenCalledWith({ where: { providerId: 'provider-x' } });
      expect(prisma.providerConfig.delete).toHaveBeenCalledWith({ where: { id: 'provider-x' } });
    });

    it('throws when provider does not exist', async () => {
      prisma.providerConfig.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteProviderConfig(TENANT_ID, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.providerConfig.delete).not.toHaveBeenCalled();
    });
  });
});
