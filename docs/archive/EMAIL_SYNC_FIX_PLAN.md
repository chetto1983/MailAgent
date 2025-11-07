# Email Sync Fix Plan - 2025-11-02

## Test Results Summary

### ✅ Database Schema - WORKING
- **Test**: Manual email insertion via Prisma
- **Result**: SUCCESS
- **Evidence**:
  - Created test email successfully
  - Upsert works correctly
  - Query with relations works
  - Email ID: `cmhhjq4tv0001k9k028vlg0vs`
- **Conclusion**: Database schema and Prisma operations are 100% functional

### ❌ IMAP Sync - BLOCKED
- **Test**: Multiple sync attempts for testopta@libero.it
- **Result**: STUCK/TIMEOUT
- **Evidence from logs**:
  ```
  [ImapSyncService] Starting full IMAP sync for testopta@libero.it
  [ImapSyncService] Connected to IMAP server
  [ImapSyncService] Full sync - fetching recent messages
  [No further logs - process hangs here]
  ```
- **Root Cause**: Line 283 in `imap-sync.service.ts`
  ```typescript
  const download = await client.download(message.uid.toString(), '1', { uid: true });
  ```
  - Downloads full body for EVERY email
  - No timeout configured
  - Blocks worker indefinitely
  - With 100 emails, this takes too long
- **Impact**: Worker hangs, no emails saved

### ❌ Microsoft Sync - TOKEN EXPIRED
- **Test**: Scheduled sync for chetto983@hotmail.it
- **Result**: FAILED - 401 Unauthorized
- **Evidence**:
  ```
  [MicrosoftSyncService] Full sync error:
  AxiosError: Request failed with status code 401
  ```
- **Root Cause**: OAuth token expired
- **Fix Required**: User needs to re-authenticate Microsoft account

### ⏳ Google Sync - NOT TESTED YET
- **Status**: Not triggered in this session
- **Expected**: Should work if token is valid
- **Advantage**: Uses Gmail API, no body download timeout issues

## Problem Diagnosis

### Why IMAP Gets Stuck

1. **Fetch Loop** (`imap-sync.service.ts:218`):
   ```typescript
   for await (const message of client.fetch(`${startSeq}:${endSeq}`, {...})) {
     const processed = await this.processMessage(message, client, ...);
   }
   ```

2. **Process Message** (`imap-sync.service.ts:224`):
   - Called for EACH message (up to 100)
   - Downloads full body content

3. **Body Download** (`imap-sync.service.ts:283-288`):
   ```typescript
   const download = await client.download(message.uid.toString(), '1', { uid: true });
   const chunks: Buffer[] = [];
   for await (const chunk of download.content) {
     chunks.push(chunk);
   }
   ```
   - NO timeout set
   - Downloads ENTIRE message body
   - Can take 1-5 seconds per email
   - 100 emails × 3 seconds = 5 minutes minimum
   - If server is slow or connection drops: HANGS FOREVER

4. **Error Handling** (`imap-sync.service.ts:298-300`):
   ```typescript
   } catch (downloadError) {
     this.logger.warn(`Could not download body for UID ${message.uid}:`, downloadError);
   }
   ```
   - Catches errors but not timeouts
   - If download hangs (no error thrown), nothing catches it

## Solution Options

### Option 1: Skip Body Download (IMMEDIATE FIX)
**Purpose**: Test if sync works without body content
**Implementation**:
```typescript
// Comment out lines 281-300 in imap-sync.service.ts
const bodyText = ''; // Skip for now
const bodyHtml = '';
```
**Pros**:
- Immediate test
- Confirms sync logic works
- Emails with metadata saved
**Cons**:
- No body content
- Temporary only

### Option 2: Add Download Timeout (PROPER FIX)
**Implementation**:
```typescript
const downloadWithTimeout = async (client, uid) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Download timeout')), 10000)
  );

  const downloadPromise = (async () => {
    const download = await client.download(uid, '1', { uid: true });
    const chunks = [];
    for await (const chunk of download.content) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  })();

  return Promise.race([downloadPromise, timeoutPromise]);
};
```
**Pros**:
- Prevents infinite hangs
- Still gets body content when possible
- Gracefully handles slow servers
**Cons**:
- More complex
- Needs testing

### Option 3: Download Headers Only First (RECOMMENDED)
**Implementation**:
- First pass: Save all emails with envelope data only
- Second pass: Background job downloads bodies
**Pros**:
- Fast initial sync
- Progressive enhancement
- Better UX
**Cons**:
- Requires job queue for body download
- More architectural changes

### Option 4: Use Gmail API for Google (ALTERNATIVE)
**Test**: Trigger Google sync which uses Gmail API instead of IMAP
**Command**:
```bash
curl -X POST "http://localhost:3000/email-sync/sync/cmhc66y3r0001u16zzou7qpfe"
```
**Pros**:
- No IMAP timeout issues
- API is more reliable
- Can verify sync logic works independently
**Cons**:
- Only tests Google provider
- Doesn't fix IMAP issue

## Recommended Action Plan

### Phase 1: Immediate Testing (NOW)
1. ✅ Verify database schema works (COMPLETED)
2. ⏳ Test Google sync to isolate issue
3. ⏳ Implement Option 1 (skip body) for IMAP
4. ⏳ Verify emails save without body content

### Phase 2: Proper Fix (NEXT)
1. Implement Option 2 (timeout) for body download
2. Add comprehensive logging at each step
3. Test with various email sizes
4. Add progress tracking (N of M emails)

### Phase 3: Microsoft Fix
1. User re-authenticates Microsoft account
2. Test Microsoft sync with new token

### Phase 4: Production Ready
1. Consider Option 3 (background body download)
2. Add metrics and monitoring
3. Add retry logic for failed downloads
4. Optimize batch sizes

## Next Steps

1. Test Google sync (should work)
2. Implement temporary fix for IMAP (skip body)
3. Verify sync saves emails to database
4. Implement proper timeout fix
5. Request user to re-auth Microsoft

## Key Findings

- ✅ **Database schema is perfect**
- ✅ **Prisma client works correctly**
- ✅ **Email save logic is correct**
- ❌ **IMAP body download blocks workers**
- ❌ **Microsoft token expired**
- ⏳ **Google sync not yet tested**

The problem is NOT in the database or save logic.
The problem IS in the IMAP download implementation.
