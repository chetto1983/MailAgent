# Unified Provider Pattern Documentation

## Overview

MailAgent implements a **Unified Provider Pattern** for consistent API access across different service types:
- **Email Providers** - Gmail, Microsoft, IMAP
- **Calendar Providers** - Google Calendar, Microsoft Calendar
- **Contacts Providers** - Google Contacts, Microsoft Contacts

Each provider type follows the same pattern: Interface → Factory → Implementation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  IEmailProvider │    │ICalendarProvider│    │IContactsProvider│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ getUserInfo()   │    │ listCalendars() │    │ listContacts()  │
│ listThreads()   │    │ listEvents()    │    │ createContact() │
│ sendEmail()     │    │ createEvent()   │    │ updateContact() │
│ getAttachment() │    │ syncCalendars() │    │ syncContacts()  │
│ refreshToken()  │    │ refreshToken()  │    │ refreshToken()  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ProviderFactory  │    │CalendarProvider│    │ContactsProvider│
│                 │    │Factory          │    │Factory         │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ create()        │    │ create()        │    │ create()       │
│ isSupported()   │    │ isSupported()   │    │ isSupported()  │
│ validateConfig()│    │ validateConfig()│    │ validateConfig()│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│GoogleEmailProv. │    │GoogleCalendarProv│    │GoogleContactsP│
│MicrosoftEmailP. │    │MicrosoftCalendar│    │MicrosoftContact│
│IMAPEmailProv.   │    │Providers        │    │Providers       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Usage Examples

### Email Provider Factory

```typescript
import { ProviderFactory, createEmailProvider } from './factory/provider.factory';

// Using class factory
const config = {
  userId: 'user123',
  providerId: 'prov456',
  providerType: 'google',
  email: 'user@gmail.com',
  accessToken: 'ya29...',
  refreshToken: '1//...',
};

const provider = ProviderFactory.create('google', config);
await provider.getUserInfo();

// Using functional helper
const provider = createEmailProvider('google', config);
const emails = await provider.listThreads({ maxResults: 10 });
```

### Calendar Provider Factory

```typescript
import { CalendarProviderFactory, createCalendarProvider } from '../calendar/calendar-provider.factory';

const calendarProvider = CalendarProviderFactory.create('google', config);
const calendars = await calendarProvider.listCalendars();

// Note: Calendar providers currently forward to existing sync services
// Future: Full provider implementations
```

### Contacts Provider Factory

```typescript
import { ContactsProviderFactory, createContactsProvider } from '../contacts/contacts-provider.factory';

const contactsProvider = ContactsProviderFactory.create('google', config);
const contacts = await contactsProvider.listContacts();

// Note: Contacts providers currently forward to existing sync services
// Future: Full provider implementations
```

## Provider Configuration

All providers require the same configuration structure:

```typescript
interface ProviderConfig {
  userId: string;           // User/tenant identifier
  providerId: string;       // Unique provider instance ID
  providerType: 'google' | 'microsoft' | 'imap';  // Provider type
  email: string;            // User email address
  accessToken: string;      // OAuth access token
  refreshToken?: string;    // OAuth refresh token (optional)
  expiresAt?: Date;         // Token expiration date
}
```

## Error Handling

All providers throw typed errors:

```typescript
try {
  const provider = ProviderFactory.create('google', config);
  await provider.getUserInfo();
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Token needs refresh
    await provider.refreshToken();
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, error.retryAfter));
  } else if (error instanceof ProviderError) {
    // Other provider-specific errors
    console.error(`${error.provider} error: ${error.message}`);
  }
}
```

## Supported Providers

| Feature | Google | Microsoft | IMAP | Status |
|---------|--------|-----------|------|--------|
| **Email** | ✅ | ✅ | 🔄 | Production |
| **Calendar** | 🔄 | 🔄 | ❌ | Sync Services Only |
| **Contacts** | 🔄 | 🔄 | ❌ | Sync Services Only |
| **Attachments** | ✅ | ✅ | ❌ | Email Providers |

**Legend:**
- ✅ **Production**: Complete provider implementation
- 🔄 **Sync Services**: Available through sync services
- ❌ **Not Supported**: Not implemented

## Future Roadmap

### Phase 3: Complete Provider Implementations
- [ ] Google Calendar Provider (ICalendarProvider)
- [ ] Microsoft Calendar Provider (ICalendarProvider)
- [ ] Google Contacts Provider (IContactsProvider)
- [ ] Microsoft Contacts Provider (IContactsProvider)
- [ ] Outlook IMAP Provider (IEmailProvider)
- [ ] Attachment Download Proxy (security layer)

### Long-term Goals
- Unified configuration management
- Provider health monitoring
- Automated token refresh
- Provider failover and redundancy
- Multi-provider data aggregation

## Testing

Run provider integration tests:

```bash
# Test email providers with real data
npm run test:integration:providers

# Test email provider factory
npm run test providers/provider.factory.spec.ts

# Full test suite
npm test
```

## Maintenance

### Adding New Providers

1. **Define Interface**: Create new provider interface in `interfaces/`
2. **Create Factory**: Implement factory pattern in separate module
3. **Implement Providers**: Create concrete provider classes
4. **Update Modules**: Register in appropriate NestJS module
5. **Add Tests**: Create comprehensive test coverage
6. **Update Docs**: Document new provider capabilities

### Configuration Updates

Keep environment variables updated for all supported providers:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=...

# Email Providers
SMTP_HOST=...
SMTP_PORT=...
```

## Troubleshooting

### Common Issues

**Token Expiry**: Implement `refreshToken()` calls in your error handling.

**Provider Not Supported**: Check supported providers with `Factory.isSupported()`.

**Invalid Configuration**: Use `Factory.validateConfig()` before creating providers.

**Rate Limiting**: Implement exponential backoff and respect `RateLimitError.retryAfter`.

---

**Last Updated**: November 18, 2025
**Version**: 0.2.0 (Unified Provider Pattern)
