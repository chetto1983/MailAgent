-- Ensure messageId is unique per tenant when present
CREATE UNIQUE INDEX IF NOT EXISTS "emails_tenantId_messageId_idx"
  ON "emails"("tenantId", "messageId")
  WHERE "messageId" IS NOT NULL;
