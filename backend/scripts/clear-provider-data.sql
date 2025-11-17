-- Delete emails and embeddings for specific providers, then reset sync tokens/priority.

-- Gmail provider
DELETE FROM "embeddings" WHERE "tenantId" = (SELECT "tenantId" FROM "provider_configs" WHERE id = 'cmi328x670024yhukc09bnrul');
DELETE FROM "emails" WHERE "providerId" = 'cmi328x670024yhukc09bnrul';
UPDATE "provider_configs"
SET
  "metadata" = (COALESCE(metadata, '{}'::jsonb) - 'historyId' - 'lastSyncToken'),
  "errorStreak" = 0,
  "syncPriority" = 1,
  "nextSyncAt" = NOW()
WHERE id = 'cmi328x670024yhukc09bnrul';

-- Microsoft provider
DELETE FROM "embeddings" WHERE "tenantId" = (SELECT "tenantId" FROM "provider_configs" WHERE id = 'cmi31z8eg001gyhukiobvp8r8');
DELETE FROM "emails" WHERE "providerId" = 'cmi31z8eg001gyhukiobvp8r8';
UPDATE "provider_configs"
SET
  "metadata" = (COALESCE(metadata, '{}'::jsonb) - 'lastSyncToken' - 'microsoftDeltaMode' - 'microsoftLastSyncTimestamp'),
  "errorStreak" = 0,
  "syncPriority" = 1,
  "nextSyncAt" = NOW()
WHERE id = 'cmi31z8eg001gyhukiobvp8r8';
