# MailAgent - Documentation Index

Welcome to the MailAgent documentation. This index provides organized access to all project documentation.

## 📚 Documentation Structure

### 🚀 [Setup & Getting Started](setup/)

Getting started guides and configuration instructions:

- **[OAuth Complete Guide](setup/oauth-complete-guide.md)** - Comprehensive OAuth2 setup for Google and Microsoft
- **[OAuth Vercel Deployment](setup/oauth-vercel.md)** - Production OAuth configuration for Vercel

### 🏗️ [Architecture & Design](architecture/)

System architecture, design patterns, and optimization strategies:

- **[AI Embeddings Optimization](architecture/ai-embeddings-optimization.md)** - Comprehensive analysis and optimization proposals
  - Query embedding caching (50-70% cost reduction)
  - Attachment content extraction (PDF, text files)
  - CTE-based tenant isolation
  - Metadata pre-filtering

- **[Email Frontend Refactor](architecture/email-frontend-refactor.md)** - Frontend architecture analysis
  - Component structure optimization
  - State management patterns
  - Performance improvements

### 🔐 [Security](security/)

Security audits, vulnerability fixes, and compliance documentation:

- **[Tenant Isolation Audit (Nov 2025)](security/tenant-isolation-audit-2025-11-19.md)** - Critical security findings
  - 1 CRITICAL vulnerability (email retention service)
  - 2 SUSPICIOUS issues (unread counts, update patterns)
  - Remediation instructions
  - GDPR/CCPA/SOC2 compliance notes

- **[XSS Fix Guide](security/xss-fix-dompurify.md)** - XSS vulnerability remediation
  - DOMPurify implementation
  - HTML sanitization best practices

### 💻 [Development](development/)

Development guides, implementation plans, and project status:

- **[Project Status](development/PROJECT_STATUS.md)** - Current implementation state and roadmap
  - Feature completion tracking (95% backend / 90% frontend)
  - Testing status (15%)
  - Upcoming features

- **[Recent Implementation Summary](development/recent-implementation-summary.md)** - Latest session work
  - Calendar event attachments
  - Security fixes (Redis KEYS→SCAN, crypto.randomBytes)
  - AI optimizations
  - Gmail/Microsoft attachment sync

- **[Labels Implementation Plan](development/labels-implementation-plan.md)** - Advanced email categorization
  - Label architecture
  - UI/UX design
  - AI-powered auto-labeling

- **[Provider Migration Phase 2](development/provider-migration-phase2.md)** - Multi-provider refactoring
  - Unified provider pattern
  - Migration completion report

- **[Folder Management Roadmap](development/folder-management-roadmap.md)** - Email folder management
  - Custom folder creation
  - Folder hierarchy
  - Sync strategies

### 📦 [Archive](archive/)

Historical documentation and test reports:

- **[Implementation Analysis](archive/implementation-analysis/)** - Historical refactoring docs
  - Roadmap master plan
  - Cross-check analysis
  - Refactoring priorities

- **[Testing Reports](archive/testing/)** - Previous test session results
  - Email sync test results
  - Token refresh tests

- **[Phase Reports](archive/)** - Development phase documentation
  - Phase 1: Cleanup
  - Phase 2: Validation
  - Phase 3: Refactoring
  - Phase 4A: IMAP Provider

---

## 🎯 Quick Links by Role

### For New Developers
1. Start with [Project Status](development/PROJECT_STATUS.md)
2. Read [OAuth Setup Guide](setup/oauth-complete-guide.md)
3. Review [Architecture Overview](../README.md#architettura)
4. Check [Recent Implementation](development/recent-implementation-summary.md)

### For Contributors
1. Review [Project Status](development/PROJECT_STATUS.md)
2. Check [Security Audit](security/tenant-isolation-audit-2025-11-19.md)
3. Read [Provider Pattern](../backend/src/modules/providers/README.md)
4. Follow development guides in [development/](development/)

### For DevOps/Security
1. Review [Security Audit](security/tenant-isolation-audit-2025-11-19.md)
2. Check [AI Optimization](architecture/ai-embeddings-optimization.md)
3. Review [Production Deployment](../README.md#production-deployment)

### For Product Managers
1. Check [Project Status](development/PROJECT_STATUS.md)
2. Review [Folder Management Roadmap](development/folder-management-roadmap.md)
3. See [Labels Implementation Plan](development/labels-implementation-plan.md)

---

## 📖 Documentation by Feature

### Email System
- **Setup**: [OAuth Guide](setup/oauth-complete-guide.md)
- **Architecture**: [Frontend Refactor](architecture/email-frontend-refactor.md)
- **Development**: [Provider Migration](development/provider-migration-phase2.md)
- **Attachments**: [Recent Summary](development/recent-implementation-summary.md)

### AI & Knowledge Base
- **Architecture**: [AI Embeddings Optimization](architecture/ai-embeddings-optimization.md)
- **Implementation**: [Recent Summary](development/recent-implementation-summary.md)
- **Performance**: Query caching, attachment indexing

### Calendar & Contacts
- **Status**: [Project Status](development/PROJECT_STATUS.md)
- **Implementation**: [Recent Summary](development/recent-implementation-summary.md)
- **Attachments**: Google Drive, OneDrive integration

### Security & Compliance
- **Audit**: [Tenant Isolation](security/tenant-isolation-audit-2025-11-19.md)
- **XSS**: [DOMPurify Fix](security/xss-fix-dompurify.md)
- **GDPR**: [PRIVACY.md](../PRIVACY.md)

---

## 🔧 Script Utilities

### Test Scripts
Location: [`../scripts/test/`](../scripts/test/)

- `test-google-apis.js` - Google APIs testing
- `test-microsoft-apis.js` - Microsoft APIs testing
- `test-imap-provider.js` - IMAP provider testing

### Diagnostic Scripts
Location: [`../scripts/diagnostics/`](../scripts/diagnostics/)

- `check-db.js` - Database verification
- `check-providers.js` - Provider verification
- `check-microsoft-sync.js` - Microsoft sync check

**📚 [Complete Script Documentation →](../scripts/README.md)**

---

## 📊 Current System Status

### ✅ Implemented Features
- ✅ Multi-provider email sync (Gmail, Microsoft, IMAP)
- ✅ Auto-refresh OAuth tokens
- ✅ Calendar & Contacts integration
- ✅ Attachment sync with S3/MinIO storage
- ✅ AI email insights (summarization, smart replies)
- ✅ Semantic search with pgvector embeddings
- ✅ Dead Letter Queue system

### 🚀 System Capacity
- **Current Configuration**: 1,020-1,530 active tenants
- **Workers**: 34 concurrent (17 high + 10 normal + 7 low)
- **Throughput**: 204 providers/minute
- **Batch Size**: 200 providers/cycle

### 📈 Performance
- Database queries: < 30ms
- Token auto-refresh: ✅ Functional
- Email sync: Production-ready

---

## 🔍 Search Documentation

Use your editor's search functionality:

```bash
# Search all documentation
grep -r "search term" docs/

# Search specific category
grep -r "search term" docs/development/
```

---

## 📝 Documentation Standards

When adding new documentation:

1. **Placement**: Choose appropriate folder
   - `setup/` - Installation and configuration
   - `architecture/` - System design
   - `security/` - Security audits, compliance
   - `development/` - Implementation guides
   - `archive/` - Historical documentation

2. **Formatting**: Use clear Markdown
   - H1 for document title
   - H2 for main sections
   - H3 for subsections
   - Code blocks with language identifiers

3. **Linking**: Use relative links
   ```markdown
   [Related Doc](../setup/oauth-guide.md)
   ```

4. **Updates**: Keep docs in sync with code
   - Update after major changes
   - Add date stamps
   - Move outdated docs to `archive/`

---

## 🤝 Contributing to Documentation

Improvements are welcome! When contributing:

1. Check existing docs to avoid duplication
2. Follow folder structure guidelines
3. Use clear, concise language
4. Include code examples
5. Add your document to this index
6. Update related documentation links

---

## 📞 Support

- **Issues**: Create a GitHub issue
- **Questions**: Use GitHub Discussions
- **Updates**: Submit a PR

---

**Last Updated**: November 2025
**Documentation Version**: 2.1.0
**Project Status**: ✅ Production-Ready

[**Main README**](../README.md) | [**PRIVACY**](../PRIVACY.md) | [**Scripts**](../scripts/README.md)
