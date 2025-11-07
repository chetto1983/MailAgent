# 🤖 Architettura Multi-Agent con RAG
**Progetto**: MailAgent v2.0.0
**Data**: 7 Novembre 2025
**Versione**: 1.0
**Status**: 🟢 In Implementazione

---

## 📋 Executive Summary

Questo documento definisce l'architettura multi-agent di MailAgent con sistema RAG (Retrieval-Augmented Generation) integrato. L'obiettivo è creare un ecosistema di agenti AI specializzati che collaborano per fornire assistenza intelligente nella gestione di email, calendario, contatti e report.

### Stato Implementazione:
- ✅ **Agent Core** - 95% implementato (LangChain + Mistral)
- ✅ **RAG System** - 90% implementato (Embeddings + Vector Search)
- ✅ **Email Agent** - 100% implementato (Email Insights Service)
- 🔴 **Calendar Agent** - 0% da implementare
- 🔴 **Contacts Agent** - 0% da implementare
- 🔴 **Report Agent** - 0% da implementare

---

## 🏗️ Architettura Generale

### 1. Visione High-Level

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (Next.js Frontend - Dashboard, Email, Calendar, Contacts)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (NestJS)                       │
│  (Authentication, Routing, Rate Limiting, CORS)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│  (LangChain Agent - Tool Selection & Execution Coordination)    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Email Agent  │  │Calendar Agent│  │ Contact Agent│         │
│  │              │  │              │  │              │         │
│  │ - Summarize  │  │ - Schedule   │  │ - Lookup     │         │
│  │ - SmartReply │  │ - Conflicts  │  │ - Suggest    │         │
│  │ - Categorize │  │ - Reminders  │  │ - Merge      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       RAG SYSTEM LAYER                          │
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌─────────────┐│
│  │ Query Embedding│ →   │ Vector Search  │ →   │  Context    ││
│  │ (Mistral Embed)│     │  (pgvector)    │     │ Injection   ││
│  └────────────────┘     └────────────────┘     └─────────────┘│
│                                                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │  Embeddings  │  │     Redis    │         │
│  │  (Prisma)    │  │  (pgvector)  │  │  (BullMQ)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Design Principles

1. **Specialization** - Ogni agent è specializzato in un dominio specifico
2. **Collaboration** - Gli agent possono invocare altri agent tramite orchestrator
3. **RAG-First** - Ogni risposta è arricchita con contesto rilevante da knowledge base
4. **Scalability** - Architecture permette aggiunta facile di nuovi agent
5. **Observability** - Ogni step è loggato e tracciabile

---

## 🧠 RAG System Architecture

### 1. Pipeline Overview

```
User Query
    ↓
┌───────────────────────────────────────┐
│ 1. EMBEDDING GENERATION               │
│    Input: User prompt (text)          │
│    Output: Vector (1024 dimensions)   │
│    Model: mistral-embed               │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 2. SIMILARITY SEARCH                  │
│    Query: pgvector cosine similarity  │
│    Threshold: > 0.7                   │
│    Limit: Top 5 results               │
│    Index: embeddings.vector (HNSW)   │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 3. CONTEXT BUILDING                   │
│    Deduplication: Remove duplicates   │
│    Ranking: Sort by relevance         │
│    Formatting: Build context string   │
│    Truncation: Max 4000 tokens        │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 4. PROMPT ENRICHMENT                  │
│    System: Base agent instructions    │
│    Context: "[CONTEXT]....[/CONTEXT]" │
│    User: Original user query          │
│    History: Last 5 messages           │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 5. LLM COMPLETION                     │
│    Model: mistral-large-latest        │
│    Temperature: 0.7                   │
│    Max Tokens: 1024                   │
│    Tools: Available agent tools       │
└───────────────┬───────────────────────┘
                ↓
    Response to User
```

### 2. Embedding Generation Strategy

#### Current Implementation ✅

**File**: `backend/src/modules/ai/services/embeddings.service.ts`

```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const response = await this.mistralClient.embeddings.create({
    model: 'mistral-embed',  // 1024 dimensions
    inputs: [text],
  });
  return response.data[0].embedding;
}
```

**Chunking Strategy** (per email lunghe):
- Chunk size: 12,000 chars (~3000 tokens)
- Overlap: 500 chars (preservare contesto)
- Metadata: `{ emailId, chunkIndex, chunkCount }`

**File**: `backend/src/modules/ai/services/knowledge-base.service.ts:132-169`

```typescript
const CHUNK_SIZE = 12000;
const chunks = [];

for (let i = 0; i < emailText.length; i += CHUNK_SIZE) {
  chunks.push({
    text: emailText.substring(i, i + CHUNK_SIZE),
    chunkIndex: chunks.length,
    metadata: { emailId, subject, from, receivedAt }
  });
}

for (const chunk of chunks) {
  const embedding = await this.embeddings.generateEmbedding(chunk.text);
  await this.embeddings.createEmbedding({
    tenantId,
    content: chunk.text,
    vector: embedding,
    metadata: chunk.metadata,
  });
}
```

#### Optimization Opportunities 🔄

1. **Batch Embedding** (Mistral supporta fino a 100 testi per chiamata)
   ```typescript
   const embeddings = await this.mistralClient.embeddings.create({
     model: 'mistral-embed',
     inputs: chunks.map(c => c.text),  // Batch!
   });
   ```

2. **Smart Chunking** (rispettare strutture semantiche)
   - Split by paragraphs, not fixed chars
   - Preserve code blocks, lists, tables
   - Use NLP sentence boundaries

3. **Embedding Cache** (Redis)
   ```typescript
   const cacheKey = `embed:${hash(text)}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);

   const embedding = await generateEmbedding(text);
   await redis.set(cacheKey, JSON.stringify(embedding), 'EX', 86400);
   ```

### 3. Vector Search Implementation

#### Current Implementation ✅

**Database**: PostgreSQL with pgvector extension

**Schema**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  content TEXT NOT NULL,
  vector vector(1024),  -- Mistral embed dimension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index per performance (cosine distance)
CREATE INDEX embeddings_vector_idx ON embeddings
USING hnsw (vector vector_cosine_ops);

-- GIN index per metadata search
CREATE INDEX embeddings_metadata_idx ON embeddings USING GIN (metadata);
```

**Similarity Search Query**:
```typescript
async searchSimilarContent(
  tenantId: string,
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.7,
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {

  const vectorString = `[${queryEmbedding.join(',')}]`;

  const results = await this.prisma.$queryRaw`
    SELECT
      content,
      metadata,
      1 - (vector <=> ${vectorString}::vector) as similarity
    FROM embeddings
    WHERE tenant_id = ${tenantId}
    AND 1 - (vector <=> ${vectorString}::vector) > ${similarityThreshold}
    ORDER BY vector <=> ${vectorString}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

**Operator**: `<=>` (cosine distance)
- Range: 0 (identici) to 2 (opposti)
- Converted to similarity: `1 - distance` (0.0 to 1.0)

#### Advanced Search Patterns 🔄

1. **Hybrid Search** (Vector + Full-Text)
   ```sql
   SELECT *,
     1 - (vector <=> query_vector) as vector_similarity,
     ts_rank(to_tsvector('english', content), query) as text_rank,
     (0.7 * (1 - (vector <=> query_vector)) + 0.3 * ts_rank(...)) as combined_score
   FROM embeddings
   WHERE ...
   ORDER BY combined_score DESC
   ```

2. **Filtered Search** (Metadata constraints)
   ```sql
   WHERE tenant_id = $1
   AND metadata->>'emailId' IS NOT NULL
   AND (metadata->>'receivedAt')::timestamp > NOW() - INTERVAL '30 days'
   AND 1 - (vector <=> $2::vector) > 0.7
   ```

3. **Multi-Query Search** (Combine multiple queries)
   ```typescript
   const queries = ['urgent emails', 'project deadline', 'meeting notes'];
   const embeddings = await Promise.all(queries.map(q => generateEmbedding(q)));

   // Average embeddings
   const avgEmbedding = embeddings[0].map((_, i) =>
     embeddings.reduce((sum, emb) => sum + emb[i], 0) / embeddings.length
   );

   return searchSimilar(avgEmbedding);
   ```

### 4. Context Injection Strategy

#### Current Implementation ✅

**File**: `backend/src/modules/ai/services/mistral.service.ts:180-195`

```typescript
buildRagContext(similarContent: Array<{ content: string; similarity: number }>): string {
  if (!similarContent || similarContent.length === 0) {
    return '';
  }

  const contextParts = similarContent.map((item, idx) =>
    `[${idx + 1}] (Relevance: ${(item.similarity * 100).toFixed(1)}%)\n${item.content}`
  );

  return `\n\n[CONTEXT FROM KNOWLEDGE BASE]\n${contextParts.join('\n\n')}\n[END CONTEXT]\n`;
}
```

**Prompt Template**:
```
System: You are an AI assistant...

[CONTEXT FROM KNOWLEDGE BASE]
[1] (Relevance: 92.3%)
Subject: Project Alpha - Q4 Deadline
From: boss@company.com
...

[2] (Relevance: 87.1%)
Subject: Re: Meeting notes
From: team@company.com
...
[END CONTEXT]

User: What's the deadline for Project Alpha?