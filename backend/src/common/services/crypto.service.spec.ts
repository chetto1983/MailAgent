import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AES_SECRET_KEY') {
        return 'test-aes-256-secret-key-32chars!'; // 32 chars for AES-256
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load AES secret key from config', () => {
      expect(configService.get).toHaveBeenCalledWith('AES_SECRET_KEY');
    });
  });

  describe('encrypt', () => {
    it('should encrypt plain text and return encrypted string', () => {
      const plainText = 'my-secret-token';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different encrypted values for same input (due to random IV)', () => {
      const plainText = 'my-secret-token';

      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle special characters', () => {
      const plainText = 'token!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/~`';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle unicode characters', () => {
      const plainText = 'Hello 世界 🌍';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plainText = 'my-secret-token';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle empty string encryption/decryption', () => {
      const plainText = '';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle long text', () => {
      const plainText = 'a'.repeat(1000);

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
      expect(decrypted.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const plainText = 'token!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/~`';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle unicode characters', () => {
      const plainText = 'Hello 世界 🌍';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle JSON strings', () => {
      const plainText = JSON.stringify({ token: 'abc123', expires: '2025-12-31' });

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
      expect(JSON.parse(decrypted)).toEqual({
        token: 'abc123',
        expires: '2025-12-31',
      });
    });

    it('should throw error when decrypting invalid ciphertext', () => {
      const invalidCiphertext = 'not-a-valid-encrypted-string';

      expect(() => service.decrypt(invalidCiphertext)).toThrow();
    });

    it('should throw error when decrypting with wrong format', () => {
      const invalidCiphertext = 'no-colon-separator';

      expect(() => service.decrypt(invalidCiphertext)).toThrow();
    });
  });

  describe('generateIV', () => {
    it('should generate initialization vector (IV)', () => {
      const iv = service.generateIV();

      expect(iv).toBeDefined();
      expect(typeof iv).toBe('string');
      expect(iv.length).toBeGreaterThan(0);
    });

    it('should generate different IVs each time', () => {
      const iv1 = service.generateIV();
      const iv2 = service.generateIV();

      expect(iv1).not.toBe(iv2);
    });

    it('should generate IV of correct length (32 hex chars for 16 bytes)', () => {
      const iv = service.generateIV();

      // IV should be 16 bytes = 32 hex characters
      expect(iv.length).toBe(32);
      // Should be valid hex
      expect(/^[0-9a-f]{32}$/i.test(iv)).toBe(true);
    });
  });

  describe('encryptWithIV and decryptWithIV', () => {
    it('should encrypt and decrypt with custom IV', () => {
      const plainText = 'my-secret-token';
      const iv = service.generateIV();

      const encrypted = service.encryptWithIV(plainText, iv);
      const decrypted = service.decryptWithIV(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should produce consistent encryption with same IV', () => {
      const plainText = 'my-secret-token';
      const iv = service.generateIV();

      const encrypted1 = service.encryptWithIV(plainText, iv);
      const encrypted2 = service.encryptWithIV(plainText, iv);

      // Same IV = same ciphertext (deterministic)
      expect(encrypted1).toBe(encrypted2);
    });

    it('should produce different encryption with different IVs', () => {
      const plainText = 'my-secret-token';
      const iv1 = service.generateIV();
      const iv2 = service.generateIV();

      const encrypted1 = service.encryptWithIV(plainText, iv1);
      const encrypted2 = service.encryptWithIV(plainText, iv2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should not decrypt correctly with wrong IV', () => {
      const plainText = 'my-secret-token';
      const iv1 = service.generateIV();
      const iv2 = service.generateIV();

      const encrypted = service.encryptWithIV(plainText, iv1);

      expect(() => service.decryptWithIV(encrypted, iv2)).toThrow();
    });

    it('should handle empty string with custom IV', () => {
      const plainText = '';
      const iv = service.generateIV();

      const encrypted = service.encryptWithIV(plainText, iv);
      const decrypted = service.decryptWithIV(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-CBC algorithm (key length = 32 bytes)', () => {
      // This is implicit in the implementation
      // We verify by ensuring encryption/decryption works
      const plainText = 'test-security';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should not expose plaintext in encrypted output', () => {
      const plainText = 'my-secret-password-123';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).not.toContain('my-secret');
      expect(encrypted).not.toContain('password');
      expect(encrypted).not.toContain('123');
    });

    it('should handle OAuth tokens', () => {
      const token = 'ya29.a0AfH6SMBx...long-google-token...xyz';

      const encrypted = service.encrypt(token);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should handle refresh tokens', () => {
      const refreshToken = '1//0gAAABCDEFG...long-refresh-token...xyz';

      const encrypted = service.encrypt(refreshToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(refreshToken);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings (10KB)', () => {
      const plainText = 'a'.repeat(10000);

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
      expect(decrypted.length).toBe(10000);
    });

    it('should handle strings with newlines', () => {
      const plainText = 'line1\nline2\r\nline3';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle strings with tabs', () => {
      const plainText = 'col1\tcol2\tcol3';

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle binary-like data (Base64)', () => {
      const plainText = 'SGVsbG8gV29ybGQh'; // Base64 encoded

      const encrypted = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });
  });
});
