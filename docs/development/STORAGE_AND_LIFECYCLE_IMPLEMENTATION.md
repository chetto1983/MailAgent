# Storage and Lifecycle Management Implementation Plan

**Date**: 2025-11-19
**Status**: Planning
**Priority**: High

---

## Current State Analysis

### ✅ What's Working
1. **Database Cascade Deletes**: `EmailAttachment` model has `onDelete: Cascade`
   - When `Email` is deleted, `EmailAttachment` records are auto-deleted
   - Location: `backend/prisma/schema.prisma:307`

2. **Storage Path Structure**: Already tenant/provider organized
   ```
   tenants/{tenantId}/providers/{providerId}/attachments/{uuid}-{filename}
   ```
   - Location: `backend/src/modules/email/services/attachment.storage.ts:258`

3. **Soft Delete Support**: Emails marked `isDeleted: true`, `folder: 'TRASH'`
   - Gmail: `google-sync.service.ts:594`
   - Microsoft: `microsoft-sync.service.ts:868`
   - IMAP: `imap-sync.service.ts:221`

### ❌ Critical Gaps

1. **Orphaned S3 Files**
   - When email is hard-deleted (`removeEmailPermanently`), S3 files are NOT deleted
   - Database records deleted, but files remain in S3 storage
   - **Memory Leak**: Files accumulate indefinitely
   - Location: `google-sync.service.ts:608-626` - only deletes embeddings + DB record

2. **No FIFO Queue System**
   - Email processing not queued (processed immediately during sync)
   - Attachment downloads not queued (synchronous processing)
   - No rate limiting or backpressure
   - Can overwhelm system with large mailboxes

3. **Single Bucket for All**
   - All tenants share one S3 bucket (`mailagent-attachments`)
   - No bucket-level isolation
   - Harder to apply lifecycle policies per tenant
   - Location: `storage.service.ts:15`

4. **No Lifecycle Policies**
   - Old emails in TRASH never auto-deleted
   - No auto-cleanup of old attachments
   - No retention policy enforcement

---

## Architecture Inspiration: Mail-0/Zero

Based on analysis of [Mail-0/Zero](https://github.com/Mail-0/Zero), they use:

1. **Cloudflare R2 Buckets**: Object storage for attachments
2. **Durable Objects**: Edge storage for real-time email data
3. **Worker Queues**: FIFO processing for email sync
4. **Bucket-per-tenant**: Isolation at storage level

**Our Adaptation** (using MinIO/S3 instead of Cloudflare):
- Multi-bucket strategy with bucket-per-tenant or logical prefixing
- BullMQ queues for FIFO processing
- S3 lifecycle policies for automatic cleanup
- Cascade delete hooks for attachment cleanup

---

## Proposed Solution

### 1. FIFO Queue System (BullMQ)

#### Email Processing Queue
```typescript
// backend/src/modules/email-sync/services/email-processing.queue.ts
interface EmailProcessingJob {
  emailId: string;
  tenantId: string;
  providerId: string;
  action: 'sync' | 'delete' | 'update';
  priority: 'high' | 'normal' | 'low';
}

@Injectable()
export class EmailProcessingQueueService {
  private queue: Queue<EmailProcessingJob>;

  async enqueueEmail(job: EmailProcessingJob): Promise<void> {
    await this.queue.add('process-email', job, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      priority: job.priority === 'high' ? 1 : job.priority === 'normal' ? 5 : 10,
    });
  }
}
```

#### Attachment Processing Queue
```typescript
// backend/src/modules/email/services/attachment-processing.queue.ts
interface AttachmentProcessingJob {
  emailId: string;
  attachmentId: string;
  tenantId: string;
  providerId: string;
  action: 'download' | 'delete' | 'extract-text';
}

@Injectable()
export class AttachmentProcessingQueueService {
  private queue: Queue<AttachmentProcessingJob>;

  async enqueueAttachment(job: AttachmentProcessingJob): Promise<void> {
    await this.queue.add('process-attachment', job, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async enqueueDeleteBatch(emailId: string, tenantId: string): Promise<void> {
    // Enqueue deletion of all attachments for an email
    const attachments = await this.prisma.emailAttachment.findMany({
      where: { emailId },
      select: { id: true, storagePath: true, storageType: true },
    });

    const jobs = attachments
      .filter(a => a.storageType === 's3' && a.storagePath)
      .map(a => ({
        emailId,
        attachmentId: a.id,
        tenantId,
        providerId: '', // Not needed for delete
        action: 'delete' as const,
      }));

    await this.queue.addBulk(
      jobs.map(job => ({ name: 'process-attachment', data: job }))
    );
  }
}
```

**Benefits**:
- FIFO ordering guarantees
- Rate limiting (concurrency control)
- Retry logic with exponential backoff
- Priority-based processing
- Backpressure handling

---

### 2. Bucket Organization Strategy

#### Option A: Bucket-per-Tenant (Recommended for < 1000 tenants)
```
Buckets:
- mailagent-tenant-{tenantId}

Path within bucket:
providers/{providerId}/attachments/{uuid}-{filename}
providers/{providerId}/exports/{date}/{file}
```

**Pros**:
- Strong isolation
- Independent lifecycle policies per tenant
- Easy to delete all tenant data
- Compliance-friendly (GDPR)

**Cons**:
- S3/MinIO bucket limits (typically 1000-10000)
- More complex bucket management

#### Option B: Logical Prefix (Recommended for 1000+ tenants)
```
Bucket:
- mailagent-attachments (single bucket)

Path:
tenants/{tenantId}/providers/{providerId}/attachments/{uuid}-{filename}
tenants/{tenantId}/providers/{providerId}/exports/{date}/{file}
```

**Pros**:
- No bucket limit issues
- Simpler management
- Already implemented!

**Cons**:
- Lifecycle policies apply to all tenants
- Harder to isolate

**Hybrid Approach** (RECOMMENDED):
- Use logical prefixes (current implementation)
- Add S3 Lifecycle Policies with tag-based rules
- Tag objects with `tenantId`, `providerId`, `type=attachment|export`

---

### 3. Cascade Delete for Attachments

#### Update `removeEmailPermanently` in all sync services

**Current (Google):**
```typescript
private async removeEmailPermanently(emailId: string, tenantId: string): Promise<void> {
  // Delete embeddings
  await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, emailId);

  // Delete email (cascade deletes EmailAttachment records)
  await this.prisma.email.delete({ where: { id: emailId } });
}
```

**Proposed:**
```typescript
private async removeEmailPermanently(emailId: string, tenantId: string): Promise<void> {
  try {
    // 1. Delete embeddings
    await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, emailId);
  } catch (error) {
    this.logger.warn(`Failed to delete embeddings for email ${emailId}: ${error.message}`);
  }

  try {
    // 2. Enqueue attachment deletion BEFORE deleting email record
    await this.attachmentProcessingQueue.enqueueDeleteBatch(emailId, tenantId);
  } catch (error) {
    this.logger.error(`Failed to enqueue attachment deletion for email ${emailId}: ${error.message}`);
    // Don't throw - continue with email deletion
  }

  try {
    // 3. Delete email (cascade deletes EmailAttachment records)
    await this.prisma.email.delete({ where: { id: emailId } });

    this.logger.debug(`Permanently deleted email ${emailId} and enqueued ${attachmentCount} attachments for S3 cleanup`);
  } catch (error) {
    this.logger.error(`Failed to delete email ${emailId} from database: ${error.message}`);
    throw error;
  }
}
```

#### Create Attachment Cleanup Worker

```typescript
// backend/src/modules/email/workers/attachment-cleanup.worker.ts
import { Worker, Job } from 'bullmq';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class AttachmentCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      'attachment-processing',
      async (job: Job<AttachmentProcessingJob>) => {
        if (job.data.action === 'delete') {
          await this.deleteAttachmentFromS3(job.data);
        }
        // Handle other actions (download, extract-text)
      },
      {
        connection: this.getRedisConnection(),
        concurrency: 10, // Process 10 attachment deletions concurrently
      }
    );
  }

  private async deleteAttachmentFromS3(job: AttachmentProcessingJob): Promise<void> {
    const attachment = await this.prisma.emailAttachment.findUnique({
      where: { id: job.attachmentId },
      select: { storagePath: true, storageType: true, filename: true },
    });

    if (!attachment) {
      this.logger.warn(`Attachment ${job.attachmentId} not found in database, skipping S3 delete`);
      return;
    }

    if (attachment.storageType !== 's3' || !attachment.storagePath) {
      this.logger.debug(`Attachment ${job.attachmentId} is not in S3, skipping`);
      return;
    }

    try {
      await this.storage.deleteObject(attachment.storagePath);
      this.logger.debug(`Deleted S3 object: ${attachment.storagePath}`);
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        this.logger.warn(`S3 object already deleted: ${attachment.storagePath}`);
      } else {
        this.logger.error(`Failed to delete S3 object ${attachment.storagePath}: ${error.message}`);
        throw error; // Will be retried by BullMQ
      }
    }
  }
}
```

#### Add `deleteObject` to StorageService

```typescript
// backend/src/modules/email/services/storage.service.ts
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

async deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: this.bucket,
    Key: key,
  });
  await this.client.send(command);
  this.logger.debug(`Deleted object from S3: ${key}`);
}

async deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  // S3 supports batch delete (up to 1000 objects)
  const command = new DeleteObjectsCommand({
    Bucket: this.bucket,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
    },
  });

  const result = await this.client.send(command);
  this.logger.debug(`Deleted ${result.Deleted?.length || 0} objects from S3`);

  if (result.Errors?.length) {
    this.logger.error(`Failed to delete ${result.Errors.length} objects from S3`, result.Errors);
  }
}
```

---

### 4. Lifecycle Policies (S3/MinIO)

#### Auto-delete TRASH emails after 30 days

**Approach 1**: Application-level (Recommended - more control)
```typescript
// backend/src/modules/email-sync/services/email-lifecycle.service.ts
@Injectable()
export class EmailLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *') // Run daily at 2 AM
  async cleanupOldTrash(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldTrashEmails = await this.prisma.email.findMany({
      where: {
        folder: 'TRASH',
        isDeleted: true,
        updatedAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, tenantId: true },
    });

    this.logger.log(`Found ${oldTrashEmails.length} old TRASH emails to delete`);

    for (const email of oldTrashEmails) {
      try {
        await this.removeEmailPermanently(email.id, email.tenantId);
      } catch (error) {
        this.logger.error(`Failed to delete old TRASH email ${email.id}: ${error.message}`);
      }
    }
  }

  @Cron('0 3 * * 0') // Run weekly on Sunday at 3 AM
  async cleanupOrphanedAttachments(): Promise<void> {
    // Find attachments in S3 that have no corresponding database record
    // This catches any orphans from failed deletions
  }
}
```

**Approach 2**: S3 Lifecycle Policy (MinIO/S3)
```xml
<!-- MinIO lifecycle policy for automatic cleanup -->
<LifecycleConfiguration>
  <Rule>
    <ID>delete-old-trash-attachments</ID>
    <Status>Enabled</Status>
    <Filter>
      <And>
        <Prefix>tenants/</Prefix>
        <Tag>
          <Key>folder</Key>
          <Value>TRASH</Value>
        </Tag>
      </And>
    </Filter>
    <Expiration>
      <Days>30</Days>
    </Expiration>
  </Rule>
</LifecycleConfiguration>
```

**Note**: For this to work, we need to tag S3 objects during upload:
```typescript
async putObject(key: string, body: Buffer, contentType: string, tags?: Record<string, string>): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: this.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Tagging: tags ? Object.entries(tags).map(([k, v]) => `${k}=${v}`).join('&') : undefined,
  });
  await this.client.send(command);
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Add `deleteObject` and `deleteObjects` to `StorageService`
- [ ] Create `AttachmentProcessingQueueService` with BullMQ
- [ ] Create `AttachmentCleanupWorker` for S3 deletion
- [ ] Add unit tests for new services

### Phase 2: Cascade Delete (Week 1-2)
- [ ] Update `removeEmailPermanently` in `GoogleSyncService`
- [ ] Update `removeEmailPermanently` in `MicrosoftSyncService`
- [ ] Update `removeEmailPermanently` in `ImapSyncService`
- [ ] Add integration tests for email deletion → attachment cleanup

### Phase 3: FIFO Queues (Week 2-3)
- [ ] Create `EmailProcessingQueueService` with BullMQ
- [ ] Create `EmailProcessingWorker`
- [ ] Refactor sync services to use queue instead of synchronous processing
- [ ] Add monitoring/logging for queue depth and processing rate

### Phase 4: Lifecycle Policies (Week 3)
- [ ] Create `EmailLifecycleService` with cron jobs
- [ ] Implement auto-cleanup of old TRASH emails
- [ ] Implement orphaned attachment detection and cleanup
- [ ] Add S3 lifecycle policies (optional, MinIO-specific)

### Phase 5: Monitoring & Alerts (Week 4)
- [ ] Add Prometheus metrics for queue depth
- [ ] Add alerts for failed attachment deletions
- [ ] Dashboard for storage usage per tenant
- [ ] Audit logs for permanent deletions

---

## Testing Strategy

### Unit Tests
- `StorageService.deleteObject` success and error cases
- `AttachmentProcessingQueue.enqueueDeleteBatch` batching logic
- `AttachmentCleanupWorker` S3 deletion with retries

### Integration Tests
- End-to-end: Delete email → Queue attachment deletion → S3 cleanup
- Orphaned attachment cleanup
- FIFO queue ordering verification

### Load Tests
- 10,000 emails deleted simultaneously
- Measure queue processing throughput
- Verify no S3 rate limiting

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| S3 deletion failures leave orphans | Medium | Retry logic + weekly orphan cleanup |
| Queue overload during bulk delete | High | Rate limiting + priority queues |
| Accidental permanent deletion | Critical | Soft delete for 30 days before hard delete |
| S3 costs increase | Low | Lifecycle policies + monitoring |

---

## Success Metrics

- **Zero orphaned S3 files** after 7 days
- **< 1 second** queue latency for attachment deletion
- **99.9% success rate** for cascade deletes
- **Storage cost reduction** of 20-30% from cleanup

---

## References

- [Mail-0/Zero Architecture](https://github.com/Mail-0/Zero)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [AWS S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [MinIO Lifecycle Management](https://min.io/docs/minio/linux/administration/object-management/object-lifecycle-management.html)
