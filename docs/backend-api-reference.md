# MailAgent Backend API - Test & Reference
_Last updated: 2025-07-11_

This document captures the latest automated test status for the backend along with an API contract summary that frontend engineers can rely on while integrating.

## 1. Automated Test Status
- Command: `npm test` (run from `backend/` on 2025-07-11 15:55 UTC+2).
- Result: **118 tests across 6 suites passed**. The log shows intentional error messages from negative-path tests in `MistralService`; they simulate upstream failures and can be ignored unless a spec breaks.
- E2E coverage: a `test:e2e` script exists but no `test/jest-e2e.json` is defined yet, so HTTP-layer tests are currently missing. Only unit/service specs run today.

### How to repeat the automated suite
```bash
cd backend
npm install           # first-time only
npm test
```
> Tip: add `CI=1` if you want Jest to exit after one run even in watch-friendly shells.

## 2. Manual API Verification Workflow
1. Start Postgres + Redis (via `docker-compose up backend postgres redis` or your preferred stack).
2. Run the API: `npm run start:dev` (uses port 3000 by default).
3. Seed at least one tenant/user (e.g., register via `POST /auth/register`).
4. Authenticate:
   - `POST /auth/login` -> if `mfaRequired` is true, call `POST /auth/verify-otp`.
   - Use the returned `accessToken` as a `Bearer` token.
5. Include tenant context on every guarded route:
   - Header `Authorization: Bearer <JWT>`.
   - Header `X-Tenant-Id: <tenant-id-or-slug>` when acting across tenants. `TenantGuard` automatically resolves tenant from the token when the header is omitted.
6. Swagger UI (non-production only): `http://localhost:3000/api/docs`.

### Error payloads
All exceptions flow through `HttpExceptionFilter` / `AllExceptionsFilter` and use:

```json
{
  "statusCode": 400,
  "message": "Human readable detail",
  "timestamp": "2025-07-11T15:58:09.123Z",
  "path": "/route-that-failed"        // only for 5xx responses
}
```

---

## 3. Endpoint Catalogue
All routes are JSON over HTTPS unless stated otherwise. A [AUTH] badge below means "authentication required (JWT + TenantGuard)". Admin-only calls additionally require `req.user.role in {admin, super-admin}`.

### 3.1 Authentication (public)
| Method | Path | Purpose | Request body (JSON) | Response highlights |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Create a tenant + first user (new slug = lowercased email). | `{ "email": "user@example.com", "password": "hunter22", "firstName": "A", "lastName": "B" }` | `{ success, message, userId, tenantId, tenantSlug }` |
| POST | `/auth/send-otp` | Send login/verification OTP. | `{ "email": "user@example.com", "tenantSlug": "tenant-a" }` | `{ success, message }` (always success for non-existent users). |
| POST | `/auth/verify-otp` | Exchange OTP for session + JWT. | `{ "email": "user@example.com", "code": "123456", "tenantSlug": "tenant-a" }` | `{ success, message, accessToken, sessionId, user: { ... } }` |
| POST | `/auth/login` | Password login. Triggers OTP when MFA enabled. | `{ "email": "user@example.com", "password": "...", "tenantSlug": "tenant-a" }` | Either `{ mfaRequired: true, message }` or `{ success, accessToken, sessionId, user }`. |
| POST | `/auth/forgot-password` | Start password reset flow. | `{ "email": "...", "tenantSlug": "..." }` | `{ success, message }` (non-disclosing). |
| POST | `/auth/reset-password` | Complete reset with emailed token. | `{ "token": "<jwt>", "newPassword": "..." }` | `{ success, message }`. |
| GET | `/auth/me` [AUTH] | Inspect the claims inside the current JWT. | _n/a_ | Echoes `req.user`. |
| POST | `/auth/logout` [AUTH] | Destroy current session. | _n/a_ | `{ message: "Successfully logged out" }`. |
| POST | `/auth/google/callback`, `/auth/microsoft/callback` | Deprecated placeholders that now throw HTTP 410 with migration hints. |

### 3.2 Users ([AUTH] + TenantGuard)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users/me` | Returns profile fields (`id,email,firstName,lastName,role,isMfaEnabled,lastLogin,createdAt`). |
| PUT | `/users/me` | Body `{ "firstName"?, "lastName"? }`. Returns updated row. |
| DELETE | `/users/me` | Performs GDPR deletion. Returns `{ success, tenantDeleted, message }`. Automatically purges knowledge-base embeddings and queue jobs if this was the last tenant user. |
| GET | `/users/me/messages` | Returns latest messages (`message` table) scoped to user + tenant. Useful for activity feeds. |

### 3.3 Tenants ([AUTH])
Intended for admins / super-admins. No pagination yet.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/tenants` | List all tenants (super-admin should wrap this). |
| GET | `/tenants/:id` | Lookup by UUID. |
| POST | `/tenants` | Body `{ name, slug, description? }`. |
| PUT | `/tenants/:id` | Body is loosely typed (`any`) - send only the fields you wish to update. |
| DELETE | `/tenants/:id` | Hard-deletes tenant (no cascading guard!). |

### 3.4 Provider Integrations ([AUTH] + TenantGuard)
All responses use `ProviderConfigResponseDto`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/providers/google/auth-url` | Body `{ scopes?: string[] }` -> returns `{ authUrl, state }`. |
| POST | `/providers/google/connect` | Body `ConnectGoogleProviderDto { authorizationCode, email?, supportsCalendar?, supportsContacts?, isDefault? }`. |
| POST | `/providers/microsoft/auth-url` | Similar to Google version. |
| POST | `/providers/microsoft/connect` | Body `ConnectMicrosoftProviderDto`. |
| POST | `/providers/generic/connect` | Body `ConnectGenericProviderDto` to store IMAP/SMTP/CALDAV/CARDDAV secrets (AES encrypted server-side). |
| GET | `/providers` | List provider configs for active tenant. |
| GET | `/providers/:id` | Retrieve single provider config. |
| DELETE | `/providers/:id` | Soft-removes config (204). |

#### Provider test utilities ([AUTH])
These hit the upstream APIs for troubleshooting:
- Google: `GET /providers/:id/test/gmail-labels`, `/gmail-messages`, `/calendars`, `/calendar-events`, `/contacts`.
- Microsoft: `GET /providers/:id/test/mail-folders`, `/mail-messages`, `/microsoft-calendars`, `/microsoft-calendar-events`, `/microsoft-contacts`.
- Generic: `GET /providers/:id/test/imap-connection`, `/imap-folders`, `/imap-messages`, `/smtp-connection`.

### 3.5 OAuth Redirect Bridges (public)
| Method | Path | What happens |
| --- | --- | --- |
| GET | `/auth/gmail/callback` | Redirects to the configured frontend origin with `?code=...&state=...&provider=google` or `?error=...`. |
| GET | `/auth/microsoft/callback` | Same pattern for Microsoft Graph. |
> Frontend should exchange `code` via `/providers/{google|microsoft}/connect`.

### 3.6 Emails ([AUTH])

**Query helpers**
- Pagination: `page` (default 1), `limit` (default 50).
- Filters: `providerId`, `folder`, `isRead`, `isStarred`, `search`, `from`, `startDate`, `endDate`.

| Method | Path | Description / Response |
| --- | --- | --- |
| GET | `/emails` | Returns `{ emails: EmailSummary[], pagination: { page, limit, total, totalPages } }`. Each summary includes metadata + provider info; deleted emails only surface when `folder=TRASH`. |
| GET | `/emails/stats` | `{ total, unread, starred, byFolder: Record<string, number> }`. |
| GET | `/emails/search?q=string&providerId?&limit?` | `{ emails: EmailSummary[] }` via Prisma full-text filters. |
| GET | `/emails/conversations` | Threaded view with pagination (returns conversation aggregates). |
| GET | `/emails/thread/:threadId` | Returns full list of emails inside a thread. |
| GET | `/emails/:id` | Returns full email including attachments + provider metadata. 404 when not found. |
| POST | `/emails/send` | Body `SendEmailRequestDto` (to/cc/bcc arrays, subject, bodyHtml, bodyText, attachments with `contentBase64`, `providerId`). Returns `{ success: true, messageId }`. Attachments accept data URLs; backend strips the prefix. |
| POST | `/emails/:id/reply` | Body `ReplyForwardEmailRequestDto`. Provider auto-selected from original message. |
| POST | `/emails/:id/forward` | Same DTO; backend prepends `Fwd:` and original headers. |
| PATCH | `/emails/:id` | Body `{ isRead?, isStarred?, folder? }`. Persists flags and syncs back to provider. |
| DELETE | `/emails/:id` | 204 after soft-delete. |
| PATCH | `/emails/bulk/read` | Body `{ emailIds: string[], isRead: boolean }` to toggle multiple in one call. |
| POST | `/emails/:id/fetch-archived` | Restores body/headers for archived emails by re-fetching from Gmail/Graph/IMAP. Returns the refreshed email entity. |
| POST | `/emails/maintenance/cleanup` | **Admin only**. Runs duplicate removal + purge for the caller's tenant, returns `{ duplicatesRemoved, permanentlyDeleted }`. |
| GET | `/emails/retention/stats` | Aggregates from `EmailRetentionService` (totals, archived count, estimated space saved). |
| POST | `/emails/retention/run` | Body `{ retentionDays?: number }`. Forces archival of messages older than the threshold; returns `{ count, emailIds[] }`. |

### 3.7 AI & Email Insights ([AUTH] + TenantGuard)

| Method | Path | Behaviour |
| --- | --- | --- |
| POST | `/ai/chat` | `{ message, conversationHistory?, conversationId? }` -> `{ success, response }`. Uses `MistralService.generateResponse`. |
| GET | `/ai/chat/sessions` | Lists latest chat sessions for the user. |
| GET | `/ai/chat/sessions/:id` | Returns `{ success, session }` (or `{ success:false, session:null }`). |
| POST | `/ai/chat/sessions` | Creates a new session `{ success, session }`. Optional `{ locale }`. |
| DELETE | `/ai/chat/sessions/:id` | Deletes a session `{ success: boolean }`. |
| POST | `/ai/agent` | LangChain-powered workflow. Body `{ message, sessionId?, history?, locale? }`. Returns `{ success, sessionId, session, messages, response, steps }`. History accepts `{ role: 'user'|'assistant', content, steps? }`. |
| POST | `/ai/summarize/:emailId` | Optional body `{ locale }`. Returns `{ success, summary }`. |
| POST | `/ai/smart-reply/:emailId` | `{ success, suggestions }` (array of strings). |
| POST | `/ai/categorize/:emailId` | `{ success, labels }` (max 3 labels, deduped). |
| POST | `/ai/memory/search` | Body `{ query?, emailId?, limit?, locale? }`. Returns `{ success, usedQuery, items: KnowledgeBaseSearchHit[] }`. |

#### Knowledge-base admin endpoints ([AUTH] + admin/super-admin)
All paths are under `/ai/knowledge-base`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/ai/knowledge-base/emails/backfill` | Body `BackfillEmailsDto { limit?, batchSize?, includeDeleted?, tenantId? }`. Runs embedding backfill and returns counts (`processed, embedded, skipped, remaining`). Only super-admins can target another tenant via `tenantId`. |
| GET | `/ai/knowledge-base/embeddings` | Query `{ limit?, offset?, tenantId? }`. Returns `{ success, items, pagination { total, limit, offset, hasMore } }`. |
| DELETE | `/ai/knowledge-base/embeddings/:id` | Optional query `{ tenantId }`. Returns `{ success, deleted }`. |
| DELETE | `/ai/knowledge-base/embeddings/email/:emailId` | Removes all embeddings tied to a message. Returns `{ success, purged, emailId }`. |
| POST | `/ai/knowledge-base/search` | Convenience alias to tenant-scoped semantic search. Same response as `/ai/memory/search`. |

### 3.8 Email Sync & Queue Management ([AUTH])
| Method | Path | Description |
| --- | --- | --- |
| GET | `/email-sync/status` | Internal health snapshot from `SyncSchedulerService` (queue stats per provider/priority). |
| GET | `/email-sync/queues` | Returns `QueueService.getQueueStatus()` with BullMQ metrics. |
| POST | `/email-sync/sync/:providerId` | Triggers a manual sync job (priority `high`). Response: `{ success, message }`. |
| POST | `/email-sync/queues/:priority/pause` | `priority in {high,normal,low}`. |
| POST | `/email-sync/queues/:priority/resume` | Resume queue. |
| POST | `/email-sync/queues/:priority/clear` | **Dangerous**: obliterates queued jobs for that priority. |

### 3.9 Compliance (public)
- `GET /compliance/gdpr/status` -> `GdprStatusDto` with compliance checks, pending actions, officer contact info, and stats (totalUsers, softDeletedUsers, audit log entries).

### 3.10 Health & Observability (public)
| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Aggregated status from `HealthService.getSystemHealth()` (database, Redis, queues). |
| GET | `/health/ready` | Readiness probe `{ status: "ready" }`. |
| GET | `/health/live` | Liveness probe `{ status: "alive" }`. |
| GET | `/health/queues` | JSON summary for queue metrics. |
| GET | `/health/metrics` | Prometheus text exposition (`Content-Type: text/plain; version=0.0.4`). |

---

## 4. Known Gaps & Next Steps
1. **HTTP/E2E Coverage:** Implement a `test/jest-e2e.json` plus Supertest specs that spin up the Nest app and hit the controllers above. Prioritise auth -> email -> AI flows.
2. **Role/Permission Matrix:** Document which routes require `admin`/`super-admin` and expose that matrix to the frontend so buttons can be hidden when the claim is missing.
3. **Provider Secrets Rotation:** Expose dedicated PATCH endpoints for rotating IMAP/SMTP passwords without re-sending every field.
4. **Error Catalog:** Enumerate domain-specific error codes so frontend can render actionable toasts (e.g., OTP expired vs invalid credentials).

Once E2E specs exist, add them to CI (e.g., `npm run test:e2e`) and record the run output in this document for future handoffs.

