import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';

const IMAP_BODY_DOWNLOAD_TIMEOUT_MS = 10000;
const IMAP_BODY_MAX_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable()
export class ImapSyncService {
  private readonly logger = new Logger(ImapSyncService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
  ) {}

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType, lastSyncedAt } = jobData;

    this.logger.log(`Starting ${syncType} IMAP sync for ${email}`);

    let client: ImapFlow | null = null;

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.imapPassword) {
        throw new Error('Provider not found or missing IMAP credentials');
      }

      // Decrypt IMAP password
      const imapPassword = this.crypto.decrypt(
        provider.imapPassword,
        provider.imapEncryptionIv!,
      );

      // Create IMAP client
      client = new ImapFlow({
        host: provider.imapHost!,
        port: provider.imapPort || 993,
        secure: provider.imapUseTls ?? true,
        auth: {
          user: provider.imapUsername!,
          pass: imapPassword,
        },
        logger: false,
      });

      await client.connect();
      this.logger.debug(`Connected to IMAP server for ${email}`);

      // Get last synced UID from metadata
      const metadata = (provider.metadata as any) || {};
      const lastUid = metadata.lastSyncToken ? parseInt(metadata.lastSyncToken) : 0;

      let messagesProcessed = 0;
      let newMessages = 0;
      let maxUid = lastUid;

      if (syncType === 'incremental' && lastUid > 0) {
        // Incremental sync - only fetch messages after last UID
        const incrementalResult = await this.syncIncremental(
          client,
          lastUid,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = incrementalResult.messagesProcessed;
        newMessages = incrementalResult.newMessages;
        maxUid = incrementalResult.maxUid;
      } else {
        // Full sync - fetch recent messages
        const fullResult = await this.syncFull(
          client,
          email,
          providerId,
          provider.tenantId,
        );
        messagesProcessed = fullResult.messagesProcessed;
        newMessages = fullResult.newMessages;
        maxUid = fullResult.maxUid;
      }

      await client.logout();

      return {
        success: true,
        providerId,
        email,
        messagesProcessed,
        newMessages,
        syncDuration: 0, // Will be set by worker
        lastSyncToken: maxUid.toString(),
      };
    } catch (error) {
      this.logger.error(`IMAP sync failed for ${email}:`, error);

      if (client) {
        try {
          await client.logout();
        } catch (logoutError) {
          // Ignore logout errors
        }
      }

      throw error;
    }
  }

  /**
   * Incremental sync - fetch messages with UID > lastUid
   */
  private async syncIncremental(
    client: ImapFlow,
    lastUid: number,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    maxUid: number;
  }> {
    this.logger.debug(`Incremental sync from UID: ${lastUid}`);

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Get mailbox status
      const status = await client.status('INBOX', { uidNext: true });
      const uidNext = status.uidNext || lastUid + 1;

      // If no new messages
      if (uidNext <= lastUid + 1) {
        return {
          messagesProcessed: 0,
          newMessages: 0,
          maxUid: lastUid,
        };
      }

      // Fetch new messages
      const range = `${lastUid + 1}:*`;

      let messagesProcessed = 0;
      let newMessages = 0;
      let maxUid = lastUid;

      for await (const message of client.fetch(range, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
      }, { uid: true })) {
        const processed = await this.processMessage(
          message,
          client,
          providerId,
          tenantId,
        );
        if (processed) {
          messagesProcessed++;
          newMessages++;
        }
        maxUid = Math.max(maxUid, message.uid);
      }

      return {
        messagesProcessed,
        newMessages,
        maxUid,
      };
    } finally {
      lock.release();
    }
  }

  /**
   * Full sync - fetch recent messages (last 100)
   */
  private async syncFull(
    client: ImapFlow,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    maxUid: number;
  }> {
    this.logger.debug('Full sync - fetching recent messages');

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Get mailbox status
      const mailboxStatus = await client.status('INBOX', { messages: true });
      const totalMessages = mailboxStatus.messages || 0;

      if (totalMessages === 0) {
        return {
          messagesProcessed: 0,
          newMessages: 0,
          maxUid: 0,
        };
      }

      // Fetch last 100 messages (or all if less than 100)
      const limit = Math.min(100, totalMessages);
      const startSeq = Math.max(1, totalMessages - limit + 1);
      const endSeq = totalMessages;

      let messagesProcessed = 0;
      let newMessages = 0;
      let maxUid = 0;

      for await (const message of client.fetch(`${startSeq}:${endSeq}`, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
      })) {
        const processed = await this.processMessage(
          message,
          client,
          providerId,
          tenantId,
        );
        if (processed) {
          messagesProcessed++;
          newMessages++;
        }
        maxUid = Math.max(maxUid, message.uid);
      }

      return {
        messagesProcessed,
        newMessages,
        maxUid,
      };
    } finally {
      lock.release();
    }
  }

  /**
   * Process a single IMAP message
   */
  private async processMessage(
    message: any,
    client: ImapFlow,
    providerId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const envelope = message.envelope;

      if (!envelope) {
        return false;
      }

      // Extract email addresses from envelope
      const from = envelope.from?.[0]?.address || '';
      const to = (envelope.to || []).map((addr: any) => addr.address).filter(Boolean);
      const cc = (envelope.cc || []).map((addr: any) => addr.address).filter(Boolean);
      const bcc = (envelope.bcc || []).map((addr: any) => addr.address).filter(Boolean);

      const subject = envelope.subject || '(No Subject)';
      const messageId = envelope.messageId;
      const inReplyTo = envelope.inReplyTo;

      // Extract dates
      const sentAt = envelope.date ? new Date(envelope.date) : new Date();
      const receivedAt = new Date();

      let bodyText = '';
      let bodyHtml = '';

      const bodyBuffer = await this.downloadMessageBody(client, message.uid);
      if (bodyBuffer) {
        try {
          const parsed = await simpleParser(bodyBuffer);
          bodyText = parsed.text ?? '';
          bodyHtml = typeof parsed.html === 'string' ? parsed.html : '';
        } catch (parseError) {
          const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
          this.logger.warn(`Failed to parse IMAP message UID ${message.uid}: ${parseMessage}`);
        }
      }

      if (bodyText.length > 10000) {
        bodyText = bodyText.slice(0, 10000);
      }
      if (bodyHtml.length > 20000) {
        bodyHtml = bodyHtml.slice(0, 20000);
      }

      // Create snippet from body or subject
      const snippetSource = bodyText || this.stripHtml(bodyHtml) || subject;
      const snippet = snippetSource.substring(0, 200);

      // Extract flags
      const flags = message.flags || new Set();
      const isRead = flags.has('\\Seen');
      const isStarred = flags.has('\\Flagged');

      // Save to database with upsert to prevent duplicates
      const emailRecord = await this.prisma.email.upsert({
        where: {
          providerId_externalId: {
            providerId,
            externalId: message.uid.toString(),
          },
        },
        create: {
          tenantId,
          providerId,
          externalId: message.uid.toString(),
          threadId: null, // IMAP doesn't have native threading
          messageId,
          inReplyTo,
          references: envelope.references,
          from,
          to,
          cc,
          bcc,
          subject,
          bodyText,
          bodyHtml,
          snippet,
          folder: 'INBOX',
          labels: [],
          isRead,
          isStarred,
          sentAt,
          receivedAt,
          size: message.size || null,
          headers: {
            uid: message.uid,
            flags: Array.from(flags),
          } as Record<string, any>,
        },
        update: {
          // Update flags in case they changed
          isRead,
          isStarred,
          headers: {
            uid: message.uid,
            flags: Array.from(flags),
          } as Record<string, any>,
        },
      });

      this.logger.debug(`Saved email UID ${message.uid}: ${subject} from ${from}`);

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(tenantId, emailRecord.id);

      if (alreadyEmbedded) {
        this.logger.verbose(
          `Skipping embedding enqueue for IMAP message UID ${message.uid} - embedding already exists.`,
        );
      } else {
        try {
          await this.emailEmbeddingQueue.enqueue({
            tenantId,
            emailId: emailRecord.id,
            subject,
            snippet,
            bodyText,
            bodyHtml,
            from,
            receivedAt,
          });
          this.logger.verbose(`Queued embedding job for IMAP message UID ${message.uid}`);
        } catch (queueError) {
          const queueMessage = queueError instanceof Error ? queueError.message : String(queueError);
          this.logger.warn(
            `Failed to enqueue embedding job for IMAP message UID ${message.uid}: ${queueMessage}`,
          );
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to process message UID ${message.uid}:`, error);
      return false;
    }
  }

  private async downloadMessageBody(client: ImapFlow, uid: number): Promise<Buffer | null> {
    const downloadTask = (async () => {
      const source = await client.download(`${uid}`, undefined, { uid: true });
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      for await (const chunk of source.content) {
        totalBytes += chunk.length;
        if (totalBytes > IMAP_BODY_MAX_BYTES) {
          throw new Error(`Message body exceeds ${IMAP_BODY_MAX_BYTES} bytes limit`);
        }
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    })();

    try {
      return await Promise.race([
        downloadTask,
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('IMAP body download timed out')), IMAP_BODY_DOWNLOAD_TIMEOUT_MS),
        ),
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not download body for UID ${uid}: ${msg}`);
      return null;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
