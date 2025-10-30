/**
 * AI Processing Worker - Processes AI requests from BullMQ queue
 * Handles heavy AI processing tasks asynchronously
 */

import { createClient } from 'redis';
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const prisma = new PrismaClient();

// Queues
const aiQueue = new Queue('ai-processing', { connection: redisClient as any });

const apiBaseUrl = 'https://api.mistral.ai/v1';
const apiKey = process.env.MISTRAL_API_KEY;
const model = process.env.MISTRAL_MODEL || 'mistral-large-latest';

// Worker to process AI jobs
const aiWorker = new Worker(
  'ai-processing',
  async (job) => {
    console.log(`Processing AI job: ${job.id}`);

    const { tenantId, userId, prompt, conversationId } = job.data;

    try {
      // Generate embedding for RAG search
      const embedding = await generateEmbedding(prompt);

      // Search for similar content
      // TODO: Implement pgvector search

      // Call Mistral API
      const response = await callMistralApi(prompt, []);

      // Store assistant response
      await prisma.message.create({
        data: {
          tenantId,
          userId,
          conversationId,
          role: 'assistant',
          content: response,
        },
      });

      console.log(`AI processing completed: ${job.id}`);
      return { success: true, response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`AI processing failed: ${errorMessage}`);
      throw error;
    }
  },
  { connection: redisClient as any },
);

// Generate embedding using Mistral API
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      `${apiBaseUrl}/embeddings`,
      {
        model: 'mistral-embed',
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

// Call Mistral API
async function callMistralApi(prompt: string, history: any[]): Promise<string> {
  try {
    const messages = [...history, { role: 'user', content: prompt }];

    const response = await axios.post(
      `${apiBaseUrl}/chat/completions`,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Mistral API error:', error);
    throw error;
  }
}

// Start worker
async function startWorker() {
  console.log('AI Worker started');

  aiWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  aiWorker.on('failed', (job, error) => {
    const jobId = job?.id || 'unknown';
    console.error(`Job ${jobId} failed:`, error);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await aiWorker.close();
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
});

startWorker().catch((error) => {
  console.error('Failed to start AI worker:', error);
  process.exit(1);
});
