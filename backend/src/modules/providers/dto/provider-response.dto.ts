import { ApiProperty } from '@nestjs/swagger';

export class ProviderConfigResponseDto {
  @ApiProperty({ example: 'clx123abc456' })
  id!: string;

  @ApiProperty({ example: 'google', enum: ['google', 'microsoft', 'generic'] })
  providerType!: string;

  @ApiProperty({ example: 'user@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe', required: false })
  displayName?: string;

  @ApiProperty({ example: true })
  supportsEmail!: boolean;

  @ApiProperty({ example: true })
  supportsCalendar!: boolean;

  @ApiProperty({ example: false })
  supportsContacts!: boolean;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-10-29T10:00:00Z', required: false })
  lastSyncedAt?: Date;

  @ApiProperty({ example: '2025-10-29T09:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-10-29T10:30:00Z' })
  updatedAt!: Date;
}

export class OAuthUrlResponseDto {
  @ApiProperty({
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
    description: 'OAuth2 authorization URL to redirect the user to'
  })
  authUrl!: string;

  @ApiProperty({
    example: 'state_random_string_123',
    description: 'State parameter for CSRF protection'
  })
  state!: string;
}

export class ProviderTestConnectionDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Connection successful', required: false })
  message?: string;

  @ApiProperty({
    example: { imapConnected: true, smtpConnected: true, caldavConnected: false },
    required: false
  })
  details?: Record<string, any>;
}
