/*
  Warnings:

  - Added the required column `tenantId` to the `webhook_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "webhook_subscriptions" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "delimiter" TEXT NOT NULL DEFAULT '/',
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isSelectable" BOOLEAN NOT NULL DEFAULT true,
    "specialUse" TEXT,
    "attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "recentCount" INTEGER NOT NULL DEFAULT 0,
    "unseenCount" INTEGER NOT NULL DEFAULT 0,
    "uidValidity" TEXT,
    "uidNext" INTEGER DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_tenantId_providerId_idx" ON "folders"("tenantId", "providerId");

-- CreateIndex
CREATE INDEX "folders_tenantId_specialUse_idx" ON "folders"("tenantId", "specialUse");

-- CreateIndex
CREATE INDEX "folders_providerId_parentId_idx" ON "folders"("providerId", "parentId");

-- CreateIndex
CREATE INDEX "folders_lastSyncedAt_idx" ON "folders"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "folders_providerId_path_key" ON "folders"("providerId", "path");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_tenantId_idx" ON "webhook_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_tenantId_isActive_idx" ON "webhook_subscriptions"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
