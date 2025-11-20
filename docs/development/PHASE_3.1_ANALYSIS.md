# Phase 3.1 Analysis: Google Sync Service Extraction

**Date**: 2025-11-19
**Status**: Planning
**Approach**: Cautious, methodical, test-after-each-step

## Architectural References

**Inspiration**: [Mail-0/Zero](https://github.com/Mail-0/Zero) - Open-source email app
- **Monorepo pattern**: Turborepo with `/apps` and `/packages` separation
- **Pluggable adapter architecture**: Provider integrations (Gmail, Outlook) as independent adapters
- **Service layer separation**: Clear boundaries between providers and core logic
- **Modular approach**: Each provider can be added without modifying core infrastructure

**Our Implementation Principles** (inspired by Mail-0/Zero):
- Provider-specific services as pluggable modules
- Clear separation of concerns (attachment, folder, message, batch)
- No tight coupling between services
- Injectable dependencies for testability

## Current File Analysis

**File**: `backend/src/modules/email-sync/services/google-sync.service.ts`
**Current Lines**: 1,437
**Target Lines**: < 400

## Extraction Plan (Ordered by Complexity)

### Step 1: GmailAttachmentHandler (Simplest)

**Methods to Extract** (158 lines total):
```typescript
// Line 889-914 (25 lines)
private async downloadGmailAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string,
): Promise<Buffer | null>

// Line 922-1055 (133 lines)
private async processEmailAttachments(
  gmail: gmail_v1.Gmail,
  emailId: string,
  externalId: string,
  attachments: GmailAttachmentMeta[],
  tenantId: string,
  providerId: string,
): Promise<void>
```

**Dependencies**:
- `gmail_v1.Gmail` client (injected)
- `AttachmentStorageService` (already exists, injected)
- `PrismaService` (injected)
- `Logger` (injected)
- `GmailAttachmentMeta` interface (copy to new file)

**Why First**:
- Self-contained logic
- No dependencies on other services to be extracted
- Clear interface boundaries
- Easy to test in isolation

---

### Step 2: GmailFolderService

**Methods to Extract** (170 lines total):
```typescript
// Line 614-660 (46 lines)
private determineFolderFromLabels(labelIds?: string[], fallback?: string): string

// Line 1295-1401 (106 lines)
async syncGmailFolders(tenantId: string, providerId: string): Promise<void>

// Line 1406-1424 (18 lines)
private determineFolderTypeFromLabelId(labelId: string): string | undefined
```

**Dependencies**:
- `gmail_v1.Gmail` client (injected)
- `PrismaService` (injected)
- `CryptoService` (injected) - for token decryption in syncGmailFolders
- `Logger` (injected)
- `BaseEmailSyncService.normalizeFolderName()` (inherited, call via callback or pass instance)

**Why Second**:
- Self-contained folder logic
- No dependencies on attachment or message processors
- `syncGmailFolders` is public async method (easier to test)

---

### Step 3: GmailMessageProcessor

**Methods to Extract** (~400 lines total):
```typescript
// Line 769-884 (115 lines)
private parseGmailMessage(message: gmail_v1.Schema$Message): {...} | null

// Line 695-723 (28 lines)
private async processMessage(
  gmail: gmail_v1.Gmail,
  message: gmail_v1.Schema$Message,
  providerId: string,
  tenantId: string,
): Promise<void>

// Line 1259-1290 (31 lines)
private async handleMissingRemoteMessage(
  emailId: string,
  externalId: string,
  providerId: string,
  tenantId: string,
): Promise<void>
```

**Dependencies**:
- `gmail_v1.Gmail` client (injected)
- `PrismaService` (injected)
- `Logger` (injected)
- `GmailAttachmentHandler` (injected) - for processMessage → processEmailAttachments
- `GmailFolderService` (injected) - for determineFolderFromLabels
- `BaseEmailSyncService.truncateText()` (inherited)
- `EmailEmbeddingQueueService` (injected)

**Why Third**:
- Depends on GmailAttachmentHandler (must be extracted first)
- Depends on GmailFolderService (must be extracted first)
- More complex parsing logic

---

### Step 4: GmailBatchProcessor (Most Complex)

**Methods to Extract** (~500 lines total):
```typescript
// Line 724-768 (44 lines)
private async fetchMessagesBatch(
  gmail: gmail_v1.Gmail,
  messageIds: { id: string; threadId?: string }[],
  format: 'full' | 'metadata',
): Promise<gmail_v1.Schema$Message[]>

// Line 1247-1258 (11 lines)
private async processMessagesBatch(
  gmail: gmail_v1.Gmail,
  messageIds: { id: string; threadId?: string }[],
  providerId: string,
  tenantId: string,
): Promise<number>

// Line 1057-1246 (~189 lines - complex batch processing with embeddings)
private async processParsedMessagesBatch(
  mapped: Array<NonNullable<ReturnType<GoogleSyncService['parseGmailMessage']>>>,
  providerId: string,
  tenantId: string,
  gmail: gmail_v1.Gmail,
): Promise<void>
```

**Dependencies**:
- `gmail_v1.Gmail` client (injected)
- `PrismaService` (injected)
- `Logger` (injected)
- `GmailMessageProcessor` (injected) - for parseGmailMessage
- `EmailEmbeddingQueueService` (injected)
- `KnowledgeBaseService` (injected)
- `EmbeddingsService` (injected)
- `BaseEmailSyncService.truncateText()` (inherited)

**Why Last**:
- Most complex orchestration logic
- Depends on GmailMessageProcessor
- Large method (processParsedMessagesBatch ~189 lines)

---

## Retained in google-sync.service.ts (~380 lines)

**Core Orchestration**:
- `syncProvider()` - Main entry point
- `syncIncremental()` - History-based sync
- `syncFull()` - Full message fetch
- `refreshMessageMetadata()` - Metadata refresh
- `handleMessageDeletion()` - Deletion orchestration
- `enforceTrashState()` - Trash state management
- `removeEmailPermanently()` - Permanent deletion

**Utilities**:
- `createGmailClient()` - Gmail client factory
- `withRetry()` - Retry wrapper
- `applyStatusMetadata()` - Status metadata application
- `notifyGmailMailboxChange()` - Realtime notifications wrapper
- `onModuleInit()` - Configuration initialization

**Constructor**: Inject all helper services

---

## Testing Strategy

**After Each Extraction**:
1. Run TypeScript compilation: `cd backend && npx tsc --noEmit`
2. Verify 0 errors
3. Commit with descriptive message
4. Document changes

**Final Integration Test**:
- All TypeScript compilation passes
- No breaking changes to public API
- google-sync.service.ts < 400 lines
- All extracted services < 500 lines each

---

## Implementation Order

1. ✅ Create `GmailAttachmentHandler` (~160 lines)
2. ✅ Update `google-sync.service.ts` to use GmailAttachmentHandler
3. ✅ Test & commit
4. ✅ Create `GmailFolderService` (~170 lines)
5. ✅ Update `google-sync.service.ts` to use GmailFolderService
6. ✅ Test & commit
7. ✅ Create `GmailMessageProcessor` (~400 lines)
8. ✅ Update `google-sync.service.ts` to use GmailMessageProcessor
9. ✅ Test & commit
10. ✅ Create `GmailBatchProcessor` (~500 lines)
11. ✅ Update `google-sync.service.ts` to use GmailBatchProcessor
12. ✅ Final test & commit
13. ✅ Update documentation

---

## Risk Mitigation

**Potential Issues**:
- Circular dependencies between extracted services
- Missing dependencies not obvious from code inspection
- Type inference issues with complex return types

**Mitigation**:
- Extract in dependency order (simple → complex)
- Test compilation after each step
- Keep interfaces explicit
- Document all dependencies clearly
- Commit after each successful extraction
