-- Ensure every subscription has a resourcePath so we can scope uniqueness
UPDATE "webhook_subscriptions"
SET "resourcePath" = 'gmail/mailbox'
WHERE "providerType" = 'google'
  AND "resourcePath" IS NULL;

UPDATE "webhook_subscriptions"
SET "resourcePath" = '/me/mailFolders/inbox/messages'
WHERE "providerType" = 'microsoft'
  AND "resourcePath" IS NULL;

UPDATE "webhook_subscriptions"
SET "resourcePath" = 'generic'
WHERE "resourcePath" IS NULL;

-- Enforce defaults and new uniqueness strategy
ALTER TABLE "webhook_subscriptions"
ALTER COLUMN "resourcePath" SET DEFAULT 'generic';

ALTER TABLE "webhook_subscriptions"
ALTER COLUMN "resourcePath" SET NOT NULL;

-- Remove legacy uniqueness constraint on providerId
DROP INDEX IF EXISTS "webhook_subscriptions_providerId_key";

-- Add helper index for subscription lookups
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_subscriptionId_idx"
ON "webhook_subscriptions"("subscriptionId");

-- Ensure we have at most one subscription per provider + resource combination
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_subscriptions_providerId_resourcePath_key"
ON "webhook_subscriptions"("providerId", "resourcePath");
