# Calendar Webhook Implementation

## Overview

The calendar webhook system provides real-time synchronization between external calendar providers (Google Calendar and Microsoft Calendar) and the MailAgent platform through push notifications/webhooks.

## Architecture

### Components

1. **Google Calendar Webhook Service** (`google-calendar-webhook.service.ts`)
   - Manages Google Calendar push notifications
   - Handles watch subscriptions via Google Calendar API
   - Automatically renews expiring subscriptions

2. **Microsoft Calendar Webhook Service** (`microsoft-calendar-webhook.service.ts`)
   - Manages Microsoft Graph API webhook subscriptions
   - Handles change notifications for calendar events
   - Provides subscription lifecycle management

3. **Calendar Webhook Controller** (`calendar-webhook.controller.ts`)
   - Exposes HTTP endpoints for webhook callbacks
   - Handles both Google and Microsoft notification formats
   - Provides health check endpoint

## Google Calendar Webhooks

### Setup

The Google Calendar webhook system uses Google's Push Notifications API:

```typescript
await googleCalendarWebhook.setupWatch(providerId);
```

**Features:**
- Watches multiple calendars per provider
- Filters watchable calendars (owner, writer, editor roles)
- Excludes deleted calendars
- 7-day expiration with automatic renewal

### Webhook Endpoint

```
POST /webhooks/calendar/google/push
```

**Required Headers:**
- `x-goog-channel-id`: Subscription channel ID
- `x-goog-resource-id`: Google resource identifier
- `x-goog-resource-state`: Notification state (sync, exists, etc.)

### Processing Flow

1. Receive push notification with headers
2. Find active subscription by channel ID
3. Verify resource path is for calendar
4. Update subscription statistics
5. Trigger calendar sync for the provider
6. Return 200 OK (to prevent Google retries)

### Auto-Renewal

Subscriptions are automatically renewed via a cron job:

```typescript
@Cron(CronExpression.EVERY_6_HOURS)
private async handleScheduledRenewal()
```

**Renewal Logic:**
- Checks for subscriptions expiring within 24 hours
- Re-establishes watch for each calendar
- Updates database with new expiration
- Logs renewal status

### Error Handling

- Returns 200 even on processing errors to prevent Google retries
- Logs all errors for monitoring
- Gracefully handles missing providers or calendars

## Microsoft Calendar Webhooks

### Setup

Microsoft webhooks use the Graph API subscription model:

```typescript
await microsoftCalendarWebhook.setupSubscription(providerId);
```

**Features:**
- Single subscription per provider for `/me/events`
- Monitors created, updated, deleted events
- 3-day expiration (Microsoft Graph API limit)
- Client state validation

### Webhook Endpoint

```
POST /webhooks/calendar/microsoft/notifications?validationToken=<token>
```

**Validation (Initial Setup):**
- Microsoft sends `validationToken` query parameter
- Endpoint must return the token in plain text
- Required for subscription creation

**Notification Payload:**
```typescript
{
  value: [
    {
      subscriptionId: string,
      clientState: string,
      changeType: 'created' | 'updated' | 'deleted',
      resource: string,
      subscriptionExpirationDateTime: string,
      resourceData?: {
        '@odata.type': string,
        '@odata.id': string,
        id: string
      }
    }
  ]
}
```

### Processing Flow

1. Handle validation request (if `validationToken` present)
2. Validate client state matches expected value
3. Find active subscription by subscription ID
4. Update subscription statistics
5. Trigger calendar sync for the provider
6. Return success response

### Subscription Renewal

Manual renewal when expiring soon:

```typescript
const renewed = await microsoftCalendarWebhook.renewExpiringSoon();
```

**Renewal Process:**
- Finds subscriptions expiring within 24 hours
- PATCH request to Graph API with new expiration
- Updates database with renewed expiration date
- Maximum 3 days per Microsoft Graph limits

### Error Handling

- Throws errors to trigger Microsoft retry mechanism
- Validates client state to prevent spoofing
- Logs all errors with subscription context
- Handles missing providers gracefully

## Webhook Subscription Model

### Database Schema

```prisma
model WebhookSubscription {
  id                    String   @id @default(cuid())
  providerId            String
  providerType          String   // 'google' | 'microsoft'
  subscriptionId        String   // External subscription ID
  resourcePath          String   // Resource being watched
  webhookUrl            String
  isActive              Boolean  @default(true)
  expiresAt             DateTime
  lastNotificationAt    DateTime?
  notificationCount     Int      @default(0)
  lastRenewedAt         DateTime?
  metadata              Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([providerId, resourcePath])
}
```

### Metadata Examples

**Google Calendar:**
```json
{
  "resourceId": "google-resource-id",
  "calendarId": "calendar@gmail.com"
}
```

**Microsoft Calendar:**
```json
{
  "clientState": "unique-client-state",
  "changeType": "created,updated,deleted"
}
```

## Health Check Endpoint

```
GET /webhooks/calendar/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T14:30:00.000Z",
  "google": {
    "activeSubscriptions": 5,
    "recentNotifications": 3,
    "lastNotifications": [...]
  },
  "microsoft": {
    "activeSubscriptions": 3,
    "recentNotifications": 2,
    "lastNotifications": [...]
  }
}
```

## Configuration

### Environment Variables

```env
# Required
BACKEND_URL=https://your-domain.com

# Optional (auto-detected from BACKEND_URL if not set)
MICROSOFT_CALENDAR_WEBHOOK_URL=https://your-domain.com/webhooks/calendar/microsoft/notifications
WEBHOOK_CLIENT_STATE=random-secure-string

# Google OAuth (for watch setup)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft OAuth (for subscription setup)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### Webhook URL Requirements

1. **Must be publicly accessible** - Both Google and Microsoft need to reach your webhook endpoints
2. **HTTPS required** (except localhost for development)
3. **Fast response time** - Should respond within 10 seconds
4. **Idempotent** - Handle duplicate notifications gracefully

## Testing

### Unit Tests

All webhook services have comprehensive unit tests:

```bash
# Run all webhook tests
npm test -- --testPathPattern=webhook

# Run specific service tests
npm test google-calendar-webhook.service.spec.ts
npm test microsoft-calendar-webhook.service.spec.ts
npm test calendar-webhook.controller.spec.ts
```

**Coverage:**
- ✅ CalendarWebhookController: 11/11 tests
- ✅ GoogleCalendarWebhookService: 13/13 tests
- ✅ MicrosoftCalendarWebhookService: 14/14 tests
- **Total: 38 tests**

### Integration Testing

Manual testing with provider webhooks:

```bash
# Google Calendar - Test push notification
curl -X POST http://localhost:3000/webhooks/calendar/google/push \
  -H "x-goog-channel-id: test-channel-123" \
  -H "x-goog-resource-id: resource-456" \
  -H "x-goog-resource-state: exists"

# Microsoft Calendar - Test validation
curl "http://localhost:3000/webhooks/calendar/microsoft/notifications?validationToken=test-token-123"

# Microsoft Calendar - Test notification
curl -X POST http://localhost:3000/webhooks/calendar/microsoft/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "value": [{
      "subscriptionId": "sub-123",
      "clientState": "your-client-state",
      "changeType": "updated",
      "resource": "/me/events/event-123",
      "subscriptionExpirationDateTime": "2025-11-14T00:00:00Z"
    }]
  }'

# Health check
curl http://localhost:3000/webhooks/calendar/health
```

## Monitoring & Troubleshooting

### Key Metrics

1. **Active Subscriptions**: Total number of active webhook subscriptions
2. **Notification Count**: Number of notifications received per subscription
3. **Last Notification**: Timestamp of most recent notification
4. **Expiration Status**: Subscriptions nearing expiration

### Common Issues

#### Google Calendar: No notifications received

**Causes:**
- Watch subscription expired (max 7 days)
- Webhook URL not publicly accessible
- Calendar access revoked

**Solutions:**
```bash
# Check subscription status
GET /webhooks/calendar/health

# Manually renew
await googleCalendarWebhook.renewExpiringSoon()

# Re-setup watch
await googleCalendarWebhook.setupWatch(providerId)
```

#### Microsoft Calendar: Validation fails

**Causes:**
- Webhook URL not accessible
- HTTPS certificate issues
- Incorrect response to validation request

**Solutions:**
- Ensure webhook URL is publicly accessible over HTTPS
- Verify validation token is returned as plain text
- Check Microsoft logs in Azure Portal

#### Duplicate Notifications

**Expected behavior** - Both providers may send duplicate notifications.

**Handling:**
- Sync operations are idempotent
- Database updates use `upsert` operations
- Last sync timestamp prevents redundant fetches

### Logs

Enable debug logging:

```typescript
// In service files
this.logger.debug(`Processing notification for ${providerId}`);
```

**Key log patterns:**
```
[GoogleCalendarWebhookService] Setup watch for provider {id}, channel {channelId}
[GoogleCalendarWebhookService] Notification: channel={id}, state={state}
[GoogleCalendarWebhookService] Renewed {count} webhook channels

[MicrosoftCalendarWebhookService] Setup subscription for provider {id}, subscription {subId}
[MicrosoftCalendarWebhookService] Notification: subscription={id}, changeType={type}
[MicrosoftCalendarWebhookService] Renewed subscription for provider {id}
```

## Best Practices

### Subscription Management

1. **Always clean up on provider deletion:**
   ```typescript
   await googleCalendarWebhook.stopWatch(providerId);
   await microsoftCalendarWebhook.deleteSubscription(providerId);
   ```

2. **Monitor expiration dates:**
   - Google: 7 days max, renew after 6 days
   - Microsoft: 3 days max, renew after 2 days

3. **Handle provider token refresh:**
   - Webhooks use stored access tokens
   - Ensure tokens are refreshed before watch/subscription setup

### Error Handling

1. **Google**: Return 200 OK always to prevent retries
2. **Microsoft**: Throw errors to trigger retry mechanism
3. **Log all errors** with context for troubleshooting
4. **Update subscription stats** even on partial failures

### Security

1. **Validate requests:**
   - Google: Verify channel ID exists in database
   - Microsoft: Validate client state matches

2. **Use HTTPS** in production

3. **Secure client state:**
   ```typescript
   const clientState = nanoid(); // Cryptographically secure random string
   ```

4. **Rate limiting:**
   - Implement rate limiting on webhook endpoints
   - Handle burst of notifications gracefully

## Future Enhancements

### Planned Improvements

1. **Batch notification processing** for Microsoft
2. **Webhook delivery metrics** (latency, failure rate)
3. **Alert system** for failed webhook deliveries
4. **Admin dashboard** for webhook management
5. **Webhook replay** mechanism for debugging

### Provider-Specific Enhancements

**Google Calendar:**
- Support for calendar-specific filtering
- Selective event type notifications
- Increased expiration handling (if Google extends beyond 7 days)

**Microsoft Calendar:**
- Delta queries for more efficient sync
- Richer notification payload handling
- Support for shared calendars

## References

### Documentation

- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Microsoft Graph Webhooks](https://learn.microsoft.com/en-us/graph/webhooks)
- [Microsoft Calendar Change Notifications](https://learn.microsoft.com/en-us/graph/webhooks-with-resource-data)

### Related Files

- Implementation: `backend/src/modules/calendar/services/*-webhook.service.ts`
- Controller: `backend/src/modules/calendar/controllers/calendar-webhook.controller.ts`
- Tests: `backend/src/modules/calendar/**/*.spec.ts`
- Sync Services: `backend/src/modules/calendar/services/*-calendar-sync.service.ts`

## Conclusion

The calendar webhook system provides robust, real-time synchronization with external calendar providers. With comprehensive error handling, automatic renewal, and thorough testing, it ensures reliable calendar event synchronization for MailAgent users.
