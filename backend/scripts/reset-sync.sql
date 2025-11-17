-- Reset sync tokens and priority for specific providers (full resync)

-- Gmail provider
UPDATE "provider_configs"
SET
  "metadata" = (COALESCE(metadata, '{}'::jsonb) - 'historyId' - 'lastSyncToken'),
  "errorStreak" = 0,
  "syncPriority" = 1,
  "nextSyncAt" = NOW()
WHERE id = 'cmi328x670024yhukc09bnrul';

-- Microsoft provider
UPDATE "provider_configs"
SET
  "metadata" = (COALESCE(metadata, '{}'::jsonb) - 'lastSyncToken' - 'microsoftDeltaMode' - 'microsoftLastSyncTimestamp'),
  "errorStreak" = 0,
  "syncPriority" = 1,
  "nextSyncAt" = NOW()
WHERE id = 'cmi31z8eg001gyhukiobvp8r8';
