# Phase 5: RAG Pipeline -- Complete Technical Knowledge File

**Source Documents:**
- `05_RUNBOOKS/PHASE_05_RAG_PIPELINE.md` (runbook)
- `06_PLAYBOOKS/PHASE_05_PLAYBOOK.md` (playbook)
**Extraction Date:** 2026-03-10
**Status:** PENDING -- Embedding model decision required before execution

---

## 1. Objective and Shane's Directives

### Core Objective
Build a production RAG pipeline for Phoenix Echo Gateway that:
1. Retrieves authoritative answers from pricebook, job history, playbooks, and operational documents
2. Runs local-first -- nomic-embed-text for embeddings, local fleet for 90% of generation, Claude for complex/training queries only
3. Shows the user exactly which model answered -- routing transparency is mandatory
4. Uses Claude for development -- building the system, generating training data, establishing quality benchmarks
5. Runs local for production -- after the system is trained and validated, local fleet handles day-to-day RAG queries

### Shane's Directives (Verbatim)
- "IM GOOD WITH DEVELOPMENTAL USE TO CREATE THE TRAINING METHOD AND GENERATE THE SYSTEM. NOT LONG TERM THOUGH."
- "YES THIS IS A MUST" -- regarding UI model attribution transparency
- Approved development use of Claude to create training method and generate the system

### Shane's Translation
Claude builds the RAG system. Claude generates training examples. Claude validates quality. Then the local fleet takes over for production queries at zero per-query cost.

---

## 2. Architecture

### 2.1 System Components

| Component | Role | Host | Port |
|-----------|------|------|------|
| ChromaDB | Vector store (SQLite backend) | Mac Studio (127.0.0.1) | 8200 |
| nomic-embed-text | Embedding model (768d) | Mac Studio, Fleet A via Ollama | 11434 |
| echo-gptoss | Primary generation model | Mac Studio, Fleet B via Ollama | 11435 |
| qwen3:8b | Fallback generation model | Mac Studio, Fleet A via Ollama | 11434 |
| Claude Sonnet 4 | Escalation / development generation | Anthropic Cloud API | HTTPS |
| Gateway | RAG orchestration, API, UI | Mac Studio | 18790 |

### 2.2 Data Flow (Complete Pipeline)

```
User Query (~5ms: query expansion)
    |
    v
Embedding via nomic-embed-text (~50ms, 768 dimensions, local, $0.00)
    |
    v
Vector Search in ChromaDB (~80ms, 4 collections, top 10 candidates)
    |
    v
Time Decay (~1ms, adjusts scores based on document freshness)
    |
    v
Re-Ranking (~10ms, keyword boost + category alignment + exact phrase match)
    |
    v
Model Selection (~1ms, production=local, development=Claude, low-confidence=Claude)
    |
    v
Generation (~1,200ms local / ~2,000ms Claude)
    |
    v
Response with Full Attribution (model name, provider, cost, sources, timing)
```

**Total latency:** ~1.3 seconds (local), ~2.5 seconds (Claude escalation)

### 2.3 Architecture Decision Records

#### ADR-001: Embedding Model Selection
- **Status:** PENDING SHANE'S DECISION
- **Recommended:** Option A -- nomic-embed-text (local, 768d, free, already warm in Fleet A)
- **Alternative:** OpenAI text-embedding-3-small (cloud, 512d, $0.02/1M tokens)
- **Critical:** These are incompatible -- vector store dimension is locked at index creation (768 vs 512)
- **Rationale for local:** Aligns with 90% local mandate, zero cost, data never leaves network, offline capable, 768d > 512d richer representation
- **Trade-off:** nomic benchmark scores ~3-5% lower than OpenAI on generic tasks; re-ranking compensates

#### ADR-002: RAG Generation Model Strategy
- **Status:** DECIDED BY SHANE
- Development Phase (Weeks 1-4): All queries to Claude (~$0.015/query)
- Production Phase (Month 2+): Local fleet (GPT-OSS/qwen3), Claude for escalation only (~10% of traffic)

#### ADR-003: Vector Store Selection
- **Status:** DECIDED -- ChromaDB
- **Rejected:** Pinecone (cloud, $30/mo, data leaves network), Qdrant (heavier), Weaviate (heavy, 500MB+), pgvector (overkill)
- **Rationale:** Smallest footprint, SQLite backend, JavaScript client (`chromadb` npm), metadata filtering, 768d native support, handles 100K+ vectors

---

## 3. Technology Stack

### 3.1 Languages and Runtime
- **Runtime:** Node.js 22.x LTS (path: `/opt/homebrew/bin/node`)
- **Module system:** ES modules (import/export)
- **Language:** JavaScript

### 3.2 Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| `chromadb` | ChromaDB JavaScript client | `npm install chromadb` |
| `chromadb-default-embed` | ChromaDB embedded mode (optional) | `npm install chromadb-default-embed` |

### 3.3 Python Dependencies (for ChromaDB server)

```bash
pip3 install chromadb
```

### 3.4 External Services
- **Ollama API** (Fleet A, port 11434): nomic-embed-text, qwen3:8b
- **Ollama API** (Fleet B, port 11435): echo-gptoss
- **Anthropic Claude API** (cloud): `https://api.anthropic.com/v1/messages`
- **Service Fusion MCP**: Pricebook data, job history (real-time via SF polling)

---

## 4. Vector Store Setup (ChromaDB)

### 4.1 Installation

```bash
# Option A: Python service (recommended -- runs independently of Gateway)
pip3 install chromadb
chroma run --host 127.0.0.1 --port 8200 --path /opt/phoenix-echo/chromadb-data

# Option B: Embedded in Gateway (lighter, couples lifecycle)
cd /opt/phoenix-echo-gateway
npm install chromadb chromadb-default-embed
```

### 4.2 Collections

Four collections, one per document type:

```javascript
import { ChromaClient } from 'chromadb';

const chroma = new ChromaClient({ path: 'http://127.0.0.1:8200' });

const collections = {
  pricebook: await chroma.getOrCreateCollection({
    name: 'phoenix_pricebook',
    metadata: {
      'hnsw:space': 'cosine',
      'hnsw:construction_ef': 200,
      'hnsw:search_ef': 100
    }
  }),
  jobHistory: await chroma.getOrCreateCollection({
    name: 'phoenix_job_history',
    metadata: { 'hnsw:space': 'cosine' }
  }),
  playbooks: await chroma.getOrCreateCollection({
    name: 'phoenix_playbooks',
    metadata: { 'hnsw:space': 'cosine' }
  }),
  operational: await chroma.getOrCreateCollection({
    name: 'phoenix_operational',
    metadata: { 'hnsw:space': 'cosine' }
  })
};
```

### 4.3 HNSW Configuration
- **Distance metric:** cosine similarity
- **construction_ef:** 200 (higher = better index quality)
- **search_ef:** 100 (higher = better search quality)

### 4.4 ChromaDB LaunchAgent (macOS)

File: `~/Library/LaunchAgents/com.phoenix.chromadb.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phoenix.chromadb</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>-m</string>
        <string>chromadb.cli</string>
        <string>run</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>8200</string>
        <string>--path</string>
        <string>/opt/phoenix-echo/chromadb-data</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/chromadb.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/chromadb.err</string>
</dict>
</plist>
```

### 4.5 ChromaDB Verification

```bash
# Heartbeat
curl http://127.0.0.1:8200/api/v1/heartbeat
# Expected: {"nanosecond heartbeat": <timestamp>}

# Collections list
curl http://127.0.0.1:8200/api/v1/collections
# Expected: JSON array with 4 collections
```

### 4.6 Data Path
- **Persistence path:** `/opt/phoenix-echo/chromadb-data`
- **Backup path:** `/opt/phoenix-echo/chromadb-data.backup.YYYYMMDD`

---

## 5. Chunking Pipeline

### 5.1 Chunking Configuration

```javascript
const CHUNK_CONFIG = {
  pricebook: {
    targetTokens: 300,     // 200-400 range
    maxTokens: 500,
    overlapTokens: 50,     // ~15% overlap
    splitBy: 'service',    // One service per chunk when possible
    metadata: ['serviceId', 'category', 'subcategory', 'price', 'updatedAt']
  },
  jobHistory: {
    targetTokens: 400,     // 300-500 range
    maxTokens: 600,
    overlapTokens: 75,     // ~20% overlap -- more context for temporal data
    splitBy: 'customerMonth',
    metadata: ['customerId', 'customerName', 'jobId', 'month', 'status', 'amount']
  },
  playbooks: {
    targetTokens: 250,     // 200-300 range
    maxTokens: 400,
    overlapTokens: 40,     // ~15% overlap
    splitBy: 'topic',
    metadata: ['topic', 'category', 'safetyLevel', 'updatedAt']
  },
  operational: {
    targetTokens: 300,
    maxTokens: 500,
    overlapTokens: 50,
    splitBy: 'section',
    metadata: ['docName', 'section', 'updatedAt']
  }
};
```

### 5.2 Overlap Strategy
- Overlap is mandatory (adversarial review m-10 flagged lack of overlap in research bible)
- Overlap prevents context loss at chunk boundaries
- Paragraph-boundary splitting with word-level overlap buffer

### 5.3 Token Estimation
- Uses `cl100k_base` approximation: ~4 chars per token
- Known limitation (m-7): Should use proper tokenizer for production
- TODO: Replace with tiktoken or Ollama tokenize endpoint

```javascript
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
```

### 5.4 Pricebook Chunking Strategy
Each service becomes a self-contained text block with fields:
- Service name and ID
- Category and subcategory
- Description
- Base price
- Labor hours
- Multipliers (JSON)
- Prerequisites (list)
- Materials (list)
- Related services (list)
- Notes

If a service text exceeds maxTokens (500), it is split with overlap.

### 5.5 Expected Chunk Counts

| Source | Raw Items | Est. Chunks | Avg Tokens/Chunk | Total Tokens |
|--------|-----------|-------------|-------------------|--------------|
| Pricebook | 1,047-1,769 services | 1,200-2,000 | ~300 | ~450K |
| Job History | ~5,000 jobs/year | 1,000-2,000 | ~400 | ~600K |
| Playbooks | ~50 topics | 100-200 | ~250 | ~40K |
| Operational | ~30 documents | 200-400 | ~300 | ~100K |
| **Total** | | **2,500-4,600** | | **~1.2M** |

---

## 6. Embedding Generation

### 6.1 Embedding Model

| Property | Value |
|----------|-------|
| Model | nomic-embed-text |
| Dimensions | 768 |
| Host | Fleet A, Ollama, `http://127.0.0.1:11434` |
| API endpoint | `POST /api/embed` |
| Cost | $0.00 per query (local) |
| Latency | ~50ms per embedding |
| Batch support | Yes (Ollama accepts array input) |

### 6.2 Embedding API

```javascript
// Single embedding
const response = await fetch('http://127.0.0.1:11434/api/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nomic-embed-text',
    input: text
  })
});
const data = await response.json();
const vector = data.embeddings[0]; // 768-dimensional

// Batch embedding
const response = await fetch('http://127.0.0.1:11434/api/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nomic-embed-text',
    input: textsArray  // Ollama accepts array
  })
});
const data = await response.json();
const vectors = data.embeddings; // Array of 768-dimensional vectors
```

### 6.3 Embedding Cache (Bounded LRU)

- **Max cache size:** 10,000 entries (~30MB at 768d float32)
- **Key:** SHA-256 hash of input text (first 16 hex chars)
- **Eviction:** LRU (oldest access evicted when at capacity)
- **Memory formula:** `cache.size * 768 * 4 / 1024 / 1024` MB
- Adversarial review (m-8) flagged unbounded cache -- this is the fix

### 6.4 Indexing Pipeline

- **Batch size:** 50 (Ollama batch limit)
- **Progress logging:** Every 200 chunks
- **Re-indexing:** Single service can be deleted and re-indexed via `reindexService()`

### 6.5 Initial Index Timing

| Corpus | Chunks | Embed Time | Index Time | Total |
|--------|--------|------------|------------|-------|
| Pricebook | ~1,500 | ~45 sec | ~5 sec | ~50 sec |
| Job History | ~1,500 | ~45 sec | ~5 sec | ~50 sec |
| Playbooks | ~150 | ~5 sec | ~1 sec | ~6 sec |
| Operational | ~300 | ~10 sec | ~2 sec | ~12 sec |
| **Total** | **~3,450** | | | **~2 min** |

---

## 7. Retrieval Engine

### 7.1 Query Expansion
Expands user queries with session context:
- Customer name and type (if known)
- Active job ID and description
- Recent conversation context (last 2 messages)

### 7.2 Multi-Collection Retrieval
- Searches all 4 collections in parallel (`Promise.all`)
- Default topK: 10 candidates
- Supports metadata filtering by category, customerId
- Results sorted by similarity score (1 - cosine distance)

### 7.3 Similarity Scoring
- ChromaDB returns `distances` (lower = more similar)
- Converted to `score = 1 - distance` (higher = more similar)

---

## 8. Re-Ranking

### 8.1 Two-Stage Re-Ranking (Current)

**Stage 1a: Keyword Presence Boost**
- Up to 15% boost based on proportion of query terms found in document

**Stage 1b: Exact Phrase Boost**
- 10% boost if the full query string appears in the document

**Stage 1c: Category Alignment Boost**
- 5% boost if query terms match document metadata category

### 8.2 Neural Cross-Encoder (Future Phase 2 Upgrade)
- Model: `cross-encoder/ms-marco-MiniLM-L-6-v2` via `@xenova/transformers`
- Quantized: 4-bit, ~25MB
- Memory impact: ~50MB additional
- Latency impact: ~100ms per query (scores 10 docs)
- Quality impact: 15-25% improvement in precision@5

---

## 9. Time Decay and Freshness

### 9.1 Decay Rules by Collection

| Collection | Full Relevance Window | Decay Period | Minimum Weight |
|-----------|----------------------|-------------|----------------|
| pricebook | 7 days (168 hours) | Decays to 0.5 at 30 days | 0.5 |
| jobHistory | 0 (immediate decay) | Decays to 0.3 at 90 days | 0.3 |
| playbooks | 0 (immediate decay) | Decays to 0.7 at 1 year | 0.7 |
| operational | 0 (immediate decay) | Decays to 0.5 at 6 months | 0.5 |

### 9.2 Re-Indexing Schedule

| Source | Trigger | Frequency | Method |
|--------|---------|-----------|--------|
| Pricebook | SF polling detects change | Real-time (30s polling) | `reindexService()` for changed service |
| Pricebook | Full refresh | Weekly (Sunday 2 AM, cron `0 2 * * 0`) | Full `indexPricebook()` |
| Job History | New job closed in SF | Real-time | Chunk + index new job |
| Job History | Full refresh | Weekly (Sunday 3 AM, cron `0 3 * * 0`) | Re-index last 90 days |
| Playbooks | Manual edit | On-save | Re-chunk + re-index |
| Operational | Manual edit | On-save | Re-chunk + re-index |
| Backup | Automated | Weekly (Sunday 4 AM, cron `0 4 * * 0`) | Snapshot ChromaDB data dir |

---

## 10. Semantic Caching

### 10.1 Configuration

| Parameter | Value |
|-----------|-------|
| Collection name | `phoenix_query_cache` |
| Similarity threshold | 0.95 (must be very similar) |
| TTL | 24 hours |
| Expected hit rate | 40-50% after warm-up |

### 10.2 How It Works
1. User query is embedded
2. Embedding is searched against `phoenix_query_cache` collection (top 1)
3. If similarity score >= 0.95 AND age < 24 hours: return cached answer
4. Otherwise: run full RAG pipeline, then cache the result

### 10.3 Cache Storage
Each cached entry stores:
- Query embedding (768d vector)
- Answer text (as document)
- Model metadata (JSON string)
- Sources metadata (JSON string)
- Original query text
- Cache timestamp

---

## 11. Generation and Model Selection

### 11.1 Model Selection Logic

```
if (forceModel specified) -> use forced model
if (mode == 'development') -> use Claude
if (topRerankedScore < 0.6) -> use Claude (weak retrieval)
if (query matches complexity signals) -> use Claude
    - compare|versus|vs.
    - analyze|analysis|calculate
    - what.*if|scenario
    - multiple question marks
else -> use local fleet
```

### 11.2 Local Generation Models (ordered by preference)

| Model | Port | Fleet | Role |
|-------|------|-------|------|
| echo-gptoss | 11435 | B | Primary generation (better reasoning) |
| qwen3:8b | 11434 | A | Fallback (faster) |

### 11.3 Cloud Generation

| Model | API | Header Required |
|-------|-----|-----------------|
| claude-sonnet-4-20250514 | `https://api.anthropic.com/v1/messages` | `anthropic-beta: oauth-2025-04-20` (MANDATORY) |

### 11.4 Generation Parameters
- **Temperature:** 0.3 (factual, low creativity)
- **Max tokens:** 1024
- **Local timeout:** 45 seconds (AbortSignal.timeout)
- **Fallback:** If all local models fail, auto-escalate to Claude

### 11.5 RAG System Prompt

```
You are Echo, Phoenix Electric's AI assistant. You answer questions for technicians, office staff, and customers about electrical services, pricing, scheduling, and operations.

RULES:
1. Ground your answers ONLY in the provided context documents. Do not make up information.
2. If the answer is not in the documents, say "I don't have that information in my current records."
3. Include service IDs, pricing, and prerequisites when relevant.
4. For pricing: always mention applicable multipliers (emergency 2.0x, commercial 1.3x).
5. For safety-critical topics (electrical work, gas), include safety warnings.
6. Be concise. Technicians in the field need quick answers.
7. Phoenix Electric is an ELECTRICAL company. Not HVAC. Never get this wrong.
```

---

## 12. UI Transparency Layer

### 12.1 Requirements (Shane's Mandate: "YES THIS IS A MUST")

Every RAG response must display:
1. Which model generated the answer (name, fleet, provider)
2. Why that model was chosen (production routing, escalation, development mode)
3. Cost per query ($0.00 for local, ~$0.015 for Claude)
4. Sources used (documents, relevance scores)
5. Timing breakdown (retrieve + re-rank + generate = total)

### 12.2 Response Schema (WebSocket to Chat Panel)

```javascript
{
  type: 'rag_response',
  data: {
    answer: "...",
    model: {
      name: "echo-gptoss (Fleet B)",
      provider: "Local Fleet (Studio)",
      icon: "local",     // or "cloud" for Claude
      reason: "Production mode -- local generation",
      costEstimate: "$0.00"
    },
    sources: [
      {
        id: "pb-ELEC-042",
        collection: "pricebook",
        relevanceScore: 0.91,
        metadata: { serviceId: "ELEC-042", category: "Panel Upgrades", price: 4200, updatedAt: "..." }
      }
    ],
    timing: {
      retrieveMs: 85,
      rerankMs: 12,
      generateMs: 1340,
      totalMs: 1437
    }
  }
}
```

### 12.3 Dashboard RAG Health Panel
Displays on Fleet Management page:
- ChromaDB status (HEALTHY/DOWN) and endpoint
- Embedder status (WARM/DOWN) and model
- Collection count and total chunks
- Embedding cache usage (entries/max, memory estimate)
- Query cache entries and hit rate
- Today's stats: total queries, local %, Claude %, cache hits %
- Average latency breakdown
- Estimated cost today
- Per-collection chunk counts and last-updated timestamps
- Controls: [Re-index All], [Flush Cache], [Toggle Dev Mode]

---

## 13. Configuration Reference

### 13.1 Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `RAG_ENABLED` | `true` / `false` | Master toggle for RAG pipeline |
| `RAG_MODE` | `production` / `development` | Controls model routing |
| `ANTHROPIC_AUTH_TOKEN` | (from Key Vault) | Claude API auth |

### 13.2 RAG Config Object

```javascript
export const RAG_CONFIG = {
  chromadb: {
    host: '127.0.0.1',
    port: 8200,
    dataPath: '/opt/phoenix-echo/chromadb-data'
  },
  embedding: {
    model: 'nomic-embed-text',
    dimensions: 768,
    ollamaHost: 'http://127.0.0.1:11434'
  },
  retrieval: {
    topK: 10,
    rerankTopK: 5,
    similarityThreshold: 0.4
  },
  cache: {
    embeddingMaxSize: 10000,
    semanticThreshold: 0.95,
    semanticTTLHours: 24
  },
  generation: {
    mode: 'production',
    localModels: [
      { name: 'echo-gptoss', port: 11435, fleet: 'B' },
      { name: 'qwen3:8b', port: 11434, fleet: 'A' }
    ],
    claudeModel: 'claude-sonnet-4-20250514',
    escalationThreshold: 0.6,
    maxTokens: 1024,
    temperature: 0.3
  },
  decay: {
    pricebook: { fullDays: 7, halfLifeDays: 30, minWeight: 0.5 },
    jobHistory: { fullDays: 0, halfLifeDays: 90, minWeight: 0.3 },
    playbooks: { fullDays: 0, halfLifeDays: 365, minWeight: 0.7 },
    operational: { fullDays: 0, halfLifeDays: 180, minWeight: 0.5 }
  },
  reindex: {
    pricebookFull: '0 2 * * 0',
    jobHistoryFull: '0 3 * * 0',
    backupSchedule: '0 4 * * 0'
  }
};
```

---

## 14. Memory Budget

### 14.1 RAG Pipeline Memory Footprint

| Component | RAM | Notes |
|-----------|-----|-------|
| ChromaDB process | 100-200 MB | SQLite backend, grows with vectors |
| ChromaDB data (3,450 vectors x 768d) | ~30 MB | In-memory HNSW index |
| Embedding cache (10,000 entries) | ~30 MB | Bounded LRU |
| Query cache collection | ~10 MB | ~1,000 cached query-answer pairs |
| Re-ranker (keyword-based) | ~5 MB | No model loaded |
| Re-ranker (neural, future) | ~50 MB | ms-marco-MiniLM quantized |
| RAG pipeline code | ~20 MB | Node.js modules |
| **Total RAG footprint** | **~200-350 MB** | |

### 14.2 Gateway Memory Impact

```
Current Gateway budget:  2 GB
Gateway core:            ~800 MB (Node.js, Express, WebSocket, pages)
RAG pipeline:            ~350 MB (ChromaDB + cache + pipeline)
Remaining:               ~850 MB (other features, headroom)
```

Recommendation: Run ChromaDB as a separate LaunchAgent process on Studio.

### 14.3 Studio Total Memory

```
macOS + Kernel:          15 GB
Gateway process:          2 GB
ChromaDB process:       0.3 GB
Ollama Fleet A:         ~29 GB (5 models, parallel=4, KV=f16)
Ollama Fleet B:         ~18 GB (GPT-OSS warm, parallel=2, KV=q8_0)
Total:                  ~64.3 GB (of 96 GB)
Headroom:               ~31.7 GB
```

---

## 15. Cost Analysis

### 15.1 Per-Query Cost

| Phase | Embedding | Search | Re-rank | Generate | Total |
|-------|-----------|--------|---------|----------|-------|
| Development (Claude) | $0.000 | $0.000 | $0.000 | ~$0.008 | **~$0.008** |
| Production (local) | $0.000 | $0.000 | $0.000 | $0.000 | **$0.000** |
| Production (Claude escalation) | $0.000 | $0.000 | $0.000 | ~$0.008 | **~$0.008** |
| Cache hit | $0.000 | $0.000 | $0.000 | $0.000 | **$0.000** |

### 15.2 Monthly Cost Projections

| Phase | Queries/Day | Local % | Claude % | Monthly Cost |
|-------|-------------|---------|----------|-------------|
| Development (Month 1) | ~50 | 0% | 100% | ~$12 |
| Transition (Month 2) | ~100 | 50% | 50% | ~$12 |
| Production (Month 3+) | ~200 | 90% | 10% | ~$5 |

### 15.3 Annual Savings vs All-Cloud

| Approach | Monthly | Annual |
|----------|---------|--------|
| All-Claude RAG | $150/mo | $1,800/yr |
| All-OpenAI embeddings + Pinecone + Claude | $180/mo | $2,160/yr |
| **Local-first + Claude escalation** | **$5/mo** | **$60/yr** |
| **Savings** | **$145-175/mo** | **$1,740-2,100/yr** |

---

## 16. Prerequisites and Hard Gates

### Hard Gates (Must pass before any RAG work)

| Gate | Description | Depends On |
|------|-------------|------------|
| HG-1 | Embedding model decision from Shane | Q1 in Build Review |
| HG-2 | Twin Peaks Fleet A running on Studio | Phase 2 |
| HG-3 | nomic-embed-text warm and responding on port 11434 | Phase 2 |
| HG-4 | Gateway running on Studio (port 18790) | Phase 1 |
| HG-5 | Service Fusion MCP tools operational | Phase 3 |

### Soft Prerequisites (Can proceed in parallel)

| Prereq | Description |
|--------|-------------|
| SP-1 | Pricebook data available (1,047-1,769 services) via SF MCP |
| SP-2 | Job history accessible via SF MCP |
| SP-3 | ChromaDB installed on Studio |
| SP-4 | Node.js 22 on Studio (`/opt/homebrew/bin/node`) |
| SP-5 | Gateway memory allocation confirmed (2GB may be insufficient) |

### Dependencies on Other Phases

```
Phase 1 (Gateway UI) --> RAG results displayed in chat panel
Phase 2 (Twin Peaks) --> nomic-embed-text, local generation models
Phase 3 (SF Integration) --> Pricebook data, job history for chunking
Phase 4 (M365) --> Email/calendar context for query expansion
```

---

## 17. Testing Requirements

### 17.1 Unit Tests

```bash
# ChromaDB connectivity
curl http://127.0.0.1:8200/api/v1/heartbeat

# Embedding model responds (768 dimensions)
curl -X POST http://127.0.0.1:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "input": "test embedding"}'

# Collection CRUD
node -e "import('chromadb').then(async ({ChromaClient}) => {
  const c = new ChromaClient({path:'http://127.0.0.1:8200'});
  const col = await c.getOrCreateCollection({name:'test'});
  console.log('Collection:', col.name);
  await c.deleteCollection({name:'test'});
  console.log('PASS');
});"
```

### 17.2 Integration Tests

| Test | Input | Pass Criteria |
|------|-------|---------------|
| IT-1: Pricebook query | "How much is a 200A panel upgrade?" | Correct service ID, price within 10% |
| IT-2: Customer query | "What jobs did ABC Plumbing have last month?" | All jobs present, amounts match SF |
| IT-3: Playbook query | "Troubleshooting: no heat from furnace" | Safety warnings, correct order |
| IT-4: No-match query | "What is the meaning of life?" | "I don't have that information" -- no hallucination |
| IT-5: Model attribution | Any query | Model name, provider, cost present |
| IT-6: Source transparency | Any query | At least 1 source with relevance score |
| IT-7: Semantic cache | Same query twice within 24h | Second response has `cached: true` |
| IT-8: Time decay | Old vs new job query | Recent job scores higher |
| IT-9: Claude escalation | Complex analysis query | Claude model attributed |
| IT-10: Offline resilience | Query with no internet | Local model responds |

### 17.3 Performance Benchmarks

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Total query latency | <1.5s | <3s | >5s |
| Retrieval time | <100ms | <200ms | >500ms |
| Re-rank time | <20ms | <50ms | >100ms |
| Generation time (local) | <2s | <5s | >10s |
| Generation time (Claude) | <3s | <5s | >10s |
| Embedding time | <50ms | <100ms | >200ms |
| Memory (ChromaDB) | <200MB | <500MB | >1GB |
| Precision@5 | >0.8 | >0.6 | <0.4 |

### 17.4 Quality Evaluation Protocol
1. Prepare 50 test queries spanning all document types
2. Run each through RAG pipeline
3. Have Claude score on: Groundedness (0-1), Completeness (0-1), Accuracy (0-1), Safety (0-1)
4. Average scores must exceed 0.75 on all dimensions before production deployment

---

## 18. Deployment and Mode Switching

### Development Mode (Month 1)
- ALL queries go through Claude
- Purpose: Establish quality baseline, generate training examples, identify weak spots, warm cache
- Cost: ~$12/month (50 queries/day)
- Shane approved: "IM GOOD WITH DEVELOPMENTAL USE TO CREATE THE TRAINING METHOD AND GENERATE THE SYSTEM."

### Production Mode (Month 2+)
Switch when:
- Local model answers match Claude quality on >90% of test queries
- Semantic cache hit rate exceeds 30%
- All 4 collections indexed and fresh

### Switching Modes

```bash
# Via Gateway Dashboard
Gateway Dashboard > RAG Health Panel > [Toggle Dev Mode]

# Via environment variable
RAG_MODE=production    # Local-first (default after Month 1)
RAG_MODE=development   # All-Claude (for training and benchmarking)
```

---

## 19. Rollback Plan

### 19.1 Rollback Triggers

| Trigger | Severity | Action |
|---------|----------|--------|
| ChromaDB corrupted | HIGH | Restore from backup, re-index from source |
| Embedding model returns garbage | HIGH | Switch to cached-only mode, restart Fleet A |
| Generation quality drops | MEDIUM | Force all queries to Claude |
| Memory exceeded (OOM) | HIGH | Kill ChromaDB, reduce cache size, restart |
| Latency exceeds 10s | MEDIUM | Bypass re-ranking, reduce topK to 3 |

### 19.2 Rollback Procedure

```bash
# Disable RAG
export RAG_ENABLED=false
systemctl restart phoenix-echo  # or launchctl on macOS

# Backup ChromaDB data
cp -r /opt/phoenix-echo/chromadb-data /opt/phoenix-echo/chromadb-data.backup.$(date +%Y%m%d)

# Re-index from scratch
node rag/scripts/full-reindex.js

# Re-enable RAG
export RAG_ENABLED=true
systemctl restart phoenix-echo
```

### 19.3 Data Safety
- ChromaDB data is regenerable from SF MCP and local documents
- If ChromaDB is down, Gateway still functions -- queries go directly to LLM
- Weekly snapshot backups (~50MB)

---

## 20. Graceful Degradation

### ChromaDB Goes Down
- Retrieval fails, Gateway catches error
- Query sent directly to LLM without context
- Chat shows: "RAG unavailable -- answering without document context"

### Fleet A Goes Down (No Embeddings)
- Embedding fails, RAG pipeline skipped entirely
- Query goes to Fleet B or Claude directly
- Chat shows: "Embeddings unavailable"

### Internet Goes Down (No Claude Escalation)
- Local retrieval works (ChromaDB + nomic are local)
- Local generation works (GPT-OSS/qwen3 are local)
- 100% of queries handled locally
- Chat shows: "Offline mode -- all answers from local fleet"

---

## 21. File Inventory

| File | Purpose | Location |
|------|---------|----------|
| `rag/vector-store.js` | ChromaDB connection + collections | Gateway |
| `rag/chunker.js` | Chunking with overlap | Gateway |
| `rag/embedder.js` | nomic-embed-text via Ollama API | Gateway |
| `rag/embed-cache.js` | Bounded LRU embedding cache | Gateway |
| `rag/retriever.js` | Multi-collection retrieval | Gateway |
| `rag/query-rewriter.js` | Query expansion with context | Gateway |
| `rag/reranker.js` | Keyword + heuristic re-ranking | Gateway |
| `rag/time-decay.js` | Source-specific time decay | Gateway |
| `rag/pipeline.js` | Complete RAG orchestration | Gateway |
| `rag/semantic-cache.js` | Semantic query cache | Gateway |
| `rag/config.js` | All RAG configuration in one place | Gateway |
| `rag/indexer.js` | Full and incremental indexing | Gateway |
| `rag/scripts/full-reindex.js` | Full re-indexing script | Gateway |
| `com.phoenix.chromadb.plist` | LaunchAgent for ChromaDB | `~/Library/LaunchAgents/` |

---

## 22. Gauntlet Checklist (45 checks)

### Architecture (G-001 to G-005)
- Embedding model confirmed by Shane
- ChromaDB running as independent LaunchAgent
- nomic-embed-text warm on Fleet A port 11434
- Vector dimensions consistent (768d) across all collections
- ChromaDB data persisted to disk

### Chunking (G-006 to G-010)
- Pricebook chunked with 50-token overlap
- Job history chunked by customer + month
- No chunk exceeds 500 tokens
- All chunks have complete metadata
- Chunk count in expected range (2,500-4,600)

### Retrieval (G-011 to G-015)
- Query expansion includes customer context
- Multi-collection search across all collections
- Metadata filtering works
- Embedding cache bounded (LRU, max 10,000)
- Retrieval latency <200ms at p95

### Re-Ranking (G-016 to G-019)
- Re-ranking changes order when appropriate
- Keyword boost prioritizes exact matches
- Time decay penalizes stale documents
- Re-ranking <50ms at p95

### Generation (G-020 to G-025)
- Local fleet generates in production mode
- Claude generates in development mode
- Auto-escalation when confidence low
- System prompt prevents hallucination
- "I don't have that information" for out-of-scope
- System prompt enforces "ELECTRICAL company"

### UI Transparency (G-026 to G-031) -- MANDATORY
- Every response shows model name and provider
- Every response shows local vs cloud icon
- Every response shows estimated cost
- Sources expandable with relevance scores
- Timing breakdown visible
- Dashboard RAG health panel with live stats

### Security (G-032 to G-036)
- Customer data never leaves Tailscale mesh
- Pricebook data never sent to external APIs for embedding
- Claude escalation sends only minimal context
- Embedding cache not externally accessible
- ChromaDB bound to 127.0.0.1

### Performance (G-037 to G-041)
- Full re-index <5 minutes
- Query-to-answer <3s at p95
- ChromaDB memory <500MB
- Gateway total memory <2GB
- Semantic cache hit rate >30% after 1 week

### Resilience (G-042 to G-045)
- Graceful degradation: ChromaDB down
- Graceful degradation: Fleet A down
- Graceful degradation: Internet down
- Rollback to no-RAG <1 minute

---

## 23. Open Questions for Shane

| Question | Recommendation | Status |
|----------|---------------|--------|
| Q1: Embedding model (BLOCKING) | nomic-embed-text (local, free, 768d, already warm) | PENDING |
| Q2: When to switch dev to production mode? | After 30 days, once local quality validated | PENDING |
| Q3: Gateway memory budget | RAG adds ~350MB; run ChromaDB separately; 2GB target OK | PENDING |

---

*Knowledge file compiled from Phase 5 Runbook and Playbook.*
*All code blocks, configurations, and specifications extracted verbatim from source documents.*
*For use by Claude, Llama, and local AI models as authoritative reference.*
