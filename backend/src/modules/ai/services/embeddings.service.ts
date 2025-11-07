import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '../../../prisma/prisma.service';

interface SaveEmbeddingOptions {
  tenantId: string;
  content: string;
  embedding: number[];
  model: string;
  messageId?: string;
  documentName?: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an embedding vector into the knowledge base.
   */
  async saveEmbedding(options: SaveEmbeddingOptions): Promise<void> {
    const {
      tenantId,
      content,
      embedding,
      model,
      messageId = null,
      documentName = null,
      metadata,
    } = options;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      this.logger.warn('Skipping embedding save because embedding array is empty.');
      return;
    }

    const vectorLiteral = Prisma.raw(`'[${embedding.join(',')}]'::vector`);
    const metadataString = metadata ? JSON.stringify(metadata) : null;
    const metadataFragment = metadataString
      ? Prisma.sql`${metadataString}::jsonb`
      : Prisma.sql`NULL::jsonb`;

    try {
      if (messageId) {
        await this.prisma.$executeRaw(
          Prisma.sql`DELETE FROM "embeddings" WHERE "messageId" = ${messageId};`,
        );
      }

      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "embeddings"
            ("id", "tenantId", "messageId", "documentName", "content", "vector", "embeddingModel", "metadata", "createdAt")
          VALUES
            (${nanoid()}, ${tenantId}, ${messageId}, ${documentName}, ${content}, ${vectorLiteral}, ${model}, ${metadataFragment}, NOW());
        `,
      );
    } catch (error) {
      this.logger.error('Failed to save embedding to database', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Perform similarity search using pgvector <-> operator.
   */
  async findSimilarContent<
    T extends { id: string; content: string; documentName: string | null; metadata: any; distance?: number }
  >(
    tenantId: string,
    embedding: number[],
    limit: number,
  ): Promise<T[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return [];
    }

    const vectorLiteral = Prisma.raw(`'[${embedding.join(',')}]'::vector`);

    try {
      const results = await this.prisma.$queryRaw<T[]>(
        Prisma.sql`
          SELECT "id", "content", "documentName", "metadata", ("vector" <-> ${vectorLiteral}) AS "distance"
          FROM "embeddings"
          WHERE "tenantId" = ${tenantId}
          ORDER BY "vector" <-> ${vectorLiteral}
          LIMIT ${limit};
        `,
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to execute similarity search', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async hasEmbeddingForEmail(tenantId: string, emailId: string): Promise<boolean> {
    if (!emailId) {
      return false;
    }

    const count = await this.prisma.embedding.count({
      where: {
        tenantId,
        metadata: {
          path: ['emailId'],
          equals: emailId,
        },
      },
    });

    return count > 0;
  }
}
