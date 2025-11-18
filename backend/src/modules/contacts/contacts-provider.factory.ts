/**
 * Contacts Provider Factory
 *
 * Factory pattern for creating contacts provider instances
 * Part of the unified provider pattern implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import type { IContactsProvider, ContactsProviderConfig } from '../providers/interfaces/contacts-provider.interface';

/**
 * ContactsProviderFactory - Factory for creating contacts provider instances
 *
 * Currently supports Google Contacts through wrapper around GoogleContactsSyncService.
 * In future releases, direct provider implementations will be added.
 */
@Injectable()
export class ContactsProviderFactory {
  private static readonly logger = new Logger(ContactsProviderFactory.name);

  /**
   * Create a contacts provider instance
   *
   * @param providerType - Type of contacts provider (google, microsoft)
   * @param config - Contacts provider configuration
   * @returns Contacts provider instance
   * @throws Error if provider type is not supported
   */
  static create(providerType: string, config: ContactsProviderConfig): IContactsProvider {
    this.logger.debug(`Creating contacts provider instance: ${providerType}`);

    // Currently only Google Contacts is fully implemented
    if (providerType === 'google') {
      // Use wrapper around existing GoogleContactsSyncService
      throw new Error(
        'Google Contacts provider not yet implemented. Use GoogleContactsSyncService directly.',
      );
    }

    if (providerType === 'microsoft') {
      // Use wrapper around existing MicrosoftContactsSyncService
      throw new Error(
        'Microsoft Contacts provider not yet implemented. Use MicrosoftContactsSyncService directly.',
      );
    }

    throw new Error(
      `Contacts provider "${providerType}" not supported. Supported providers: google, microsoft`,
    );
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
 * Helper function to create contacts provider (functional style)
 */
export function createContactsProvider(
  providerType: string,
  config: ContactsProviderConfig,
): IContactsProvider {
  return ContactsProviderFactory.create(providerType, config);
}
