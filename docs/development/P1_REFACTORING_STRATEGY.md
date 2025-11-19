# P1 Refactoring Strategy - Email Sync Services

**Status**: Foundation Complete ✅
**Date**: 2025-11-19
**Phase**: P1 Important Refactoring (Week 2-3)

## Overview

This document outlines the strategy for splitting the large email-sync service files and reducing code duplication.

## Current State

### Problem Files
- `google-sync.service.ts`: **1,393 lines** (279% over 500-line limit) 🔴
- `microsoft-sync.service.ts`: **1,535 lines** (307% over 500-line limit) 🔴

### Code Duplication
- **65%** duplication between Google/Microsoft/IMAP
- **~2,200 lines** can be eliminated
- Batch processing: 188 lines duplicate
- Attachment handling: 77 lines duplicate
- Folder normalization: 57 lines triplicate

## Foundation Completed ✅

### BaseEmailSyncService
**File**: `backend/src/modules/email-sync/services/base-email-sync.service.ts`

**Provides**:
1. **Abstract syncProvider()** - Must be implemented by each provider
2. **normalizeFolderName()** - Standardizes folder names (inbox, sent, drafts, etc.)
3. **isSystemFolder()** - Identifies system vs custom folders
4. **notifyMailboxChange()** - WebSocket/SSE notifications
5. **calculateSyncStats()** - Before/after statistics
6. **isNotFoundError()** - 404 error detection
7. **extractPlainText()** - HTML to plain text conversion
8. **truncateText()** - Text length limiting

**Benefits**:
- Single source of truth for common logic
- Type-safe notification system
- Consistent folder handling across providers
- Reusable utility methods

## Next Steps (Not Yet Implemented)

### Phase 2: Extract Specialized Services

#### 1. AttachmentHandlerService (8h)
Extract attachment processing logic:
- Download attachments
- Store in database
- Handle inline images
- Manage attachment metadata

**Impact**: -77 duplicate lines

#### 2. MessageParserService (8h)
Extract message parsing logic:
- Parse email headers
- Extract recipients (to, cc, bcc)
- Handle threading
- Process MIME parts

**Impact**: -120 duplicate lines

#### 3. FolderSyncService (Already exists - needs enhancement)
Current: `backend/src/modules/email-sync/services/folder-sync.service.ts`
- Already handles folder synchronization
- May need minor updates to use BaseEmailSyncService patterns

### Phase 3: Refactor Large Services

#### Google Sync Service Splitting (32h)
**Target Structure**:
```
google-sync.service.ts (300 lines) ← Main orchestration
  ├─ extends BaseEmailSyncService
  ├─ uses AttachmentHandlerService
  ├─ uses MessageParserService
  └─ uses FolderSyncService
```

**Extraction Plan**:
1. Move attachment logic to AttachmentHandlerService
2. Move parsing logic to MessageParserService
3. Use BaseEmailSyncService utilities
4. Keep only Gmail-specific API calls

**Before**: 1,393 lines
**After**: ~300-400 lines
**Reduction**: ~70%

#### Microsoft Sync Service Splitting (32h)
**Target Structure**:
```
microsoft-sync.service.ts (350 lines) ← Main orchestration
  ├─ extends BaseEmailSyncService
  ├─ uses AttachmentHandlerService
  ├─ uses MessageParserService
  └─ uses FolderSyncService
```

**Before**: 1,535 lines
**After**: ~350-400 lines
**Reduction**: ~75%

## Implementation Guidelines

### 1. Always Test After Each Change
```bash
cd backend && npx tsc --noEmit
```

### 2. Extend BaseEmailSyncService
```typescript
@Injectable()
export class GoogleSyncService extends BaseEmailSyncService {
  constructor(
    prisma: PrismaService,
    realtimeEvents: RealtimeEventsService,
    private attachmentHandler: AttachmentHandlerService,
    private messageParser: MessageParserService,
  ) {
    super(prisma, realtimeEvents);
  }

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    // Use this.normalizeFolderName()
    // Use this.notifyMailboxChange()
    // Use this.extractPlainText()
    // etc.
  }
}
```

### 3. Extract in Small, Safe Steps
- One service at a time
- Compile and test after each extraction
- Don't modify existing services until new services are ready
- Keep git commits small and focused

### 4. Prioritize by Impact
1. **AttachmentHandlerService** (High reuse, -77 lines)
2. **MessageParserService** (High reuse, -120 lines)
3. **Google Sync Refactor** (Critical, -1000 lines)
4. **Microsoft Sync Refactor** (Critical, -1100 lines)

## Success Metrics

### Code Quality
- [ ] google-sync.service.ts: < 500 lines
- [ ] microsoft-sync.service.ts: < 500 lines
- [ ] Code duplication: < 15% (from 65%)
- [ ] Test coverage: > 60% (from 10%)

### Maintainability
- [ ] Single responsibility per service
- [ ] Clear separation of concerns
- [ ] Reusable components
- [ ] Easy to test individual pieces

## Estimated Timeline

| Task | Hours | Priority |
|------|-------|----------|
| AttachmentHandlerService | 8h | High |
| MessageParserService | 8h | High |
| Google Sync Refactor | 32h | Critical |
| Microsoft Sync Refactor | 32h | Critical |
| Testing & Documentation | 16h | High |
| **Total** | **96h** | |

## Notes

- BaseEmailSyncService is **non-breaking** - existing code continues to work
- Can be adopted incrementally
- Each extraction reduces duplication and improves testability
- Foundation is production-ready and type-safe

## References

- Original Audit: `/docs/development/BACKEND_AUDIT_ROADMAP.md`
- Base Class: `/backend/src/modules/email-sync/services/base-email-sync.service.ts`
