import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { ProviderConfigService } from '../services/provider-config.service';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { MicrosoftOAuthService } from '../services/microsoft-oauth.service';
import {
  ConnectGoogleProviderDto,
  ConnectMicrosoftProviderDto,
  ConnectGenericProviderDto,
  GoogleOAuthUrlDto,
  MicrosoftOAuthUrlDto,
  ProviderConfigResponseDto,
  OAuthUrlResponseDto,
} from '../dto';

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providerConfigService: ProviderConfigService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
  ) {}

  // ========== GOOGLE PROVIDER ==========

  @Post('google/auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 authorization URL' })
  @ApiResponse({ status: 200, type: OAuthUrlResponseDto })
  getGoogleAuthUrl(@Body() dto: GoogleOAuthUrlDto): OAuthUrlResponseDto {
    return this.googleOAuth.generateAuthUrl(dto.scopes);
  }

  @Post('google/connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect Google provider (Gmail + Calendar)' })
  @ApiResponse({ status: 201, type: ProviderConfigResponseDto })
  async connectGoogle(
    @Request() req: any,
    @Body() dto: ConnectGoogleProviderDto,
  ): Promise<ProviderConfigResponseDto> {
    const { tenantId, userId } = req.user;
    return this.providerConfigService.connectGoogleProvider(tenantId, userId, dto);
  }

  // ========== MICROSOFT PROVIDER ==========

  @Post('microsoft/auth-url')
  @ApiOperation({ summary: 'Get Microsoft OAuth2 authorization URL' })
  @ApiResponse({ status: 200, type: OAuthUrlResponseDto })
  getMicrosoftAuthUrl(@Body() dto: MicrosoftOAuthUrlDto): OAuthUrlResponseDto {
    return this.microsoftOAuth.generateAuthUrl(dto.scopes);
  }

  @Post('microsoft/connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect Microsoft provider (Outlook + Graph API)' })
  @ApiResponse({ status: 201, type: ProviderConfigResponseDto })
  async connectMicrosoft(
    @Request() req: any,
    @Body() dto: ConnectMicrosoftProviderDto,
  ): Promise<ProviderConfigResponseDto> {
    const { tenantId, userId } = req.user;
    return this.providerConfigService.connectMicrosoftProvider(tenantId, userId, dto);
  }

  // ========== GENERIC PROVIDER (IMAP/CalDAV) ==========

  @Post('generic/connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect generic provider (IMAP/SMTP + CalDAV/CardDAV)' })
  @ApiResponse({ status: 201, type: ProviderConfigResponseDto })
  async connectGeneric(
    @Request() req: any,
    @Body() dto: ConnectGenericProviderDto,
  ): Promise<ProviderConfigResponseDto> {
    const { tenantId, userId } = req.user;
    return this.providerConfigService.connectGenericProvider(tenantId, userId, dto);
  }

  // ========== COMMON OPERATIONS ==========

  @Get()
  @ApiOperation({ summary: 'Get all provider configs' })
  @ApiResponse({ status: 200, type: [ProviderConfigResponseDto] })
  async getProviders(@Request() req: any): Promise<ProviderConfigResponseDto[]> {
    const { tenantId } = req.user;
    return this.providerConfigService.getProviderConfigs(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific provider config' })
  @ApiResponse({ status: 200, type: ProviderConfigResponseDto })
  async getProvider(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<ProviderConfigResponseDto> {
    const { tenantId } = req.user;
    return this.providerConfigService.getProviderConfig(tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a provider config' })
  @ApiResponse({ status: 204, description: 'Provider config deleted successfully' })
  async deleteProvider(@Request() req: any, @Param('id') id: string): Promise<void> {
    const { tenantId } = req.user;
    await this.providerConfigService.deleteProviderConfig(tenantId, id);
  }

  // ========== TEST ENDPOINTS ==========

  @Get(':id/test/gmail-labels')
  @ApiOperation({ summary: 'Test Gmail API - List labels' })
  @ApiResponse({ status: 200, description: 'Returns Gmail labels' })
  async testGmailLabels(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.googleOAuth.testGmailLabels(tenantId, id);
  }

  @Get(':id/test/gmail-messages')
  @ApiOperation({ summary: 'Test Gmail API - List recent messages' })
  @ApiResponse({ status: 200, description: 'Returns recent Gmail messages' })
  async testGmailMessages(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.googleOAuth.testGmailMessages(tenantId, id);
  }

  @Get(':id/test/calendars')
  @ApiOperation({ summary: 'Test Google Calendar API - List calendars' })
  @ApiResponse({ status: 200, description: 'Returns Google calendars' })
  async testCalendars(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.googleOAuth.testCalendars(tenantId, id);
  }

  @Get(':id/test/calendar-events')
  @ApiOperation({ summary: 'Test Google Calendar API - List upcoming events' })
  @ApiResponse({ status: 200, description: 'Returns upcoming calendar events' })
  async testCalendarEvents(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.googleOAuth.testCalendarEvents(tenantId, id);
  }

  @Get(':id/test/contacts')
  @ApiOperation({ summary: 'Test Google People API - List contacts' })
  @ApiResponse({ status: 200, description: 'Returns Google contacts' })
  async testContacts(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.googleOAuth.testContacts(tenantId, id);
  }

  // ========== MICROSOFT TEST ENDPOINTS ==========

  @Get(':id/test/mail-folders')
  @ApiOperation({ summary: 'Test Microsoft Mail API - List mail folders' })
  @ApiResponse({ status: 200, description: 'Returns mail folders' })
  async testMailFolders(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.microsoftOAuth.testMailFolders(tenantId, id);
  }

  @Get(':id/test/mail-messages')
  @ApiOperation({ summary: 'Test Microsoft Mail API - List recent messages' })
  @ApiResponse({ status: 200, description: 'Returns recent mail messages' })
  async testMailMessages(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.microsoftOAuth.testMailMessages(tenantId, id);
  }

  @Get(':id/test/microsoft-calendars')
  @ApiOperation({ summary: 'Test Microsoft Calendar API - List calendars' })
  @ApiResponse({ status: 200, description: 'Returns Microsoft calendars' })
  async testMicrosoftCalendars(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.microsoftOAuth.testCalendars(tenantId, id);
  }

  @Get(':id/test/microsoft-calendar-events')
  @ApiOperation({ summary: 'Test Microsoft Calendar API - List upcoming events' })
  @ApiResponse({ status: 200, description: 'Returns upcoming calendar events' })
  async testMicrosoftCalendarEvents(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.microsoftOAuth.testCalendarEvents(tenantId, id);
  }

  @Get(':id/test/microsoft-contacts')
  @ApiOperation({ summary: 'Test Microsoft Contacts API - List contacts' })
  @ApiResponse({ status: 200, description: 'Returns Microsoft contacts' })
  async testMicrosoftContacts(@Request() req: any, @Param('id') id: string): Promise<any> {
    const { tenantId } = req.user;
    return this.microsoftOAuth.testContacts(tenantId, id);
  }
}
