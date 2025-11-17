import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

const cookieExtractor = (req: any): string | null => {
  if (req?.cookies?.access_token) return req.cookies.access_token as string;
  const bearerCookie = req?.cookies?.Authorization || req?.cookies?.authorization;
  if (typeof bearerCookie === 'string' && bearerCookie.startsWith('Bearer ')) {
    return bearerCookie.replace(/^Bearer\s+/i, '');
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: any) {
    if (!payload) {
      this.logger.warn('JWT validation failed: empty payload');
      return null;
    }

    if (!payload.userId || !payload.tenantId) {
      this.logger.warn(
        `JWT validation failed: missing userId/tenantId in payload keys=${Object.keys(payload).join(',')}`,
      );
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      this.logger.warn(`JWT validation failed: user ${payload.userId} not found`);
      return null;
    }

    return {
      id: user.id,
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      sessionId: payload.sessionId,
    };
  }
}
