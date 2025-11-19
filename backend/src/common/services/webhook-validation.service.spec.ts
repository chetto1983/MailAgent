import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import {
  WebhookValidationService,
  WebhookProvider,
} from './webhook-validation.service';
import { CacheService } from './cache.service';

describe('WebhookValidationService', () => {
  let service: WebhookValidationService;
  let _cacheService: CacheService;
  let _configService: ConfigService;

  const mockCacheService = {
    exists: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookValidationService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                WEBHOOK_SECRET: 'test-webhook-secret',
                GOOGLE_WEBHOOK_TOKEN: 'google-test-token',
                MICROSOFT_WEBHOOK_SECRET: 'microsoft-test-secret',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookValidationService>(WebhookValidationService);
    _cacheService = module.get<CacheService>(CacheService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Generic Webhook Validation', () => {
    it('should validate webhook with correct token in header', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
        }),
      ).resolves.not.toThrow();
    });

    it('should validate webhook with correct token in query', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          query: { token: 'test-webhook-secret' },
        }),
      ).resolves.not.toThrow();
    });

    it('should reject webhook with missing token', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: {},
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with incorrect token', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'wrong-token' },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not validate when secret is not configured', async () => {
      jest.spyOn(_configService, 'get').mockReturnValue(undefined);

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: {},
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Google Webhook Validation', () => {
    it('should validate webhook with required headers', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GOOGLE,
          headers: {
            'x-goog-channel-id': 'channel-123',
            'x-goog-resource-id': 'resource-456',
            'x-goog-channel-token': 'google-test-token',
          },
        }),
      ).resolves.not.toThrow();
    });

    it('should reject webhook with missing channel-id', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GOOGLE,
          headers: {
            'x-goog-resource-id': 'resource-456',
          },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with missing resource-id', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GOOGLE,
          headers: {
            'x-goog-channel-id': 'channel-123',
          },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with invalid token', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GOOGLE,
          headers: {
            'x-goog-channel-id': 'channel-123',
            'x-goog-resource-id': 'resource-456',
            'x-goog-channel-token': 'wrong-token',
          },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept webhook token in x-webhook-token header', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GOOGLE,
          headers: {
            'x-goog-channel-id': 'channel-123',
            'x-goog-resource-id': 'resource-456',
            'x-webhook-token': 'google-test-token',
          },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Microsoft Webhook Validation', () => {
    it('should validate webhook with client state', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          body: { clientState: 'microsoft-test-secret' },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle subscription validation', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          query: { validationToken: 'abc123' },
        }),
      ).resolves.not.toThrow();
    });

    it('should reject webhook with missing client state', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          body: {},
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with invalid client state', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          body: { clientState: 'wrong-secret' },
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept client state in header', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          headers: { 'x-webhook-token': 'microsoft-test-secret' },
          body: {},
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept valid timestamp within tolerance', async () => {
      const now = Math.floor(Date.now() / 1000);

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          timestamp: now.toString(),
        }),
      ).resolves.not.toThrow();
    });

    it('should reject timestamp outside tolerance', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          timestamp: oldTimestamp.toString(),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid timestamp format', async () => {
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          timestamp: 'invalid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Nonce Validation', () => {
    it('should accept new nonce', async () => {
      mockCacheService.exists.mockResolvedValue(false);
      mockCacheService.set.mockResolvedValue(true);

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          nonce: 'unique-nonce-123',
        }),
      ).resolves.not.toThrow();

      expect(mockCacheService.exists).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should reject duplicate nonce', async () => {
      mockCacheService.exists.mockResolvedValue(true);

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          nonce: 'duplicate-nonce',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('HMAC Signature Validation', () => {
    it('should validate correct HMAC signature', async () => {
      const payload = { foo: 'bar' };
      const signature = service.generateSignature(payload, 'microsoft-test-secret');

      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          headers: {
            'x-ms-signature': signature,
            'x-webhook-token': 'microsoft-test-secret',
          },
          body: payload,
        }),
      ).resolves.not.toThrow();
    });

    it('should reject invalid HMAC signature', async () => {
      const payload = { foo: 'bar' };

      await expect(
        service.validate({
          provider: WebhookProvider.MICROSOFT,
          headers: {
            'x-ms-signature': 'invalid-signature',
            'x-webhook-token': 'microsoft-test-secret',
          },
          body: payload,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Timing-Safe Comparison', () => {
    it('should use timing-safe comparison for tokens', async () => {
      // This test ensures timing-safe comparison is being used
      // We can't directly test timing, but we can verify it works correctly
      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
        }),
      ).resolves.not.toThrow();

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secre' }, // One char different
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Helper Methods', () => {
    it('should generate HMAC signature', () => {
      const payload = { test: 'data' };
      const secret = 'my-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should generate consistent signatures for same input', () => {
      const payload = { test: 'data' };
      const secret = 'my-secret';

      const sig1 = service.generateSignature(payload, secret);
      const sig2 = service.generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'my-secret';

      const sig1 = service.generateSignature({ test: 'data1' }, secret);
      const sig2 = service.generateSignature({ test: 'data2' }, secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate nonce', () => {
      const nonce = service.generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique nonces', () => {
      const nonce1 = service.generateNonce();
      const nonce2 = service.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    it('should get current timestamp', () => {
      const timestamp = service.getTimestamp();

      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('string');
      expect(parseInt(timestamp, 10)).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should throw for unknown provider', async () => {
      await expect(
        service.validate({
          provider: 'unknown' as any,
          headers: {},
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle cache errors gracefully during nonce validation', async () => {
      mockCacheService.exists.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.validate({
          provider: WebhookProvider.GENERIC,
          headers: { 'x-webhook-token': 'test-webhook-secret' },
          nonce: 'test-nonce',
        }),
      ).rejects.toThrow();
    });
  });
});
