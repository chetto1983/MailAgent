import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { getConfiguration } from '../../config/configuration';

@Injectable()
export class CryptoService {
  private logger = new Logger(CryptoService.name);
  private algorithm = 'aes-256-cbc';
  private secretKey: Buffer;
  private config = getConfiguration();

  constructor() {
    // Initialize secret key from centralized config
    try {
      this.secretKey = Buffer.from(this.config.encryption.aesSecretKey, 'base64');
      if (this.secretKey.length !== 32) {
        throw new Error(`AES secret key must be 32 bytes, got ${this.secretKey.length}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize encryption key:', error);
      throw new Error('Invalid AES_SECRET_KEY configuration');
    }
  }

  /**
   * Encrypt data - uses centralized config
   */
  encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt data - uses centralized config
   */
  decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
