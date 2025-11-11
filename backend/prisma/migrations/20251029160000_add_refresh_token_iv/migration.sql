-- Add IV column for refresh tokens so we can decrypt them independently
ALTER TABLE "provider_configs"
ADD COLUMN IF NOT EXISTS "refreshTokenEncryptionIv" TEXT;
