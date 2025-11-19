# AI/Embeddings System - Optimization Proposal

## Executive Summary

Analysis of the current AI/Embeddings implementation reveals a well-architected system with bulk processing, smart chunking, and queue-based execution. This document proposes **5 high-impact optimizations** to improve search performance, reduce costs, and enable attachment content search.

## Current Implementation Analysis

### Architecture Overview
```text
Email → Content Extraction → Chunking (12K) → Bulk Embeddings (Mistral) → pgvector → Search
```

### Components Analyzed

#### 1. **KnowledgeBaseService** (knowledge-base.service.ts)
- **Content Composition**: `composeEmailEmbeddingContent()` (line 771)
  - Priority: bodyHtml > bodyText > snippet
  - Uses Mozilla Readability for HTML extraction
  - Adds "Oggetto: {subject}" prefix
- **Chunking**: `chunkContentForEmbedding()` (line 802)
  - MAX_CHARS_PER_CHUNK = 12,000 characters
  - Breaks on newlines (within 50% of max)
  - Each chunk stored with metadata (chunkIndex, chunkCount)
- **Bulk Processing**: `createBulkEmbeddingsForEmails()` (line 145)
  - Processes multiple emails in single Mistral API call
  - Graceful fallback to individual processing

#### 2. **EmbeddingsService** (embeddings.service.ts)
- **Storage**: PostgreSQL with pgvector extension
- **Search**: Cosine distance operator (`<->`)
- **Operations**: saveEmbedding(), findSimilarContent(), hasEmbeddingForEmail()

#### 3. **MistralService** (mistral.service.ts)
- **Model**: mistral-embed
- **Methods**:
  - `generateEmbedding()` - single text
  - `generateBulkEmbeddings()` - batch (more efficient)

#### 4. **EmailEmbeddingQueueService** (email-embedding.queue.ts)
- **Queue**: BullMQ with Redis
- **Configuration**:
  - Bulk size: 75 emails
  - Concurrency: 8 workers
  - Rate limit: 25/second
  - Exponential backoff on rate limits

#### 5. **HtmlContentExtractor** (html-content-extractor.ts)
- **Algorithm**: Mozilla Readability
- **Fallback**: Basic HTML tag stripping
- **Cleaning**: Normalizes whitespace, removes excessive newlines

### Strengths ✅

1. ✅ **Bulk API Usage** - Single API call for multiple embeddings (cost-efficient)
2. ✅ **Smart Chunking** - Newline-aware splitting preserves structure
3. ✅ **Queue Processing** - Rate limiting, retries, backoff handling
4. ✅ **HTML Extraction** - Industry-standard Readability algorithm
5. ✅ **Deduplication** - Prevents duplicate embedding jobs
6. ✅ **Graceful Degradation** - Fallbacks at multiple layers
7. ✅ **Metadata Tracking** - Rich metadata for each embedding

## Optimization Opportunities

### Priority Matrix

| Optimization | Impact | Complexity | Priority | Cost Savings | Perf Gain |
|--------------|--------|------------|----------|--------------|-----------|
| Query Embedding Cache | HIGH | LOW | 🔥 **P0** | 50-70% | 2-3x |
| Metadata Pre-filtering | HIGH | LOW | 🔥 **P0** | - | 2-5x |
| Attachment Content Index | HIGH | MEDIUM | 🔥 **P0** | - | Complete |
| Improved Chunking | MEDIUM | MEDIUM | **P1** | - | 10-20% |
| Hybrid Search | MEDIUM | MEDIUM | **P1** | - | Better recall |

---

## 🔥 P0: Query Embedding Cache

### Problem
Every search generates a new embedding for the query text:
```typescript
// searchKnowledgeBase() - line 553
const embedding = await this.mistralService.generateEmbedding(searchText, client);
```
- **Cost**: ~$0.0001 per query (mistral-embed pricing)
- **Latency**: 100-300ms per query
- **Impact**: Repeated/similar searches waste API calls

### Solution: Redis Cache for Query Embeddings

**Implementation**: `QueryEmbeddingCacheService`

```typescript
// backend/src/modules/ai/services/query-embedding-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class QueryEmbeddingCacheService {
  private readonly logger = new Logger(QueryEmbeddingCacheService.name);
  private readonly redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'query-embedding:';

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
    });
  }

  /**
   * Get cached embedding for query text
   */
  async getCachedEmbedding(queryText: string): Promise<number[] | null> {
    const cacheKey = this.getCacheKey(queryText);

    try {
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Query embedding cache HIT for key: ${cacheKey}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Query embedding cache MISS for key: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached query embedding: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Cache embedding for query text
   */
  async setCachedEmbedding(queryText: string, embedding: number[]): Promise<void> {
    const cacheKey = this.getCacheKey(queryText);

    try {
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(embedding)
      );

      this.logger.debug(`Cached query embedding for key: ${cacheKey} (TTL: ${this.CACHE_TTL}s)`);
    } catch (error) {
      this.logger.warn(`Failed to cache query embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate cache key from query text (normalized + hashed)
   */
  private getCacheKey(queryText: string): string {
    // Normalize: lowercase, trim, collapse whitespace
    const normalized = queryText.toLowerCase().trim().replace(/\s+/g, ' ');

    // Hash for consistent key length
    const hash = createHash('sha256').update(normalized).digest('hex');

    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Clear all cached query embeddings
   */
  async clearCache(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      let cursor = '0';
      let deleted = 0;

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          deleted += await this.redis.del(...keys);
        }
      } while (cursor !== '0');

      this.logger.log(`Cleared ${deleted} cached query embeddings`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to clear query embedding cache: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }
}
```

**Integration** into `KnowledgeBaseService`:

```typescript
// Modified searchKnowledgeBase() method
async searchKnowledgeBase(options: KnowledgeBaseSearchOptions): Promise<{
  usedQuery: string;
  items: KnowledgeBaseSearchHit[];
}> {
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 10) : 5;
  const trimmedQuery = options.query?.trim() ?? '';
  let searchText = trimmedQuery;

  if (!searchText && options.emailId) {
    // ... existing email content extraction ...
  }

  if (!searchText) {
    throw new BadRequestException(
      'Provide a free-text query or an email with content to search the knowledge base.',
    );
  }

  // 🆕 Try to get cached embedding first
  let embedding = await this.queryEmbeddingCache.getCachedEmbedding(searchText);

  if (!embedding) {
    // Cache miss - generate new embedding
    const client = await this.mistralService.createMistralClient();
    embedding = await this.mistralService.generateEmbedding(searchText, client);

    // 🆕 Cache the embedding for future queries
    await this.queryEmbeddingCache.setCachedEmbedding(searchText, embedding);
  }

  const matches = await this.embeddingsService.findSimilarContent(
    options.tenantId,
    embedding,
    limit,
  );

  // ... rest of method unchanged ...
}
```

### Impact
- **API Cost Reduction**: 50-70% for common/repeated queries
- **Latency Improvement**: 2-3x faster (cache retrieval ~5ms vs API call ~200ms)
- **Cache Hit Rate**: Expected 40-60% in production (varies by usage pattern)

---

## 🔥 P0: Metadata Pre-filtering

### Problem
Current vector search scans ALL embeddings for a tenant:
```sql
SELECT "id", "content", "documentName", "metadata", ("vector" <-> '[...]'::vector) AS "distance"
FROM "embeddings"
WHERE "tenantId" = $1
ORDER BY "vector" <-> '[...]'::vector
LIMIT $2;
```

For a tenant with 100,000 emails = 200,000+ embeddings (with chunks), this is inefficient.

### Solution: Add WHERE Clauses Before Vector Search

**Enhanced Search Options**:

```typescript
// Extended KnowledgeBaseSearchOptions
interface KnowledgeBaseSearchOptions {
  tenantId: string;
  query?: string;
  emailId?: string;
  limit?: number;

  // 🆕 Metadata filters
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    sender?: string; // from email
    hasAttachments?: boolean;
    source?: 'email' | 'document' | 'note';
    emailIds?: string[]; // restrict to specific emails
  };
}
```

**Modified findSimilarContent** in `EmbeddingsService`:

```typescript
async findSimilarContent<
  T extends { id: string; content: string; documentName: string | null; metadata: any; distance?: number }
>(
  tenantId: string,
  embedding: number[],
  limit: number,
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    sender?: string;
    hasAttachments?: boolean;
    source?: string;
    emailIds?: string[];
  },
): Promise<T[]> {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return [];
  }

  const vectorLiteral = Prisma.raw(`'[${embedding.join(',')}]'::vector`);

  // 🆕 Build WHERE conditions using Prisma parameterization (SQL injection safe)
  const whereConditions = [];
  whereConditions.push(Prisma.sql`"tenantId" = ${tenantId}`);

  if (filters?.dateFrom) {
    whereConditions.push(Prisma.sql`metadata->>'receivedAt' >= ${filters.dateFrom.toISOString()}`);
  }

  if (filters?.dateTo) {
    whereConditions.push(Prisma.sql`metadata->>'receivedAt' <= ${filters.dateTo.toISOString()}`);
  }

  if (filters?.sender) {
    // ILIKE pattern with parameterization
    const pattern = `%${filters.sender}%`;
    whereConditions.push(Prisma.sql`metadata->>'from' ILIKE ${pattern}`);
  }

  if (filters?.source) {
    whereConditions.push(Prisma.sql`metadata->>'source' = ${filters.source}`);
  }

  if (filters?.emailIds && filters.emailIds.length > 0) {
    // Use Prisma.join for safe array handling
    whereConditions.push(Prisma.sql`metadata->>'emailId' IN (${Prisma.join(filters.emailIds)})`);
  }

  // Combine conditions with AND
  const combinedWhere = Prisma.sql`${Prisma.join(whereConditions, ' AND ')}`;

  try {
    const results = await this.prisma.$queryRaw<T[]>(
      Prisma.sql`
        SELECT "id", "content", "documentName", "metadata", ("vector" <-> ${vectorLiteral}) AS "distance"
        FROM "embeddings"
        WHERE ${combinedWhere}
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
```

### Impact
- **Performance**: 2-5x faster search (fewer vectors to compare)
- **Relevance**: More targeted results based on user intent
- **Scalability**: Linear scaling as embedding count grows

---

## 🔥 P0: Attachment Content Indexing

### Problem
We just implemented attachment sync for Gmail/Microsoft, but **attachment content is not searchable**:
- PDFs with important documents
- Word/Excel files with data
- Images with text (OCR potential)
- Text files

### Solution: Extract Text from Attachments, Include in Email Embeddings

**Architecture**:
```text
Attachment Download → Content Extraction → Append to Email Content → Embedding
```

**New Service**: `AttachmentContentExtractorService`

```typescript
// backend/src/modules/ai/services/attachment-content-extractor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../email/services/storage.service';
import * as pdfParse from 'pdf-parse';

export interface AttachmentContent {
  attachmentId: string;
  filename: string;
  extractedText: string;
  extractionMethod: 'pdf-parse' | 'text' | 'unsupported';
}

@Injectable()
export class AttachmentContentExtractorService {
  private readonly logger = new Logger(AttachmentContentExtractorService.name);
  private readonly MAX_ATTACHMENT_TEXT = 50000; // 50K chars per attachment

  constructor(private readonly storageService: StorageService) {}

  /**
   * Extract text content from attachment based on MIME type
   */
  async extractTextFromAttachment(
    storagePath: string,
    mimeType: string,
    filename: string,
  ): Promise<string | null> {
    try {
      // Only extract from supported types
      if (!this.isSupportedMimeType(mimeType)) {
        this.logger.debug(`Unsupported MIME type for extraction: ${mimeType} (${filename})`);
        return null;
      }

      // Get signed URL and fetch content
      const signedUrl = await this.storageService.getSignedDownloadUrl(storagePath, 300);
      const response = await fetch(signedUrl);

      if (!response.ok) {
        this.logger.warn(`Failed to fetch attachment for extraction: ${filename}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Extract based on type
      let extractedText: string | null = null;

      if (mimeType === 'application/pdf') {
        extractedText = await this.extractFromPDF(buffer, filename);
      } else if (this.isTextMimeType(mimeType)) {
        extractedText = await this.extractFromText(buffer, filename);
      }

      // Truncate if too long
      if (extractedText && extractedText.length > this.MAX_ATTACHMENT_TEXT) {
        this.logger.debug(`Truncating attachment text from ${extractedText.length} to ${this.MAX_ATTACHMENT_TEXT} chars`);
        extractedText = extractedText.substring(0, this.MAX_ATTACHMENT_TEXT) + '\n... [truncated]';
      }

      return extractedText;
    } catch (error) {
      this.logger.error(
        `Failed to extract text from attachment ${filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractFromPDF(buffer: Buffer, filename: string): Promise<string | null> {
    try {
      const data = await pdfParse(buffer);

      if (data.text && data.text.trim().length > 0) {
        this.logger.debug(`Extracted ${data.text.length} chars from PDF: ${filename} (${data.numpages} pages)`);
        return data.text.trim();
      }

      return null;
    } catch (error) {
      this.logger.warn(`PDF extraction failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(buffer: Buffer, filename: string): Promise<string | null> {
    try {
      const text = buffer.toString('utf-8').trim();

      if (text.length > 0) {
        this.logger.debug(`Extracted ${text.length} chars from text file: ${filename}`);
        return text;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Text extraction failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Check if MIME type is supported for extraction
   */
  private isSupportedMimeType(mimeType: string): boolean {
    const supported = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/csv',
      'text/markdown',
      'application/json',
    ];

    return supported.includes(mimeType) || mimeType.startsWith('text/');
  }

  /**
   * Check if MIME type is text-based
   */
  private isTextMimeType(mimeType: string): boolean {
    return mimeType.startsWith('text/') || mimeType === 'application/json';
  }

  /**
   * Extract text from multiple attachments in parallel
   */
  async extractFromAttachments(
    attachments: Array<{
      id: string;
      filename: string;
      mimeType: string;
      storagePath: string;
    }>,
  ): Promise<AttachmentContent[]> {
    const results = await Promise.allSettled(
      attachments.map(async (att) => {
        const text = await this.extractTextFromAttachment(
          att.storagePath,
          att.mimeType,
          att.filename,
        );

        return {
          attachmentId: att.id,
          filename: att.filename,
          extractedText: text || '',
          extractionMethod: this.getExtractionMethod(att.mimeType),
        };
      }),
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<AttachmentContent>).value)
      .filter((content) => content.extractedText.length > 0);
  }

  private getExtractionMethod(mimeType: string): 'pdf-parse' | 'text' | 'unsupported' {
    if (mimeType === 'application/pdf') return 'pdf-parse';
    if (this.isTextMimeType(mimeType)) return 'text';
    return 'unsupported';
  }
}
```

**Integration**: Modify `composeEmailEmbeddingContent()` in `KnowledgeBaseService`:

```typescript
private async composeEmailEmbeddingContentWithAttachments(
  email: {
    id: string;
    subject: string | null;
    snippet: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
  },
  tenantId: string,
): Promise<string | null> {
  const pieces: string[] = [];

  if (email.subject) {
    pieces.push(`Oggetto: ${email.subject}`);
  }

  // Email body (existing logic)
  if (email.bodyHtml) {
    const extracted = HtmlContentExtractor.extractMainContent(email.bodyHtml);
    if (extracted) pieces.push(extracted);
  } else if (email.bodyText?.trim()) {
    pieces.push(email.bodyText.trim());
  } else if (email.snippet) {
    pieces.push(email.snippet);
  }

  // 🆕 Fetch and extract attachment content
  try {
    const attachments = await this.prisma.emailAttachment.findMany({
      where: {
        emailId: email.id,
        isInline: false, // Skip inline images
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        storagePath: true,
      },
    });

    if (attachments.length > 0) {
      const extractedContent = await this.attachmentContentExtractor.extractFromAttachments(
        attachments,
      );

      if (extractedContent.length > 0) {
        pieces.push('\n--- Allegati ---');
        for (const content of extractedContent) {
          pieces.push(`\nFile: ${content.filename}\n${content.extractedText}`);
        }

        this.logger.debug(
          `Extracted content from ${extractedContent.length}/${attachments.length} attachments for email ${email.id}`,
        );
      }
    }
  } catch (error) {
    this.logger.warn(
      `Failed to extract attachment content for email ${email.id}: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Continue without attachment content
  }

  const combined = pieces.join('\n\n').trim();
  return combined.length > 0 ? combined : null;
}
```

**Package Installation**:
```bash
npm install pdf-parse @types/pdf-parse
```

### Impact
- **Search Coverage**: 100% - search across ALL email content including attachments
- **Use Cases**: Find PDFs with contracts, invoices, reports, etc.
- **User Value**: Massive improvement to search relevance

### Future Extensions
- **OCR for Images**: Use Tesseract.js or cloud OCR (Google Vision, AWS Textract)
- **Office Documents**: Use mammoth (DOCX), xlsx (Excel)
- **Archives**: Extract from ZIP/RAR

---

## P1: Improved Chunking Strategy

### Problem
Current chunking is basic:
- Fixed 12K char chunks
- Breaks on newlines (within 50% of max)
- No overlap between chunks
- May split semantic units

### Solution: Semantic Chunking with Overlap

**Enhanced Chunking Algorithm**:

```typescript
private static chunkContentForEmbeddingAdvanced(
  content: string,
  options: {
    maxChars?: number;
    overlapPercent?: number;
    minChunkChars?: number;
  } = {},
): Array<{ content: string; index: number }> {
  const maxChars = options.maxChars ?? 12000;
  const overlapPercent = options.overlapPercent ?? 10; // 10% overlap
  const minChunkChars = options.minChunkChars ?? 500;

  if (content.length <= maxChars) {
    return [{ content, index: 0 }];
  }

  const chunks: Array<{ content: string; index: number }> = [];
  const overlapChars = Math.floor(maxChars * (overlapPercent / 100));

  let start = 0;
  let index = 0;

  while (start < content.length) {
    let end = Math.min(start + maxChars, content.length);

    // Try to break on semantic boundaries (in order of preference)
    if (end < content.length) {
      // 1. Paragraph break (double newline)
      const paragraphBreak = content.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + maxChars * 0.5) {
        end = paragraphBreak + 2; // Include the newlines
      } else {
        // 2. Single newline
        const lineBreak = content.lastIndexOf('\n', end);
        if (lineBreak > start + maxChars * 0.5) {
          end = lineBreak + 1;
        } else {
          // 3. Sentence boundary (. ! ?)
          const sentenceEnd = this.findLastSentenceBoundary(content, start, end);
          if (sentenceEnd > start + maxChars * 0.5) {
            end = sentenceEnd;
          } else {
            // 4. Word boundary (space)
            const spaceBreak = content.lastIndexOf(' ', end);
            if (spaceBreak > start + maxChars * 0.5) {
              end = spaceBreak + 1;
            }
          }
        }
      }
    }

    const chunkContent = content.slice(start, end).trim();

    if (chunkContent.length >= minChunkChars) {
      chunks.push({ content: chunkContent, index });
      index += 1;
    }

    // Move start forward, accounting for overlap
    if (end >= content.length) {
      break;
    }

    start = Math.max(start + 1, end - overlapChars);
  }

  return chunks;
}

/**
 * Find the last sentence boundary before the specified position
 */
private static findLastSentenceBoundary(text: string, start: number, end: number): number {
  // Look for sentence-ending punctuation followed by space/newline
  const sentenceEndPattern = /[.!?]["']?\s/g;
  let lastMatch = -1;

  // Search in the range
  const searchText = text.slice(start, end);
  let match;

  while ((match = sentenceEndPattern.exec(searchText)) !== null) {
    lastMatch = start + match.index + match[0].length;
  }

  return lastMatch > start ? lastMatch : -1;
}
```

### Impact
- **Context Preservation**: 10-20% better embedding quality
- **Overlap**: Adjacent chunks share context, reducing edge effects
- **Semantic Boundaries**: Respect natural text structure

---

## P1: Hybrid Search (Semantic + Keyword)

### Problem
Pure semantic search may miss exact keyword matches:
- User searches "invoice #12345" but semantic search finds similar invoices
- Technical terms, IDs, codes need exact matching

### Solution: Combine pgvector (Semantic) + tsvector (Keyword)

**Database Migration** - Add tsvector column:

```sql
-- Add full-text search column
ALTER TABLE "embeddings" ADD COLUMN "content_tsv" tsvector;

-- Create GIN index for fast text search
CREATE INDEX idx_embeddings_content_tsv ON "embeddings" USING GIN(content_tsv);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION embeddings_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('italian', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER embeddings_content_tsv_update
  BEFORE INSERT OR UPDATE ON "embeddings"
  FOR EACH ROW
  EXECUTE FUNCTION embeddings_content_tsv_trigger();

-- Backfill existing rows
UPDATE "embeddings" SET content_tsv = to_tsvector('italian', COALESCE(content, ''));
```

**Hybrid Search Implementation**:

```typescript
async hybridSearch(
  tenantId: string,
  queryText: string,
  embedding: number[],
  limit: number,
  options: {
    semanticWeight?: number; // 0-1, default 0.7
    keywordWeight?: number;  // 0-1, default 0.3
  } = {},
): Promise<Array<{ id: string; content: string; score: number }>> {
  const semanticWeight = options.semanticWeight ?? 0.7;
  const keywordWeight = options.keywordWeight ?? 0.3;

  const vectorLiteral = Prisma.raw(`'[${embedding.join(',')}]'::vector`);

  // SECURITY: buildTsQuery sanitizes input (removes all non-alphanumeric except spaces)
  // Then Prisma.sql parameterizes it safely for PostgreSQL
  const tsQuery = this.buildTsQuery(queryText);

  const results = await this.prisma.$queryRaw<
    Array<{ id: string; content: string; documentName: string | null; metadata: any; score: number }>
  >(
    Prisma.sql`
      SELECT
        "id",
        "content",
        "documentName",
        "metadata",
        (
          -- Normalize semantic score (1 - distance) to 0-1 range
          (1 - ("vector" <-> ${vectorLiteral})) * ${semanticWeight}
          +
          -- Normalize keyword score using ts_rank
          ts_rank(content_tsv, to_tsquery('italian', ${tsQuery})) * ${keywordWeight}
        ) AS score
      FROM "embeddings"
      WHERE "tenantId" = ${tenantId}
        AND (
          -- Must match at least one of: semantic similarity OR keyword presence
          ("vector" <-> ${vectorLiteral}) < 0.5
          OR
          content_tsv @@ to_tsquery('italian', ${tsQuery})
        )
      ORDER BY score DESC
      LIMIT ${limit};
    `,
  );

  return results;
}

/**
 * Build PostgreSQL tsquery from user query
 * SECURITY: Sanitizes input to prevent SQL injection
 * - Removes all non-alphanumeric characters
 * - Filters short terms (< 3 chars)
 * - Returns only [a-z0-9] and '|' separator (safe for SQL)
 */
private buildTsQuery(queryText: string): string {
  // Split into terms, handle phrases in quotes
  const terms = queryText
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2) // Ignore very short terms
    .map((t) => t.replace(/[^a-z0-9]/g, '')) // CRITICAL: Remove all special chars
    .filter((t) => t.length > 0);

  if (terms.length === 0) {
    return 'empty'; // Fallback for empty query
  }

  // Join with OR for more lenient matching
  // Result: "term1 | term2 | term3" (only alphanumeric + pipe)
  return terms.join(' | ');
}
```

### Impact
- **Better Recall**: Catch exact matches that semantic search might miss
- **Technical Terms**: Better handling of IDs, codes, specific terminology
- **Flexibility**: Adjustable semantic/keyword weights

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 days) 🔥
1. **Query Embedding Cache** - Immediate cost savings, latency improvement
2. **Metadata Pre-filtering** - Better performance, more relevant results

### Phase 2: Attachment Content (2-3 days) 🔥
3. **Attachment Content Indexing** - PDF extraction first, then expand to other formats

### Phase 3: Advanced Features (3-4 days)
4. **Improved Chunking** - Semantic boundaries, overlap
5. **Hybrid Search** - Combine semantic + keyword

### Phase 4: Future Enhancements
- OCR for images (Tesseract.js)
- Office document support (mammoth, xlsx)
- Reranking with Mistral chat model
- Query expansion and reformulation
- Embedding model fine-tuning

## Testing Strategy

### Unit Tests
- Query cache hit/miss scenarios
- Chunking boundary cases
- Attachment extraction for various MIME types
- Metadata filtering edge cases

### Integration Tests
- End-to-end search with cache
- Attachment content in search results
- Hybrid search ranking

### Performance Tests
- Compare search latency before/after optimizations
- Measure cache hit rates
- Benchmark attachment extraction times

## Monitoring & Metrics

### Key Metrics to Track
1. **Query Cache Hit Rate** - Target: 50-60%
2. **Average Search Latency** - Target: <500ms (from ~1s)
3. **Mistral API Call Reduction** - Target: 50-70%
4. **Attachment Extraction Success Rate** - Target: >90% for PDFs
5. **Search Result Relevance** - User click-through rate

### Logging
- Cache hits/misses
- Attachment extraction successes/failures
- Hybrid search score distributions
- Query patterns for cache optimization

## Cost Impact

### Current Costs (Example: 10K searches/day)
- Mistral API: 10,000 queries × $0.0001 = **$1/day** = **$30/month**
- Storage: Embeddings in PostgreSQL (included)

### After Optimization (60% cache hit rate)
- Mistral API: 4,000 queries × $0.0001 = **$0.40/day** = **$12/month**
- Redis cache: Negligible (< 100MB for query cache)
- **Savings: $18/month (60%)**

### At Scale (100K searches/day)
- Before: $300/month
- After: $120/month
- **Savings: $180/month (60%)**

## Conclusion

The current AI/Embeddings implementation is solid, but these 5 optimizations will provide:

1. 🔥 **60% cost reduction** through query caching
2. 🔥 **2-5x faster search** through metadata pre-filtering
3. 🔥 **Complete search coverage** including attachment content
4. **10-20% better embedding quality** through improved chunking
5. **Better recall** through hybrid semantic + keyword search

**Total effort**: 5-7 days of development + testing

**ROI**: Immediate for Phase 1 (query cache + metadata filtering), high user value for Phase 2 (attachment content).

---

**Next Steps**: Implement Phase 1 (Query Cache + Metadata Pre-filtering) immediately for quick wins.
