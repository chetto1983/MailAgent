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

### BaseEmailSyncService (Updated 2025-11-19)
**File**: `backend/src/modules/email-sync/services/base-email-sync.service.ts`

**Provides**:
1. **Abstract syncProvider()** - Must be implemented by each provider
2. **normalizeFolderName()** - Standardizes folder names with i18n support (INBOX, SENT, DRAFTS, etc.)
3. **isSystemFolder()** - Identifies system vs custom folders
4. **notifyMailboxChange()** - WebSocket/SSE notifications
5. **calculateSyncStats()** - Before/after statistics
6. **isNotFoundError()** - 404/410 error detection
7. **isRateLimitError()** - 429 error detection
8. **isServerError()** - 5xx error detection
9. **extractPlainText()** - Robust HTML to plain text conversion (using cheerio + he)
10. **truncateText()** - Text length limiting
11. **validateEmailAddress()** - RFC 5322 email validation
12. **formatTimestamp()** - ISO 8601 date formatting
13. **sleep()** - Async sleep utility for retries
14. **extractErrorMessage()** - Consistent error message extraction
15. **OnModuleInit** - Configuration from environment variables

**Benefits**:
- Single source of truth for common logic
- Type-safe notification system
- Consistent folder handling across providers (UPPERCASE, i18n support)
- Robust HTML parsing with proper entity decoding
- Reusable error detection utilities
- Configuration management built-in

## Next Steps (Not Yet Implemented)

### Phase 2: Extract Specialized Services

#### 1. Enhance AttachmentStorageService (4h)
**Status**: Service already exists at `backend/src/modules/email/services/attachment.storage.ts`

**Enhancement Tasks**:
- Consolidate duplicate attachment logic from Google/Microsoft sync services
- Ensure consistent handling of inline images vs attachments
- Standardize attachment metadata extraction
- Add provider-agnostic download method

**Impact**: -77 duplicate lines across sync services

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
  protected readonly logger = new Logger(GoogleSyncService.name);

  constructor(
    prisma: PrismaService,
    realtimeEvents: RealtimeEventsService,
    config: ConfigService,
    // Provider-specific services
    private crypto: CryptoService,
    private providerToken: ProviderTokenService,
    private attachmentStorage: AttachmentStorageService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private retryService: RetryService,
  ) {
    super(prisma, realtimeEvents, config);
  }

  // Override to add Gmail-specific configuration
  onModuleInit() {
    super.onModuleInit(); // Load base configuration
    this.batchSize = this.config.get('GMAIL_BATCH_GET_SIZE', 100);
    this.fullSyncMaxMessages = this.config.get('GMAIL_FULL_MAX_MESSAGES', 200);
  }

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    // Use base class utilities:
    // - this.normalizeFolderName()
    // - this.notifyMailboxChange()
    // - this.extractPlainText()
    // - this.isRateLimitError()
    // - this.sleep()
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
| Enhance AttachmentStorageService | 4h | High |
| MessageParserService | 8h | High |
| Google Sync Refactor | 32h | Critical |
| Microsoft Sync Refactor | 32h | Critical |
| Testing & Documentation | 16h | High |
| **Total** | **92h** | |

## Testing Strategy

### Unit Testing BaseEmailSyncService

**Test File**: `backend/src/modules/email-sync/services/base-email-sync.service.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

// Concrete implementation for testing
class TestEmailSyncService extends BaseEmailSyncService {
  readonly logger = new Logger('TestService');

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    return { success: true, messagesProcessed: 0 };
  }
}

describe('BaseEmailSyncService', () => {
  let service: TestEmailSyncService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockRealtimeEvents: jest.Mocked<RealtimeEventsService>;
  let mockConfig: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockPrisma = { /* mock implementation */ } as any;
    mockRealtimeEvents = {
      emitEmailNew: jest.fn(),
      emitSyncStatus: jest.fn(),
    } as any;
    mockConfig = {
      get: jest.fn((key, defaultValue) => defaultValue),
    } as any;

    service = new TestEmailSyncService(mockPrisma, mockRealtimeEvents, mockConfig);
    service.onModuleInit();
  });

  describe('normalizeFolderName', () => {
    it('should normalize "inbox" to "INBOX"', () => {
      expect(service['normalizeFolderName']('inbox')).toBe('INBOX');
      expect(service['normalizeFolderName']('Inbox')).toBe('INBOX');
      expect(service['normalizeFolderName']('INBOX')).toBe('INBOX');
    });

    it('should handle Italian folder names', () => {
      expect(service['normalizeFolderName']('Posta in arrivo')).toBe('INBOX');
      expect(service['normalizeFolderName']('Posta Inviata')).toBe('SENT');
      expect(service['normalizeFolderName']('Cestino')).toBe('TRASH');
    });

    it('should handle custom folder names', () => {
      expect(service['normalizeFolderName']('My Custom Folder')).toBe('MY CUSTOM FOLDER');
    });
  });

  describe('extractPlainText', () => {
    it('should extract text from HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      expect(service['extractPlainText'](html)).toBe('Hello world!');
    });

    it('should decode HTML entities', () => {
      const html = 'Hello &amp; goodbye &mdash; test &rsquo;quote&rsquo;';
      const result = service['extractPlainText'](html);
      expect(result).toContain('&');
      expect(result).toContain('—');
      expect(result).toContain(''');
    });

    it('should remove script and style tags', () => {
      const html = '<p>Content</p><script>alert("bad")</script><style>.red{color:red}</style>';
      expect(service['extractPlainText'](html)).toBe('Content');
    });
  });

  describe('isRateLimitError', () => {
    it('should detect 429 status code', () => {
      const error = { response: { status: 429 } };
      expect(service['isRateLimitError'](error)).toBe(true);
    });

    it('should detect rate limit in message', () => {
      const error = new Error('Rate limit exceeded');
      expect(service['isRateLimitError'](error)).toBe(true);
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate correct emails', () => {
      expect(service['validateEmailAddress']('test@example.com')).toBe(true);
      expect(service['validateEmailAddress']('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(service['validateEmailAddress']('not-an-email')).toBe(false);
      expect(service['validateEmailAddress']('missing@domain')).toBe(false);
      expect(service['validateEmailAddress']('')).toBe(false);
    });
  });
});
```

### Integration Testing Migration Example

**Before Migration** (Google Sync Service):
```typescript
describe('GoogleSyncService', () => {
  // Mock Gmail API client
  // Mock PrismaService
  // Mock all 9 dependencies
  // Test syncProvider() with real API calls (mocked)
});
```

**After Migration** (Using BaseEmailSyncService):
```typescript
describe('GoogleSyncService', () => {
  it('should use base class folder normalization', async () => {
    // Can test that Gmail-specific logic delegates to base class
    const spy = jest.spyOn(service as any, 'normalizeFolderName');
    await service.syncProvider(mockJobData);
    expect(spy).toHaveBeenCalledWith('[Gmail]/Sent Mail');
  });

  it('should use base class HTML extraction', async () => {
    // Test that Gmail message body processing uses extractPlainText
    const spy = jest.spyOn(service as any, 'extractPlainText');
    await service.syncProvider(mockJobData);
    expect(spy).toHaveBeenCalled();
  });
});
```

### Test Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| BaseEmailSyncService | 90% | N/A (new) |
| GoogleSyncService | 65% | 10% |
| MicrosoftSyncService | 65% | 10% |
| AttachmentStorageService | 70% | Unknown |
| MessageParserService | 80% | N/A (new) |

### Testing Commands

```bash
# Run all email-sync tests
cd backend && npm test -- email-sync

# Run with coverage
npm test -- --coverage email-sync

# Watch mode during development
npm test -- --watch email-sync/services/base-email-sync.service.spec.ts
```

## Migration Guide

### Step-by-Step Migration for Existing Services

#### Step 1: Update Imports
```typescript
// Add to existing imports
import { BaseEmailSyncService } from './base-email-sync.service';
```

#### Step 2: Extend Base Class
```typescript
// OLD
@Injectable()
export class GoogleSyncService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSyncService.name);

// NEW
@Injectable()
export class GoogleSyncService extends BaseEmailSyncService {
  protected readonly logger = new Logger(GoogleSyncService.name);
```

#### Step 3: Update Constructor
```typescript
// OLD
constructor(
  private prisma: PrismaService,
  private crypto: CryptoService,
  // ... 7 more services
) {}

// NEW
constructor(
  prisma: PrismaService,           // Pass to super
  realtimeEvents: RealtimeEventsService,  // Pass to super
  config: ConfigService,           // Pass to super
  private crypto: CryptoService,   // Keep as private
  // ... other services
) {
  super(prisma, realtimeEvents, config);
}
```

#### Step 4: Update onModuleInit
```typescript
// OLD
onModuleInit() {
  this.GMAIL_BATCH_GET_SIZE = this.config.get('GMAIL_BATCH_GET_SIZE', 100);
  this.RETRY_MAX_ATTEMPTS = this.config.get('RETRY_MAX_ATTEMPTS', 3);
  // ... 5 more config loads
}

// NEW
onModuleInit() {
  super.onModuleInit(); // Loads common config
  this.batchSize = this.config.get('GMAIL_BATCH_GET_SIZE', 100); // Provider-specific override
}
```

#### Step 5: Replace Duplicate Methods
```typescript
// DELETE these methods from child class:
private normalizeFolderName(name: string): string { /* ... */ }
private extractPlainText(html: string): string { /* ... */ }
private isNotFoundError(error: any): boolean { /* ... */ }

// REPLACE calls with:
this.normalizeFolderName(folderName)
this.extractPlainText(htmlContent)
this.isNotFoundError(error)
```

#### Step 6: Test Compilation
```bash
cd backend && npx tsc --noEmit
```

#### Step 7: Run Tests
```bash
npm test -- google-sync.service.spec.ts
```

### Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Git revert to last working commit
   ```bash
   git revert HEAD
   ```

2. **Partial Rollback**: Remove `extends BaseEmailSyncService`, keep methods inline
   ```typescript
   export class GoogleSyncService implements OnModuleInit {
     // Revert to original implementation
   }
   ```

3. **Feature Flag**: Add config flag to toggle new vs old implementation
   ```typescript
   if (this.config.get('USE_BASE_SYNC_SERVICE', false)) {
     return this.normalizeFolderName(name); // Base class
   } else {
     return this.legacyNormalizeFolderName(name); // Old code
   }
   ```

## Notes

- BaseEmailSyncService is **non-breaking** - existing code continues to work
- Can be adopted incrementally
- Each extraction reduces duplication and improves testability
- Foundation is production-ready and type-safe

## References

- Original Audit: `/docs/development/BACKEND_AUDIT_ROADMAP.md`
- Base Class: `/backend/src/modules/email-sync/services/base-email-sync.service.ts`
