/**
 * AI Processing Worker - Processes AI requests from BullMQ queue
 * Reuses NestJS services (MistralService & EmbeddingsService) for consistency
 */

import { Queue, Worker } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { MistralService } from '../modules/ai/services/mistral.service';
import { PrismaService } from '../prisma/prisma.service';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

const queueOptions = { connection };

const aiQueue = new Queue('ai-processing', queueOptions);

async function bootstrap() {
  const logger = new Logger('AIWorker');

  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prismaService = appContext.get(PrismaService);
  const mistralService = appContext.get(MistralService);

  const aiWorker = new Worker(
    'ai-processing',
    async (job) => {
      const { tenantId, userId, prompt, conversationHistory = [], conversationId } = job.data;

      if (!tenantId || !userId || !prompt) {
        throw new Error('Job payload missing tenantId, userId or prompt');
      }

      const response = await mistralService.generateResponse(
        tenantId,
        userId,
        prompt,
        conversationHistory,
        { conversationId },
      );

      return { success: true, response };
    },
    queueOptions,
  );

  aiWorker.on('completed', (job) => {
    logger.log(`AI job ${job.id} completed successfully`);
  });

  aiWorker.on('failed', (job, error) => {
    const jobId = job?.id || 'unknown';
    logger.error(`AI job ${jobId} failed:`, error);
  });

  const shutdown = async () => {
    logger.log('AI worker shutting down gracefully');
    await aiWorker.close();
    await aiQueue.close();
    await prismaService.$disconnect();
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.log('AI Worker started and listening for jobs');
}

const bootstrapLogger = new Logger('AIWorkerBootstrap');
bootstrap().catch((error) => {
  bootstrapLogger.error('Failed to initialise AI worker:', error);
  process.exit(1);
});
