# Backend Security Audit Plan - Hacker Perspective

**Date**: 2025-11-22
**Audit Type**: Offensive Security Testing (Ethical Hacking)
**Target**: MailAgent Backend API
**Approach**: Think like an attacker

---

## 🎯 Attack Surface Analysis

### 1. Authentication & Authorization
**Goal**: Bypass authentication or elevate privileges

#### Attack Vectors:
- [ ] JWT token manipulation/forgery
- [ ] Token expiration bypass
- [ ] Missing authentication on endpoints
- [ ] Weak token secrets
- [ ] Session fixation
- [ ] OAuth flow hijacking
- [ ] Refresh token theft

#### Tests:
```bash
# Test 1: Access protected endpoint without token
curl http://localhost:3000/emails

# Test 2: Use expired/invalid JWT
curl -H "Authorization: Bearer invalid_token" http://localhost:3000/emails

# Test 3: Use another user's JWT (tenant isolation)
# Get user A's JWT, try to access user B's data

# Test 4: Token manipulation
# Decode JWT, change tenantId, re-encode without signature verification
```

---

### 2. Tenant Isolation (CRITICAL)
**Goal**: Access another tenant's emails/data

#### Attack Vectors:
- [ ] Parameter tampering (change tenantId in requests)
- [ ] SQL injection to bypass tenant filters
- [ ] Mass assignment to overwrite tenantId
- [ ] IDOR (Insecure Direct Object Reference)
- [ ] Cross-tenant data leakage

#### Tests:
```bash
# Test 1: Try to access another tenant's email by ID
GET /emails/{another_tenant_email_id}

# Test 2: Try to modify another tenant's data
PATCH /emails/{another_tenant_email_id}
Body: { "isRead": true }

# Test 3: Try to inject tenantId in request body
POST /emails/drafts
Body: {
  "tenantId": "another_tenant_id",  # Should be ignored/rejected
  "subject": "Test"
}

# Test 4: Bulk operations across tenants
DELETE /emails/bulk
Body: { "emailIds": ["tenant_a_email", "tenant_b_email"] }
```

---

### 3. SQL Injection
**Goal**: Extract/modify database data or execute arbitrary SQL

#### Attack Vectors:
- [ ] Search queries
- [ ] Filter parameters
- [ ] Email IDs
- [ ] Subject/body text
- [ ] Provider IDs
- [ ] Folder names

#### Tests:
```bash
# Test 1: Search with SQL injection
GET /emails/search?q=' OR '1'='1

# Test 2: Filter with SQL injection
GET /emails?folder=' OR 1=1--

# Test 3: Email ID injection
GET /emails/' OR '1'='1

# Test 4: Union-based injection
GET /emails/search?q=' UNION SELECT password FROM users--

# Test 5: Time-based blind injection
GET /emails?search=' OR SLEEP(5)--
```

---

### 4. Cross-Site Scripting (XSS)
**Goal**: Inject malicious scripts into stored data

#### Attack Vectors:
- [ ] Email subject
- [ ] Email body (HTML)
- [ ] Email sender/recipient names
- [ ] Label names
- [ ] Folder names
- [ ] Attachment filenames

#### Tests:
```bash
# Test 1: XSS in email subject
POST /emails/send
Body: {
  "subject": "<script>alert('XSS')</script>",
  "bodyHtml": "Test"
}

# Test 2: XSS in email body
POST /emails/send
Body: {
  "subject": "Test",
  "bodyHtml": "<img src=x onerror=alert('XSS')>"
}

# Test 3: XSS in label name
POST /labels
Body: {
  "name": "<svg/onload=alert('XSS')>",
  "color": "#ff0000"
}

# Test 4: XSS in attachment filename
POST /emails/send
Body: {
  "subject": "Test",
  "attachments": [{
    "filename": "test<script>alert('XSS')</script>.pdf"
  }]
}
```

---

### 5. Mass Assignment
**Goal**: Modify fields that shouldn't be user-controllable

#### Attack Vectors:
- [ ] Inject admin/role fields
- [ ] Modify createdAt/updatedAt timestamps
- [ ] Change providerId
- [ ] Modify email IDs
- [ ] Override system fields

#### Tests:
```bash
# Test 1: Try to set isAdmin via email update
PATCH /emails/{id}
Body: {
  "isRead": true,
  "isAdmin": true,  # Should be rejected
  "role": "admin"    # Should be rejected
}

# Test 2: Try to modify tenantId in draft
POST /emails/drafts
Body: {
  "subject": "Test",
  "tenantId": "malicious_tenant_id",  # Should be ignored
  "providerId": "another_provider_id"  # Should be validated
}

# Test 3: Try to set system timestamps
PATCH /emails/{id}
Body: {
  "isRead": true,
  "createdAt": "2020-01-01T00:00:00Z",  # Should be ignored
  "updatedAt": "2020-01-01T00:00:00Z"   # Should be ignored
}
```

---

### 6. Input Validation Bypasses
**Goal**: Send malicious/malformed input to crash or bypass validation

#### Attack Vectors:
- [ ] Negative numbers for pagination
- [ ] Extremely large limits
- [ ] Invalid email addresses
- [ ] Invalid UUIDs
- [ ] Null/undefined values
- [ ] Empty arrays where not expected
- [ ] Type confusion (string vs number)

#### Tests:
```bash
# Test 1: Negative pagination
GET /emails?page=-1&limit=-1

# Test 2: Extremely large limit (DOS)
GET /emails?limit=999999999

# Test 3: Invalid email format
POST /emails/send
Body: {
  "to": ["not-an-email"],
  "subject": "Test"
}

# Test 4: Invalid UUID
GET /emails/00000000-0000-0000-0000-000000000000

# Test 5: Null injection
POST /emails/drafts
Body: {
  "subject": null,
  "bodyHtml": null
}

# Test 6: Array injection
POST /emails/send
Body: {
  "to": "string-instead-of-array"
}
```

---

### 7. Rate Limiting & DOS
**Goal**: Overwhelm the system or bypass rate limits

#### Attack Vectors:
- [ ] Rapid API requests
- [ ] Bulk operations abuse
- [ ] Large attachment uploads
- [ ] WebSocket flood
- [ ] Email sending spam

#### Tests:
```bash
# Test 1: Rapid requests
for i in {1..1000}; do
  curl http://localhost:3000/emails &
done

# Test 2: Large limit abuse
GET /emails?limit=100000

# Test 3: Bulk delete all emails
DELETE /emails/bulk
Body: { "emailIds": [/* thousands of IDs */] }

# Test 4: Send mass emails
for i in {1..1000}; do
  POST /emails/send { "to": ["spam@example.com"], "subject": "Spam" }
done

# Test 5: Large attachment upload
POST /emails/send
Body: {
  "attachments": [{
    "contentBase64": "base64_string_of_100MB_file"
  }]
}
```

---

### 8. File Upload Vulnerabilities
**Goal**: Upload malicious files or bypass restrictions

#### Attack Vectors:
- [ ] Upload executable files (.exe, .sh, .bat)
- [ ] Upload files with double extensions (.pdf.exe)
- [ ] Upload extremely large files
- [ ] Upload files with malicious filenames
- [ ] Path traversal in filenames
- [ ] MIME type spoofing

#### Tests:
```bash
# Test 1: Upload executable
POST /emails/send
Body: {
  "attachments": [{
    "filename": "malware.exe",
    "contentType": "application/x-msdownload",
    "contentBase64": "..."
  }]
}

# Test 2: Path traversal
POST /emails/send
Body: {
  "attachments": [{
    "filename": "../../etc/passwd",
    "contentType": "text/plain",
    "contentBase64": "..."
  }]
}

# Test 3: Double extension
POST /emails/send
Body: {
  "attachments": [{
    "filename": "document.pdf.exe",
    "contentType": "application/pdf",
    "contentBase64": "..."
  }]
}

# Test 4: MIME type spoofing
POST /emails/send
Body: {
  "attachments": [{
    "filename": "malware.exe",
    "contentType": "image/jpeg",  # Lie about type
    "contentBase64": "..."
  }]
}
```

---

### 9. API Abuse & Business Logic Flaws
**Goal**: Abuse API logic for unintended behavior

#### Attack Vectors:
- [ ] Reply to non-existent emails
- [ ] Forward deleted emails
- [ ] Access archived emails before they're expired
- [ ] Bypass retention policies
- [ ] Circular email references
- [ ] Thread ID spoofing

#### Tests:
```bash
# Test 1: Reply to deleted email
POST /emails/{deleted_email_id}/reply

# Test 2: Access another tenant's draft
GET /emails/drafts/{another_tenant_draft_id}

# Test 3: Modify read-only fields via bulk operation
PATCH /emails/bulk/read
Body: {
  "emailIds": ["..."],
  "isRead": true,
  "providerId": "malicious_provider_id"  # Should be ignored
}

# Test 4: Circular thread references
POST /emails/send
Body: {
  "threadId": "same_as_this_email_id",  # Create loop
  "inReplyTo": "this_email_id"
}
```

---

### 10. Information Disclosure
**Goal**: Extract sensitive information from errors/responses

#### Attack Vectors:
- [ ] Detailed error messages
- [ ] Stack traces in production
- [ ] Database connection strings
- [ ] Internal paths
- [ ] Version numbers
- [ ] Debug endpoints

#### Tests:
```bash
# Test 1: Trigger error to see stack trace
GET /emails/invalid-id-format

# Test 2: Check for debug endpoints
GET /debug
GET /.env
GET /config
GET /swagger

# Test 3: Probe for sensitive headers
GET /emails
# Check response headers for X-Powered-By, Server, etc.

# Test 4: Test error responses
POST /emails/send
Body: { "invalid": "data" }
# Check if error reveals internal structure
```

---

### 11. WebSocket Security
**Goal**: Abuse WebSocket connection or spy on other tenants

#### Attack Vectors:
- [ ] Connect without authentication
- [ ] Join other tenants' rooms
- [ ] Send forged events
- [ ] Flood WebSocket with messages
- [ ] Bypass tenant isolation in rooms

#### Tests:
```javascript
// Test 1: Connect without JWT
const socket = io('http://localhost:3000/realtime');

// Test 2: Try to join another tenant's room
socket.emit('join_room', { room: 'tenant:another_tenant_id' });

// Test 3: Send malicious events
socket.emit('email:new', {
  tenantId: 'another_tenant',
  emailId: 'fake_email'
});

// Test 4: Flood with ping
for (let i = 0; i < 10000; i++) {
  socket.emit('ping');
}
```

---

### 12. OAuth & Provider Integration
**Goal**: Hijack OAuth flow or steal tokens

#### Attack Vectors:
- [ ] OAuth redirect URI manipulation
- [ ] CSRF in OAuth flow
- [ ] Token theft from database
- [ ] Replay attacks with old tokens
- [ ] Provider API abuse

#### Tests:
```bash
# Test 1: Manipulate OAuth redirect
GET /auth/google/callback?code=malicious_code&state=tampered

# Test 2: Check if tokens are properly encrypted
# Query database directly to see token storage

# Test 3: Try to use provider tokens directly
# Extract access_token from DB, use it to call Gmail/Outlook API
```

---

## 🔍 Code Review Checklist

### Critical Files to Review:
1. ✅ Authentication Guards (`backend/src/modules/auth/guards/`)
2. ✅ Email Controllers (`backend/src/modules/email/controllers/`)
3. ✅ Email Services (`backend/src/modules/email/services/`)
4. ✅ Prisma Schema (`backend/prisma/schema.prisma`)
5. ✅ WebSocket Gateway (`backend/src/modules/realtime/gateways/`)
6. ✅ OAuth Services (`backend/src/modules/auth/`)

### Look For:
- [ ] Missing `@UseGuards(JwtAuthGuard)` decorators
- [ ] Raw SQL queries (should use Prisma)
- [ ] User input in database queries without sanitization
- [ ] Missing tenant checks (`WHERE tenantId = ?`)
- [ ] Hardcoded secrets
- [ ] Disabled security features in production
- [ ] Missing rate limiting
- [ ] No input validation decorators
- [ ] Direct use of `req.body` without DTO validation
- [ ] File operations without path validation

---

## 🎯 Priority Targets (High Risk)

### 1. CRITICAL: Tenant Isolation
**Why**: One tenant accessing another's emails = data breach
**Test**: Try to access email ID from another tenant

### 2. CRITICAL: SQL Injection
**Why**: Could dump entire database
**Test**: Inject SQL in search queries

### 3. HIGH: Authentication Bypass
**Why**: Access entire system without credentials
**Test**: Remove JWT token, try to access endpoints

### 4. HIGH: File Upload
**Why**: Could execute malicious code on server
**Test**: Upload .exe or .sh files

### 5. HIGH: XSS (Stored)
**Why**: Could steal session tokens from all users
**Test**: Inject `<script>` in email body

### 6. MEDIUM: Rate Limiting
**Why**: Could DOS the system
**Test**: Send 1000 requests per second

### 7. MEDIUM: Mass Assignment
**Why**: Could elevate privileges
**Test**: Try to set admin fields

---

## 📊 Testing Methodology

1. **Automated Scanning**
   - Run OWASP ZAP
   - Run Burp Suite scanner
   - Run SQLMap for SQL injection
   - Run Nikto for web vulnerabilities

2. **Manual Testing**
   - Test each endpoint with malicious input
   - Attempt privilege escalation
   - Try to bypass authentication
   - Test tenant isolation thoroughly

3. **Code Review**
   - Review all authentication code
   - Review all database queries
   - Review input validation
   - Review authorization logic

4. **Documentation**
   - Document all findings
   - Rate severity (Critical/High/Medium/Low)
   - Provide proof of concept
   - Suggest remediation

---

## 🚨 Red Flags to Look For

- ❌ `@SkipThrottle()` on sensitive endpoints
- ❌ Raw database queries: `prisma.$executeRaw()`
- ❌ Missing tenant checks: No `WHERE tenantId = ?`
- ❌ No input validation: No DTOs or `@IsEmail()`, `@IsUUID()`, etc.
- ❌ Direct file path construction: `path.join(userInput)`
- ❌ HTML rendering without sanitization
- ❌ Hardcoded credentials: `password: 'admin123'`
- ❌ Disabled CORS: `cors: { origin: '*' }`
- ❌ Production debug mode: `DEBUG=true`
- ❌ No rate limiting
- ❌ Weak JWT secrets

---

**Status**: Ready to begin offensive security testing
**Next Step**: Start with authentication bypass tests
