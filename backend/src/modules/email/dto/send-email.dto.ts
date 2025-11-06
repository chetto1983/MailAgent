import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class EmailAttachmentDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsString()
  contentBase64!: string;
}

class BaseComposeEmailDto {
  @IsArray()
  @IsString({ each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;

  @IsString()
  bodyText!: string;

  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];
}

export class SendEmailRequestDto extends BaseComposeEmailDto {
  @IsString()
  providerId!: string;
}

export class ReplyForwardEmailRequestDto extends BaseComposeEmailDto {}

export type { EmailAttachmentDto };
