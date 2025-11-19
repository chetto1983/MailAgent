import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService, CacheNamespace } from './cache.service';
import * as crypto from 'crypto';

/**
 * Webhook provider types
 */
export enum WebhookProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  GENERIC = 'generic',
}

/**
 * Webhook validation options
 */
export interface WebhookValidationOptions {
  provider: WebhookProvider;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  signature?: string;
  timestamp?: string;
  nonce?: string;
}

/**
 * WebhookValidationService
 *
 * Centralized webhook validation and security service.
 * Provides consistent authentication across all webhook endpoints.
 *
 * Features:
 * - Timing-safe token comparison
 * - Replay attack prevention (nonce + timestamp)
 * - Signature validation (HMAC)
 * - Provider-specific validation (Google, Microsoft)
 * - Audit logging
 * - Rate limiting integration
 *
 * Security Best Practices:
 * - Always use timing-safe comparison for secrets
 * - Validate timestamps to prevent replay attacks
 * - Store nonces in Redis with TTL
 * - Use HMAC signatures for payload integrity
 * - Log all validation failures for security monitoring
 *
 * Usage:
 * ```typescript
 * // Basic token validation
 * await webhookValidation.validate({
 *   provider: WebhookProvider.GENERIC,
 *   headers: { 'x-webhook-token': token },
 * });
 *
 * // Google webhook with headers
 * await webhookValidation.validate({
 *   provider: WebhookProvider.GOOGLE,
 *   headers: {
 *     'x-goog-channel-id': channelId,
 *     'x-goog-resource-id': resourceId,
 *   },
 * });
 *
 * // Microsoft webhook with signature
 * await webhookValidation.validate({
 *   provider: WebhookProvider.MICROSOFT,
 *   headers: { 'x-ms-signature': signature },
 *   body: payload,
 * });
 * ```
 */
@Injectable()
export class WebhookValidationService {
  private readonly logger = new Logger(WebhookValidationService.name);
  private readonly NONCE_TTL = 300; // 5 minutes
  private readonly TIMESTAMP_TOLERANCE = 300; // 5 minutes

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Main validation entry point
   *
   * Validates webhook based on provider type and options.
   * Throws UnauthorizedException if validation fails.
   */
  async validate(options: WebhookValidationOptions): Promise<void> {
    const startTime = Date.now();

    try {
      switch (options.provider) {
        case WebhookProvider.GOOGLE:
          await this.validateGoogle(options);
          break;
        case WebhookProvider.MICROSOFT:
          await this.validateMicrosoft(options);
          break;
        case WebhookProvider.GENERIC:
          await this.validateGeneric(options);
          break;
        default:
          throw new UnauthorizedException(`Unknown webhook provider: ${options.provider}`);
      }

      // Validate timestamp if provided
      if (options.timestamp) {
        this.validateTimestamp(options.timestamp);
      }

      // Validate nonce if provided (prevents replay attacks)
      if (options.nonce) {
        await this.validateNonce(options.nonce);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Webhook validation successful for ${options.provider} (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Webhook validation failed for ${options.provider} (${duration}ms):`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Validate Google webhook
   *
   * Google sends notifications with:
   * - x-goog-channel-id: Subscription channel ID
   * - x-goog-resource-id: Resource being watched
   * - x-goog-channel-token: Optional verification token
   */
  private async validateGoogle(options: WebhookValidationOptions): Promise<void> {
    const headers = options.headers || {};

    // Check for required Google headers
    const channelId = headers['x-goog-channel-id'];
    const resourceId = headers['x-goog-resource-id'];

    if (!channelId || !resourceId) {
      throw new UnauthorizedException('Missing required Google webhook headers');
    }

    // Validate channel token if configured
    const expectedToken = this.config.get<string>('GOOGLE_WEBHOOK_TOKEN');
    if (expectedToken) {
      const providedToken = headers['x-goog-channel-token'] || headers['x-webhook-token'];
      if (!providedToken) {
        throw new UnauthorizedException('Missing Google webhook token');
      }

      if (!this.timingSafeCompare(providedToken, expectedToken)) {
        throw new UnauthorizedException('Invalid Google webhook token');
      }
    }

    this.logger.debug(`Google webhook validated: ${channelId}/${resourceId}`);
  }

  /**
   * Validate Microsoft webhook
   *
   * Microsoft sends notifications with:
   * - clientState: Custom verification token
   * - validationToken: For subscription validation
   * - Optional: HMAC signature verification
   */
  private async validateMicrosoft(options: WebhookValidationOptions): Promise<void> {
    const headers = options.headers || {};
    const body = options.body || {};
    const query = options.query || {};

    // Handle subscription validation (returns validation token)
    if (query.validationToken) {
      this.logger.debug('Microsoft webhook subscription validation');
      return; // Validation is handled by controller
    }

    // Validate client state if configured
    const expectedClientState = this.config.get<string>('MICROSOFT_WEBHOOK_SECRET');
    if (expectedClientState) {
      // Check in body (notification payload)
      const providedClientState = body.clientState || headers['x-webhook-token'];

      if (!providedClientState) {
        throw new UnauthorizedException('Missing Microsoft webhook clientState');
      }

      if (!this.timingSafeCompare(providedClientState, expectedClientState)) {
        throw new UnauthorizedException('Invalid Microsoft webhook clientState');
      }
    }

    // Validate HMAC signature if present
    const signature = headers['x-ms-signature'];
    if (signature && options.body) {
      const secret = this.config.get<string>('MICROSOFT_WEBHOOK_SECRET');
      if (secret) {
        this.validateHmacSignature(options.body, signature, secret);
      }
    }

    this.logger.debug('Microsoft webhook validated');
  }

  /**
   * Validate generic webhook (custom integrations)
   *
   * Checks for webhook token in headers or query parameters.
   */
  private async validateGeneric(options: WebhookValidationOptions): Promise<void> {
    const expectedToken = this.config.get<string>('WEBHOOK_SECRET');

    if (!expectedToken) {
      this.logger.warn('WEBHOOK_SECRET not configured, skipping validation');
      return; // No validation if secret not configured
    }

    const headers = options.headers || {};
    const query = options.query || {};

    const providedToken = headers['x-webhook-token'] || query.token;

    if (!providedToken) {
      throw new UnauthorizedException('Missing webhook token');
    }

    if (!this.timingSafeCompare(providedToken, expectedToken)) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    this.logger.debug('Generic webhook validated');
  }

  /**
   * Validate HMAC signature
   *
   * Verifies payload integrity using HMAC-SHA256.
   */
  private validateHmacSignature(payload: any, signature: string, secret: string): void {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (!this.timingSafeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug('HMAC signature validated');
  }

  /**
   * Validate timestamp to prevent replay attacks
   *
   * Rejects requests with timestamps outside tolerance window.
   */
  private validateTimestamp(timestamp: string): void {
    const providedTime = parseInt(timestamp, 10);

    if (isNaN(providedTime)) {
      throw new UnauthorizedException('Invalid timestamp format');
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - providedTime);

    if (diff > this.TIMESTAMP_TOLERANCE) {
      throw new UnauthorizedException(
        `Timestamp outside tolerance window (${diff}s > ${this.TIMESTAMP_TOLERANCE}s)`,
      );
    }
  }

  /**
   * Validate nonce to prevent replay attacks
   *
   * Stores nonce in Redis with TTL. Rejects duplicate nonces.
   */
  private async validateNonce(nonce: string): Promise<void> {
    // Check if nonce already exists
    const exists = await this.cache.exists(nonce, {
      namespace: CacheNamespace.WEBHOOK_NONCE,
    });

    if (exists) {
      throw new UnauthorizedException('Duplicate nonce (replay attack detected)');
    }

    // Store nonce to prevent reuse
    await this.cache.set(nonce, true, {
      namespace: CacheNamespace.WEBHOOK_NONCE,
      ttl: this.NONCE_TTL,
    });
  }

  /**
   * Timing-safe string comparison
   *
   * Prevents timing attacks by comparing strings in constant time.
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Generate webhook signature for testing
   *
   * Useful for testing webhook endpoints.
   */
  generateSignature(payload: any, secret: string): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Generate nonce for webhook requests
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get current timestamp for webhook requests
   */
  getTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }
}
