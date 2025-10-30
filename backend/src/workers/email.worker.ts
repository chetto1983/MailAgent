/**
 * Email Sync Worker - Processes email synchronization jobs from BullMQ queue
 * Connects to IMAP/Gmail/Outlook and syncs emails periodically
 */

import { createClient } from 'redis';
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import * as crypto from 'crypto';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const prisma = new PrismaClient();

// Queues
const emailSyncQueue = new Queue('email-sync', { connection: redisClient as any });

// Helper to decrypt credentials
function decryptValue(encrypted: string, iv: string): string {
  const algorithm = 'aes-256-cbc';
  const secretKey = Buffer.from(process.env.AES_SECRET_KEY || 'default-key-32-bytes-long-here!!', 'base64');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(iv, 'hex'), secretKey as any);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Worker to process email sync jobs
const emailWorker = new Worker(
  'email-sync',
  async (job) => {
    console.log(`Processing email sync job: ${job.id}`);

    const { emailConfigId } = job.data;

    try {
      const emailConfig = await prisma.emailConfig.findUnique({
        where: { id: emailConfigId },
      });

      if (!emailConfig || !emailConfig.isActive) {
        throw new Error('Email config not found or inactive');
      }

      // Handle different email providers
      if (emailConfig.type === 'imap') {
        await syncImap(emailConfig);
      } else if (emailConfig.type === 'gmail') {
        await syncGmail(emailConfig);
      } else if (emailConfig.type === 'outlook') {
        await syncOutlook(emailConfig);
      }

      // Update last sync time
      await prisma.emailConfig.update({
        where: { id: emailConfigId },
        data: { lastSyncedAt: new Date() },
      });

      console.log(`Email sync completed: ${emailConfigId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Email sync failed: ${errorMessage}`);
      throw error;
    }
  },
  { connection: redisClient as any },
);

// Sync IMAP mailbox
async function syncImap(emailConfig: any) {
  const password = decryptValue(emailConfig.imapPassword, emailConfig.encryptionIv);

  const client = new ImapFlow({
    host: 'imap.gmail.com', // Should be configurable per provider
    port: 993,
    secure: true,
    auth: {
      user: emailConfig.email,
      pass: password,
    },
  });

  await client.connect();

  try {
    const mailbox = await client.mailboxOpen('INBOX');
    // Note: ImapFlow's search API uses different parameters
    // For now, fetch all messages - TODO: implement unseen flag filtering
    const messageIds = await client.search({});

    if (Array.isArray(messageIds)) {
      console.log(`Found ${messageIds.length} new messages`);

      // Process messages...
      // TODO: Parse emails and store metadata in database
    }

    await client.logout();
  } catch (error) {
    console.error('IMAP sync error:', error);
    throw error;
  }
}

// Sync Gmail API
async function syncGmail(emailConfig: any) {
  // TODO: Implement Gmail API sync
  console.log('Gmail sync not yet implemented');
}

// Sync Outlook/Microsoft Graph
async function syncOutlook(emailConfig: any) {
  // TODO: Implement Microsoft Graph sync
  console.log('Outlook sync not yet implemented');
}

// Start worker
async function startWorker() {
  console.log('Email Worker started');

  // Add recurring job every 15 minutes
  await emailSyncQueue.add(
    'sync',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
    },
  );

  emailWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, error) => {
    const jobId = job?.id || 'unknown';
    console.error(`Job ${jobId} failed:`, error);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await emailWorker.close();
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
});

startWorker().catch((error) => {
  console.error('Failed to start email worker:', error);
  process.exit(1);
});
