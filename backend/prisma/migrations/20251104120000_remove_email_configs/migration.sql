-- Migrate legacy email_configs records into provider_configs (if any remain)
INSERT INTO "provider_configs" (
  "id",
  "tenantId",
  "userId",
  "providerType",
  "email",
  "displayName",
  "supportsEmail",
  "supportsCalendar",
  "supportsContacts",
  "accessToken",
  "refreshToken",
  "tokenEncryptionIv",
  "refreshTokenEncryptionIv",
  "imapPassword",
  "imapEncryptionIv",
  "isDefault",
  "isActive",
  "lastSyncedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  ec."id",
  ec."tenantId",
  ec."userId",
  CASE
    WHEN ec."type" = 'gmail' THEN 'google'
    WHEN ec."type" = 'outlook' THEN 'microsoft'
    ELSE 'generic'
  END,
  ec."email",
  ec."displayName",
  true,
  CASE
    WHEN ec."type" IN ('gmail', 'outlook') THEN true
    ELSE false
  END,
  CASE
    WHEN ec."type" IN ('gmail', 'outlook') THEN true
    ELSE false
  END,
  ec."accessToken",
  ec."refreshToken",
  ec."encryptionIv",
  ec."encryptionIv",
  CASE
    WHEN ec."type" = 'imap' THEN ec."imapPassword"
    ELSE NULL
  END,
  CASE
    WHEN ec."type" = 'imap' THEN ec."encryptionIv"
    ELSE NULL
  END,
  ec."isDefault",
  ec."isActive",
  ec."lastSyncedAt",
  ec."createdAt",
  ec."updatedAt"
FROM "email_configs" ec
WHERE NOT EXISTS (
  SELECT 1
  FROM "provider_configs" pc
  WHERE pc."tenantId" = ec."tenantId"
    AND pc."email" = ec."email"
    AND pc."providerType" = CASE
      WHEN ec."type" = 'gmail' THEN 'google'
      WHEN ec."type" = 'outlook' THEN 'microsoft'
      ELSE 'generic'
    END
);

-- Drop the legacy table
DROP TABLE IF EXISTS "email_configs";
