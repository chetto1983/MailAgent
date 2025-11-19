import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
