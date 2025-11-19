import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * CacheModule
 *
 * Global module that provides Redis-based caching throughout the application.
 * Marked as @Global so it can be imported once in AppModule and used everywhere.
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
 * Then inject CacheService in any service:
 * ```typescript
 * constructor(private readonly cache: CacheService) {}
 * ```
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
