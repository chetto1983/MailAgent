/**
 * ProviderFactory Test Suite
 */

import { ProviderFactory } from './provider.factory';
import { GoogleEmailProvider } from '../providers/google-email.provider';
import { MicrosoftEmailProvider } from '../providers/microsoft-email.provider';
import { ImapEmailProvider } from '../providers/imap-email.provider';
import { ProviderConfig } from '../interfaces/email-provider.interface';

describe('ProviderFactory', () => {
  const mockConfig: ProviderConfig = {
    userId: 'user-123',
    providerId: 'provider-123',
    providerType: 'google',
    email: 'test@example.com',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000),
  };

  describe('create', () => {
    it('should create a Google provider', () => {
      const provider = ProviderFactory.create('google', {
        ...mockConfig,
        providerType: 'google',
      });

      expect(provider).toBeInstanceOf(GoogleEmailProvider);
      expect(provider.config.providerType).toBe('google');
      expect(provider.config.email).toBe('test@example.com');
    });

    it('should create a Microsoft provider', () => {
      const provider = ProviderFactory.create('microsoft', {
        ...mockConfig,
        providerType: 'microsoft',
      });

      expect(provider).toBeInstanceOf(MicrosoftEmailProvider);
      expect(provider.config.providerType).toBe('microsoft');
    });

    it('should create an IMAP provider', () => {
      const provider = ProviderFactory.create('imap', {
        ...mockConfig,
        providerType: 'imap',
      });

      expect(provider).toBeInstanceOf(ImapEmailProvider);
      expect(provider.config.providerType).toBe('imap');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        ProviderFactory.create('yahoo', mockConfig);
      }).toThrow('Provider "yahoo" not supported');
    });

    it('should throw error with supported providers list', () => {
      expect(() => {
        ProviderFactory.create('unknown', mockConfig);
      }).toThrow(/Supported providers: google, microsoft, imap/);
    });
  });

  describe('isSupported', () => {
    it('should return true for google', () => {
      expect(ProviderFactory.isSupported('google')).toBe(true);
    });

    it('should return true for microsoft', () => {
      expect(ProviderFactory.isSupported('microsoft')).toBe(true);
    });

    it('should return true for imap', () => {
      expect(ProviderFactory.isSupported('imap')).toBe(true);
    });

    it('should return false for unsupported provider', () => {
      expect(ProviderFactory.isSupported('yahoo')).toBe(false);
      expect(ProviderFactory.isSupported('invalid')).toBe(false);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return array of supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toEqual(['google', 'microsoft', 'imap']);
    });

    it('should return array with 3 providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toHaveLength(3);
    });
  });

  describe('getProviderClass', () => {
    it('should return GoogleEmailProvider class for google', () => {
      const ProviderClass = ProviderFactory.getProviderClass('google');
      expect(ProviderClass).toBe(GoogleEmailProvider);
    });

    it('should return MicrosoftEmailProvider class for microsoft', () => {
      const ProviderClass = ProviderFactory.getProviderClass('microsoft');
      expect(ProviderClass).toBe(MicrosoftEmailProvider);
    });

    it('should return ImapEmailProvider class for imap', () => {
      const ProviderClass = ProviderFactory.getProviderClass('imap');
      expect(ProviderClass).toBe(ImapEmailProvider);
    });
  });

  describe('validateConfig', () => {
    it('should not throw for valid config', () => {
      expect(() => {
        ProviderFactory.validateConfig(mockConfig);
      }).not.toThrow();
    });

    it('should throw for missing userId', () => {
      const invalidConfig = { ...mockConfig, userId: '' };
      expect(() => {
        ProviderFactory.validateConfig(invalidConfig as ProviderConfig);
      }).toThrow(/Missing fields.*userId/);
    });

    it('should throw for missing email', () => {
      const invalidConfig = { ...mockConfig, email: '' };
      expect(() => {
        ProviderFactory.validateConfig(invalidConfig as ProviderConfig);
      }).toThrow(/Missing fields.*email/);
    });

    it('should throw for missing accessToken', () => {
      const invalidConfig = { ...mockConfig, accessToken: '' };
      expect(() => {
        ProviderFactory.validateConfig(invalidConfig as ProviderConfig);
      }).toThrow(/Missing fields.*accessToken/);
    });

    it('should throw for unsupported provider type', () => {
      const invalidConfig = { ...mockConfig, providerType: 'yahoo' as any };
      expect(() => {
        ProviderFactory.validateConfig(invalidConfig);
      }).toThrow('Unsupported provider type: yahoo');
    });

    it('should throw for multiple missing fields', () => {
      const invalidConfig = {
        ...mockConfig,
        userId: '',
        email: '',
        accessToken: '',
      };
      expect(() => {
        ProviderFactory.validateConfig(invalidConfig as ProviderConfig);
      }).toThrow(/Missing fields:.*userId.*email.*accessToken/);
    });
  });

  describe('createWithValidation', () => {
    it('should create provider with valid config', () => {
      const provider = ProviderFactory.createWithValidation('google', mockConfig);
      expect(provider).toBeInstanceOf(GoogleEmailProvider);
    });

    it('should throw for invalid config', () => {
      const invalidConfig = { ...mockConfig, email: '' };
      expect(() => {
        ProviderFactory.createWithValidation('google', invalidConfig as ProviderConfig);
      }).toThrow(/Missing fields.*email/);
    });
  });
});
