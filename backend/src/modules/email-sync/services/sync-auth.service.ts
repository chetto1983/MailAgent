import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SyncAuthService {
  constructor(private readonly configService: ConfigService) {}

  validateWebhookToken(tokenFromHeader?: string, tokenFromQuery?: string) {
    const expected = this.configService.get<string>('EMAIL_SYNC_WEBHOOK_TOKEN');
    if (!expected) {
      return;
    }

    const provided = tokenFromHeader || tokenFromQuery;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }
  }

  validateJobToken(tokenFromJob?: string) {
    const expected = this.configService.get<string>('EMAIL_SYNC_WORKER_TOKEN');
    if (!expected) {
      return;
    }

    if (!tokenFromJob || tokenFromJob !== expected) {
      throw new UnauthorizedException('Invalid worker job token');
    }
  }
}
