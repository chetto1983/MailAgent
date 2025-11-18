import { Logger } from '@nestjs/common';
import {
  ProviderError,
  RateLimitError,
  TokenExpiredError,
  InsufficientPermissionsError,
} from '../interfaces/email-provider.interface';

type ErrorContext = Record<string, unknown> | undefined;

/**
 * BaseEmailProvider centralizza gestione errori/logging condivisi tra i provider.
 * Adotta mapping leggero degli status code alle eccezioni typed per uniformare il comportamento.
 */
export abstract class BaseEmailProvider {
  protected readonly providerName: string;
  protected readonly logger: Logger;

  protected constructor(providerName: string) {
    this.providerName = providerName;
    this.logger = new Logger(providerName);
  }

  /**
   * Wrapper per gestire logging e mapping errori in modo consistente.
   */
  protected async withErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: ErrorContext,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status ?? error?.code;
      const message = error?.message || 'Unknown error';
      const provider = this.providerName;

      if (status === 401) {
        throw new TokenExpiredError(provider, error);
      }

      if (status === 403) {
        const scopes =
          (error?.response?.data)?.error?.error?.requiredScopes ??
          (error?.response?.data)?.error?.requiredScopes ??
          [];
        throw new InsufficientPermissionsError(provider, scopes, error);
      }

      if (status === 429) {
        const retryAfterHeader = error?.response?.headers?.['retry-after'];
        const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
        throw new RateLimitError(provider, retryAfter, error);
      }

      this.logger.error(
        `Provider operation failed: ${operation} - ${message}`,
        error?.stack,
        context,
      );

      throw new ProviderError(message, status ?? 'UNKNOWN', provider, error);
    }
  }
}
