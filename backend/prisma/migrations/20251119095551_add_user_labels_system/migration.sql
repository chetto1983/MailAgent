-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('SYSTEM', 'USER');

-- CreateTable
CREATE TABLE "user_labels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "LabelType" NOT NULL DEFAULT 'USER',
    "color" JSONB,
    "icon" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_labels" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_labels_tenantId_type_idx" ON "user_labels"("tenantId", "type");

-- CreateIndex
CREATE INDEX "user_labels_tenantId_parentId_idx" ON "user_labels"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "user_labels_tenantId_orderIndex_idx" ON "user_labels"("tenantId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "user_labels_tenantId_slug_key" ON "user_labels"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "email_labels_emailId_idx" ON "email_labels"("emailId");

-- CreateIndex
CREATE INDEX "email_labels_labelId_idx" ON "email_labels"("labelId");

-- CreateIndex
CREATE INDEX "email_labels_createdAt_idx" ON "email_labels"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_labels_emailId_labelId_key" ON "email_labels"("emailId", "labelId");

-- AddForeignKey
ALTER TABLE "user_labels" ADD CONSTRAINT "user_labels_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "user_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_labels" ADD CONSTRAINT "user_labels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "user_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
