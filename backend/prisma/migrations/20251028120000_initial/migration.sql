-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'email',
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "providerType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "supportsEmail" BOOLEAN NOT NULL DEFAULT true,
    "supportsCalendar" BOOLEAN NOT NULL DEFAULT false,
    "supportsContacts" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenEncryptionIv" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "imapUsername" TEXT,
    "imapPassword" TEXT,
    "imapEncryptionIv" TEXT,
    "imapUseTls" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUsername" TEXT,
    "smtpPassword" TEXT,
    "smtpEncryptionIv" TEXT,
    "smtpUseTls" BOOLEAN NOT NULL DEFAULT true,
    "caldavUrl" TEXT,
    "caldavUsername" TEXT,
    "caldavPassword" TEXT,
    "caldavEncryptionIv" TEXT,
    "carddavUrl" TEXT,
    "carddavUsername" TEXT,
    "carddavPassword" TEXT,
    "carddavEncryptionIv" TEXT,
    "metadata" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avgActivityRate" DOUBLE PRECISION DEFAULT 0.0,
    "syncPriority" INTEGER DEFAULT 3,
    "nextSyncAt" TIMESTAMP(3),
    "emailsReceivedLast24h" INTEGER DEFAULT 0,
    "errorStreak" INTEGER DEFAULT 0,
    "lastActivityCheck" TIMESTAMP(3),

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "threadId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "references" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "snippet" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'INBOX',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "size" INTEGER,
    "headers" JSONB,
    "metadata" JSONB,
    "crossProviderLinkId" TEXT,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_attachments" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentId" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "storagePath" TEXT,
    "isInline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_cross_provider_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "conflictStrategy" TEXT NOT NULL DEFAULT 'LAST_WRITE_WINS',
    "mergedIsRead" BOOLEAN NOT NULL DEFAULT false,
    "mergedIsStarred" BOOLEAN NOT NULL DEFAULT false,
    "mergedFolder" TEXT NOT NULL DEFAULT 'INBOX',
    "mergedLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConflictAt" TIMESTAMP(3),
    "lastConflict" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_cross_provider_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT,
    "documentName" TEXT,
    "content" TEXT NOT NULL,
    "vector" vector,
    "embeddingModel" TEXT NOT NULL DEFAULT 'mistral-embed',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "calendarId" TEXT,
    "iCalUID" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "organizer" TEXT,
    "attendees" JSONB,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "recurrence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recurringEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "reminders" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "htmlLink" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "resourcePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastRenewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "lastNotificationAt" TIMESTAMP(3),
    "notificationCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'up',
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,
    "error" TEXT,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_codes_code_key" ON "mfa_codes"("code");

-- CreateIndex
CREATE INDEX "mfa_codes_userId_code_idx" ON "mfa_codes"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_token_idx" ON "sessions"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "provider_configs_tenantId_isDefault_idx" ON "provider_configs"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "provider_configs_userId_idx" ON "provider_configs"("userId");

-- CreateIndex
CREATE INDEX "provider_configs_nextSyncAt_isActive_idx" ON "provider_configs"("nextSyncAt", "isActive");

-- CreateIndex
CREATE INDEX "provider_configs_syncPriority_nextSyncAt_idx" ON "provider_configs"("syncPriority", "nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_tenantId_email_providerType_key" ON "provider_configs"("tenantId", "email", "providerType");

-- CreateIndex
CREATE INDEX "emails_tenantId_folder_receivedAt_idx" ON "emails"("tenantId", "folder", "receivedAt");

-- CreateIndex
CREATE INDEX "emails_tenantId_isRead_idx" ON "emails"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "emails_tenantId_threadId_idx" ON "emails"("tenantId", "threadId");

-- CreateIndex
CREATE INDEX "emails_sentAt_idx" ON "emails"("sentAt");

-- CreateIndex
CREATE INDEX "emails_crossProviderLinkId_idx" ON "emails"("crossProviderLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "emails_providerId_externalId_key" ON "emails"("providerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "emails_tenantId_messageId_key" ON "emails"("tenantId", "messageId");

-- CreateIndex
CREATE INDEX "email_attachments_emailId_idx" ON "email_attachments"("emailId");

-- CreateIndex
CREATE INDEX "email_cross_provider_links_tenantId_lastSyncedAt_idx" ON "email_cross_provider_links"("tenantId", "lastSyncedAt");

-- CreateIndex
CREATE INDEX "email_cross_provider_links_contentHash_idx" ON "email_cross_provider_links"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "email_cross_provider_links_tenantId_contentHash_key" ON "email_cross_provider_links"("tenantId", "contentHash");

-- CreateIndex
CREATE INDEX "messages_tenantId_userId_conversationId_idx" ON "messages"("tenantId", "userId", "conversationId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "chat_sessions_tenantId_userId_updatedAt_idx" ON "chat_sessions"("tenantId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "embeddings_tenantId_idx" ON "embeddings"("tenantId");

-- CreateIndex
CREATE INDEX "calendar_events_tenantId_startTime_idx" ON "calendar_events"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_tenantId_calendarId_startTime_idx" ON "calendar_events"("tenantId", "calendarId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_iCalUID_idx" ON "calendar_events"("iCalUID");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_providerId_externalId_key" ON "calendar_events"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "job_queue_tenantId_status_idx" ON "job_queue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "job_queue_createdAt_idx" ON "job_queue"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_subscriptions_providerId_key" ON "webhook_subscriptions"("providerId");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_providerId_isActive_idx" ON "webhook_subscriptions"("providerId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_expiresAt_idx" ON "webhook_subscriptions"("expiresAt");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_providerType_idx" ON "webhook_subscriptions"("providerType");

-- CreateIndex
CREATE UNIQUE INDEX "health_checks_service_key" ON "health_checks"("service");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_codes" ADD CONSTRAINT "mfa_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_configs" ADD CONSTRAINT "provider_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_crossProviderLinkId_fkey" FOREIGN KEY ("crossProviderLinkId") REFERENCES "email_cross_provider_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_embeddingId_fkey" FOREIGN KEY ("embeddingId") REFERENCES "embeddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

