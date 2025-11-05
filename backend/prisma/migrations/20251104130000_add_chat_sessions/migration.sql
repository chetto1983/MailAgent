-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "chat_sessions_tenantId_userId_updatedAt_idx"
    ON "chat_sessions"("tenantId", "userId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
