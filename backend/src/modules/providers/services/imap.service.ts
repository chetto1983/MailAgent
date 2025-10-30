import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ImapFlow, ImapFlowOptions } from 'imapflow';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Test IMAP connection
   */
  async testConnection(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTls: boolean;
  }): Promise<boolean> {
    let client: ImapFlow | null = null;

    try {
      const options: ImapFlowOptions = {
        host: config.host,
        port: config.port,
        secure: config.useTls,
        auth: {
          user: config.username,
          pass: config.password,
        },
        logger: false, // Disable verbose logging
      };

      client = new ImapFlow(options);

      // Connect to IMAP server
      await client.connect();

      this.logger.log(`IMAP connection test successful for ${config.host}`);
      return true;
    } catch (error) {
      this.logger.error(`IMAP connection test failed for ${config.host}:`, error);
      return false;
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (logoutError) {
          this.logger.warn('Error during IMAP logout:', logoutError);
        }
      }
    }
  }

  /**
   * Test SMTP connection
   */
  async testSmtpConnection(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTls: boolean;
  }): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.useTls, // true for 465, false for other ports
        auth: {
          user: config.username,
          pass: config.password,
        },
      });

      // Verify connection
      await transporter.verify();

      this.logger.log(`SMTP connection test successful for ${config.host}`);
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection test failed for ${config.host}:`, error);
      return false;
    }
  }

  /**
   * Get IMAP client instance (for reuse in other services)
   */
  createClient(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTls: boolean;
  }): ImapFlow {
    const options: ImapFlowOptions = {
      host: config.host,
      port: config.port,
      secure: config.useTls,
      auth: {
        user: config.username,
        pass: config.password,
      },
      logger: false,
    };

    return new ImapFlow(options);
  }

  /**
   * Fetch email folders (for testing/verification)
   */
  async listFolders(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    useTls: boolean;
  }): Promise<string[]> {
    let client: ImapFlow | null = null;

    try {
      client = this.createClient(config);
      await client.connect();

      const folders = await client.list();

      const folderNames = folders.map((folder) => folder.path);

      this.logger.log(`Retrieved ${folderNames.length} folders from IMAP server`);

      return folderNames;
    } catch (error) {
      this.logger.error('Failed to list IMAP folders:', error);
      throw new UnauthorizedException('Failed to list IMAP folders');
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (logoutError) {
          this.logger.warn('Error during IMAP logout:', logoutError);
        }
      }
    }
  }
}
