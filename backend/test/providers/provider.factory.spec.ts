const { ProviderFactory } = require('../src/modules/providers/factory/provider.factory');

describe('ProviderFactory', () => {
  it('should create Google provider successfully', () => {
    const config = {
      userId: 'user-123',
      providerId: 'provider-123',
      providerType: 'google',
      email: 'test@gmail.com',
      accessToken: 'valid-token',
      refreshToken: '',
    };

    const provider = ProviderFactory.create('google', config);
    expect(provider).toBeDefined();
    expect(provider.config.providerType).toBe('google');
  });

  it('should create Microsoft provider successfully', () => {
    const config = {
      userId: 'user-123',
      providerId: 'provider-123',
      providerType: 'microsoft',
      email: 'test@outlook.com',
      accessToken: 'valid-token',
      refreshToken: '',
    };

    const provider = ProviderFactory.create('microsoft', config);
    expect(provider).toBeDefined();
    expect(provider.config.providerType).toBe('microsoft');
  });

  it('should throw error for unsupported provider', () => {
    const config = {
      userId: 'user-123',
      providerId: 'provider-123',
      providerType: 'google',
      email: 'test@gmail.com',
      accessToken: 'valid-token',
      refreshToken: '',
    };

    expect(() => {
      ProviderFactory.create('unsupported', config);
    }).toThrow('Provider "unsupported" not supported');
  });

  it('should validate config correctly', () => {
    const validConfig = {
      userId: 'user-123',
      providerId: 'provider-123',
      providerType: 'google',
      email: 'test@gmail.com',
      accessToken: 'token',
      refreshToken: '',
    };

    expect(() => {
      ProviderFactory.validateConfig(validConfig);
    }).not.toThrow();
  });

  it('should return supported providers list', () => {
    const supported = ProviderFactory.getSupportedProviders();
    expect(Array.isArray(supported)).toBe(true);
    expect(supported).toContain('google');
    expect(supported).toContain('microsoft');
  });

  it('should check if provider is supported', () => {
    expect(ProviderFactory.isSupported('google')).toBe(true);
    expect(ProviderFactory.isSupported('microsoft')).toBe(true);
    expect(ProviderFactory.isSupported('unsupported')).toBe(false);
  });
});
