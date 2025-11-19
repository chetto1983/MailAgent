import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { WebhookValidationService } from './webhook-validation.service';

/**
 * CacheModule
 *
 * Global module that provides Redis-based caching and webhook validation
 * throughout the application. Marked as @Global so it can be imported once
 * in AppModule and used everywhere.
 *
 * Services:
 * - CacheService: Redis-based caching for horizontal scaling
 * - WebhookValidationService: Centralized webhook authentication
 *
 * Usage in AppModule:
 * ```typescript
 * import { CacheModule } from './common/services/cache.module';
 *
 * @Module({
 *   imports: [CacheModule, ...],
 * })
 * export class AppModule {}
 * ```
 *
 * Then inject services in any module:
 * ```typescript
 * constructor(
 *   private readonly cache: CacheService,
 *   private readonly webhookValidation: WebhookValidationService,
 * ) {}
 * ```
 */
@Global()
@Module({
  providers: [CacheService, WebhookValidationService],
  exports: [CacheService, WebhookValidationService],
})
export class CacheModule {}
