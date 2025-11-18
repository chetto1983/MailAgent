/**
 * Retry Service
 *
 * Shared retry logic with exponential backoff for handling transient errors
 * Supports rate limiting (429) and server errors (5xx)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Delay in milliseconds for 429 (rate limit) errors
   * Multiplied by attempt number for exponential backoff
   * @default 2000
   */
  delay429Ms?: number;

  /**
   * Delay in milliseconds for 5xx (server error) errors
   * Multiplied by attempt number for exponential backoff
   * @default 2000
   */
  delay5xxMs?: number;

  /**
   * Custom logger name for context
   * @default 'RetryService'
   */
  loggerName?: string;

  /**
   * Custom error status extractor
   * Useful for different API response formats
   */
  extractStatus?: (error: any) => number | undefined;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly DEFAULT_MAX_ATTEMPTS: number;
  private readonly DEFAULT_DELAY_429_MS: number;
  private readonly DEFAULT_DELAY_5XX_MS: number;

  /**
   * Default status code extractor
   * Handles common HTTP error response formats
   */
  private readonly defaultStatusExtractor = (error: any): number | undefined => {
    return (
      error?.response?.status ??
      error?.response?.statusCode ??
      error?.status ??
      error?.statusCode ??
      error?.code
    );
  };

  constructor(private configService: ConfigService) {
    this.DEFAULT_MAX_ATTEMPTS = this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3);
    this.DEFAULT_DELAY_429_MS = this.configService.get<number>('RETRY_429_DELAY_MS', 2000);
    this.DEFAULT_DELAY_5XX_MS = this.configService.get<number>('RETRY_5XX_DELAY_MS', 2000);
  }

  /**
   * Execute a function with automatic retry on transient errors
   *
   * @param fn - The async function to execute
   * @param options - Retry configuration options
   * @returns The result of the function execution
   * @throws The last error if all retries are exhausted
   *
   * @example
   * ```typescript
   * const result = await retryService.withRetry(
   *   () => apiClient.getData(),
   *   { maxAttempts: 5, loggerName: 'MyService' }
   * );
   * ```
   */
  async withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const maxAttempts = options.maxAttempts ?? this.DEFAULT_MAX_ATTEMPTS;
    const delay429Ms = options.delay429Ms ?? this.DEFAULT_DELAY_429_MS;
    const delay5xxMs = options.delay5xxMs ?? this.DEFAULT_DELAY_5XX_MS;
    const loggerName = options.loggerName ?? 'RetryService';
    const extractStatus = options.extractStatus ?? this.defaultStatusExtractor;

    let attempt = 0;
    let lastError: any;

    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const status = extractStatus(error);
        attempt += 1;

        // Retry on rate limit (429)
        if (status === 429) {
          const delay = delay429Ms * attempt; // Exponential backoff
          this.logger.warn(
            `[${loggerName}] Rate limit (429) hit on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms`,
          );
          await this.sleep(delay);
          continue;
        }

        // Retry on server errors (5xx)
        if (status && status >= 500 && status < 600) {
          const delay = delay5xxMs * attempt; // Exponential backoff
          this.logger.warn(
            `[${loggerName}] Server error (${status}) on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms`,
          );
          await this.sleep(delay);
          continue;
        }

        // Don't retry on client errors (4xx except 429) or other errors
        throw error;
      }
    }

    // All retries exhausted
    this.logger.error(`[${loggerName}] All ${maxAttempts} retry attempts exhausted`);
    throw lastError;
  }


  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   *
   * @param error - The error to check
   * @param extractStatus - Optional custom status extractor
   * @returns true if error is retryable (429 or 5xx)
   */
  isRetryable(error: any, extractStatus?: (error: any) => number | undefined): boolean {
    const extract = extractStatus ?? this.defaultStatusExtractor;
    const status = extract(error);

    if (status === 429) return true;
    if (status && status >= 500 && status < 600) return true;

    return false;
  }
}
