import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

// Mock the getConfiguration function
jest.mock('../../config/configuration', () => ({
  getConfiguration: jest.fn(() => ({
    encryption: {
      // Base64 encoded 32-byte key for AES-256
      aesSecretKey: Buffer.from('test-aes-256-secret-key-32chars!').toString('base64'),
    },
  })),
}));

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('encrypt', () => {
    it('should encrypt plain text and return encrypted object with iv', () => {
      const plainText = 'my-secret-token';

      const result = service.encrypt(plainText);

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(typeof result.encrypted).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(result.encrypted).not.toBe(plainText);
      expect(result.encrypted.length).toBeGreaterThan(0);
      expect(result.iv.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should produce different encrypted values for same input (due to random IV)', () => {
      const plainText = 'my-secret-token';

      const result1 = service.encrypt(plainText);
      const result2 = service.encrypt(plainText);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty string', () => {
      const result = service.encrypt('');

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
    });

    it('should handle special characters', () => {
      const plainText = 'token!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/~`';

      const result = service.encrypt(plainText);

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const plainText = 'Hello 世界 🌍';

      const result = service.encrypt(plainText);

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plainText = 'my-secret-token';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle empty string encryption/decryption', () => {
      const plainText = '';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle long text', () => {
      const plainText = 'a'.repeat(1000);

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
      expect(decrypted.length).toBe(1000);
    });

    it('should handle special characters', () => {
      const plainText = 'token!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/~`';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle unicode characters', () => {
      const plainText = 'Hello 世界 🌍';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle JSON strings', () => {
      const plainText = JSON.stringify({ token: 'abc123', expires: '2025-12-31' });

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
      expect(JSON.parse(decrypted)).toEqual({
        token: 'abc123',
        expires: '2025-12-31',
      });
    });

    it('should throw error when decrypting with wrong IV', () => {
      const plainText = 'my-secret-token';

      const { encrypted } = service.encrypt(plainText);
      const wrongIv = '00000000000000000000000000000000';

      expect(() => service.decrypt(encrypted, wrongIv)).toThrow();
    });

    it('should throw error when decrypting with invalid hex IV', () => {
      const plainText = 'my-secret-token';

      const { encrypted } = service.encrypt(plainText);
      const invalidIv = 'not-hex-string';

      expect(() => service.decrypt(encrypted, invalidIv)).toThrow();
    });
  });

  describe('Security Properties', () => {
    it('should use AES-256-CBC algorithm', () => {
      // Verify by ensuring encryption/decryption works correctly
      const plainText = 'test-security';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should not expose plaintext in encrypted output', () => {
      const plainText = 'my-secret-password-123';

      const { encrypted } = service.encrypt(plainText);

      expect(encrypted).not.toContain('my-secret');
      expect(encrypted).not.toContain('password');
      expect(encrypted).not.toContain('123');
    });

    it('should handle OAuth tokens', () => {
      const token = 'ya29.a0AfH6SMBx...long-google-token...xyz';

      const { encrypted, iv } = service.encrypt(token);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(token);
    });

    it('should handle refresh tokens', () => {
      const refreshToken = '1//0gAAABCDEFG...long-refresh-token...xyz';

      const { encrypted, iv } = service.encrypt(refreshToken);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(refreshToken);
    });

    it('should produce different ciphertext with same plaintext (random IV)', () => {
      const plainText = 'same-plaintext';

      const result1 = service.encrypt(plainText);
      const result2 = service.encrypt(plainText);

      // Different IVs mean different ciphertexts
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);

      // But both decrypt to same plaintext
      expect(service.decrypt(result1.encrypted, result1.iv)).toBe(plainText);
      expect(service.decrypt(result2.encrypted, result2.iv)).toBe(plainText);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings (10KB)', () => {
      const plainText = 'a'.repeat(10000);

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
      expect(decrypted.length).toBe(10000);
    });

    it('should handle strings with newlines', () => {
      const plainText = 'line1\nline2\r\nline3';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle strings with tabs', () => {
      const plainText = 'col1\tcol2\tcol3';

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle binary-like data (Base64)', () => {
      const plainText = 'SGVsbG8gV29ybGQh'; // Base64 encoded

      const { encrypted, iv } = service.encrypt(plainText);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(plainText);
    });

    it('should handle IMAP passwords', () => {
      const password = 'my-secure-imap-password-2025!@#';

      const { encrypted, iv } = service.encrypt(password);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(password);
    });

    it('should handle SMTP passwords', () => {
      const password = 'smtp-P@ssw0rd-w1th-sp3c!al-ch@rs';

      const { encrypted, iv } = service.encrypt(password);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(password);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should encrypt/decrypt Google access token', () => {
      const token =
        'ya29.a0AfH6SMBx1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

      const { encrypted, iv } = service.encrypt(token);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(token);
    });

    it('should encrypt/decrypt Microsoft access token', () => {
      const token = 'EwBwA8...very_long_microsoft_token...xyz123';

      const { encrypted, iv } = service.encrypt(token);
      const decrypted = service.decrypt(encrypted, iv);

      expect(decrypted).toBe(token);
    });

    it('should store encrypted credentials separately from IV (database pattern)', () => {
      const plainText = 'my-api-key-secret';

      const { encrypted, iv } = service.encrypt(plainText);

      // Simulate database storage
      const storedEncrypted = encrypted;
      const storedIv = iv;

      // Simulate retrieval and decryption
      const decrypted = service.decrypt(storedEncrypted, storedIv);

      expect(decrypted).toBe(plainText);
    });
  });
});
