-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "syncToken" TEXT;

-- CreateIndex
CREATE INDEX "folders_providerId_externalId_idx" ON "folders"("providerId", "externalId");
