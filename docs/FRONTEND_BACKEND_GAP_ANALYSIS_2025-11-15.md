# Frontend ↔ Backend Gap Analysis (2025-11-15)

## Scope
While integrating the PmSync UI with the NestJS backend we audited every screen that still relied on mocks or browser storage. Provider management has now been moved from the deprecated `/dashboard/providers` page into the Settings ▸ Mail Accounts section so those backend flows are exercised from the new UI. The remaining gaps documented below require backend work because the frontend already exposes, or is blocked by, those features.

---

## 1. Persisted User Preferences
- **Frontend evidence:** `frontend/components/dashboard/PmSyncSettings.tsx:200-276` persists the theme, language, timezone, and notification toggle exclusively in `localStorage` (see the TODO at line 239).
- **Backend status:** there is no `settings` or `preferences` module under `backend/src/modules`, and no controller exposes endpoints to read/update per-user preferences.
- **Impact:** user choices reset on each device/browser and cannot be managed centrally (e.g., enforcing tenant-wide defaults).
- **Proposed backend work:**
  1. Create a `user-settings` module with `GET /user/settings` and `PATCH /user/settings`.
  2. Store payloads similar to the `StoredUserSettings` type introduced in `frontend/lib/utils/user-settings.ts`.
  3. Extend JWT payloads with `userId` + `tenantId` to scope settings correctly.

---

## 2. Task Workspace APIs
- **Frontend evidence:** `frontend/components/dashboard/PmSyncTasks.tsx:17-123` seeds an in-memory array of mock `Task` objects and never talks to the backend. The dashboard summary also hard-codes `pendingTasks: 0` (see `frontend/components/dashboard/PmSyncDashboard.tsx:38-82`).
- **Backend status:** no `tasks` module exists under `backend/src/modules`, and there are no `/tasks` routes.
- **Impact:** the Tasks page cannot reflect real assignments, and the dashboard’s task metrics will always be zero.
- **Proposed backend work:**
  1. Introduce a `tasks` module with CRUD endpoints (`GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`).
  2. Return aggregates (e.g., `/tasks/stats`) so the dashboard card can display real counts.
  3. Include assignment metadata (project, dueDate, priority) matching the frontend `Task` interface.

---

## 3. Email Attachment Download Streaming
- **Frontend evidence:** attachments in the mailbox call `emailApi.downloadAttachment` and expect a `downloadUrl` to open in a new tab (`frontend/components/dashboard/PmSyncMailbox.tsx:928-967`).
- **Backend status:** `backend/src/modules/email/services/emails.service.ts:537-575` returns only metadata (storageType/storagePath) and the controller simply forwards that JSON. No signed URL generation or file streaming is implemented.
- **Impact:** users always hit the fallback alert (“Failed to download attachment”) because no usable URL is returned.
- **Proposed backend work:**
  1. Decide on storage backend (S3, GCS, local disk).
  2. Update `getAttachmentDownloadUrl` to either stream the binary or produce a short-lived signed URL and surface it as `downloadUrl`.
  3. Enforce tenant scoping while serving the asset.

---

## 4. Notification Preferences & Digest Scheduling
- **Frontend evidence:** the Settings ▸ General panel exposes toggles for notification emails (see `frontend/components/dashboard/PmSyncSettings.tsx:212-244`), but the handlers only update local state and the shared `user-settings` helper.
- **Backend status:** there is no notification-preferences endpoint; notification delivery jobs (if any) cannot read user intent.
- **Impact:** opting out/in via the UI has no effect on backend digests or push notifications.
- **Proposed backend work:**
  1. Extend the proposed `user-settings` module (Section 1) with notification channels (email, push, reminders).
  2. Wire the notification workers to respect those flags before sending digests or alerts.

---

## Summary of Remaining Backend Work
| Area | Frontend Status | Backend Status | Priority |
|------|-----------------|----------------|----------|
| User preferences (theme/language/timezone/notifications) | UI done, stored locally | **Missing** | High |
| Tasks workspace | UI prototype only | **Missing** | High |
| Attachment downloads | UI calls API but gets placeholder | **Partial** (metadata only) | High |
| Notification opt-in/out | UI toggles only | **Missing** | Medium |

Addressing the items above will unblock the last visible placeholders in the PmSync UI and keep frontend behavior aligned with the backend capabilities. Let us know when the backend endpoints are in place so the remaining TODOs can be replaced with real requests.

---

## Backend APIs Without Frontend Surfaces Yet

| Backend Capability | Sample Endpoints | Frontend Status | Notes |
|--------------------|------------------|-----------------|-------|
| **Email retention & maintenance** | `GET /emails/retention/stats`, `POST /emails/retention/run`, `POST /emails/maintenance/cleanup` | Not exposed anywhere (UI only shows mailbox) | Consider an admin panel or a Settings ▸ Compliance section so operators can monitor retention policies or trigger cleanups. |
| **Threaded conversations APIs** | `GET /emails/conversations`, `GET /emails/thread/:threadId` | Mailbox lists individual messages only | If threaded view is desired, reuse the backend data model; otherwise these endpoints remain unused. |
| **Audit / Compliance modules** | See `backend/src/modules/audit` & `compliance` controllers | No equivalent dashboard pages | These would be useful for tenant administrators (e.g., log exports, DLP reports). |
| **Webhook lifecycle stats** | Gmail/Microsoft webhook controllers expose `/subscriptions` diagnostics | Not surfaced in UI | Could be linked from Providers -> Diagnostics to help operators re-arm subscriptions. |
| **AI helper endpoints (summarize / smart-reply / categorize / memory search)** | `/ai/summarize/:emailId`, `/ai/smart-reply/:emailId`, `/ai/categorize/:emailId`, `/ai/memory/search` | Only `/dashboard/ai` chat uses `/ai/agent` and chat session CRUD | The mailbox still shows static “Smart Reply Ready” copy (see `frontend/components/dashboard/PmSyncDashboard.tsx:446-485`). Hooking these APIs into message view would deliver the promised AI actions. |
| **Tenant / user administration APIs** | `backend/src/modules/tenants`, `backend/src/modules/users` | No admin UI in PmSync shell | Required if we want in-product management instead of relying on Postman/CLI. |

Documenting these backend-only capabilities helps planning future frontend work: once the higher-priority blockers in the previous sections are addressed, we can build UI affordances for the APIs above to give operators full access without leaving the PmSync experience.

---

## Mail / Calendar / Contacts – Bidirectional Sync Status

| Domain | Frontend touchpoints | Backend coverage | Gaps / follow-up |
|--------|---------------------|------------------|------------------|
| **Mail** | - Mailbox list + detail view (`frontend/components/dashboard/PmSyncMailbox.tsx`) calls `emailApi.listEmails`, `emailApi.getEmail`, bulk mark read/unread, star, delete, and attachment metadata.<br>- Compose flow (`frontend/pages/dashboard/email/compose.tsx`) posts to `sendEmail`, `replyToEmail`, `forwardEmail`.<br>- Folder metadata pulled via `getFolders` on load. | - `/emails`, `/emails/:id`, `/emails/send`, `/emails/:id/reply`, `/emails/:id/forward` implemented and wired to provider sync modules (`email-sync`).<br>- Attachment endpoint currently returns metadata only (see Section 3).<br>- `/email-sync/sync/:providerId` exists for manual resync. | - UI lacks entry points to trigger manual syncs or show sync health per provider (only a spinner icon in Mail list refresh).<br>- No UI for retention/maintenance actions, or folder-level sync now that backend exposes `/folders/sync/:providerId`.<br>- Attachment downloads still blocked until backend returns a usable URL/stream. |
| **Calendar** | - FullCalendar wrapper (`frontend/components/dashboard/PmSyncCalendar.tsx`) loads events via `calendarApi.listEvents` filtered by time window and creates events via `calendarApi.createEvent`.<br>- Quick add and dialog create flows exist; editing/deleting is not yet implemented. | - Calendar services under `backend/src/modules/calendar` expose CRUD + manual sync endpoints.<br>- Provider connectors (Google/Microsoft) already push new events into the DB. | - Frontend does not surface update/delete endpoints yet, so edits must be done elsewhere.<br>- No “sync now” or subscription health UI even though `/calendar/sync/:providerId` exists.<br>- Category toggles rely on local state; they are not persisted per user or mapped to backend calendars yet. |
| **Contacts** | - Contacts workspace (`frontend/components/dashboard/PmSyncContacts.tsx`) lists contacts via `contactsApi.listContacts`, allows create (`createContact`), update (`updateContact`), and delete (`deleteContact`).<br>- Provider picker is enforced when creating a contact, matching backend expectations. | - Contacts module exposes CRUD + `/contacts/sync/:providerId` for manual sync.<br>- Provider metadata is available via `providersApi.getProviders`. | - UI does not allow manual sync per provider or display last-sync status beyond whatever is in the list payload.<br>- “Recent activity” and notes tabs still show placeholders; backend audit/comms data could fill them once exposed.<br>- No bulk import/export obwohl backend may have endpoints under compliance/audit. |

**Next steps for bidirectional sync**
1. Surface sync state/actions in the Mail, Calendar, and Contacts toolbars (e.g., “Sync now”, “Last synced at” per provider).
2. Wire Calendar edit/delete actions to the existing backend endpoints.
3. Populate Contacts activity/notes using audit/email APIs once those payloads are available.
