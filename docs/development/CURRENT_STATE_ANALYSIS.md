# Current State Analysis: What Already Exists

**Date**: 2025-11-19
**Finding**: Much of the infrastructure already exists!

---

## ✅ Already Implemented

### 1. **FIFO Queue System** (queue.service.ts)
**Location**: `backend/src/modules/email-sync/services/queue.service.ts`

**Status**: ✅ **FULLY IMPLEMENTED**

**Features**:
- BullMQ with 3 priority queues (high/normal/low)
- FIFO ordering guaranteed
- Job deduplication per provider
- Retry logic with exponential backoff
- Metrics tracking (completed, failed, duration)
- Bulk job processing
- Tenant/provider-specific job removal

**Example Usage**:
```typescript
// Already in use by sync scheduler
await this.queueService.addSyncJob({
  providerId: 'provider-123',
  email: 'user@example.com',
  providerType: 'google',
  syncType: 'incremental',
  priority: 'normal', // high, normal, or low
});
```

**Verdict**: ✅ No changes needed - already perfect!

---

### 2. **Email Embedding Queue** (email-embedding.queue.ts)
**Location**: `backend/src/modules/ai/services/email-embedding.queue.ts`

**Status**: ✅ **FULLY IMPLEMENTED**

**Features**:
- BullMQ worker for embedding generation
- Rate limiting (25 jobs per second by default)
- Bulk job batching (flush every 75 jobs or 100ms)
- Retry logic with exponential backoff
- Job deduplication by emailId
- Handles rate limit errors (429) gracefully

**Example Usage**:
```typescript
// Already used in batch processors
await this.emailEmbeddingQueue.enqueueMany([
  { tenantId, emailId, subject, bodyText, ... }
]);
```

**Verdict**: ✅ No changes needed - already perfect!

---

### 3. **Bucket Organization** (attachment.storage.ts)
**Location**: `backend/src/modules/email/services/attachment.storage.ts`

**Status**: ✅ **ALREADY CORRECT STRUCTURE**

**Current Path Format**:
```
tenants/{tenantId}/providers/{providerId}/attachments/{uuid}-{filename}
```

**Features**:
- ✅ Tenant isolation at path level
- ✅ Provider separation
- ✅ UUID prevents filename collisions
- ✅ **Metadata-only storage already implemented!**

**Metadata-Only Pattern**:
```typescript
// Line 73-88: Already has "pending" storage type
storeAttachmentMetadata(providerId: string, metadata: AttachmentMetadata): PendingAttachment {
  const storagePath = `${providerId}/${metadata.externalMessageId}/${metadata.externalId}`;

  return {
    storageType: 'pending',  // ✅ Not downloaded yet!
    storagePath,             // ✅ Logical reference only
    // ... metadata ...
  };
}
```

**Processing Strategy**:
```typescript
// Line 228-244: Already determines what to download
getProcessingStrategy(metadata: AttachmentMetadata): 'embeddings' | 'metadata-only' | 'skip' {
  if (metadata.isInline && this.isImageMimeType(metadata.mimeType)) {
    return 'skip';  // ✅ Skip inline images
  }

  if (this.shouldProcessForEmbeddings(metadata)) {
    return 'embeddings';  // ✅ Download PDFs for AI
  }

  return 'metadata-only';  // ✅ Everything else: metadata-only
}
```

**Verdict**: ✅ Already has metadata-only strategy! Just not fully utilized.

---

### 4. **Email Cleanup Service** (email-cleanup.service.ts)
**Location**: `backend/src/modules/email/services/email-cleanup.service.ts`

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Missing S3 cleanup!

**Features**:
- ✅ Cron job runs daily at 3 AM
- ✅ Purges soft-deleted emails after 24 hours
- ✅ Removes duplicate emails
- ✅ Deletes embeddings via KnowledgeBaseService
- ❌ **Does NOT delete S3 attachments!**

**Current Implementation** (Line 124-129):
```typescript
private async permanentlyDeleteEmail(id: string, tenantId: string) {
  await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, id);
  await this.prisma.email.delete({
    where: { id },
  });
  // ❌ Missing: Delete attachments from S3!
}
```

**Issue**: When email is deleted:
1. ✅ Embeddings deleted
2. ✅ Email record deleted
3. ✅ EmailAttachment records cascade deleted (onDelete: Cascade in schema)
4. ❌ **S3 files left orphaned!**

**Verdict**: ⚠️ Needs S3 cleanup added - **Critical Bug!**

---

### 5. **Storage Service** (storage.service.ts)
**Location**: `backend/src/modules/email/services/storage.service.ts`

**Status**: ⚠️ **MISSING DELETE METHODS**

**Current Methods**:
- ✅ `getSignedDownloadUrl()` - Generate presigned URLs
- ✅ `putObject()` - Upload to S3
- ❌ **Missing `deleteObject()`** - Delete single file
- ❌ **Missing `deleteObjects()`** - Batch delete files

**Verdict**: ⚠️ Needs delete methods added

---

## ❌ Not Implemented

### 1. **On-Demand Email Body Fetching**
**Status**: ❌ NOT IMPLEMENTED

**Current Behavior**:
- Email sync fetches **FULL** message with body (format: 'full')
- Stores `bodyText` and `bodyHtml` in `Email` table
- All email bodies stored in database

**Desired Behavior**:
- Fetch metadata only (format: 'metadata')
- Store only snippet (first 200 chars)
- Fetch full body on-demand when user opens email
- Cache with TTL (30 days)

**Impact**:
- Database bloat: 100 KB/email vs 1 KB/email
- 99% storage reduction possible

**Verdict**: ❌ Major migration needed - but low priority if database is small

---

### 2. **Attachment Cleanup Queue**
**Status**: ❌ NOT IMPLEMENTED

**Current Behavior**:
- Attachments deleted synchronously when email deleted
- No queue for S3 cleanup

**Desired Behavior**:
- Enqueue attachment deletion jobs
- Worker processes deletions in background
- Retry failed deletions

**Verdict**: ❌ Nice to have, but can be added simply to existing cleanup service

---

### 3. **Quota Enforcement**
**Status**: ❌ NOT IMPLEMENTED

**No per-tenant limits** for:
- Max emails
- Max attachments
- Max storage usage

**Verdict**: ❌ Future feature, not critical for now

---

### 4. **Lifecycle Policies**
**Status**: ❌ NOT IMPLEMENTED

**No automatic cleanup** for:
- Old TRASH emails (> 30 days)
- Rarely-accessed attachments
- Expired cached content

**Verdict**: ⚠️ Partially covered by email-cleanup.service.ts (24h purge)

---

## Minimal Changes Needed

### Priority 1: Fix S3 Orphan Bug (Critical)

#### Step 1: Add delete methods to StorageService

**File**: `backend/src/modules/email/services/storage.service.ts`

```typescript
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

async deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: this.bucket,
    Key: key,
  });
  await this.client.send(command);
}

async deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  // S3 batch delete (max 1000 objects)
  const command = new DeleteObjectsCommand({
    Bucket: this.bucket,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
    },
  });

  await this.client.send(command);
}
```

#### Step 2: Update EmailCleanupService to delete S3 attachments

**File**: `backend/src/modules/email/services/email-cleanup.service.ts`

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly knowledgeBaseService: KnowledgeBaseService,
  private readonly configService: ConfigService,
  private readonly storage: StorageService,  // ✅ Add this
) {
  // ...
}

private async permanentlyDeleteEmail(id: string, tenantId: string) {
  // 1. Get attachments BEFORE deleting email
  const attachments = await this.prisma.emailAttachment.findMany({
    where: { emailId: id },
    select: { storagePath: true, storageType: true },
  });

  // 2. Delete embeddings
  await this.knowledgeBaseService.deleteEmbeddingsForEmail(tenantId, id);

  // 3. Delete email (cascade deletes EmailAttachment records)
  await this.prisma.email.delete({
    where: { id },
  });

  // 4. Delete S3 files (batch delete)
  const s3Keys = attachments
    .filter(a => a.storageType === 's3' && a.storagePath)
    .map(a => a.storagePath!);

  if (s3Keys.length > 0) {
    try {
      await this.storage.deleteObjects(s3Keys);
      this.logger.debug(`Deleted ${s3Keys.length} S3 objects for email ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete S3 objects for email ${id}: ${error.message}`);
      // Don't throw - email already deleted from DB
    }
  }
}
```

**That's it!** This fixes the orphan bug with minimal code changes.

---

### Priority 2: Utilize Existing Metadata-Only Strategy (Optional)

The `AttachmentStorageService` already supports metadata-only storage with `storageType: 'pending'`, but the attachment handlers currently download everything.

**Current** (gmail-attachment-handler.ts):
```typescript
// Downloads ALL attachments immediately
const strategy = this.attachmentStorage.getProcessingStrategy(meta);
if (strategy === 'skip') continue;

// Always downloads, even for 'metadata-only'
const buffer = await this.downloadGmailAttachment(gmail, externalId, meta.id);
```

**Optimized** (use existing strategy):
```typescript
const strategy = this.attachmentStorage.getProcessingStrategy(meta);

if (strategy === 'skip') {
  continue;  // Skip inline images
}

if (strategy === 'metadata-only') {
  // ✅ Store metadata only, don't download
  const stored = this.attachmentStorage.storeAttachmentMetadata(providerId, {
    filename: meta.filename,
    mimeType: meta.mimeType,
    size: meta.size,
    isInline: meta.isInline,
    contentId: meta.contentId,
    externalId: meta.id,
    externalMessageId: externalId,
  });

  await this.prisma.emailAttachment.create({
    data: {
      emailId,
      ...stored,  // storageType: 'pending', no actual file
    },
  });
  continue;
}

if (strategy === 'embeddings') {
  // ✅ Only download for embeddings (small PDFs, docs)
  const buffer = await this.downloadGmailAttachment(gmail, externalId, meta.id);
  // ... upload to S3 and process ...
}
```

**Benefit**:
- 95% fewer S3 downloads
- Attachments fetched on-demand when user clicks "Download"
- Already has the infrastructure!

**Verdict**: Easy win with existing code - recommend implementing!

---

## Summary

### ✅ Already Exists (No Changes Needed)
1. FIFO Queue System (BullMQ) - Perfect
2. Email Embedding Queue - Perfect
3. Bucket Organization - Perfect structure
4. Metadata-Only Storage Pattern - Already coded!

### ⚠️ Needs Minimal Fixes
1. **Add S3 delete methods** to StorageService (5 lines)
2. **Update EmailCleanupService** to delete S3 attachments (15 lines)

### ❌ Not Implemented (Future)
1. On-Demand Email Body Fetching - Complex migration
2. Attachment Cleanup Queue - Nice to have
3. Quota Enforcement - Future feature
4. Lifecycle Policies - Partially covered

---

## Recommendation

**Immediate Action** (30 minutes of work):
1. Add `deleteObject()` and `deleteObjects()` to StorageService
2. Update `permanentlyDeleteEmail()` in EmailCleanupService
3. Test: Delete email → verify S3 files deleted
4. Deploy

**Optional Enhancement** (2 hours of work):
1. Update attachment handlers to use existing metadata-only strategy
2. Implement on-demand attachment download endpoint
3. 95% reduction in S3 storage costs

**Long-term** (weeks):
1. On-demand email body fetching with cache
2. Quota enforcement per tenant
3. Advanced lifecycle policies

---

## Files to Modify (Minimal Fix)

1. `backend/src/modules/email/services/storage.service.ts`
   - Add: `deleteObject()`, `deleteObjects()`

2. `backend/src/modules/email/services/email-cleanup.service.ts`
   - Update: `permanentlyDeleteEmail()` to delete S3 files
   - Add: `StorageService` to constructor

3. `backend/src/modules/email/email.module.ts`
   - No changes needed (StorageService already provided)

---

**Estimated Effort**: 30 minutes
**Impact**: Fixes critical S3 orphan bug
**Risk**: Low (only adds cleanup, doesn't change existing behavior)
