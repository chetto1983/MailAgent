import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { MistralService } from './mistral.service';
import { EmbeddingsService } from './embeddings.service';
import { EmailEmbeddingQueueService } from './email-embedding.queue';

interface BackfillResult {
  processed: number;
  embedded: number; // Number of emails queued for embedding
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

interface KnowledgeBaseSearchOptions {
  tenantId: string;
  query?: string;
  emailId?: string;
  limit?: number;
}

export interface KnowledgeBaseSearchHit {
  id: string;
  subject: string | null;
  snippet: string;
  source: string | null;
  emailId: string | null;
  from: string | null;
  receivedAt: string | null;
  distance: number | null;
  score: number | null;
  metadata: Record<string, any> | null;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private static readonly MAX_CHARS_PER_CHUNK = 12000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mistralService: MistralService,
    private readonly embeddingsService: EmbeddingsService,
    @Inject(forwardRef(() => EmailEmbeddingQueueService))
    private readonly emailEmbeddingQueue: EmailEmbeddingQueueService,
  ) {}

  async backfillEmailEmbeddingsForTenant(
    tenantId: string,
    options: BackfillOptions = {},
  ): Promise<BackfillResult> {
    const limit = options.limit && options.limit > 0 ? options.limit : 100;
    const requestedBatchSize = options.batchSize && options.batchSize > 0 ? options.batchSize : 10;
    const batchSize = Math.min(requestedBatchSize, 10);
    const includeDeleted = options.includeDeleted ?? false;

    let processed = 0;
    let enqueued = 0;
    let skipped = 0;

    while (processed < limit) {
      const batchCount = Math.min(batchSize, limit - processed);
      const emails = await this.fetchEmailsWithoutEmbeddings(tenantId, batchCount, includeDeleted);

      if (emails.length === 0) {
        break;
      }

      for (const email of emails) {
        processed += 1;
        const contentPreview = this.composeEmailEmbeddingContent(email);

        if (!contentPreview) {
          skipped += 1;
          continue;
        }

        try {
          await this.emailEmbeddingQueue.enqueue({
            tenantId,
            emailId: email.id,
            subject: email.subject,
            snippet: email.snippet,
            bodyText: email.bodyText,
            bodyHtml: email.bodyHtml,
            from: email.from,
            receivedAt: email.receivedAt,
          });
          enqueued += 1;
        } catch (error) {
          skipped += 1;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to enqueue embedding job for email ${email.id}: ${message}`);
        }
      }

      if (processed < limit && emails.length === batchCount) {
        await this.pauseBetweenBackfillBatches();
      }
    }

    const remaining = await this.countEmailsWithoutEmbeddings(tenantId, includeDeleted);

    return {
      processed,
      embedded: enqueued,
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

    if (
      options.emailId &&
      (await this.embeddingsService.hasEmbeddingForEmail(options.tenantId, options.emailId))
    ) {
      this.logger.verbose(
        `Embedding already exists for email ${options.emailId} (tenant ${options.tenantId}), skipping.`,
      );
      return false;
    }

    try {
      const chunks = KnowledgeBaseService.chunkContentForEmbedding(content);

      if (chunks.length > 1) {
        this.logger.debug(
          `Email ${options.emailId} (tenant ${options.tenantId}) split into ${chunks.length} chunks for embedding.`,
        );
      }

      const client = await this.mistralService.createMistralClient();
      await this.deleteEmbeddingsForEmail(options.tenantId, options.emailId);

      const receivedAtIso =
        options.receivedAt instanceof Date
          ? options.receivedAt.toISOString()
          : options.receivedAt || undefined;

      let successfulChunks = 0;

      for (const chunk of chunks) {
        try {
          const embedding = await this.mistralService.generateEmbedding(chunk.content, client);

          await this.embeddingsService.saveEmbedding({
            tenantId: options.tenantId,
            messageId: `${options.emailId}::chunk-${chunk.index + 1}`,
            content: chunk.content,
            embedding,
            model: this.mistralService.getEmbeddingModel(),
            documentName: options.subject,
            metadata: {
              source: 'email',
              emailId: options.emailId,
              subject: options.subject,
              from: options.from ?? null,
              receivedAt: receivedAtIso ?? null,
              chunkIndex: chunk.index,
              chunkCount: chunks.length,
            },
          });

          successfulChunks += 1;
        } catch (chunkError) {
          const message = chunkError instanceof Error ? chunkError.message : String(chunkError);
          this.logger.warn(
            `Failed embedding chunk ${chunk.index + 1}/${chunks.length} for email ${options.emailId} (tenant ${options.tenantId}): ${message}`,
          );
        }
      }

      return successfulChunks > 0;
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

  async searchKnowledgeBase(options: KnowledgeBaseSearchOptions): Promise<{
    usedQuery: string;
    items: KnowledgeBaseSearchHit[];
  }> {
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 10) : 5;
    const trimmedQuery = options.query?.trim() ?? '';
    let searchText = trimmedQuery;

    if (!searchText && options.emailId) {
      const email = await this.prisma.email.findFirst({
        where: { id: options.emailId, tenantId: options.tenantId },
        select: {
          subject: true,
          snippet: true,
          bodyText: true,
          bodyHtml: true,
        },
      });

      if (email) {
        searchText =
          this.composeEmailEmbeddingContent({
            subject: email.subject ?? null,
            snippet: email.snippet,
            bodyText: email.bodyText,
            bodyHtml: email.bodyHtml,
          }) ?? '';
      }
    }

    if (!searchText) {
      throw new BadRequestException(
        'Provide a free-text query or an email with content to search the knowledge base.',
      );
    }

    const client = await this.mistralService.createMistralClient();
    const embedding = await this.mistralService.generateEmbedding(searchText, client);
    const matches = await this.embeddingsService.findSimilarContent(
      options.tenantId,
      embedding,
      limit,
    );

    if (!matches.length) {
      return {
        usedQuery: searchText,
        items: [],
      };
    }

    const items = await this.hydrateKnowledgeHits(matches, options.tenantId);

    return {
      usedQuery: searchText,
      items,
    };
  }


  private async hydrateKnowledgeHits(
    matches: Array<{
      id: string;
      content: string;
      documentName: string | null;
      metadata: any;
      distance?: number;
    }>,
    tenantId: string,
  ): Promise<KnowledgeBaseSearchHit[]> {
    const metadataList = matches.map((match) => this.normaliseMetadata(match.metadata));

    const emailIds = Array.from(
      new Set(
        metadataList
          .map((meta) => (this.isString(meta.emailId) ? (meta.emailId) : null))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const emailMap = await this.fetchEmailHydrationMap(tenantId, emailIds);

    return matches.map((match, index) => {
      const metadata = metadataList[index];
      const emailId = this.isString(metadata.emailId) ? (metadata.emailId) : null;
      const emailDetails = emailId ? emailMap.get(emailId) : undefined;

      const subject =
        (this.isString(metadata.subject) && metadata.subject.trim()) ||
        emailDetails?.subject ||
        match.documentName ||
        null;

      const from =
        (this.isString(metadata.from) && metadata.from.trim()) || emailDetails?.from || null;

      const receivedAt =
        (this.isString(metadata.receivedAt) && metadata.receivedAt) ||
        emailDetails?.receivedAt ||
        null;

      const source =
        (this.isString(metadata.source) && metadata.source) || (emailId ? 'email' : null);

      const distance =
        typeof match.distance === 'number' && Number.isFinite(match.distance)
          ? match.distance
          : null;
      const score =
        distance === null
          ? null
          : Number((1 - Math.min(Math.max(distance, 0), 1)).toFixed(3));

      return {
        id: match.id,
        subject,
        snippet: this.truncateMemorySnippet(match.content),
        source,
        emailId,
        from,
        receivedAt,
        distance,
        score,
        metadata: Object.keys(metadata).length ? metadata : null,
      };
    });
  }

  private async fetchEmailHydrationMap(
    tenantId: string,
    emailIds: string[],
  ): Promise<Map<string, { subject: string | null; from: string | null; receivedAt: string | null }>> {
    if (!emailIds.length) {
      return new Map();
    }

    const rows = await this.prisma.email.findMany({
      where: {
        tenantId,
        id: {
          in: emailIds,
        },
      },
      select: {
        id: true,
        subject: true,
        from: true,
        receivedAt: true,
      },
    });

    return new Map(
      rows.map((row) => [
        row.id,
        {
          subject: row.subject,
          from: row.from,
          receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
        },
      ]),
    );
  }

  private normaliseMetadata(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return value as Record<string, any>;
  }

  private truncateMemorySnippet(value: string, limit = 320): string {
    if (!value) {
      return '';
    }

    const normalised = value.replace(/\s+/g, ' ').trim();
    return normalised.length > limit ? `${normalised.slice(0, limit)}...` : normalised;
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
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

  private async pauseBetweenBackfillBatches(): Promise<void> {
    const pauseMs = 1000;
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }

  private composeEmailEmbeddingContent(email: {
    subject: string | null;
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

  private static chunkContentForEmbedding(content: string): Array<{ content: string; index: number }> {
    const maxChars = KnowledgeBaseService.MAX_CHARS_PER_CHUNK;

    if (content.length <= maxChars) {
      return [{ content, index: 0 }];
    }

    const chunks: Array<{ content: string; index: number }> = [];
    let start = 0;
    let index = 0;

    while (start < content.length) {
      let end = Math.min(start + maxChars, content.length);

      if (end < content.length) {
        const lastBreak = content.lastIndexOf('\n', end);
        if (lastBreak > start + maxChars * 0.5) {
          end = lastBreak;
        }
      }

      const chunkContent = content.slice(start, end).trim();
      if (chunkContent.length > 0) {
        chunks.push({ content: chunkContent, index });
        index += 1;
      }

      start = end;
    }

    return chunks;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
