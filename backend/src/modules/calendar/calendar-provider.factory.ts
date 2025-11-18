/**
 * Calendar Provider Factory
 *
 * Factory pattern for creating calendar provider instances
 * Part of the unified provider pattern implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ICalendarProvider, CalendarProviderConfig } from '../providers/interfaces/calendar-provider.interface';

/**
 * CalendarProviderFactory - Factory for creating calendar provider instances
 *
 * Currently supports Google Calendar through wrapper around GoogleCalendarSyncService.
 * In future releases, direct provider implementations will be added.
 */
@Injectable()
export class CalendarProviderFactory {
  private static readonly logger = new Logger(CalendarProviderFactory.name);

  /**
   * Create a calendar provider instance
   *
   * @param providerType - Type of calendar provider (google, microsoft)
   * @param config - Calendar provider configuration
   * @returns Calendar provider instance
   * @throws Error if provider type is not supported
   */
  static create(providerType: string, config: CalendarProviderConfig): ICalendarProvider {
    this.logger.debug(`Creating calendar provider instance: ${providerType}`);

    // Currently only Google Calendar is fully implemented
    if (providerType === 'google') {
      // Use wrapper around existing GoogleCalendarSyncService
      throw new Error(
        'Google Calendar provider not yet implemented. Use GoogleCalendarSyncService directly.',
      );
    }

    if (providerType === 'microsoft') {
      // Use wrapper around existing MicrosoftCalendarSyncService
      throw new Error(
        'Microsoft Calendar provider not yet implemented. Use MicrosoftCalendarSyncService directly.',
      );
    }

    throw new Error(
      `Calendar provider "${providerType}" not supported. Supported providers: google, microsoft`,
    );
  }

  /**
   * Check if a calendar provider type is supported
   */
  static isSupported(providerType: string): boolean {
    return ['google', 'microsoft'].includes(providerType);
  }

  /**
   * Get list of supported calendar provider types
   */
  static getSupportedProviders(): string[] {
    return ['google', 'microsoft'];
  }

  /**
   * Validate calendar provider configuration
   */
  static validateConfig(config: CalendarProviderConfig): void {
    const required = ['userId', 'providerId', 'providerType', 'email', 'accessToken'];
    const missing = required.filter((field) => !config[field as keyof CalendarProviderConfig]);

    if (missing.length > 0) {
      throw new Error(`Invalid calendar provider config. Missing fields: ${missing.join(', ')}`);
    }

    if (!this.isSupported(config.providerType)) {
      throw new Error(`Unsupported calendar provider type: ${config.providerType}`);
    }
  }
}

/**
 * Helper function to create calendar provider (functional style)
 */
export function createCalendarProvider(
  providerType: string,
  config: CalendarProviderConfig,
): ICalendarProvider {
  return CalendarProviderFactory.create(providerType, config);
}
