import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

/**
 * RequestIdMiddleware
 *
 * Adds a unique request ID to each incoming request for tracing.
 * If the client provides an X-Request-ID header, it will be used.
 * Otherwise, a new ID is generated using nanoid.
 *
 * The request ID is:
 * - Attached to the request object (req.id)
 * - Set as a response header (X-Request-ID)
 * - Used for correlation in logs
 *
 * Benefits:
 * - Request tracing across services
 * - Easier debugging in production
 * - Correlate logs with specific requests
 * - Support for distributed tracing
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Check if client provided a request ID, otherwise generate one
    const requestId = (req.headers['x-request-id'] as string) || nanoid();

    // Attach to request object for access in controllers/services
    (req as any).id = requestId;

    // Set response header so client can track the request
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request with ID (optional - can be disabled in production for performance)
    if (process.env.LOG_REQUESTS === 'true') {
      this.logger.log(`[${requestId}] ${req.method} ${req.url}`);
    }

    next();
  }
}
