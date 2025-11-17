import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthDebugMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthDebugMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const accessTokenCookie = req.cookies?.access_token;
    const bearerCookie = req.cookies?.Authorization || req.cookies?.authorization;
    this.logger.debug(
      `Auth debug -> path=${req.path} method=${req.method} authHeader=${authHeader ? 'present' : 'missing'} cookie.access_token=${Boolean(accessTokenCookie)} cookie.Authorization=${Boolean(bearerCookie)}`,
    );
    next();
  }
}
