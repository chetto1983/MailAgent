# MailAgent - OAuth2 Configuration Index

Complete guide to setting up external OAuth2 providers for MailAgent.

## 📋 Overview

MailAgent supports authentication and email integration with multiple OAuth2 providers:

| Provider | Use Cases | Complexity | Docs |
|----------|-----------|-----------|------|
| **Gmail** | Email sync, authentication | Medium | [OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md) |
| **Microsoft** | Outlook/Exchange sync, authentication | Medium | [OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md) |
| **IMAP** | Generic email sync (no OAuth) | Low | Built-in |

---

## Quick Links

### Setup Guides

- **[OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md)**
  - Register app on Google Cloud Console
  - Generate Client ID and Secret
  - Configure redirect URIs
  - Test the integration
  - **Time**: 15-20 minutes

- **[OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md)**
  - Register app on Azure Entra ID
  - Generate Client ID and Secret
  - Configure redirect URIs
  - Test the integration
  - **Time**: 15-20 minutes

---

## Setup Flowchart

```
Start: Configure OAuth in MailAgent
    │
    ├─→ Want Gmail/Outlook Email Sync?
    │       YES → Choose provider:
    │           │
    │           ├─→ Gmail?
    │           │   └─→ Read: OAUTH_GMAIL_SETUP.md
    │           │
    │           └─→ Microsoft Outlook?
    │               └─→ Read: OAUTH_MICROSOFT_SETUP.md
    │
    └─→ NO → Skip OAuth (local testing only)
```

---

## Step-by-Step Setup Path

### For Gmail (Google Workspace / Gmail)

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com/
   - Create new project named "MailAgent"
   - Time: 2 minutes

2. **Enable APIs**
   - Enable: Gmail API
   - Enable: Google+ API (optional)
   - Time: 2 minutes

3. **Configure OAuth Consent Screen**
   - Set app name: "MailAgent"
   - Add email addresses
   - Add scopes (email, profile, Gmail access)
   - Add test users (for development)
   - Time: 5 minutes

4. **Create OAuth Credentials**
   - Create OAuth 2.0 Client ID (Web application)
   - Add redirect URI: http://localhost:3000/auth/gmail/callback
   - Copy Client ID and Secret
   - Time: 3 minutes

5. **Update MailAgent**
   - Edit `.env` file
   - Add: `GMAIL_CLIENT_ID=...`
   - Add: `GMAIL_CLIENT_SECRET=...`
   - Restart backend
   - Time: 2 minutes

**Total Time**: ~15 minutes

**See**: [OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md)

---

### For Microsoft (Outlook / Exchange)

1. **Create Azure Project**
   - Go to: https://portal.azure.com/
   - Navigate to: Entra ID
   - Create new app registration named "MailAgent"
   - Time: 2 minutes

2. **Generate Credentials**
   - Copy: Application (Client) ID
   - Create: Client Secret
   - Copy: Client Secret value
   - Time: 3 minutes

3. **Configure OAuth**
   - Add redirect URI: http://localhost:3000/auth/microsoft/callback
   - Set appropriate scopes
   - Time: 3 minutes

4. **Update MailAgent**
   - Edit `.env` file
   - Add: `MICROSOFT_CLIENT_ID=...`
   - Add: `MICROSOFT_CLIENT_SECRET=...`
   - Restart backend
   - Time: 2 minutes

**Total Time**: ~15 minutes

**See**: [OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md)

---

## Environment Variables

### Base OAuth Configuration

After setup, your `.env` should contain:

```env
# ===== OAUTH2 CREDENTIALS (Gmail) =====
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-your-secret-key

# ===== OAUTH2 CREDENTIALS (Microsoft) =====
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz.1234567890
```

### Auto-Generated URLs

MailAgent automatically builds these from base variables:

```
GMAIL_REDIRECT_URI = http://localhost:3000/auth/gmail/callback
MICROSOFT_REDIRECT_URI = http://localhost:3000/auth/microsoft/callback
```

These must match the URIs registered on:
- Google Cloud Console (for Gmail)
- Azure Portal (for Microsoft)

---

## Comparison Table

| Aspect | Gmail | Microsoft |
|--------|-------|-----------|
| **Provider** | Google Cloud | Microsoft Azure |
| **Account** | Google Cloud account | Microsoft Azure subscription |
| **Console** | console.cloud.google.com | portal.azure.com |
| **Setup Time** | 15 min | 15 min |
| **Complexity** | Medium | Medium |
| **Free Tier** | Yes | Yes |
| **Email Types** | Gmail, Workspace | Outlook, Exchange |
| **Scopes** | gmail.*, userinfo.* | Mail.*, Outlook.* |
| **Rate Limits** | 250 MB/day | Variable |
| **Verification** | Automatic | Automatic |

---

## Checklist: Before You Start

- [ ] Have an email provider account (Gmail or Microsoft)
- [ ] Have internet access
- [ ] Have administrator access to create OAuth apps
- [ ] Know your MailAgent backend URL
- [ ] Know your production domain (if applicable)

---

## Checklist: After Setup

- [ ] GMAIL_CLIENT_ID set (if using Gmail)
- [ ] GMAIL_CLIENT_SECRET set (if using Gmail)
- [ ] MICROSOFT_CLIENT_ID set (if using Microsoft)
- [ ] MICROSOFT_CLIENT_SECRET set (if using Microsoft)
- [ ] Backend restarted: `docker-compose restart backend`
- [ ] No errors in logs: `docker-compose logs backend`
- [ ] Login buttons appear in frontend
- [ ] Can authenticate via OAuth provider
- [ ] Email data is accessible in MailAgent

---

## Local Development Setup

For testing OAuth locally (without real email):

1. **Use test accounts** provided by OAuth provider
2. **Configure redirect URI** as: `http://localhost:3000/auth/gmail/callback`
3. **Set MailAgent frontend** as: `http://localhost:3001`
4. **Use `.env` with credentials**
5. **Restart services**: `docker-compose restart backend`

---

## Production Deployment

For production environment:

1. **Update redirect URI** to: `https://your-domain.com/auth/gmail/callback`
2. **Update base variables** in `.env`:
   ```env
   API_HOST=your-domain.com
   FRONTEND_URL=https://your-domain.com
   ```
3. **Verify HTTPS** is configured
4. **Test end-to-end** before going live

See individual guides for production-specific steps.

---

## Troubleshooting

### OAuth Provider Issues

| Error | Provider | Solution |
|-------|----------|----------|
| redirect_uri_mismatch | Both | Check redirect URI matches exactly |
| invalid_client | Both | Verify Client ID and Secret |
| API not enabled | Gmail | Enable Gmail API in Cloud Console |
| Invalid scopes | Both | Check scopes are correct |

See individual guides for provider-specific troubleshooting.

### MailAgent Integration Issues

```bash
# Check OAuth configuration is loaded
docker-compose logs backend | grep -i "oauth\|gmail\|microsoft"

# Verify environment variables
docker-compose exec backend env | grep -i "oauth\|gmail\|microsoft"

# Check API connectivity
curl https://accounts.google.com/o/oauth2/v2/auth?client_id=test
curl https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=test
```

---

## Integration Points in Code

### Backend

The backend uses OAuth credentials in:

- **`backend/src/config/configuration.ts`**
  - Loads CLIENT_ID and SECRET from `.env`
  - Builds redirect URIs automatically

- **`backend/src/modules/auth/`**
  - OAuth strategy implementation
  - Token exchange logic
  - User creation/update on first login

- **`backend/src/modules/email/`**
  - Email sync using OAuth tokens
  - Gmail API integration
  - Microsoft Graph API integration

### Frontend

The frontend initiates OAuth in:

- **`frontend/pages/auth/login.tsx`**
  - OAuth provider buttons
  - Redirect to provider login
  - Handle callback

- **`frontend/lib/api-client.ts`**
  - Store JWT token after OAuth login
  - Attach token to API requests

---

## Common Scenarios

### Scenario 1: Gmail Only

**Setup**:
1. Follow [OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md)
2. Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
3. Leave Microsoft credentials empty

**Result**: Only Gmail login available

---

### Scenario 2: Microsoft Only

**Setup**:
1. Follow [OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md)
2. Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`
3. Leave Gmail credentials empty

**Result**: Only Microsoft login available

---

### Scenario 3: Both Gmail and Microsoft

**Setup**:
1. Follow both guides
2. Set both `GMAIL_*` and `MICROSOFT_*` credentials
3. Restart backend

**Result**: Users can choose login provider

---

### Scenario 4: IMAP Only (No OAuth)

**Setup**:
1. Don't set any OAuth credentials
2. Users configure IMAP manually in settings
3. No external OAuth needed

**Result**: Direct IMAP email sync (no OAuth)

---

## Security Considerations

### Client Secret Management

- ✅ Store in `.env` file (not in version control)
- ✅ Use environment variables in production
- ✅ Rotate secrets periodically
- ✅ Use different secrets for dev/prod

### Token Management

- ✅ Access tokens stored encrypted in database
- ✅ Refresh tokens stored encrypted in database
- ✅ Tokens validated before use
- ✅ Expired tokens automatically refreshed

### OAuth Scopes

- ✅ Request minimum scopes needed
- ✅ Don't request calendar/contacts unless needed
- ✅ Document scope usage in privacy policy

---

## Testing OAuth Integration

### Manual Testing

1. Start services: `docker-compose up -d`
2. Visit frontend: http://localhost:3001/auth/login
3. Click OAuth provider button
4. Follow provider login flow
5. Verify redirect to callback URL
6. Check session created in MailAgent

### Automated Testing

See individual guides for:
- Node.js test scripts
- cURL commands
- API endpoint tests

---

## Next Steps After OAuth Setup

1. **Email Sync**: Configure email provider account settings
2. **AI Integration**: Set up Mistral API for AI features
3. **Production**: Update credentials for production domain
4. **Monitoring**: Set up logging and monitoring
5. **Documentation**: Update internal docs with your setup

---

## Related Documentation

- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup guide
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration system
- [README.md](README.md) - Full project documentation

---

## Support Resources

### Gmail OAuth

- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Docs](https://developers.google.com/gmail/api)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

### Microsoft OAuth

- [Azure Portal](https://portal.azure.com/)
- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)

---

## Summary

You now have:

✅ Guide to configure Gmail OAuth
✅ Guide to configure Microsoft OAuth
✅ Understanding of OAuth flow
✅ Troubleshooting resources
✅ Security best practices
✅ Integration examples

**Next**: Choose your OAuth provider(s) and follow the appropriate guide(s).

---

**Last Updated**: January 2025
**Project**: MailAgent - AI-powered Multi-tenant Email Assistant
