import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * ResponseTimeInterceptor
 *
 * Logs the response time for each HTTP request.
 * Helps identify slow endpoints and performance bottlenecks.
 *
 * Features:
 * - Logs response time in milliseconds
 * - Includes HTTP method and URL
 * - Includes request ID for correlation
 * - Color-coded by response time (fast/medium/slow)
 *
 * Benefits:
 * - Easy performance monitoring
 * - Identify slow endpoints
 * - Track performance regressions
 * - Debug production performance issues
 */
@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  // Thresholds for color-coding (milliseconds)
  private readonly FAST_THRESHOLD = 100;
  private readonly MEDIUM_THRESHOLD = 500;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const requestId = (req).id || 'N/A';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logRequest(method, url, responseTime, requestId, 'SUCCESS');
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logRequest(method, url, responseTime, requestId, 'ERROR', error.status);
        },
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    responseTime: number,
    requestId: string,
    status: 'SUCCESS' | 'ERROR',
    statusCode?: number,
  ) {
    const emoji = this.getResponseTimeEmoji(responseTime);
    const statusEmoji = status === 'SUCCESS' ? '✅' : '❌';
    const statusText = statusCode ? ` [${statusCode}]` : '';

    // Log format: [RequestID] METHOD URL - TIME STATUS
    const message = `[${requestId}] ${method} ${url} - ${responseTime}ms ${emoji}${statusText}`;

    // Color-code by response time
    if (status === 'ERROR') {
      this.logger.error(`${statusEmoji} ${message}`);
    } else if (responseTime > this.MEDIUM_THRESHOLD) {
      this.logger.warn(`🐢 ${message}`);
    } else if (responseTime > this.FAST_THRESHOLD) {
      this.logger.log(`${emoji} ${message}`);
    } else {
      this.logger.debug(`${emoji} ${message}`);
    }
  }

  private getResponseTimeEmoji(ms: number): string {
    if (ms < this.FAST_THRESHOLD) return '🚀'; // Fast
    if (ms < this.MEDIUM_THRESHOLD) return '⚡'; // Medium
    return '🐢'; // Slow
  }
}
