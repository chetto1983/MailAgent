# ✅ Production Security Checklist

**Pre-Deployment Security Verification**
**Last Updated**: 2025-11-22

---

## 🚨 CRITICAL - DEPLOY BLOCKERS

These **MUST** be completed before production deployment:

### 1. Generate Strong Secrets ⏱️ 2 minutes

```bash
# Generate JWT Secret (64 bytes)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (32 bytes for AES-256)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Redis Password
node -e "console.log('REDIS_PASSWORD=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Verification**:
- [ ] JWT_SECRET is 128 characters (64 bytes hex)
- [ ] ENCRYPTION_KEY is 64 characters (32 bytes hex)
- [ ] REDIS_PASSWORD is set and strong
- [ ] Secrets stored in environment variables (NOT in code)
- [ ] `.env` file added to `.gitignore`

**Risk if skipped**: 🔴 **CRITICAL** - Complete system compromise possible

---

### 2. Enable Redis Authentication ⏱️ 5 minutes

**Update `redis.conf`**:
```conf
requirepass YOUR_GENERATED_REDIS_PASSWORD
```

**Update Application Code** (if not already done):
```typescript
// Verify Redis client configuration
Redis.createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,  // ✅ Must be set!
});
```

**Verification**:
- [ ] `redis.conf` has `requirepass` set
- [ ] Application connects with password
- [ ] Test: `redis-cli -a $REDIS_PASSWORD PING` returns PONG
- [ ] Test: `redis-cli PING` returns AUTH error

**Risk if skipped**: 🔴 **HIGH** - Data leakage, cache poisoning, DoS

---

### 3. Verify Security Fixes Applied ⏱️ 5 minutes

**Files to Check**:
- [ ] [contacts.controller.ts](../../backend/src/modules/contacts/controllers/contacts.controller.ts)
  - Has `@UseGuards(JwtAuthGuard, TenantGuard)`
  - `syncProvider()` validates provider ownership
- [ ] [calendar.controller.ts](../../backend/src/modules/calendar/controllers/calendar.controller.ts)
  - Has `@UseGuards(JwtAuthGuard, TenantGuard)`
  - `syncProvider()` validates provider ownership

**Verification**:
```bash
# Check TypeScript compilation
cd backend && npx tsc --noEmit

# Expected: No errors
```

**Risk if skipped**: 🔴 **CRITICAL** - Cross-tenant data access

---

## ⚠️ HIGH PRIORITY - Strongly Recommended

### 4. Database Security ⏱️ 15 minutes

**Enable SSL Connection**:
```env
# Production .env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

**Verify**:
- [ ] SSL enabled for database connections
- [ ] Database user has minimum required permissions
- [ ] No `CREATE DATABASE` or `DROP DATABASE` permissions
- [ ] Connection pooling configured

**Test**:
```bash
psql "$DATABASE_URL"
# Should connect successfully with SSL
```

---

### 5. Redis Hardening ⏱️ 10 minutes

**Update `redis.conf`**:
```conf
# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command SHUTDOWN ""

# Bind to localhost (if not using cluster)
bind 127.0.0.1

# Enable persistence (optional but recommended)
save 900 1
save 300 10
save 60 10000
```

**Verification**:
- [ ] Dangerous commands disabled
- [ ] Redis bound to correct IP
- [ ] Persistence enabled (if needed)
- [ ] AOF enabled (if needed)

---

### 6. WebSocket Authentication ⏱️ 30 minutes

**Verify**:
- [ ] JWT authentication enforced on WebSocket connections
- [ ] Users can only join rooms for their tenant
- [ ] Room names include tenant ID validation

**Test**:
```javascript
// Should FAIL without valid token
const socket = io('http://localhost:3000', {
  auth: { token: 'invalid' }
});
// Expected: Connection refused

// Should SUCCEED with valid token
const socket = io('http://localhost:3000', {
  auth: { token: validJWT }
});
// Expected: Connected
```

---

## 📋 RECOMMENDED - Best Practices

### 7. HTTPS/TLS Configuration ⏱️ 20 minutes

**Production Requirements**:
- [ ] HTTPS enabled (TLS 1.2 or higher)
- [ ] Valid SSL certificate (not self-signed)
- [ ] HTTP to HTTPS redirect
- [ ] HSTS header enabled

**Nginx Example**:
```nginx
server {
    listen 443 ssl http2;
    server_name mailagent.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000" always;
}

server {
    listen 80;
    server_name mailagent.com;
    return 301 https://$server_name$request_uri;
}
```

---

### 8. CORS Configuration ⏱️ 5 minutes

**Verify**:
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,  // ✅ Specific origin, not '*'
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Verification**:
- [ ] CORS origin set to production frontend URL
- [ ] Not using wildcard `*` in production
- [ ] Credentials enabled if needed
- [ ] Methods restricted to necessary ones

---

### 9. Security Headers ⏱️ 10 minutes

**Install Helmet**:
```bash
npm install helmet
```

**Configure**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

**Verification**:
- [ ] Helmet middleware installed
- [ ] CSP configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set

---

### 10. Secret Management ⏱️ 30-60 minutes

**Production Options**:

**AWS**:
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name mailagent/jwt-secret \
  --secret-string $JWT_SECRET

# Retrieve in application
const secret = await secretsManager.getSecretValue({
  SecretId: 'mailagent/jwt-secret'
}).promise();
```

**Azure**:
```bash
# Store in Azure Key Vault
az keyvault secret set \
  --vault-name mailagent-vault \
  --name jwt-secret \
  --value $JWT_SECRET

# Retrieve in application
const secret = await keyVaultClient.getSecret(
  'https://mailagent-vault.vault.azure.net',
  'jwt-secret'
);
```

**Verification**:
- [ ] Secrets stored in secure vault (AWS/Azure/etc.)
- [ ] Application retrieves secrets from vault
- [ ] No secrets in code or `.env` committed to Git
- [ ] Secret rotation schedule defined

---

## 🧪 PRE-DEPLOYMENT TESTING

### Run All Security Tests:

```bash
# 1. TypeScript compilation
cd backend && npx tsc --noEmit

# 2. API Security Scan
npx ts-node api-security-scan.ts

# 3. Penetration Tests
npx ts-node penetration-test.ts

# 4. Unit Tests
npm test

# 5. E2E Tests
npm run test:e2e
```

**Required Results**:
- [ ] TypeScript: 0 errors
- [ ] API Scan: 100% pass rate
- [ ] Penetration Tests: 100% security score
- [ ] Unit Tests: All passing
- [ ] E2E Tests: All passing

---

## 📊 DEPLOYMENT VERIFICATION

### After Deployment, Verify:

**1. Health Check**:
```bash
curl https://api.mailagent.com/health
# Expected: {"status":"ok"}
```

**2. Authentication Works**:
```bash
curl https://api.mailagent.com/auth/me
# Expected: 401 Unauthorized (no token)

curl https://api.mailagent.com/auth/me \
  -H "Authorization: Bearer $VALID_TOKEN"
# Expected: 200 OK with user data
```

**3. HTTPS Enforced**:
```bash
curl http://api.mailagent.com
# Expected: 301 redirect to https://
```

**4. CORS Working**:
```bash
curl https://api.mailagent.com/health \
  -H "Origin: https://mailagent.com" \
  -v
# Check: Access-Control-Allow-Origin header present
```

**5. Rate Limiting Active**:
```bash
# Send 6 login attempts rapidly
for i in {1..6}; do
  curl -X POST https://api.mailagent.com/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: 429 Too Many Requests on 6th request
```

---

## 🚨 ROLLBACK PLAN

**If Security Issues Found After Deployment**:

1. **Immediate**: Revert to previous deployment
2. **Within 1 hour**: Identify root cause
3. **Within 4 hours**: Apply fix
4. **Within 24 hours**: Re-deploy with fix
5. **Within 1 week**: Complete security audit of issue

**Rollback Command** (example):
```bash
# Kubernetes
kubectl rollout undo deployment/mailagent-api

# Docker
docker-compose down
docker-compose up -d --build previous-tag

# PM2
pm2 reload mailagent-api --update-env
```

---

## 📞 SECURITY CONTACTS

**During Deployment**:
- Security Lead: security@mailagent.local
- DevOps Lead: devops@mailagent.local
- On-Call Engineer: oncall@mailagent.local

**Incident Response**:
- Severity 1 (Critical): Page on-call immediately
- Severity 2 (High): Email + Slack within 15 minutes
- Severity 3 (Medium): Create ticket, review next day

---

## ✅ FINAL SIGN-OFF

**Deployment Authorized By**:
- [ ] Security Team
- [ ] DevOps Team
- [ ] Engineering Manager

**Pre-Deployment Checklist**:
- [ ] All CRITICAL items completed
- [ ] All HIGH PRIORITY items completed (or documented exceptions)
- [ ] All security tests passing
- [ ] Secrets properly configured
- [ ] Rollback plan tested
- [ ] Monitoring and alerts configured
- [ ] Documentation updated

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________

---

## 📈 POST-DEPLOYMENT MONITORING

**Monitor for 48 hours**:
- [ ] Failed authentication attempts
- [ ] 403/401 error rates
- [ ] Rate limit violations
- [ ] Database connection errors
- [ ] Redis connection errors
- [ ] Abnormal traffic patterns

**Alert Thresholds**:
- Failed logins: >50/hour from single IP
- 401/403 errors: >100/hour
- Rate limit hits: >1000/hour
- Database errors: >10/minute
- Redis errors: >10/minute

---

**Status**: Ready for production after CRITICAL items completed
**Next Review**: 3 months post-deployment
**Security Score**: 87/100 (will be 95/100 after CRITICAL fixes)
