import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { IContactsProvider, ContactsProviderConfig } from '../providers/interfaces/contacts-provider.interface';
import { GoogleContactsProvider } from './providers/google-contacts.provider';
import { MicrosoftContactsProvider } from './providers/microsoft-contacts.provider';

/**
 * Supported contacts provider implementations
 */
const CONTACTS_PROVIDER_CLASSES = {
  google: GoogleContactsProvider,
  microsoft: MicrosoftContactsProvider,
} as const;

/**
 * ContactsProviderFactory - Factory for creating contacts provider instances
 *
 * Now supports Google and Microsoft Contacts providers through unified provider pattern.
 * Part of the unified provider pattern implementation.
 */
@Injectable()
export class ContactsProviderFactory {
  private readonly logger = new Logger(ContactsProviderFactory.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Create a contacts provider instance
   *
   * @param providerType - Type of contacts provider (google, microsoft)
   * @param config - Contacts provider configuration
   * @returns Contacts provider instance
   * @throws Error if provider type is not supported
   */
  async create(providerType: string, config: ContactsProviderConfig): Promise<IContactsProvider> {
    this.logger.debug(`Creating contacts provider instance: ${providerType} for ${config.email}`);

    // Validate configuration
    ContactsProviderFactory.validateConfig(config);

    switch (providerType.toLowerCase()) {
      case 'google':
        return this.createGoogleProvider(config);

      case 'microsoft':
        return this.createMicrosoftProvider(config);

      default:
        throw new Error(
          `Contacts provider "${providerType}" not supported. Supported providers: ${ContactsProviderFactory.getSupportedProviders().join(', ')}`,
        );
    }
  }

  /**
   * Create Google Contacts provider instance
   */
  private async createGoogleProvider(config: ContactsProviderConfig): Promise<IContactsProvider> {
    const providerClass = CONTACTS_PROVIDER_CLASSES.google;

    try {
      // Get dependencies from module container
      const [prisma, crypto, googleOAuth, googleContactsSync] = await Promise.all([
        this.moduleRef.get('PrismaService'),
        this.moduleRef.get('CryptoService'),
        this.moduleRef.get('GoogleOAuthService'),
        this.moduleRef.get('GoogleContactsSyncService'),
      ]);

      // Create and return provider instance
      const provider = new providerClass(
        config,
        prisma as any,
        crypto as any,
        googleOAuth as any,
        googleContactsSync as any,
      );

      this.logger.log(`Google Contacts provider created for ${config.email}`);
      return provider;
    } catch (error) {
      this.logger.error(`Failed to create Google Contacts provider:`, error);
      throw new Error('Google Contacts provider initialization failed');
    }
  }

  /**
   * Create Microsoft Contacts provider instance
   */
  private async createMicrosoftProvider(config: ContactsProviderConfig): Promise<IContactsProvider> {
    const providerClass = CONTACTS_PROVIDER_CLASSES.microsoft;

    try {
      // Get dependencies from module container
      const [prisma, crypto, microsoftOAuth, microsoftContactsSync] = await Promise.all([
        this.moduleRef.get('PrismaService'),
        this.moduleRef.get('CryptoService'),
        this.moduleRef.get('MicrosoftOAuthService'),
        this.moduleRef.get('MicrosoftContactsSyncService'),
      ]);

      // Create and return provider instance
      const provider = new providerClass(
        config,
        prisma as any,
        crypto as any,
        microsoftOAuth as any,
        microsoftContactsSync as any,
      );

      this.logger.log(`Microsoft Contacts provider created for ${config.email}`);
      return provider;
    } catch (error) {
      this.logger.error(`Failed to create Microsoft Contacts provider:`, error);
      throw new Error('Microsoft Contacts provider initialization failed');
    }
  }

  /**
   * Check if a contacts provider type is supported
   */
  static isSupported(providerType: string): boolean {
    return ['google', 'microsoft'].includes(providerType);
  }

  /**
   * Get list of supported contacts provider types
   */
  static getSupportedProviders(): string[] {
    return ['google', 'microsoft'];
  }

  /**
   * Validate contacts provider configuration
   */
  static validateConfig(config: ContactsProviderConfig): void {
    const required = ['userId', 'providerId', 'providerType', 'email', 'accessToken'];
    const missing = required.filter((field) => !config[field as keyof ContactsProviderConfig]);

    if (missing.length > 0) {
      throw new Error(`Invalid contacts provider config. Missing fields: ${missing.join(', ')}`);
    }

    if (!this.isSupported(config.providerType)) {
      throw new Error(`Unsupported contacts provider type: ${config.providerType}`);
    }
  }
}

/**
 * Contacts providers can be created by injecting ContactsProviderFactory
 * and calling factory.create(providerType, config)
 */
