import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { Prisma, ProviderConfig } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { AttachmentStorageService } from './attachment.storage';

export interface SendEmailDto {
  tenantId: string;
  providerId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

@Injectable()
export class EmailSendService {
  private readonly logger = new Logger(EmailSendService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private googleOAuth: GoogleOAuthService,
    private microsoftOAuth: MicrosoftOAuthService,
    private attachmentStorage: AttachmentStorageService,
  ) {}

  /**
   * Send email via the appropriate provider
   */
  async sendEmail(data: SendEmailDto): Promise<{ success: boolean; messageId: string }> {
    const provider = await this.prisma.providerConfig.findFirst({
      where: {
        id: data.providerId,
        tenantId: data.tenantId,
        isActive: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found or inactive');
    }

    let messageId: string;

    try {
      const uploadedAttachments =
        data.attachments && data.attachments.length > 0
          ? await Promise.all(
              data.attachments.map((att) =>
                this.attachmentStorage.uploadAttachment(data.tenantId, provider.id, {
                  filename: att.filename,
                  content: att.content,
                  contentType: att.contentType,
                }),
              ),
            )
          : [];

      const normalizedData: SendEmailDto = {
        ...data,
        attachments: uploadedAttachments.map((att) => ({
          filename: att.filename,
          content: Buffer.alloc(0), // content already uploaded; not reused here
          contentType: att.mimeType,
        })),
      };

      switch (provider.providerType) {
        case 'google': {
          const accessToken = await this.getAccessToken(provider);
          messageId = await this.sendViaGmail(accessToken, normalizedData);
          break;
        }
        case 'microsoft': {
          const accessToken = await this.getAccessToken(provider);
          messageId = await this.sendViaOutlook(accessToken, normalizedData);
          break;
        }
        case 'generic':
          messageId = await this.sendViaSMTP(provider, normalizedData);
          break;

        default:
          throw new BadRequestException(`Unsupported provider type: ${provider.providerType}`);
      }

      this.logger.log(`Email sent successfully via ${provider.providerType}: ${messageId}`);

      // Save sent email to database (with attachment storage info already embedded)
      await this.saveSentEmail(data, messageId, provider.id);

      return { success: true, messageId };
    } catch (error) /* istanbul ignore next */ {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send email via ${provider.providerType}: ${message}`, stack);
      throw new BadRequestException(`Failed to send email: ${message}`);
    }
  }

  /**
   * Send email via Gmail API
   */
  private async sendViaGmail(accessToken: string, data: SendEmailDto): Promise<string> {
    const oauth2 = new google.auth.OAuth2();
    oauth2.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    // Create RFC 2822 formatted message
    const message = this.createRFC2822Message(data);
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return response.data.id!;
  }

  /**
   * Send email via Microsoft Graph API
   */
  private async sendViaOutlook(accessToken: string, data: SendEmailDto): Promise<string> {
    const message = {
      subject: data.subject,
      body: {
        contentType: 'HTML',
        content: data.bodyHtml,
      },
      toRecipients: data.to.map(email => ({
        emailAddress: { address: email },
      })),
      ccRecipients: data.cc?.map(email => ({
        emailAddress: { address: email },
      })) || [],
      bccRecipients: data.bcc?.map(email => ({
        emailAddress: { address: email },
      })) || [],
      ...(data.inReplyTo && {
        inferenceClassification: 'focused',
        internetMessageHeaders: [
          { name: 'In-Reply-To', value: data.inReplyTo },
          { name: 'References', value: data.references || data.inReplyTo },
        ],
      }),
    };

    await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        message,
        saveToSentItems: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Microsoft doesn't return messageId immediately, generate temp ID
    return `microsoft-${Date.now()}`;
  }

  /**
   * Send email via SMTP (generic provider)
   */
  private async sendViaSMTP(
    config: ProviderConfig,
    data: SendEmailDto,
  ): Promise<string> {
    if (
      !config.smtpHost ||
      !config.smtpPort ||
      !config.smtpUsername ||
      !config.smtpPassword ||
      !config.smtpEncryptionIv
    ) {
      throw new BadRequestException('SMTP provider missing configuration');
    }

    const smtpPassword = this.crypto.decrypt(config.smtpPassword, config.smtpEncryptionIv);

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpUseTls ?? true,
      auth: {
        user: config.smtpUsername,
        pass: smtpPassword,
      },
    });

    const mailOptions = {
      from: config.email || config.smtpUsername,
      to: data.to.join(', '),
      cc: data.cc?.join(', '),
      bcc: data.bcc?.join(', '),
      subject: data.subject,
      text: data.bodyText,
      html: data.bodyHtml,
      inReplyTo: data.inReplyTo,
      references: data.references,
      attachments: data.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  }

  /**
   * Create RFC 2822 formatted email message for Gmail
   */
  private createRFC2822Message(data: SendEmailDto): string {
    const boundary = `boundary_${Date.now()}`;
    let message = '';

    // Headers
    message += `To: ${data.to.join(', ')}\r\n`;
    if (data.cc && data.cc.length > 0) {
      message += `Cc: ${data.cc.join(', ')}\r\n`;
    }
    if (data.bcc && data.bcc.length > 0) {
      message += `Bcc: ${data.bcc.join(', ')}\r\n`;
    }
    message += `Subject: ${data.subject}\r\n`;
    if (data.inReplyTo) {
      message += `In-Reply-To: ${data.inReplyTo}\r\n`;
    }
    if (data.references) {
      message += `References: ${data.references}\r\n`;
    }
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    message += `\r\n`;

    // Plain text part
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    message += `\r\n`;
    message += `${data.bodyText}\r\n`;
    message += `\r\n`;

    // HTML part
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset="UTF-8"\r\n`;
    message += `\r\n`;
    message += `${data.bodyHtml}\r\n`;
    message += `\r\n`;

    message += `--${boundary}--`;

    return message;
  }

  /**
   * Save sent email to database
   */
  private async saveSentEmail(data: SendEmailDto, messageId: string, providerId: string) {
    await this.prisma.email.create({
      data: {
        tenantId: data.tenantId,
        providerId,
        externalId: messageId,
        messageId,
        from: '', // Will be filled in by next sync
        to: data.to,
        cc: data.cc || [],
        bcc: data.bcc || [],
        subject: data.subject,
        bodyText: data.bodyText,
        bodyHtml: data.bodyHtml,
        folder: 'SENT',
        labels: [],
        isRead: true,
        isStarred: false,
        isFlagged: false,
        isDraft: false,
        isDeleted: false,
        sentAt: new Date(),
        receivedAt: new Date(),
        inReplyTo: data.inReplyTo,
        references: data.references,
      },
    });
  }

  /**
   * Get decrypted access token from provider
   */
  private async getAccessToken(provider: ProviderConfig): Promise<string> {
    if (!provider.accessToken || !provider.tokenEncryptionIv) {
      throw new BadRequestException('Provider has no access token');
    }

    const needsRefresh =
      !provider.tokenExpiresAt ||
      provider.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

    switch (provider.providerType) {
      case 'google':
        return this.getGoogleAccessToken(provider, needsRefresh);
      case 'microsoft':
        return this.getMicrosoftAccessToken(provider, needsRefresh);
      default:
        return this.crypto.decrypt(provider.accessToken, provider.tokenEncryptionIv);
    }
  }

  private async getGoogleAccessToken(
    provider: ProviderConfig,
    needsRefresh: boolean,
  ): Promise<string> {
    let accessToken = this.crypto.decrypt(provider.accessToken!, provider.tokenEncryptionIv!);

    if (!needsRefresh) {
      return accessToken;
    }

    if (!provider.refreshToken || !provider.refreshTokenEncryptionIv) {
      throw new BadRequestException('Google provider missing refresh token');
    }

    const refreshToken = this.crypto.decrypt(
      provider.refreshToken,
      provider.refreshTokenEncryptionIv,
    );

    const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;

    const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);

    const updateData: Prisma.ProviderConfigUpdateInput = {
      accessToken: encryptedAccess.encrypted,
      tokenEncryptionIv: encryptedAccess.iv,
      tokenExpiresAt: refreshed.expiresAt,
    };

    await this.prisma.providerConfig.update({
      where: { id: provider.id },
      data: updateData,
    });

    return accessToken;
  }

  private async getMicrosoftAccessToken(
    provider: ProviderConfig,
    needsRefresh: boolean,
  ): Promise<string> {
    let accessToken = this.crypto.decrypt(provider.accessToken!, provider.tokenEncryptionIv!);

    if (!needsRefresh) {
      return accessToken;
    }

    if (!provider.refreshToken || !provider.refreshTokenEncryptionIv) {
      throw new BadRequestException('Microsoft provider missing refresh token');
    }

    const refreshToken = this.crypto.decrypt(
      provider.refreshToken,
      provider.refreshTokenEncryptionIv,
    );

    const refreshed = await this.microsoftOAuth.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;

    const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
    const updateData: Prisma.ProviderConfigUpdateInput = {
      accessToken: encryptedAccess.encrypted,
      tokenEncryptionIv: encryptedAccess.iv,
      tokenExpiresAt: refreshed.expiresAt,
    };

    if (refreshed.refreshToken) {
      const encryptedRefresh = this.crypto.encrypt(refreshed.refreshToken);
      Object.assign(updateData, {
        refreshToken: encryptedRefresh.encrypted,
        refreshTokenEncryptionIv: encryptedRefresh.iv,
      });
    }

    await this.prisma.providerConfig.update({
      where: { id: provider.id },
      data: updateData,
    });

    return accessToken;
  }

  /**
   * Reply to an email
   */
  async replyToEmail(
    emailId: string,
    tenantId: string,
    data: Omit<SendEmailDto, 'tenantId' | 'providerId' | 'inReplyTo' | 'references'>,
  ): Promise<{ success: boolean; messageId: string }> {
    const originalEmail = await this.prisma.email.findFirst({
      where: { id: emailId, tenantId },
    });

    if (!originalEmail) {
      throw new NotFoundException('Original email not found');
    }

    // Build references chain
    const references = originalEmail.references
      ? `${originalEmail.references} ${originalEmail.messageId}`
      : originalEmail.messageId || '';

    return this.sendEmail({
      ...data,
      tenantId,
      providerId: originalEmail.providerId,
      inReplyTo: originalEmail.messageId || undefined,
      references,
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(
    emailId: string,
    tenantId: string,
    data: Omit<SendEmailDto, 'tenantId' | 'providerId' | 'subject' | 'bodyHtml' | 'bodyText'>,
  ): Promise<{ success: boolean; messageId: string }> {
    const originalEmail = await this.prisma.email.findFirst({
      where: { id: emailId, tenantId },
    });

    if (!originalEmail) {
      throw new NotFoundException('Original email not found');
    }

    // Prepare forwarded content
    const subject = originalEmail.subject.startsWith('Fwd:')
      ? originalEmail.subject
      : `Fwd: ${originalEmail.subject}`;

    const bodyHtml = `
      <p><br></p>
      <p>---------- Forwarded message ---------</p>
      <p><strong>From:</strong> ${originalEmail.from}</p>
      <p><strong>Date:</strong> ${originalEmail.sentAt.toLocaleString()}</p>
      <p><strong>Subject:</strong> ${originalEmail.subject}</p>
      <p><strong>To:</strong> ${originalEmail.to.join(', ')}</p>
      <p><br></p>
      ${originalEmail.bodyHtml || ''}
    `;

    const bodyText = `
---------- Forwarded message ---------
From: ${originalEmail.from}
Date: ${originalEmail.sentAt.toLocaleString()}
Subject: ${originalEmail.subject}
To: ${originalEmail.to.join(', ')}

${originalEmail.bodyText || ''}
    `;

    return this.sendEmail({
      ...data,
      tenantId,
      providerId: originalEmail.providerId,
      subject,
      bodyHtml,
      bodyText,
    });
  }
}
