# Implementation Plan - Labels System (Safe & Incremental)

**Data**: 2025-11-19
**Versione**: 1.0
**Status**: Ready for Implementation
**Risk Level**: 🟢 LOW (Non-Breaking Changes)

---

## Indice

1. [Analisi Situazione Attuale](#analisi-situazione-attuale)
2. [Strategia di Implementazione Sicura](#strategia-di-implementazione-sicura)
3. [Fase 0: Preparazione](#fase-0-preparazione)
4. [Fase 1: Backend Foundation](#fase-1-backend-foundation)
5. [Fase 2: Frontend Components](#fase-2-frontend-components)
6. [Fase 3: Integration](#fase-3-integration)
7. [Rollback Strategy](#rollback-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Checklist Implementazione](#checklist-implementazione)

---

## Analisi Situazione Attuale

### ✅ Stato Database

**Schema Attuale** ([backend/prisma/schema.prisma](../backend/prisma/schema.prisma)):

```prisma
model Email {
  // ... altri campi
  folder              String                  @default("INBOX")
  labels              String[]                @default([])  // ⚠️ GIÀ ESISTENTE - usato per Gmail
  // ...
}

model Folder {
  id           String         @id @default(cuid())
  tenantId     String
  providerId   String
  name         String
  path         String
  // ... altri campi
  @@map("folders")
}
```

**Osservazioni Critiche:**
- ✅ Il campo `labels` ESISTE GIÀ nel modello Email (linea 181)
- ✅ Attualmente usato per Gmail labels (CATEGORY_SOCIAL, INBOX, etc.)
- ⚠️ È un array di STRING (Gmail label IDs), non relazioni
- ✅ Il modello Folder è separato e non interferirà

**Implicazioni:**
- ✅ NON possiamo modificare il campo `labels` esistente (breaking change)
- ✅ DOBBIAMO mantenere backward compatibility
- ✅ Creeremo un nuovo sistema parallelo (UserLabel + EmailLabel)

---

### ✅ Stato Codice Backend

**Moduli Esistenti:**
- [email.module.ts](../backend/src/modules/email/email.module.ts) - Gestione email
- [email-sync.module.ts](../backend/src/modules/email-sync/email-sync.module.ts) - Sincronizzazione
- Controllers: `EmailsController`, `FoldersController`

**Uso Attuale del Campo `labels`:**

```typescript
// backend/src/modules/email-sync/services/google-sync.service.ts:597
private determineFolderFromLabels(labelIds?: string[], fallback?: string): string {
  if (!labelIds || labelIds.length === 0) return fallback ?? 'INBOX';

  if (labelIds.includes('TRASH')) return 'TRASH';
  if (labelIds.includes('SPAM')) return 'SPAM';
  if (labelIds.includes('SENT')) return 'SENT';

  // Gmail categories
  const categoryLabel = labelIds.find(label => label.startsWith('CATEGORY_'));
  if (categoryLabel) {
    switch (categoryLabel) {
      case 'CATEGORY_SOCIAL': return 'SOCIAL';
      case 'CATEGORY_PROMOTIONS': return 'PROMOTIONS';
      // ...
    }
  }

  return 'INBOX';
}
```

**Implicazioni:**
- ✅ Il sistema usa `labels` per Gmail system labels
- ⚠️ NON possiamo cambiare questa logica (breaking)
- ✅ Le nostre UserLabel saranno SEPARATE e NON interferiranno

---

### ✅ Stato Frontend

**Store Attuale:**
- [folders-store.ts](../frontend/stores/folders-store.ts) - Solo contatori cartelle
- Nessun store per labels custom (DA CREARE)

**Componenti Attuali:**
- [PmSyncMailbox.tsx](../frontend/components/dashboard/PmSyncMailbox.tsx) - UI principale
- Accordion per cartelle provider
- Nessun componente labels custom (DA CREARE)

**Implicazioni:**
- ✅ Frontend NON usa attualmente il campo `labels`
- ✅ Possiamo aggiungere nuovi componenti senza breaking changes
- ✅ Store labels sarà completamente nuovo

---

## Strategia di Implementazione Sicura

### 🎯 Principi Guida

1. **Zero Breaking Changes**: Nessuna modifica al codice esistente
2. **Additive Only**: Solo aggiunte, nessuna rimozione/modifica
3. **Parallel Systems**: UserLabel parallelo a Gmail labels
4. **Feature Flags**: Rollout graduale controllato
5. **Backward Compatible**: Sistema funziona anche con feature disabilitata
6. **Rollback Ready**: Possibilità di rollback senza perdita dati

---

### 🔒 Compatibilità con Sistema Esistente

**Separazione Chiara:**

```
┌─────────────────────────────────────────────────────┐
│                   Email Model                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  labels: String[]  ──────► Gmail/System Labels      │
│  (ESISTENTE - NON MODIFICARE)   (CATEGORY_SOCIAL,   │
│                                  INBOX, TRASH, etc.) │
│                                                      │
│                                                      │
│  emailLabels: EmailLabel[]  ──► User Custom Labels  │
│  (NUOVO - DA AGGIUNGERE)         (Progetti, VIP,    │
│                                   Urgenti, etc.)     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Due Sistemi Paralleli:**
- **Sistema 1 (Esistente)**: `Email.labels` → Gmail/provider labels
- **Sistema 2 (Nuovo)**: `Email.emailLabels` → User custom labels

**NO Conflitti Perché:**
- ✅ Campi database diversi
- ✅ Scopi diversi (system vs user)
- ✅ Codice separato
- ✅ Feature flag controllato

---

## Fase 0: Preparazione

**Durata**: 1 giorno
**Risk**: 🟢 Minimal
**Breaking**: ❌ NO

### 0.1 Git Branch Strategy

```bash
# Crea branch feature principale
git checkout -b feature/user-labels

# Questa sarà la base per tutti i sub-branch
```

**Sub-branches per feature specifiche:**
```
feature/user-labels
├── feature/user-labels/database
├── feature/user-labels/backend-api
├── feature/user-labels/frontend-store
├── feature/user-labels/frontend-ui
└── feature/user-labels/integration
```

### 0.2 Feature Flag Setup

**File**: `backend/src/config/features.config.ts` (NUOVO)

```typescript
export interface FeaturesConfig {
  userLabels: {
    enabled: boolean;
    rolloutPercentage: number; // 0-100
    allowedTenants?: string[];  // Whitelist per beta
  };
}

export const featuresConfig: FeaturesConfig = {
  userLabels: {
    enabled: process.env.FEATURE_USER_LABELS === 'true',
    rolloutPercentage: parseInt(process.env.FEATURE_USER_LABELS_ROLLOUT || '0'),
    allowedTenants: process.env.FEATURE_USER_LABELS_TENANTS?.split(',') || []
  }
};
```

**File**: `backend/.env.example` (UPDATE)

```bash
# Feature Flags
FEATURE_USER_LABELS=false
FEATURE_USER_LABELS_ROLLOUT=0
FEATURE_USER_LABELS_TENANTS=
```

**Guard Decorator**: `backend/src/common/decorators/feature-flag.decorator.ts` (NUOVO)

```typescript
import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const FeatureFlag = (feature: string) => SetMetadata(FEATURE_FLAG_KEY, feature);
```

**Guard**: `backend/src/common/guards/feature-flag.guard.ts` (NUOVO)

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { featuresConfig } from '../../config/features.config';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.get<string>(FEATURE_FLAG_KEY, context.getHandler());
    if (!feature) return true; // No feature flag = always allow

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    // Check if feature is enabled
    const config = featuresConfig[feature];
    if (!config) return false;

    if (!config.enabled) return false;

    // Check tenant whitelist
    if (config.allowedTenants && config.allowedTenants.length > 0) {
      if (!tenantId || !config.allowedTenants.includes(tenantId)) {
        return false;
      }
    }

    // Check rollout percentage
    if (config.rolloutPercentage < 100) {
      const hash = this.hashTenantId(tenantId || '');
      if (hash > config.rolloutPercentage) return false;
    }

    return true;
  }

  private hashTenantId(tenantId: string): number {
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
      hash = (hash << 5) - hash + tenantId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 100);
  }
}
```

### 0.3 Environment Setup

**File**: `.env.development` (CREATE)

```bash
# Development: Feature enabled for testing
FEATURE_USER_LABELS=true
FEATURE_USER_LABELS_ROLLOUT=100
FEATURE_USER_LABELS_TENANTS=
```

**File**: `.env.production` (UPDATE)

```bash
# Production: Feature disabled by default
FEATURE_USER_LABELS=false
FEATURE_USER_LABELS_ROLLOUT=0
FEATURE_USER_LABELS_TENANTS=
```

---

## Fase 1: Backend Foundation

**Durata**: 3-4 giorni
**Risk**: 🟢 LOW
**Breaking**: ❌ NO

### 1.1 Database Migration (Additive Only)

**Branch**: `feature/user-labels/database`

**File**: `backend/prisma/schema.prisma` (UPDATE)

**⚠️ IMPORTANTE: Solo AGGIUNTE, NO modifiche a modelli esistenti**

```prisma
// ============================================
// NUOVO MODELLO: UserLabel
// ============================================
model UserLabel {
  id              String   @id @default(cuid())
  tenantId        String
  name            String
  slug            String   // URL-friendly: "progetti-2024"
  type            LabelType @default(USER)
  color           Json?    // { backgroundColor: "#FEE2E2", textColor: "#991B1B" }
  icon            String?  // Icon name from lucide-react
  parentId        String?
  level           Int      @default(0)
  orderIndex      Int      @default(0)
  isArchived      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  parent          UserLabel?  @relation("LabelHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children        UserLabel[] @relation("LabelHierarchy")
  tenant          Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  emailLabels     EmailLabel[]

  @@unique([tenantId, slug])
  @@index([tenantId, type])
  @@index([tenantId, parentId])
  @@index([tenantId, orderIndex])
  @@map("user_labels")
}

enum LabelType {
  SYSTEM  // Gmail labels, etc. (future use)
  USER    // User-created custom labels
}

// ============================================
// NUOVO MODELLO: EmailLabel (Junction Table)
// ============================================
model EmailLabel {
  id          String    @id @default(cuid())
  emailId     String
  labelId     String
  createdAt   DateTime  @default(now())

  email       Email     @relation(fields: [emailId], references: [id], onDelete: Cascade)
  label       UserLabel @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@unique([emailId, labelId])
  @@index([emailId])
  @@index([labelId])
  @@index([createdAt])
  @@map("email_labels")
}

// ============================================
// UPDATE: Email Model (Solo AGGIUNTA)
// ============================================
model Email {
  // ... tutti i campi esistenti NON MODIFICATI ...

  // NUOVO campo (AGGIUNTA)
  emailLabels     EmailLabel[]  // Nuova relazione per custom labels

  // Campo esistente NON MODIFICATO
  // labels          String[]      @default([])  // ← Rimane invariato per Gmail
}

// ============================================
// UPDATE: Tenant Model (Solo AGGIUNTA)
// ============================================
model Tenant {
  // ... tutti i campi esistenti NON MODIFICATI ...

  // NUOVO campo (AGGIUNTA)
  userLabels      UserLabel[]  // Nuova relazione
}
```

**Migration Script**: Generate automaticamente

```bash
cd backend
npx prisma migrate dev --name add_user_labels_system
```

**Expected Migration** (`backend/prisma/migrations/YYYYMMDD_add_user_labels_system/migration.sql`):

```sql
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
CREATE UNIQUE INDEX "user_labels_tenantId_slug_key" ON "user_labels"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "user_labels_tenantId_type_idx" ON "user_labels"("tenantId", "type");

-- CreateIndex
CREATE INDEX "user_labels_tenantId_parentId_idx" ON "user_labels"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "user_labels_tenantId_orderIndex_idx" ON "user_labels"("tenantId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "email_labels_emailId_labelId_key" ON "email_labels"("emailId", "labelId");

-- CreateIndex
CREATE INDEX "email_labels_emailId_idx" ON "email_labels"("emailId");

-- CreateIndex
CREATE INDEX "email_labels_labelId_idx" ON "email_labels"("labelId");

-- CreateIndex
CREATE INDEX "email_labels_createdAt_idx" ON "email_labels"("createdAt");

-- AddForeignKey
ALTER TABLE "user_labels" ADD CONSTRAINT "user_labels_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "user_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_labels" ADD CONSTRAINT "user_labels_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_labels" ADD CONSTRAINT "email_labels_labelId_fkey"
    FOREIGN KEY ("labelId") REFERENCES "user_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**✅ Verifica Migration Sicura:**
- ✅ Solo CREATE (no ALTER su tabelle esistenti)
- ✅ No DROP di colonne
- ✅ No RENAME
- ✅ Tutte foreign keys hanno CASCADE (cleanup automatico)
- ✅ Indici per performance

**Rollback Migration** (se necessario):

```sql
-- Down migration
DROP TABLE IF EXISTS "email_labels";
DROP TABLE IF EXISTS "user_labels";
DROP TYPE IF EXISTS "LabelType";
```

---

### 1.2 Backend Module Structure

**Branch**: `feature/user-labels/backend-api`

**Creare NUOVO modulo separato** (no modifiche a moduli esistenti)

**File**: `backend/src/modules/labels/labels.module.ts` (NUOVO)

```typescript
import { Module } from '@nestjs/common';
import { LabelsService } from './services/labels.service';
import { LabelsController } from './controllers/labels.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [LabelsService],
  controllers: [LabelsController],
  exports: [LabelsService],
})
export class LabelsModule {}
```

**File**: `backend/src/modules/labels/services/labels.service.ts` (NUOVO)

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserLabel, Prisma } from '@prisma/client';
import { CreateLabelDto, UpdateLabelDto } from '../dto/labels.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all user labels for a tenant
   */
  async findAllByTenant(tenantId: string): Promise<UserLabel[]> {
    return this.prisma.userLabel.findMany({
      where: {
        tenantId,
        isArchived: false,
      },
      include: {
        children: {
          where: { isArchived: false },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { emailLabels: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /**
   * Get single label by ID
   */
  async findOne(tenantId: string, id: string): Promise<UserLabel> {
    const label = await this.prisma.userLabel.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { emailLabels: true },
        },
      },
    });

    if (!label || label.tenantId !== tenantId) {
      throw new NotFoundException('Label not found');
    }

    return label;
  }

  /**
   * Create new label
   */
  async create(tenantId: string, dto: CreateLabelDto): Promise<UserLabel> {
    const slug = this.generateSlug(dto.name);

    // Check if slug already exists for this tenant
    const existing = await this.prisma.userLabel.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A label with this name already exists');
    }

    // Calculate level if has parent
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.userLabel.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent label not found');
      }

      level = parent.level + 1;
    }

    // Get max orderIndex for new label
    const maxOrder = await this.prisma.userLabel.aggregate({
      where: { tenantId, parentId: dto.parentId || null },
      _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex || -1) + 1;

    return this.prisma.userLabel.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        color: dto.color as any,
        icon: dto.icon,
        parentId: dto.parentId,
        level,
        orderIndex,
        type: 'USER',
      },
      include: {
        _count: {
          select: { emailLabels: true },
        },
      },
    });
  }

  /**
   * Update label
   */
  async update(tenantId: string, id: string, dto: UpdateLabelDto): Promise<UserLabel> {
    // Verify ownership
    await this.findOne(tenantId, id);

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);

      // Check slug uniqueness
      const existing = await this.prisma.userLabel.findFirst({
        where: {
          tenantId,
          slug: updateData.slug,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('A label with this name already exists');
      }
    }

    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.orderIndex !== undefined) updateData.orderIndex = dto.orderIndex;

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        const parent = await this.prisma.userLabel.findUnique({
          where: { id: dto.parentId },
        });

        if (!parent || parent.tenantId !== tenantId) {
          throw new NotFoundException('Parent label not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(id, dto.parentId)) {
          throw new ConflictException('Cannot create circular label hierarchy');
        }

        updateData.parentId = dto.parentId;
        updateData.level = parent.level + 1;
      } else {
        updateData.parentId = null;
        updateData.level = 0;
      }
    }

    return this.prisma.userLabel.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { emailLabels: true },
        },
      },
    });
  }

  /**
   * Soft delete label (archive)
   */
  async delete(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    // Soft delete (archive)
    await this.prisma.userLabel.update({
      where: { id },
      data: { isArchived: true },
    });

    // Note: emailLabels junction records stay intact for potential restore
  }

  /**
   * Hard delete label (permanent)
   */
  async hardDelete(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);

    // Hard delete (CASCADE will remove children and emailLabels)
    await this.prisma.userLabel.delete({
      where: { id },
    });
  }

  /**
   * Add emails to label
   */
  async addEmailsToLabel(
    tenantId: string,
    labelId: string,
    emailIds: string[],
  ): Promise<number> {
    // Verify label ownership
    await this.findOne(tenantId, labelId);

    // Verify emails belong to tenant
    const validEmails = await this.prisma.email.findMany({
      where: {
        id: { in: emailIds },
        tenantId,
      },
      select: { id: true },
    });

    const validEmailIds = validEmails.map((e) => e.id);

    // Create junction records (skip duplicates)
    const records = validEmailIds.map((emailId) => ({
      emailId,
      labelId,
    }));

    const result = await this.prisma.emailLabel.createMany({
      data: records,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Remove email from label
   */
  async removeEmailFromLabel(labelId: string, emailId: string): Promise<void> {
    await this.prisma.emailLabel.deleteMany({
      where: {
        emailId,
        labelId,
      },
    });
  }

  /**
   * Get emails for a label
   */
  async getEmailsForLabel(
    tenantId: string,
    labelId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    await this.findOne(tenantId, labelId);

    const emailLabels = await this.prisma.emailLabel.findMany({
      where: { labelId },
      include: {
        email: {
          where: { tenantId },
          orderBy: { receivedAt: 'desc' },
        },
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return emailLabels.map((el) => el.email);
  }

  /**
   * Reorder labels
   */
  async reorder(
    tenantId: string,
    labelIds: string[],
  ): Promise<void> {
    // Verify all labels belong to tenant
    const labels = await this.prisma.userLabel.findMany({
      where: {
        id: { in: labelIds },
        tenantId,
      },
    });

    if (labels.length !== labelIds.length) {
      throw new NotFoundException('Some labels not found');
    }

    // Update orderIndex for each label
    await Promise.all(
      labelIds.map((id, index) =>
        this.prisma.userLabel.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async wouldCreateCircularReference(
    labelId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === labelId) return true;
      if (visited.has(currentId)) return true; // Cycle detected

      visited.add(currentId);

      const parent = await this.prisma.userLabel.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }
}
```

**File**: `backend/src/modules/labels/dto/labels.dto.ts` (NUOVO)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsObject, IsInt, IsArray } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  color?: {
    backgroundColor: string;
    textColor: string;
  };

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  color?: {
    backgroundColor: string;
    textColor: string;
  };

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class AddEmailsToLabelDto {
  @IsArray()
  @IsString({ each: true })
  emailIds: string[];
}

export class ReorderLabelsDto {
  @IsArray()
  @IsString({ each: true })
  labelIds: string[];
}
```

**File**: `backend/src/modules/labels/controllers/labels.controller.ts` (NUOVO)

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LabelsService } from '../services/labels.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { FeatureFlag } from '../../../common/decorators/feature-flag.decorator';
import {
  CreateLabelDto,
  UpdateLabelDto,
  AddEmailsToLabelDto,
  ReorderLabelsDto,
} from '../dto/labels.dto';

@Controller('labels')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@FeatureFlag('userLabels')  // ⚠️ Feature flag protection
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  async getUserLabels(@Request() req: any) {
    const labels = await this.labelsService.findAllByTenant(req.user.tenantId);
    return { labels };
  }

  @Get(':id')
  async getLabel(@Request() req: any, @Param('id') id: string) {
    const label = await this.labelsService.findOne(req.user.tenantId, id);
    return { label };
  }

  @Post()
  async createLabel(@Request() req: any, @Body() dto: CreateLabelDto) {
    const label = await this.labelsService.create(req.user.tenantId, dto);
    return { label };
  }

  @Put(':id')
  async updateLabel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    const label = await this.labelsService.update(req.user.tenantId, id, dto);
    return { label };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLabel(@Request() req: any, @Param('id') id: string) {
    await this.labelsService.delete(req.user.tenantId, id);
  }

  @Post(':id/emails')
  async addEmailsToLabel(
    @Request() req: any,
    @Param('id') labelId: string,
    @Body() dto: AddEmailsToLabelDto,
  ) {
    const count = await this.labelsService.addEmailsToLabel(
      req.user.tenantId,
      labelId,
      dto.emailIds,
    );
    return { count };
  }

  @Delete(':id/emails/:emailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEmailFromLabel(
    @Param('id') labelId: string,
    @Param('emailId') emailId: string,
  ) {
    await this.labelsService.removeEmailFromLabel(labelId, emailId);
  }

  @Get(':id/emails')
  async getEmailsForLabel(
    @Request() req: any,
    @Param('id') labelId: string,
  ) {
    const emails = await this.labelsService.getEmailsForLabel(
      req.user.tenantId,
      labelId,
    );
    return { emails };
  }

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderLabels(
    @Request() req: any,
    @Body() dto: ReorderLabelsDto,
  ) {
    await this.labelsService.reorder(req.user.tenantId, dto.labelIds);
  }
}
```

---

### 1.3 Register Module in App

**File**: `backend/src/app.module.ts` (UPDATE - Solo AGGIUNTA)

```typescript
import { Module } from '@nestjs/common';
// ... existing imports ...
import { LabelsModule } from './modules/labels/labels.module';  // ← NUOVO

@Module({
  imports: [
    // ... existing modules ...
    LabelsModule,  // ← AGGIUNTO
  ],
  // ... rest unchanged ...
})
export class AppModule {}
```

**✅ Verifica Sicura:**
- ✅ Solo import aggiunto
- ✅ No modifiche a moduli esistenti
- ✅ No rimozioni

---

### 1.4 Testing Backend

**File**: `backend/src/modules/labels/services/labels.service.spec.ts` (NUOVO)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from './labels.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('LabelsService', () => {
  let service: LabelsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        {
          provide: PrismaService,
          useValue: {
            userLabel: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            emailLabel: {
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByTenant', () => {
    it('should return all non-archived labels for a tenant', async () => {
      const mockLabels = [
        { id: '1', name: 'Work', tenantId: 'tenant1', isArchived: false },
        { id: '2', name: 'Personal', tenantId: 'tenant1', isArchived: false },
      ];

      jest.spyOn(prisma.userLabel, 'findMany').mockResolvedValue(mockLabels as any);

      const result = await service.findAllByTenant('tenant1');
      expect(result).toEqual(mockLabels);
      expect(prisma.userLabel.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1', isArchived: false },
        include: expect.any(Object),
        orderBy: { orderIndex: 'asc' },
      });
    });
  });

  // ... more tests ...
});
```

**Run Tests:**

```bash
cd backend
npm run test -- labels.service.spec.ts
```

---

## Fase 2: Frontend Components

**Durata**: 3-4 giorni
**Risk**: 🟢 LOW
**Breaking**: ❌ NO

### 2.1 API Client

**Branch**: `feature/user-labels/frontend-store`

**File**: `frontend/lib/api/labels.ts` (NUOVO)

```typescript
import { apiClient } from './api-client';

export interface UserLabel {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: 'SYSTEM' | 'USER';
  color?: {
    backgroundColor: string;
    textColor: string;
  };
  icon?: string;
  parentId?: string;
  level: number;
  orderIndex: number;
  children?: UserLabel[];
  emailCount?: number;
}

export interface CreateLabelRequest {
  name: string;
  color?: { backgroundColor: string; textColor: string };
  icon?: string;
  parentId?: string;
}

export const labelsApi = {
  async list(): Promise<{ labels: UserLabel[] }> {
    const response = await apiClient.get('/labels');
    return response.data;
  },

  async create(data: CreateLabelRequest): Promise<{ label: UserLabel }> {
    const response = await apiClient.post('/labels', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateLabelRequest>): Promise<{ label: UserLabel }> {
    const response = await apiClient.put(`/labels/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/labels/${id}`);
  },

  async addToEmails(labelId: string, emailIds: string[]): Promise<{ count: number }> {
    const response = await apiClient.post(`/labels/${labelId}/emails`, { emailIds });
    return response.data;
  },

  async removeFromEmail(labelId: string, emailId: string): Promise<void> {
    await apiClient.delete(`/labels/${labelId}/emails/${emailId}`);
  },

  async reorder(labelIds: string[]): Promise<void> {
    await apiClient.post('/labels/reorder', { labelIds });
  },
};
```

---

### 2.2 Zustand Store

**File**: `frontend/stores/labels-store.ts` (NUOVO)

```typescript
import { create } from 'zustand';
import { UserLabel } from '@/lib/api/labels';

interface LabelsState {
  labels: UserLabel[];
  selectedLabelIds: string[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  setLabels: (labels: UserLabel[]) => void;
  addLabel: (label: UserLabel) => void;
  updateLabel: (id: string, updates: Partial<UserLabel>) => void;
  removeLabel: (id: string) => void;
  toggleLabelSelection: (id: string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
}

export const useLabelsStore = create<LabelsState>((set) => ({
  labels: [],
  selectedLabelIds: [],
  isLoading: false,
  error: null,

  setLabels: (labels) => set({ labels }),

  addLabel: (label) =>
    set((state) => ({
      labels: [...state.labels, label],
    })),

  updateLabel: (id, updates) =>
    set((state) => ({
      labels: state.labels.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  removeLabel: (id) =>
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== id),
      selectedLabelIds: state.selectedLabelIds.filter((lid) => lid !== id),
    })),

  toggleLabelSelection: (id) =>
    set((state) => ({
      selectedLabelIds: state.selectedLabelIds.includes(id)
        ? state.selectedLabelIds.filter((lid) => lid !== id)
        : [...state.selectedLabelIds, id],
    })),

  clearSelection: () => set({ selectedLabelIds: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
```

---

### 2.3 React Query Hook

**File**: `frontend/hooks/use-labels.ts` (NUOVO)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelsApi, CreateLabelRequest } from '@/lib/api/labels';
import { useLabelsStore } from '@/stores/labels-store';
import { toast } from 'sonner';

export function useLabels() {
  const queryClient = useQueryClient();
  const { setLabels, setLoading, setError } = useLabelsStore();

  const query = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await labelsApi.list();
        setLabels(result.labels);
        return result.labels;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to fetch labels');
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLabelRequest) => labelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label created successfully');
    },
    onError: () => {
      toast.error('Failed to create label');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLabelRequest> }) =>
      labelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label updated successfully');
    },
    onError: () => {
      toast.error('Failed to update label');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => labelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete label');
    },
  });

  return {
    labels: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createLabel: createMutation.mutateAsync,
    updateLabel: updateMutation.mutateAsync,
    deleteLabel: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
```

---

## Fase 3: Integration

**Durata**: 2 giorni
**Risk**: 🟡 MEDIUM
**Breaking**: ❌ NO (con feature flag)

### 3.1 Conditional UI Rendering

**File**: `frontend/components/dashboard/PmSyncMailbox.tsx` (UPDATE)

```typescript
// ... existing imports ...
import { useLabels } from '@/hooks/use-labels';  // ← NUOVO
import { useLabelsStore } from '@/stores/labels-store';  // ← NUOVO

export function PmSyncMailbox() {
  // ... existing code UNCHANGED ...

  // ⚠️ NUOVO: Feature flag check
  const [labelsFeatureEnabled, setLabelsFeatureEnabled] = useState(false);

  useEffect(() => {
    // Check if labels feature is enabled
    fetch('/api/features/user-labels')
      .then(res => res.json())
      .then(data => setLabelsFeatureEnabled(data.enabled))
      .catch(() => setLabelsFeatureEnabled(false));
  }, []);

  // ⚠️ NUOVO: Conditional hook
  const { labels } = labelsFeatureEnabled ? useLabels() : { labels: [] };
  const { selectedLabelIds } = useLabelsStore();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Existing sidebar - UNCHANGED */}
      <Box sx={{ width: 280 }}>
        {/* ... existing folders code ... */}

        {/* ⚠️ NUOVO: Conditional labels section */}
        {labelsFeatureEnabled && labels.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
              Custom Labels
            </Typography>
            {/* RecursiveFolder components here */}
          </>
        )}
      </Box>

      {/* Rest of component UNCHANGED */}
    </Box>
  );
}
```

**✅ Verifica Sicura:**
- ✅ Codice esistente NON modificato
- ✅ Nuove features dietro feature flag
- ✅ Graceful fallback se feature disabilitata

---

## Rollback Strategy

### 🔴 Emergency Rollback (< 5 minuti)

**Se qualcosa va storto in produzione:**

1. **Disable Feature Flag** (IMMEDIATO):
```bash
# Production .env
FEATURE_USER_LABELS=false
```

2. **Restart Backend**:
```bash
pm2 restart mailgent-backend
# OR
docker-compose restart backend
```

3. **Verify**:
```bash
curl -H "Authorization: Bearer $TOKEN" https://api.mailgent.com/labels
# Should return 403 Forbidden (feature disabled)
```

**Risultato:**
- ✅ API labels inaccessibile
- ✅ Frontend nasconde UI labels
- ✅ Sistema torna a funzionare come prima
- ✅ NO perdita dati (tables rimangono intatte)

---

### 🟡 Rollback Database (se necessario)

**Solo se migration causa problemi:**

```bash
cd backend

# Rollback ultima migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Drop tables manualmente
npx prisma db execute --file rollback.sql
```

**File**: `rollback.sql`

```sql
-- Backup dei dati prima di droppare (opzionale)
CREATE TABLE user_labels_backup AS SELECT * FROM user_labels;
CREATE TABLE email_labels_backup AS SELECT * FROM email_labels;

-- Drop tables
DROP TABLE IF EXISTS email_labels CASCADE;
DROP TABLE IF EXISTS user_labels CASCADE;
DROP TYPE IF EXISTS "LabelType";
```

**Restore da backup** (se necessario):

```sql
-- Restore tables
CREATE TABLE user_labels AS SELECT * FROM user_labels_backup;
CREATE TABLE email_labels AS SELECT * FROM email_labels_backup;

-- Drop backups
DROP TABLE user_labels_backup;
DROP TABLE email_labels_backup;
```

---

## Testing Strategy

### Unit Tests

**Backend Services:**
```bash
cd backend
npm run test -- labels.service.spec.ts
npm run test:cov -- labels
```

**Frontend Hooks:**
```bash
cd frontend
npm run test -- use-labels.test.ts
```

---

### Integration Tests

**API Endpoints:**

```typescript
// backend/test/labels.e2e-spec.ts
describe('Labels API (e2e)', () => {
  it('POST /labels - creates a label', async () => {
    const response = await request(app.getHttpServer())
      .post('/labels')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Label',
        color: { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
      })
      .expect(201);

    expect(response.body.label).toHaveProperty('id');
    expect(response.body.label.name).toBe('Test Label');
  });

  it('POST /labels - returns 403 if feature disabled', async () => {
    // Disable feature
    process.env.FEATURE_USER_LABELS = 'false';

    await request(app.getHttpServer())
      .post('/labels')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Test' })
      .expect(403);

    // Re-enable
    process.env.FEATURE_USER_LABELS = 'true';
  });
});
```

---

### Manual Testing Checklist

**Backend:**
- [ ] Create label via Postman
- [ ] Update label via Postman
- [ ] Delete label via Postman
- [ ] Add emails to label
- [ ] Remove emails from label
- [ ] Feature flag disable/enable works

**Frontend:**
- [ ] Labels list displays
- [ ] Create label dialog works
- [ ] Edit label works
- [ ] Delete label works (with confirmation)
- [ ] Multi-select labels works
- [ ] Feature flag hides UI when disabled

**Integration:**
- [ ] WebSocket updates labels count
- [ ] Filtering by labels works
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive

---

## Checklist Implementazione

### ✅ Fase 0: Preparazione

- [ ] Create branch `feature/user-labels`
- [ ] Setup feature flags (`features.config.ts`)
- [ ] Setup environment variables (`.env.development`, `.env.production`)
- [ ] Create guards (`FeatureFlagGuard`)
- [ ] Create decorators (`@FeatureFlag`)
- [ ] Commit: "feat: add feature flag system for user labels"

### ✅ Fase 1: Backend Foundation

- [ ] Update Prisma schema (additive only)
- [ ] Run migration: `npx prisma migrate dev --name add_user_labels_system`
- [ ] Verify migration SQL (no breaking changes)
- [ ] Create `LabelsModule`
- [ ] Create `LabelsService`
- [ ] Create `LabelsController` with `@FeatureFlag` guard
- [ ] Write unit tests
- [ ] Register module in `AppModule`
- [ ] Test endpoints with Postman (feature enabled)
- [ ] Test feature flag (feature disabled → 403)
- [ ] Commit: "feat(backend): add user labels CRUD API"

### ✅ Fase 2: Frontend Components

- [ ] Create `labelsApi` client
- [ ] Create `useLabelsStore` (Zustand)
- [ ] Create `useLabels` hook (React Query)
- [ ] Test hook with backend
- [ ] Commit: "feat(frontend): add labels store and hooks"

### ✅ Fase 3: Integration

- [ ] Add conditional rendering in `PmSyncMailbox`
- [ ] Test with feature enabled
- [ ] Test with feature disabled (no UI visible)
- [ ] Commit: "feat(integration): add labels UI to mailbox"

### ✅ Testing & Validation

- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Manual testing checklist
- [ ] Performance testing (DB queries)
- [ ] Security testing (auth, ownership)

### ✅ Deployment

- [ ] Merge to `main` branch
- [ ] Deploy to staging with feature disabled
- [ ] Enable feature for 1 test tenant
- [ ] Monitor logs, metrics
- [ ] Enable feature for 10% users
- [ ] Monitor for 24h
- [ ] Gradual rollout to 100%

---

## Next Steps

Una volta completata questa implementazione sicura, potremo procedere con:

1. **Fase 4**: RecursiveFolder component (UI gerarchica)
2. **Fase 5**: Context menu operazioni
3. **Fase 6**: Multi-label filtering
4. **Fase 7**: Settings page completa
5. **Fase 8**: Advanced features (AI suggestions, automation)

---

**Document Status**: ✅ Ready for Implementation
**Last Updated**: 2025-11-19
**Approval Required**: Yes (before starting)
