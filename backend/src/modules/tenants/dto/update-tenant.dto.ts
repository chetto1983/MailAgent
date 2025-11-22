import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating a tenant
 * Only allows safe fields to be updated
 * DOES NOT allow: isActive, ownerId, credits, etc. (security!)
 */
export class UpdateTenantDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation Updated',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Tenant description',
    example: 'Enterprise customer - updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // ✅ SECURITY: Only safe fields allowed
  // ❌ DO NOT add: isActive, ownerId, credits, slug, etc.
  // These should only be modified via dedicated admin endpoints
}
