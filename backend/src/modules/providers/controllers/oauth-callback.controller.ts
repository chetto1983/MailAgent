import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { getConfiguration } from '../../../config/configuration';

/**
 * OAuth2 callback controller
 * Handles OAuth2 callbacks from Google and Microsoft
 * These endpoints are called by the OAuth provider after user authorization
 */
@ApiTags('OAuth Callbacks')
@Controller('auth')
export class OAuthCallbackController {
  private config = getConfiguration();

  @Get('gmail/callback')
  @ApiOperation({ summary: 'OAuth2 callback for Google (Gmail)' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with authorization code' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.api.corsOrigins.find((origin) =>
      origin.includes('localhost:3001'),
    ) || 'http://localhost:3001';

    // If there was an error during OAuth flow
    if (error) {
      return res.redirect(
        `${frontendUrl}/dashboard/providers?error=${encodeURIComponent(error)}&provider=google`,
      );
    }

    // If no code was provided
    if (!code) {
      return res.redirect(
        `${frontendUrl}/dashboard/providers?error=no_code&provider=google`,
      );
    }

    // Redirect to frontend with the authorization code
    // Frontend will then call the /providers/google/connect endpoint
    return res.redirect(
      `${frontendUrl}/dashboard/providers?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}&provider=google`,
    );
  }

  @Get('microsoft/callback')
  @ApiOperation({ summary: 'OAuth2 callback for Microsoft' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Microsoft' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with authorization code' })
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.api.corsOrigins.find((origin) =>
      origin.includes('localhost:3001'),
    ) || 'http://localhost:3001';

    // If there was an error during OAuth flow
    if (error) {
      const errorMsg = errorDescription || error;
      return res.redirect(
        `${frontendUrl}/dashboard/providers?error=${encodeURIComponent(errorMsg)}&provider=microsoft`,
      );
    }

    // If no code was provided
    if (!code) {
      return res.redirect(
        `${frontendUrl}/dashboard/providers?error=no_code&provider=microsoft`,
      );
    }

    // Redirect to frontend with the authorization code
    // Frontend will then call the /providers/microsoft/connect endpoint
    return res.redirect(
      `${frontendUrl}/dashboard/providers?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}&provider=microsoft`,
    );
  }
}
