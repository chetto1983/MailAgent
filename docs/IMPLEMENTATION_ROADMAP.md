# PMSync Implementation Roadmap
**Project**: MailAgent → PMSync Evolution
**Last Updated**: 2025-11-06
**Overall Completion**: **65%**

> **Note**: For detailed gap analysis, see [STRATEGY_GAP_ANALYSIS.md](./STRATEGY_GAP_ANALYSIS.md)

---

## Executive Summary

The PMSync platform is **65% complete** with strong foundations in email synchronization, AI agents, and multi-tenant architecture. Critical gaps remain in user-facing features (email composition, calendar/contacts) and operational capabilities (testing, production deployment).

**Strategic Priorities**:
1. 🔴 Email Composition (CRITICAL - unblocks core workflow)
2. 🔴 Calendar Sync Worker (CRITICAL - major PMSync feature)
3. 🔴 Test Suite Setup (CRITICAL - code quality)
4. 🟠 Calendar & Contacts UI (HIGH - complete communication suite)
5. 🟠 Daily Reports & Alerts (HIGH - key differentiator)

---

## 1. Current Status Assessment

### ✅ **Completed Features (Production-Ready)**

#### Email Synchronization (95%)
- **Backend**: Gmail, Outlook, IMAP with incremental sync
- **Queue System**: 3-tier BullMQ architecture (34 concurrent workers)
- **Scale**: Optimized for 1000+ tenants (200 providers/cycle)
- **Frontend**: Email viewer, folders, search, threading
- **Files**: [backend/src/modules/email-sync/**](../backend/src/modules/email-sync/)

#### AI Agent System (90%)
- **Backend**: Mistral API + LangChain with RAG (pgvector)
- **Tools**: Knowledge search, recent emails retrieval
- **Embedding Pipeline**: Automatic email embedding with chunking
- **Frontend**: Chat interface, session management, quick prompts
- **Files**: [backend/src/modules/ai/**](../backend/src/modules/ai/)

#### Multi-Tenant Architecture (100%)
- Complete tenant isolation at database level
- TenantGuard enforcement on all routes
- Automatic tenant creation on registration
- **Files**: [backend/src/modules/tenants/**](../backend/src/modules/tenants/)

#### GDPR Compliance (95%)
- AES-256 encryption for credentials
- Audit logging for all modifications
- Soft delete + purge capability
- Compliance dashboard
- **Files**: [backend/src/modules/compliance/**](../backend/src/modules/compliance/)

#### Authentication (100%)
- JWT-based auth with 24h expiry
- Email-based OTP/2FA
- Password reset flow
- Session management
- **Files**: [backend/src/modules/auth/**](../backend/src/modules/auth/)

### ⚠️ **Partially Completed Features**

#### Calendar Management (30%)
- ✅ Google/Microsoft/CalDAV API integration
- ✅ Test endpoints available
- ❌ **No background sync worker** (CRITICAL GAP)
- ❌ No calendar event database model
- ❌ No frontend calendar UI
- **Impact**: Major PMSync feature incomplete

#### Dashboard UI (45%)
- ✅ Authentication pages
- ✅ Email viewer
- ✅ AI chat interface
- ✅ Provider management
- ❌ **No email composer** (CRITICAL GAP)
- ❌ No calendar UI
- ❌ No contacts UI

### ❌ **Missing Features**

#### Email Composition (0%) - 🔴 CRITICAL
- No rich text editor
- No reply/forward functionality
- No draft management
- No attachment upload
- **Impact**: Users cannot send emails

#### Contacts Sync (20%)
- ✅ Google/Microsoft Contacts API integration
- ❌ No background sync worker
- ❌ No contacts database model
- ❌ No frontend UI

#### Daily Reports & Alerts (0%) - 🟠 HIGH
- No report generation service
- No follow-up tracking
- No alert system
- **Impact**: Key PMSync differentiator missing

#### Testing Infrastructure (0%) - 🔴 CRITICAL
- No Jest configuration
- No unit tests
- No integration tests
- No E2E tests
- **Impact**: Code quality unknown, regression risk

---

## 2. Critical Blockers Analysis

### 🔴 **CRITICAL (Must Fix Before MVP)**

| # | Feature | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | Email Composition | Core workflow blocked | 3-4 days | P0 |
| 2 | Calendar Sync Worker | Major PMSync feature | 3-4 days | P0 |
| 3 | Test Suite Setup | Code quality unknown | 2 days | P0 |
| 4 | Calendar UI | Users can't manage calendar | 4-5 days | P1 |

### 🟠 **HIGH (Needed for MVP)**

| # | Feature | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 5 | Contacts Sync Worker | Communication suite incomplete | 2-3 days | P1 |
| 6 | Contacts UI | Users can't manage contacts | 3-4 days | P1 |
| 7 | Daily Reports | Key differentiator | 4-5 days | P2 |
| 8 | Follow-up Alerts | Proactive assistance | 3 days | P2 |
| 9 | Smart Reply Integration | AI value proposition | 2-3 days | P2 |

---

## 3. Implementation Roadmap (2025-2026)

### Phase 1: MVP Completion (Weeks 1-4)
**Goal**: Unblock core workflows and complete email functionality

#### Week 1-2: Email Composition (P0)
**Owner**: Frontend Team
**Effort**: 3-4 days

**Tasks**:
1. Integrate rich text editor (TipTap recommended)
   - Install `@tiptap/react`, `@tiptap/starter-kit`
   - Create `EmailComposer.tsx` component
   - Add toolbar (bold, italic, lists, links)
2. Implement reply/forward logic
   - Extract original email content
   - Add quote styling
   - Handle threading (In-Reply-To, References headers)
3. Draft auto-save
   - Auto-save to backend every 30 seconds
   - Restore draft on page load
4. Attachment upload
   - File picker component
   - Upload to backend storage (S3/local)
   - Display attachment list
5. Connect to SMTP sending API
   - Create `POST /emails/send` endpoint (backend)
   - Handle Gmail/Microsoft/SMTP sending
   - Update UI with send status

**Files to Create**:
- `frontend/components/dashboard/EmailComposer.tsx`
- `backend/src/modules/email/services/email-send.service.ts`
- `backend/src/modules/email/controllers/emails.controller.ts` (add send endpoint)

**Acceptance Criteria**:
- ✅ User can compose new email with rich text
- ✅ User can reply to emails with quoted content
- ✅ User can forward emails
- ✅ Drafts auto-save and restore
- ✅ User can attach files
- ✅ Email sends successfully via provider

---

#### Week 2-3: Calendar Sync Worker (P0)
**Owner**: Backend Team
**Effort**: 3-4 days

**Tasks**:
1. Create calendar database models
   ```prisma
   model Event {
     id          String   @id @default(uuid())
     tenantId    String
     providerId  String
     externalId  String
     title       String
     description String?
     location    String?
     startTime   DateTime
     endTime     DateTime
     isAllDay    Boolean  @default(false)
     status      String   @default("confirmed") // confirmed, tentative, cancelled
     organizer   Json?
     attendees   Json[]
     recurrence  Json?
     metadata    Json?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     tenant      Tenant         @relation(fields: [tenantId], references: [id])
     provider    ProviderConfig @relation(fields: [providerId], references: [id])

     @@unique([providerId, externalId])
     @@index([tenantId, startTime])
   }
   ```

2. Create `CalendarSyncService`
   - Follow email sync patterns
   - Implement incremental sync using sync tokens
   - Google: `calendar.events.list` with `syncToken`
   - Microsoft: `/me/calendar/events/delta`
   - CalDAV: REPORT with `sync-token`

3. Add calendar BullMQ queue
   - Create `calendar-sync` queue
   - Add to `QueueService`
   - Configure concurrency (5 workers)

4. Update `SyncSchedulerService`
   - Add calendar sync to cron job
   - Run every 15 minutes (less frequent than email)

5. Create `CalendarSyncWorker`
   - Process calendar sync jobs
   - Handle event creation/update/deletion
   - Detect conflicts (overlapping events)

**Files to Create**:
- `backend/prisma/migrations/YYYYMMDDHHMMSS_add_calendar_events.sql`
- `backend/src/modules/calendar/services/calendar-sync.service.ts`
- `backend/src/modules/calendar/workers/calendar.worker.ts`
- `backend/src/modules/calendar/calendar.module.ts`

**Acceptance Criteria**:
- ✅ Events sync from Google Calendar
- ✅ Events sync from Microsoft Calendar
- ✅ Events sync from CalDAV
- ✅ Incremental sync uses tokens
- ✅ Conflicts detected and logged
- ✅ Automatic sync every 15 minutes

---

#### Week 3: Test Infrastructure Setup (P0)
**Owner**: QA/DevOps Team
**Effort**: 2 days

**Tasks**:
1. Backend testing (Jest)
   ```bash
   cd backend
   npm install --save-dev @nestjs/testing jest @types/jest ts-jest
   ```
   - Configure `jest.config.js`
   - Add test scripts to `package.json`
   - Write sample test for `AuthService`

2. Frontend testing (Jest + RTL)
   ```bash
   cd frontend
   npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
   ```
   - Configure `jest.config.js`
   - Write sample test for `EmailList` component

3. E2E testing setup (Playwright)
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install
   ```
   - Create `tests/e2e/` directory
   - Write auth flow test

4. CI/CD integration (GitHub Actions)
   - Create `.github/workflows/test.yml`
   - Run tests on every PR
   - Block merge if tests fail

**Files to Create**:
- `backend/jest.config.js`
- `frontend/jest.config.js`
- `playwright.config.ts`
- `.github/workflows/test.yml`
- `backend/src/modules/auth/services/auth.service.spec.ts`
- `frontend/components/dashboard/__tests__/EmailList.test.tsx`
- `tests/e2e/auth.spec.ts`

**Acceptance Criteria**:
- ✅ Jest configured for backend
- ✅ Jest + RTL configured for frontend
- ✅ Playwright E2E tests running
- ✅ CI/CD pipeline runs tests automatically
- ✅ Minimum 30% code coverage

---

#### Week 4: Calendar UI (P1)
**Owner**: Frontend Team
**Effort**: 4-5 days

**Tasks**:
1. Install calendar library
   ```bash
   npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
   ```

2. Create `Calendar.tsx` component
   - Month/week/day views
   - Event display
   - Click to view details

3. Create `EventDialog.tsx`
   - View event details
   - Edit event (title, time, attendees)
   - Delete event

4. Add calendar API client
   - `getEvents(startDate, endDate)`
   - `createEvent(event)`
   - `updateEvent(id, event)`
   - `deleteEvent(id)`

5. Integrate with AI assistant
   - "Schedule meeting with X next week"
   - "What's on my calendar tomorrow?"

**Files to Create**:
- `frontend/pages/dashboard/calendar.tsx`
- `frontend/components/dashboard/Calendar.tsx`
- `frontend/components/dashboard/EventDialog.tsx`
- `frontend/lib/api/calendar.ts`

**Acceptance Criteria**:
- ✅ User can view events in month/week/day view
- ✅ User can create new events
- ✅ User can edit existing events
- ✅ User can delete events
- ✅ AI assistant can query calendar
- ✅ Responsive mobile design

---

### Phase 2: Complete Communication Suite (Weeks 5-8)

#### Week 5-6: Contacts Sync + UI (P1)
**Owner**: Full-Stack Team
**Effort**: 5-6 days

**Backend Tasks**:
1. Create contact database model
   ```prisma
   model Contact {
     id          String   @id @default(uuid())
     tenantId    String
     providerId  String
     externalId  String
     displayName String
     email       String?
     phone       String?
     company     String?
     jobTitle    String?
     avatar      String?
     metadata    Json?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     tenant      Tenant         @relation(fields: [tenantId], references: [id])
     provider    ProviderConfig @relation(fields: [providerId], references: [id])

     @@unique([providerId, externalId])
     @@index([tenantId, email])
   }
   ```

2. Create `ContactsSyncService`
   - Google: People API
   - Microsoft: Contacts API
   - CardDAV: REPORT method

3. Add contacts BullMQ queue

**Frontend Tasks**:
1. Create `Contacts.tsx` page
2. Create `ContactsList.tsx` component
3. Create `ContactDialog.tsx` for view/edit
4. Add search and filtering

**Acceptance Criteria**:
- ✅ Contacts sync from all providers
- ✅ User can view contacts list
- ✅ User can search contacts
- ✅ User can edit contact details
- ✅ AI assistant can search contacts

---

#### Week 7-8: Daily Reports & Alerts (P2)
**Owner**: Backend + AI Team
**Effort**: 4-5 days

**Tasks**:
1. Create `ReportService`
   - Cron job runs at 8 AM daily
   - Fetch yesterday's email activity
   - Use Mistral AI to generate summary
   - Detect emails awaiting follow-up
   - Save report to database

2. Create `AlertService`
   - Detect follow-up opportunities
   - Send email notifications
   - Store alert history

3. Add report database models
   ```prisma
   model DailyReport {
     id          String   @id @default(uuid())
     tenantId    String
     userId      String
     date        DateTime
     summary     String
     stats       Json
     followUps   Json[]
     createdAt   DateTime @default(now())

     tenant      Tenant   @relation(fields: [tenantId], references: [id])
     user        User     @relation(fields: [userId], references: [id])

     @@unique([userId, date])
   }
   ```

4. Create frontend report viewer
   - Daily report page
   - Report history
   - Follow-up action center

**Acceptance Criteria**:
- ✅ Daily reports generated automatically
- ✅ Reports include AI-generated summary
- ✅ Follow-up alerts detected
- ✅ Email notifications sent
- ✅ User can view report history

---

### Phase 3: Production Readiness (Weeks 9-12)

#### Week 9-10: Test Coverage to 70%
**Owner**: Full Team
**Effort**: 10 days

**Tasks**:
1. Unit tests for all services
2. Integration tests for API endpoints
3. E2E tests for critical workflows
4. Performance tests for sync workers
5. Security tests (OWASP top 10)

**Target Coverage**:
- Backend: 70%+
- Frontend: 60%+
- E2E: All critical paths

---

#### Week 11: Performance Optimization
**Owner**: DevOps + Backend Team
**Effort**: 5 days

**Tasks**:
1. Database query optimization
   - Add missing indexes
   - Optimize N+1 queries
2. Redis caching layer
   - Cache user data
   - Cache email statistics
3. Frontend optimization
   - Lazy loading routes
   - Virtual scrolling for email list
   - Image optimization
4. CDN for static assets

---

#### Week 12: Production Deployment
**Owner**: DevOps Team
**Effort**: 5 days

**Tasks**:
1. Hetzner Cloud setup
   - Provision servers
   - Configure networking
2. SSL/TLS setup (Let's Encrypt)
3. Secrets management (Vault)
4. Automated backups (PostgreSQL)
5. Monitoring (Prometheus + Grafana)
6. Alerting (PagerDuty)
7. CI/CD pipeline (GitHub Actions)
8. Staging environment
9. Production deployment
10. Smoke tests

---

### Phase 4: Advanced Features (Q1 2026)

#### January 2026: Voice & Real-time
- Speech-to-text/text-to-speech
- WebSocket for real-time notifications
- Push notifications

#### February 2026: Mobile & Admin
- Mobile PWA
- Admin panel for tenant management
- Advanced search with operators

#### March 2026: Enterprise Features
- Email templates
- Bulk operations
- Scheduled sending
- Advanced filtering

---

## 4. Legacy Cleanup (Ongoing)

### A. Provider API Migration (COMPLETED ✅)
- ✅ Old `email-configs` API deprecated
- ✅ New `/providers/*` endpoints active
- ✅ Frontend migrated to `providersApi`
- ⚠️ Remove stub methods in `AuthService` (low priority)

### B. Health & Observability (IN PROGRESS ⚠️)
1. **Metrics Exposure**
   - Connect `/health/metrics` to Prometheus/Grafana
   - Add queue lag, rate limit, provider error metrics
2. **Alerting**
   - Define alert thresholds
   - Create runbooks for incident management

### C. Documentation Updates (IN PROGRESS ⚠️)
- ✅ `CURRENT_STATUS.md` updated
- ✅ `STRATEGY_GAP_ANALYSIS.md` created
- ✅ `IMPLEMENTATION_ROADMAP.md` updated
- ⚠️ Update OAuth setup guides with new endpoints

---

## 5. Timeline Summary

| Phase | Weeks | Focus | Completion Target |
|-------|-------|-------|-------------------|
| **Phase 1: MVP** | 1-4 | Email + Calendar | Week 4 (Dec 4, 2025) |
| **Phase 2: Suite** | 5-8 | Contacts + Reports | Week 8 (Jan 1, 2026) |
| **Phase 3: Production** | 9-12 | Testing + Deploy | Week 12 (Jan 29, 2026) |
| **Phase 4: Advanced** | Q1 2026 | Voice + Mobile | Mar 31, 2026 |

**MVP Launch Target**: December 4, 2025
**Production Launch Target**: January 29, 2026
**Full Feature Set**: March 31, 2026

---

## 6. Resource Requirements

### Development Team
- 2x Backend Developers (email, calendar, contacts sync)
- 2x Frontend Developers (UI components, pages)
- 1x Full-Stack Developer (integration)
- 1x QA Engineer (testing)
- 1x DevOps Engineer (deployment)

### Infrastructure
- Hetzner Cloud servers (2x CX21, 1x CX31)
- PostgreSQL database (managed or self-hosted)
- Redis cluster
- S3-compatible storage (Hetzner Storage Box)
- Monitoring (Prometheus + Grafana)

### External Services
- Mistral AI API (pay-as-you-go)
- Gmail API (free tier: 10,000 req/day)
- Microsoft Graph API (free tier)
- Let's Encrypt (free SSL)

---

## 7. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| API rate limiting | MEDIUM | HIGH | Request queuing, quota monitoring |
| Calendar sync complexity | MEDIUM | MEDIUM | Prototype first, incremental rollout |
| Test coverage delays | HIGH | MEDIUM | Parallel development, pair programming |
| Production deployment issues | MEDIUM | HIGH | Staging environment, rollback plan |
| Team availability | LOW | HIGH | Cross-training, documentation |

---

## 8. Success Metrics

### Technical Metrics
- ✅ Email sync success rate > 99%
- ✅ Calendar sync success rate > 95%
- ✅ Test coverage > 70%
- ✅ API response time < 200ms (p95)
- ✅ Sync worker latency < 5 minutes
- ✅ Zero critical security vulnerabilities

### User Metrics
- ✅ User can send email within 30 seconds
- ✅ Calendar displays events within 2 seconds
- ✅ AI assistant responds within 5 seconds
- ✅ Daily report delivered by 8 AM
- ✅ Zero data loss incidents

---

## 9. Dependencies & Assumptions

### Dependencies
- Prisma migrations executed successfully
- Mistral API availability (99.9% SLA)
- Provider API quotas sufficient
- Hetzner Cloud account approved

### Assumptions
- Team fully allocated to project
- No major scope changes
- Provider APIs remain stable
- Infrastructure scales as expected

---

## 10. Next Actions (This Week)

### Priority 0 (Start Immediately)
1. **Email Composer** - Start frontend development
   - Set up TipTap editor
   - Create composer component
   - Design send API endpoint

2. **Calendar Sync** - Start backend development
   - Design Event database model
   - Create migration
   - Prototype Google Calendar sync

3. **Test Setup** - Configure testing frameworks
   - Install Jest (backend + frontend)
   - Write first sample tests
   - Set up CI/CD pipeline

---

**Roadmap Owner**: Technical Lead
**Last Review**: 2025-11-06
**Next Review**: 2025-11-13 (weekly)
