# On-Demand Storage Strategy: Metadata Proxy Pattern

**Date**: 2025-11-19
**Philosophy**: We are NOT Gmail/Microsoft - fetch from source when possible
**Priority**: Critical (Cost Optimization)

---

## Core Principle

**Don't store what you can fetch**

- Gmail/Microsoft/IMAP providers are the source of truth
- We store **metadata** for search/indexing
- We fetch **content** on-demand when user requests it
- We cache **hot data** temporarily
- We expire **cold data** automatically

---

## Current Problem

**Full Mirror Approach** (current implementation):
```
Email arrives → Sync fetches full body + all attachments → Store in DB + S3 → Keep forever
```

**Issues**:
- Stores TB of data unnecessarily
- Costs scale linearly with email count
- 90% of emails never viewed by user
- Duplicate storage (we have it, provider has it)

---

## Proposed Solution: Tiered Storage

### Tier 1: Always Store (Metadata Only)
```typescript
interface EmailMetadata {
  // Identification
  externalId: string;      // Provider's ID (can fetch later)
  threadId: string;
  messageId: string;

  // Headers (lightweight)
  from: string;
  to: string[];
  subject: string;
  snippet: string;         // First 200 chars for preview

  // Metadata
  folder: string;
  labels: string[];
  isRead: boolean;
  sentAt: Date;
  receivedAt: Date;
  size: number;

  // References (no content)
  hasAttachments: boolean;
  attachmentCount: number;

  // AI (embeddings only, not full text)
  embeddingId?: string;    // Link to vector embedding
}
```

**Storage Cost**: ~1-2 KB per email
**Total for 100K emails**: 100-200 MB (negligible)

### Tier 2: Cache Hot Data (TTL 7-30 days)
```typescript
interface EmailContent {
  emailId: string;
  bodyText: string;        // Full text body
  bodyHtml: string;        // Full HTML body
  cachedAt: Date;
  expiresAt: Date;         // Auto-delete after 7-30 days
}
```

**Storage**: Separate table with TTL
**Cost**: ~10-50 KB per email × only active emails
**Auto-cleanup**: Cron job deletes expired entries

### Tier 3: Never Store (Fetch on Demand)
```typescript
interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;

  // Reference to fetch from provider
  externalId: string;          // Provider's attachment ID
  externalMessageId: string;   // Provider's message ID

  // Never download unless user clicks "Download"
  storageType: 'pending';      // Not 's3'
  storagePath: string;         // Logical path (not physical)
}
```

**Storage**: ~200 bytes per attachment (just metadata)
**Download**: Only when user clicks "Download" button

---

## Implementation

### 1. Email Body Caching with TTL

#### Schema Changes

```prisma
// backend/prisma/schema.prisma

model Email {
  id          String   @id @default(cuid())
  tenantId    String
  providerId  String
  externalId  String   // Provider's ID (Gmail: messageId, MS: id)

  // Metadata (always stored)
  from        String
  to          String[]
  subject     String
  snippet     String   // First 200 chars
  folder      String
  isRead      Boolean
  sentAt      DateTime
  receivedAt  DateTime
  size        Int?

  // Content (cached, optional)
  content     EmailContent?

  // Attachments (metadata only)
  attachments EmailAttachment[]

  @@index([tenantId, providerId, externalId])
  @@index([receivedAt])
}

// NEW: Separate table for cached email bodies
model EmailContent {
  id        String   @id @default(cuid())
  emailId   String   @unique
  email     Email    @relation(fields: [emailId], references: [id], onDelete: Cascade)

  bodyText  String?  @db.Text
  bodyHtml  String?  @db.Text

  cachedAt  DateTime @default(now())
  expiresAt DateTime // Auto-calculated: cachedAt + 30 days

  @@index([expiresAt]) // For cleanup cron
  @@map("email_content_cache")
}

model EmailAttachment {
  id                String   @id @default(cuid())
  emailId           String
  email             Email    @relation(fields: [emailId], references: [id], onDelete: Cascade)

  // Metadata (always stored)
  filename          String
  mimeType          String
  size              Int
  isInline          Boolean  @default(false)
  contentId         String?

  // Reference to fetch from provider
  externalId        String   // Provider's attachment ID
  externalMessageId String   // Provider's message ID

  // Storage (only for user-downloaded or AI-processed attachments)
  storageType       String   @default("pending") // "pending" | "s3"
  storagePath       String?  // NULL until downloaded
  downloadedAt      DateTime?

  @@index([emailId])
  @@map("email_attachments")
}
```

#### Migration

```bash
npx prisma migrate dev --name add-email-content-cache
```

### 2. On-Demand Email Fetching Service

```typescript
// backend/src/modules/email/services/email-on-demand.service.ts

@Injectable()
export class EmailOnDemandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gmail: GoogleSyncService,
    private readonly microsoft: MicrosoftSyncService,
    private readonly imap: ImapSyncService,
  ) {}

  /**
   * Get email content - fetch from cache or provider
   */
  async getEmailContent(emailId: string, tenantId: string): Promise<{ bodyText: string; bodyHtml: string }> {
    // 1. Check cache first
    const cached = await this.prisma.emailContent.findUnique({
      where: { emailId },
      select: { bodyText: true, bodyHtml: true, expiresAt: true },
    });

    if (cached && cached.expiresAt > new Date()) {
      this.logger.debug(`Email ${emailId} found in cache`);
      return { bodyText: cached.bodyText || '', bodyHtml: cached.bodyHtml || '' };
    }

    // 2. Cache miss or expired - fetch from provider
    const email = await this.prisma.email.findUnique({
      where: { id: emailId },
      include: { provider: true },
    });

    if (!email) {
      throw new NotFoundException(`Email ${emailId} not found`);
    }

    this.logger.debug(`Fetching email ${emailId} from provider ${email.provider.type}`);

    const content = await this.fetchFromProvider(email);

    // 3. Cache for 30 days
    await this.cacheEmailContent(emailId, content);

    return content;
  }

  private async fetchFromProvider(email: Email & { provider: Provider }): Promise<{ bodyText: string; bodyHtml: string }> {
    switch (email.provider.type) {
      case 'google':
        return this.gmail.fetchMessageContent(email.externalId, email.providerId);
      case 'microsoft':
        return this.microsoft.fetchMessageContent(email.externalId, email.providerId);
      case 'imap':
        return this.imap.fetchMessageContent(email.externalId, email.providerId);
      default:
        throw new Error(`Unsupported provider type: ${email.provider.type}`);
    }
  }

  private async cacheEmailContent(emailId: string, content: { bodyText: string; bodyHtml: string }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

    await this.prisma.emailContent.upsert({
      where: { emailId },
      create: {
        emailId,
        bodyText: content.bodyText,
        bodyHtml: content.bodyHtml,
        expiresAt,
      },
      update: {
        bodyText: content.bodyText,
        bodyHtml: content.bodyHtml,
        cachedAt: new Date(),
        expiresAt,
      },
    });

    this.logger.debug(`Cached email ${emailId} until ${expiresAt.toISOString()}`);
  }

  /**
   * Download attachment on-demand
   */
  async downloadAttachment(attachmentId: string, tenantId: string): Promise<{ url: string; filename: string }> {
    const attachment = await this.prisma.emailAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        email: {
          include: { provider: true },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    // If already downloaded to S3, return signed URL
    if (attachment.storageType === 's3' && attachment.storagePath) {
      const url = await this.storage.getSignedDownloadUrl(attachment.storagePath, 300);
      return { url, filename: attachment.filename };
    }

    // Otherwise, fetch from provider and upload to S3
    this.logger.debug(`Downloading attachment ${attachmentId} from provider ${attachment.email.provider.type}`);

    const buffer = await this.fetchAttachmentFromProvider(attachment);

    // Upload to S3
    const uploaded = await this.attachmentStorage.uploadAttachment(
      tenantId,
      attachment.email.providerId,
      {
        filename: attachment.filename,
        content: buffer,
        contentType: attachment.mimeType,
      }
    );

    // Update attachment record
    await this.prisma.emailAttachment.update({
      where: { id: attachmentId },
      data: {
        storageType: 's3',
        storagePath: uploaded.storagePath,
        downloadedAt: new Date(),
      },
    });

    const url = await this.storage.getSignedDownloadUrl(uploaded.storagePath, 300);
    return { url, filename: attachment.filename };
  }

  private async fetchAttachmentFromProvider(attachment: EmailAttachment & { email: Email & { provider: Provider } }): Promise<Buffer> {
    switch (attachment.email.provider.type) {
      case 'google':
        return this.gmail.downloadAttachment(
          attachment.email.externalId,
          attachment.externalId,
          attachment.email.providerId
        );
      case 'microsoft':
        return this.microsoft.downloadAttachment(
          attachment.externalMessageId,
          attachment.externalId,
          attachment.email.providerId
        );
      case 'imap':
        return this.imap.downloadAttachment(
          attachment.externalMessageId,
          attachment.externalId,
          attachment.email.providerId
        );
      default:
        throw new Error(`Unsupported provider type: ${attachment.email.provider.type}`);
    }
  }
}
```

### 3. Email Sync Service Updates

**BEFORE** (Full Mirror):
```typescript
async syncProvider(job: SyncJobData): Promise<SyncJobResult> {
  const messages = await gmail.users.messages.list(...);

  for (const msg of messages.data.messages) {
    // Fetch FULL message with body
    const full = await gmail.users.messages.get({ id: msg.id, format: 'full' });

    // Store everything
    await this.prisma.email.create({
      data: {
        externalId: full.id,
        from: ...,
        to: ...,
        bodyText: extractText(full),    // ❌ Store full body
        bodyHtml: extractHtml(full),    // ❌ Store full HTML
        attachments: {
          create: full.attachments.map(a => ({
            filename: a.filename,
            // Download ALL attachments immediately ❌
            content: downloadAttachment(a.id),
          })),
        },
      },
    });
  }
}
```

**AFTER** (Metadata Only):
```typescript
async syncProvider(job: SyncJobData): Promise<SyncJobResult> {
  const messages = await gmail.users.messages.list(...);

  for (const msg of messages.data.messages) {
    // Fetch METADATA only (format: 'metadata')
    const metadata = await gmail.users.messages.get({ id: msg.id, format: 'metadata' });

    // Store metadata + snippet only
    await this.prisma.email.create({
      data: {
        externalId: metadata.id,
        from: extractHeader(metadata, 'From'),
        to: extractHeader(metadata, 'To'),
        subject: extractHeader(metadata, 'Subject'),
        snippet: metadata.snippet,  // ✅ Just snippet (200 chars)
        // NO bodyText, NO bodyHtml

        attachments: {
          create: metadata.payload.parts
            .filter(p => p.filename)
            .map(p => ({
              filename: p.filename,
              mimeType: p.mimeType,
              size: p.body.size,
              externalId: p.body.attachmentId,
              externalMessageId: metadata.id,
              storageType: 'pending',  // ✅ Not downloaded yet
              // NO content stored
            })),
        },
      },
    });
  }
}
```

**Storage Savings**:
- **Before**: 100 KB/email (avg) × 100K emails = **10 GB**
- **After**: 1 KB/email × 100K emails = **100 MB**
- **Savings**: **99% reduction**

### 4. Cache Cleanup Service

```typescript
// backend/src/modules/email/services/email-cache-cleanup.service.ts

@Injectable()
export class EmailCacheCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Delete expired email content cache
   * Runs daily at 3 AM
   */
  @Cron('0 3 * * *')
  async cleanupExpiredContent(): Promise<void> {
    const deleted = await this.prisma.emailContent.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Deleted ${deleted.count} expired email content entries`);
  }

  /**
   * Delete rarely-accessed attachments from S3
   * Runs weekly on Sunday at 4 AM
   */
  @Cron('0 4 * * 0')
  async cleanupRarelyAccessedAttachments(): Promise<void> {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Find attachments in S3 that haven't been accessed in 60+ days
    const staleAttachments = await this.prisma.emailAttachment.findMany({
      where: {
        storageType: 's3',
        downloadedAt: { lt: sixtyDaysAgo },
      },
      select: { id: true, storagePath: true },
    });

    this.logger.log(`Found ${staleAttachments.length} rarely-accessed attachments to clean up`);

    for (const attachment of staleAttachments) {
      try {
        // Delete from S3
        await this.storage.deleteObject(attachment.storagePath!);

        // Revert to "pending" state (can re-download from provider)
        await this.prisma.emailAttachment.update({
          where: { id: attachment.id },
          data: {
            storageType: 'pending',
            storagePath: null,
            downloadedAt: null,
          },
        });

        this.logger.debug(`Cleaned up attachment ${attachment.id} from S3`);
      } catch (error) {
        this.logger.error(`Failed to cleanup attachment ${attachment.id}: ${error.message}`);
      }
    }
  }

  /**
   * Database size report
   * Runs weekly on Monday at 8 AM
   */
  @Cron('0 8 * * 1')
  async reportDatabaseSize(): Promise<void> {
    const stats = await this.prisma.$queryRaw<Array<{ table_name: string; size_mb: number }>>`
      SELECT
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size_mb
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
      LIMIT 10;
    `;

    this.logger.log('Top 10 largest tables:');
    stats.forEach(stat => {
      this.logger.log(`  ${stat.table_name}: ${stat.size_mb}`);
    });

    const emailCount = await this.prisma.email.count();
    const cachedCount = await this.prisma.emailContent.count();
    const attachmentCount = await this.prisma.emailAttachment.count();
    const s3AttachmentCount = await this.prisma.emailAttachment.count({
      where: { storageType: 's3' },
    });

    this.logger.log(`Emails: ${emailCount.toLocaleString()}`);
    this.logger.log(`Cached content: ${cachedCount.toLocaleString()} (${((cachedCount / emailCount) * 100).toFixed(1)}%)`);
    this.logger.log(`Attachments: ${attachmentCount.toLocaleString()}`);
    this.logger.log(`Downloaded to S3: ${s3AttachmentCount.toLocaleString()} (${((s3AttachmentCount / attachmentCount) * 100).toFixed(1)}%)`);
  }
}
```

---

## Storage Capacity Limits

### Per-Tenant Quotas

```typescript
// backend/src/modules/tenants/interfaces/tenant-quota.interface.ts

interface TenantStorageQuota {
  maxEmailsPerProvider: number;      // e.g., 100,000
  maxTotalEmails: number;            // e.g., 500,000
  maxCachedContent: number;          // e.g., 10,000 (hot emails)
  maxAttachmentStorageMB: number;    // e.g., 5,000 MB (5 GB)
  maxDatabaseSizeMB: number;         // e.g., 1,000 MB (1 GB)
}

const TENANT_QUOTAS = {
  free: {
    maxEmailsPerProvider: 10_000,
    maxTotalEmails: 10_000,
    maxCachedContent: 1_000,
    maxAttachmentStorageMB: 100,
    maxDatabaseSizeMB: 50,
  },
  pro: {
    maxEmailsPerProvider: 100_000,
    maxTotalEmails: 500_000,
    maxCachedContent: 10_000,
    maxAttachmentStorageMB: 5_000,
    maxDatabaseSizeMB: 500,
  },
  enterprise: {
    maxEmailsPerProvider: 1_000_000,
    maxTotalEmails: 5_000_000,
    maxCachedContent: 50_000,
    maxAttachmentStorageMB: 50_000,
    maxDatabaseSizeMB: 5_000,
  },
};
```

### Quota Enforcement

```typescript
// backend/src/modules/email-sync/services/quota-enforcement.service.ts

@Injectable()
export class QuotaEnforcementService {
  async checkQuotaBeforeSync(tenantId: string, providerId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    const quota = TENANT_QUOTAS[tenant.plan] || TENANT_QUOTAS.free;

    // Check current usage
    const emailCount = await this.prisma.email.count({
      where: { tenantId },
    });

    if (emailCount >= quota.maxTotalEmails) {
      throw new QuotaExceededException(
        `Tenant ${tenantId} has reached max emails quota (${quota.maxTotalEmails}). Please upgrade plan.`
      );
    }

    const attachmentStorage = await this.getAttachmentStorageUsage(tenantId);
    if (attachmentStorage > quota.maxAttachmentStorageMB * 1024 * 1024) {
      throw new QuotaExceededException(
        `Tenant ${tenantId} has exceeded attachment storage quota (${quota.maxAttachmentStorageMB} MB)`
      );
    }
  }

  private async getAttachmentStorageUsage(tenantId: string): Promise<number> {
    const result = await this.prisma.emailAttachment.aggregate({
      where: {
        email: { tenantId },
        storageType: 's3',
      },
      _sum: { size: true },
    });

    return result._sum.size || 0;
  }
}
```

---

## Migration Path

### Phase 1: Add New Schema (Week 1)
1. Add `EmailContent` table with TTL
2. Update `EmailAttachment` with `externalId`, `externalMessageId`
3. Run migration: `npx prisma migrate dev --name add-on-demand-storage`

### Phase 2: Create On-Demand Services (Week 1-2)
4. Implement `EmailOnDemandService`
5. Add `EmailCacheCleanupService` with cron jobs
6. Add `QuotaEnforcementService`

### Phase 3: Update Sync Services (Week 2-3)
7. Update Gmail sync to fetch metadata only
8. Update Microsoft sync to fetch metadata only
9. Update IMAP sync to fetch metadata only

### Phase 4: Migrate Existing Data (Week 3)
10. Move existing `email.bodyText/bodyHtml` to `EmailContent` table
11. Set `expiresAt = now() + 30 days` for all
12. Update `EmailAttachment` with `externalId` from `storagePath`

### Phase 5: Cleanup (Week 4)
13. Remove `bodyText` and `bodyHtml` columns from `Email` table
14. Monitor quota usage per tenant
15. Tune cache TTL based on access patterns

---

## Expected Savings

### Storage
- **Database**: 99% reduction (100 GB → 1 GB for 1M emails)
- **S3**: 95% reduction (only downloads user-requested attachments)
- **Total cost**: ~$50/month → ~$5/month for 1M emails

### Performance
- **Sync speed**: 10x faster (metadata-only fetch)
- **API response**: No change (on-demand fetch < 500ms)
- **Search**: Same (snippet + embeddings still available)

---

## Success Metrics

- [ ] Average email metadata size < 2 KB
- [ ] Cache hit rate > 80% for active emails
- [ ] On-demand fetch latency < 500ms (p95)
- [ ] Database size < 1 GB per 1M emails
- [ ] S3 storage < 100 MB per 10K attachments (metadata-only)
- [ ] Zero quota violations for properly tiered plans

---

## References

- [Gmail API - Format Parameter](https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get#format)
- [Microsoft Graph - Select Parameter](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0&tabs=http#optional-query-parameters)
- [PostgreSQL Table Size](https://wiki.postgresql.org/wiki/Disk_Usage)
