-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "contactGroup" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "middleName" TEXT,
    "displayName" TEXT,
    "nickname" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "emails" JSONB,
    "phoneNumbers" JSONB,
    "addresses" JSONB,
    "company" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "birthday" TIMESTAMP(3),
    "anniversary" TIMESTAMP(3),
    "websites" JSONB,
    "socialProfiles" JSONB,
    "notes" TEXT,
    "photoUrl" TEXT,
    "photoEtag" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "vCardVersion" TEXT DEFAULT '4.0',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 1,
    "eTag" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_providerId_externalId_key" ON "contacts"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "contacts_tenantId_lastName_firstName_idx" ON "contacts"("tenantId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "contacts_tenantId_displayName_idx" ON "contacts"("tenantId", "displayName");

-- CreateIndex
CREATE INDEX "contacts_tenantId_company_idx" ON "contacts"("tenantId", "company");

-- CreateIndex
CREATE INDEX "contacts_contactGroup_idx" ON "contacts"("contactGroup");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
