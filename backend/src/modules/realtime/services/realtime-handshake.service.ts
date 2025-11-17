import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedSocket, buildTenantRoom } from '../types/realtime.types';

interface HandshakeResult {
  userId: string;
  tenantId: string;
  email: string;
  tenantRoom: string;
}

@Injectable()
export class RealtimeHandshakeService {
  private readonly logger = new Logger(RealtimeHandshakeService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  extractToken(client: AuthenticatedSocket): string | null {
    const headerToken =
      client.handshake.headers?.authorization?.replace(/Bearer\s+/i, '') ||
      client.handshake.auth?.token;

    if (headerToken) {
      return headerToken;
    }

    const queryToken = client.handshake.query?.token;
    if (!queryToken) {
      return null;
    }

    return Array.isArray(queryToken) ? queryToken[0] : String(queryToken);
  }

  private async validateToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Realtime token validation failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async authenticate(client: AuthenticatedSocket): Promise<HandshakeResult> {
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const decoded = await this.validateToken(token);
    if (!decoded?.userId || !decoded?.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, tenantId: true },
    });

    if (!user || user.tenantId !== decoded.tenantId) {
      throw new UnauthorizedException('User not found or tenant mismatch');
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      tenantRoom: buildTenantRoom(user.tenantId),
    };
  }
}
