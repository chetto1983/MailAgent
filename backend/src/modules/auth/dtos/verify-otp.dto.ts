import { IsEmail, IsString, Length, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code!: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
