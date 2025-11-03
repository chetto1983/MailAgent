import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoService } from '../../common/services/crypto.service';

// Services
import { GoogleOAuthService } from './services/google-oauth.service';
import { MicrosoftOAuthService } from './services/microsoft-oauth.service';
import { ImapService } from './services/imap.service';
import { CalDavService } from './services/caldav.service';
import { ProviderConfigService } from './services/provider-config.service';

// Controllers
import { ProvidersController } from './controllers/providers.controller';
import { OAuthCallbackController } from './controllers/oauth-callback.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    // Common services
    CryptoService,

    // Provider-specific services
    GoogleOAuthService,
    MicrosoftOAuthService,
    ImapService,
    CalDavService,
    ProviderConfigService,
  ],
  controllers: [ProvidersController, OAuthCallbackController],
  exports: [
    CryptoService,
    GoogleOAuthService,
    MicrosoftOAuthService,
    ImapService,
    CalDavService,
    ProviderConfigService,
  ],
})
export class ProvidersModule {}
