import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';
import { EmbeddingsService } from './embeddings.service';
import { Prisma } from '@prisma/client';

interface BackfillResult {
  processed: number;
  embedded: number;
  skipped: number;
  remaining: number;
}

interface BackfillOptions {
  limit?: number;
  batchSize?: number;
  includeDeleted?: boolean;
}

interface ListEmbeddingsResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

interface CreateEmailEmbeddingOptions {
  tenantId: string;
  emailId: string;
  subject: string;
  snippet?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  from?: string | null;
  receivedAt?: Date | string | null;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mistralService: MistralService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async backfillEmailEmbeddingsForTenant(
    tenantId: string,
    options: BackfillOptions = {},
  ): Promise<BackfillResult> {
    const limit = options.limit && options.limit > 0 ? options.limit : 100;
    const batchSize = options.batchSize && options.batchSize > 0 ? options.batchSize : 20;
    const includeDeleted = options.includeDeleted ?? false;

    const mistralClient = await this.mistralService.createMistralClient();
    const embeddingModel = this.mistralService.getEmbeddingModel();

    let processed = 0;
    let embedded = 0;
    let skipped = 0;

    while (processed < limit) {
      const batchCount = Math.min(batchSize, limit - processed);
      const emails = await this.fetchEmailsWithoutEmbeddings(tenantId, batchCount, includeDeleted);

      if (emails.length === 0) {
        break;
      }

      for (const email of emails) {
        processed += 1;
        const content = this.composeEmailEmbeddingContent(email);

        if (!content) {
          skipped += 1;
          continue;
        }

        try {
          const embedding = await this.mistralService.generateEmbedding(content, mistralClient);
          await this.embeddingsService.saveEmbedding({
            tenantId,
            content,
            embedding,
            model: embeddingModel,
            documentName: email.subject,
            metadata: {
              source: 'email',
              emailId: email.id,
              subject: email.subject,
              from: email.from,
              receivedAt: email.receivedAt?.toISOString?.() ?? email.receivedAt,
            },
          });
          embedded += 1;
        } catch (error) {
          skipped += 1;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to create embedding for email ${email.id}: ${message}`);
        }
      }
    }

    const remaining = await this.countEmailsWithoutEmbeddings(tenantId, includeDeleted);

    return {
      processed,
      embedded,
      skipped,
      remaining,
    };
  }

  async createEmbeddingForEmail(options: CreateEmailEmbeddingOptions): Promise<boolean> {
    const content = this.composeEmailEmbeddingContent({
      subject: options.subject,
      snippet: options.snippet ?? null,
      bodyText: options.bodyText ?? null,
      bodyHtml: options.bodyHtml ?? null,
    });

    if (!content) {
      this.logger.debug(
        `Skipping embedding for email ${options.emailId} (tenant ${options.tenantId}): empty content`,
      );
      return false;
    }

    try {
      const client = await this.mistralService.createMistralClient();
      const embedding = await this.mistralService.generateEmbedding(content, client);

      const receivedAtIso =
        options.receivedAt instanceof Date
          ? options.receivedAt.toISOString()
          : options.receivedAt || undefined;

      await this.embeddingsService.saveEmbedding({
        tenantId: options.tenantId,
        messageId: options.emailId,
        content,
        embedding,
        model: this.mistralService.getEmbeddingModel(),
        documentName: options.subject,
        metadata: {
          source: 'email',
          emailId: options.emailId,
          subject: options.subject,
          from: options.from ?? null,
          receivedAt: receivedAtIso ?? null,
        },
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to create embedding for email ${options.emailId} (tenant ${options.tenantId}): ${message}`,
      );
      return false;
    }
  }

  async listEmbeddings<T = any>(
    tenantId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<ListEmbeddingsResult<T>> {
    const limit = params.limit && params.limit > 0 && params.limit < 200 ? params.limit : 25;
    const offset = params.offset && params.offset >= 0 ? params.offset : 0;

    const embeddings = await this.prisma.embedding.findMany({
      where: { tenantId },
      select: {
        id: true,
        documentName: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await this.prisma.embedding.count({
      where: { tenantId },
    });

    return {
      items: embeddings as unknown as T[],
      total,
      limit,
      offset,
    };
  }

  async deleteEmbedding(tenantId: string, embeddingId: string): Promise<void> {
    const existing = await this.prisma.embedding.findFirst({
      where: {
        id: embeddingId,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Embedding not found for this tenant');
    }

    await this.prisma.embedding.delete({
      where: { id: embeddingId },
    });
  }

  async deleteEmbeddingsForEmail(tenantId: string, emailId: string): Promise<number> {
    const result = await this.prisma.embedding.deleteMany({
      where: {
        tenantId,
        metadata: {
          path: ['emailId'],
          equals: emailId,
        },
      },
    });

    return result.count;
  }

  private async fetchEmailsWithoutEmbeddings(
    tenantId: string,
    limit: number,
    includeDeleted: boolean,
  ): Promise<
    Array<{
      id: string;
      subject: string;
      snippet: string | null;
      bodyText: string | null;
      bodyHtml: string | null;
      from: string | null;
      receivedAt: Date | null;
    }>
  > {
    const deletedCondition = includeDeleted
      ? Prisma.sql`TRUE`
      : Prisma.sql`e."isDeleted" = FALSE`;

    const rows = await this.prisma.$queryRaw<Array<any>>(
      Prisma.sql`
        SELECT
          e."id",
          e."subject",
          e."snippet",
          e."bodyText",
          e."bodyHtml",
          e."from",
          e."receivedAt"
        FROM "emails" e
        LEFT JOIN "embeddings" emb
          ON emb.metadata ->> 'emailId' = e."id"
        WHERE emb."id" IS NULL
          AND e."tenantId" = ${tenantId}
          AND ${deletedCondition}
        ORDER BY e."receivedAt" DESC NULLS LAST
        LIMIT ${limit};
      `,
    );

    return rows;
  }

  private async countEmailsWithoutEmbeddings(tenantId: string, includeDeleted: boolean): Promise<number> {
    const deletedCondition = includeDeleted
      ? Prisma.sql`TRUE`
      : Prisma.sql`e."isDeleted" = FALSE`;

    const result = await this.prisma.$queryRaw<Array<{ remaining: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS remaining
        FROM "emails" e
        LEFT JOIN "embeddings" emb
          ON emb.metadata ->> 'emailId' = e."id"
        WHERE emb."id" IS NULL
          AND e."tenantId" = ${tenantId}
          AND ${deletedCondition};
      `,
    );

    const remaining = result?.[0]?.remaining ?? BigInt(0);
    return Number(remaining);
  }

  private composeEmailEmbeddingContent(email: {
    subject: string;
    snippet: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
  }): string | null {
    const pieces: string[] = [];

    if (email.subject) {
      pieces.push(`Oggetto: ${email.subject}`);
    }

    const textBody = email.bodyText?.trim();
    if (textBody) {
      pieces.push(textBody);
    } else if (email.bodyHtml) {
      const stripped = this.stripHtml(email.bodyHtml);
      if (stripped) {
        pieces.push(stripped);
      }
    } else if (email.snippet) {
      pieces.push(email.snippet);
    }

    const combined = pieces.join('\n\n').trim();
    return combined.length > 0 ? combined : null;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
