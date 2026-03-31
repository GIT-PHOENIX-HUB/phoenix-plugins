# Phoenix Echo Gateway -- Research Bible Knowledge Extract

**Extracted:** 2026-03-10
**Source:** 17 research bible files, 8 adversarial review files, crucible review
**Scope:** Complete research findings for Phoenix Echo Gateway implementation
**Total Source Material:** 380+ KB across 10 major research reports, 7 agent reviews, 148 action items

---

## 1. SYSTEM OVERVIEW

Phoenix Echo Gateway is a production-grade, sovereign AI orchestration system serving Phoenix Electric, an electrical contracting company operated by Shane Warehime. The research campaign (March 4-9, 2026) produced a 30-step build plan for transforming the Gateway from a 10-phase proof-of-concept into production.

**The North Star Principle:** "Chat is infrastructure, not a page." The current Gateway's biggest flaw is "either you're in chat or you're not." The new design eliminates that completely.

---

## 2. ARCHITECTURE

### 2.1 Hub-and-Spoke Gateway Model (Validated)

The existing architecture (single control plane, multi-channel adapters, MCP tool integration) matches the pattern proven at scale by OpenClaw (290K+ stars). The architecture is sound. The gaps are operational, not structural.

- Gateway runs on port 18790 with OAuth auth
- All MCP clients connect through the gateway
- Phoenix's OAuth is superior to OpenClaw's token/password model
- Centralizes authentication, logging, and access control
- Enables hot-reload configuration without restarting agents

### 2.2 Twelve Architecture Patterns Worth Adopting

1. **Hub-and-spoke gateway** -- Single control plane managing all channels, agents, routing
2. **Workspace file system** -- Markdown files on disk (ECHO.md, LEDGER.md, MEMORY.md) as source of truth for agent identity
3. **Skill format (SKILL.md)** -- Markdown instructions with YAML frontmatter, not code
4. **Session-based security tiers** -- Different execution contexts get different permission levels (main/dm/group)
5. **Memory architecture: dual-layer with vector search** -- Daily logs + long-term curated facts, hybrid vector+BM25 search, temporal decay (30-day half-life)
6. **Channel adapter standardization** -- Each messaging platform implements a standardized interface (authenticate, parseMessage, checkAllowlist, formatResponse, send)
7. **Tool policy layering** -- Permission cascades: global -> provider -> agent -> group -> sandbox; profiles: minimal/coding/messaging/full
8. **Compaction with memory flush** -- Before context compaction, fire silent agentic turn to extract durable facts to MEMORY.md
9. **Config-driven behavior (JSON5 + Zod)** -- Behavior via config file, not code changes; hot reload on SIGHUP
10. **Event-driven WebSocket protocol** -- Three frame types: Request, Response, Event; idempotency keys for safe retry
11. **Pre-compaction memory flush** -- Model decides what to keep (better than heuristics), silent execution
12. **Cost footer on every response** -- Transparent cost visibility per request

### 2.3 Eight Anti-Patterns to Avoid

1. Codebase size explosion (OpenClaw: 430K+ lines) -- Phoenix target: 10,000 LOC
2. Plugin complexity (40+ extensions) -- Use MCP servers instead
3. Config schema explosion (100+ type files) -- Start minimal, add as needed
4. Multi-agent routing complexity for single-user -- Single Echo + sub-agents
5. Docker sandboxing dependency -- Use Tailscale-secured containers when needed
6. Public skill registry (ClawHavoc: 341 malicious skills) -- Curated internally only
7. Cargo cult dependency -- Only adopt patterns that serve Echo's mission
8. Premature plugin infrastructure -- YAGNI violation

### 2.4 Echo Identity System (Phoenix's Advancement Over OpenClaw)

- ECHO.md: Identity + system knowledge + current state
- HANDOFF.md: Architecture decisions and foundation facts
- LEDGER.md: Timestamped session log (survival proof)
- PRO_BUFFER.md: Handoff notes for next Echo instance
- Covenant model more advanced than OpenClaw's basic SOUL.md

### 2.5 Competitive Variant Landscape

**Tier 1 (Most Relevant):**
- NanoClaw: Container-per-agent isolation, agent swarms, 500 lines
- IronClaw: Rust/WASM, boundary injection (credentials NEVER in LLM context), leak detection
- ClawWork: Economic agent benchmark, per-request cost tracking, survival tiers
- tenacitOS: Mission Control dashboard, auto-discovery, cost analytics, 3D office

**Tier 2 (Emerging):**
- ZeroClaw: Edge deployment, 3.4MB binary, trait-based swappable architecture
- TinyClaw: Multi-agent teams, chained + fan-out delegation patterns
- ClawSec: Identity file drift detection

**Key patterns to steal:**
- Per-request cost tracking with footer (ClawWork) -- IMMEDIATE
- Identity drift detection (ClawSec) -- IMMEDIATE
- Credential boundary injection (IronClaw) -- IMMEDIATE
- Container-per-agent isolation (NanoClaw) -- NEXT PHASE
- Cost analytics dashboard (tenacitOS) -- NEXT PHASE
- Chained + fan-out delegation (TinyClaw) -- NEXT PHASE

### 2.6 Security Architecture

- OAuth 2.0 with PKCE for frontend auth (no secret exposure)
- 3-tier memory system + JWT session management
- Sandbox isolation for agent code execution (Phase 8)
- RBAC with tool-level permissions
- Multi-device persistence via Tailscale (5 devices on taild2e21b.ts.net)
- Azure Key Vault for all secrets (no secrets in code)
- Boundary injection pattern: credentials injected at HTTP boundary, never in LLM context
- Leak detection: 22 regex patterns with Aho-Corasick scanning all requests/responses

**Security Events/Lessons:**
- CVE-2026-25253 (CVSS 8.8): Cross-site WebSocket hijacking leading to RCE
- ClawHavoc: 341 malicious skills compromised 9,000+ installations
- 42,000 exposed instances: 93% had critical auth bypass
- ToxicSkills (Snyk): 36% of skills had prompt injection

---

## 3. ECOSYSTEM AND MCP

### 3.1 OpenClaw Ecosystem

- 3,286 vetted skills in ClawHub (post-ClawHavoc purge, down from 5,705)
- 5,494 curated in awesome-openclaw-skills
- n8n workflow automation proven by 60-80% of OpenClaw users
- Security maturity increased post-ClawHavoc incident

### 3.2 MCP Ecosystem

- 18,322 servers indexed on MCP.so
- 8,590+ quality-filtered on PulseMCP
- Official registry at registry.modelcontextprotocol.io
- MCP has become "npm of AI tools" -- OpenAI adopted it, Microsoft ships enterprise servers
- Microsoft Agent 365 coming (Outlook, Teams, SharePoint, OneDrive)
- MCP Apps (Jan 26, 2026) -- interactive UIs inside Claude (Slack, Figma, Asana)
- Quality is bimodal: ClawHub quality > PulseMCP quality > MCP.so quantity

### 3.3 Phoenix Echo MCP Status

Currently uses 7 MCP servers: filesystem, memory, thinking, pdf, fetch, github
3 custom MCP servers to build:
1. ServiceFusion MCP (47 endpoints) -- business operations API
2. Pricebook MCP (1,047-1,769 services, Rexel sync) -- pricing engine
3. Custom Business Logic MCP (quoting, invoicing, dispatch) -- domain workflows

### 3.4 MCP Architecture

Protocol structure: Client -> MCP Server (tools, resources, prompts, sampling) -> Backend APIs

Three message types: Tool Calls, Resource Reading, Prompt Definition

Auth pattern: OAuth via Azure Key Vault, no secrets in code
Rate limiting: Token bucket, 10 req/sec per endpoint
Caching: 5-minute TTL on read operations
Error handling: Sanitize logs, never leak tokens

### 3.5 Key Integration Patterns

**n8n as Deterministic Execution Layer:** NOTE: Shane has effectively rejected n8n (believes it is going out of business; Opus 4.6 with OAuth subscription provides same capability). Do NOT build n8n integrations unless case is made.

**MCP Servers for Tools, Skills/Plugins for Workflows:** Clear separation -- MCP servers = standardized tools; skills/plugins = agent instructions that orchestrate multiple tools.

**Local-First + Cloud Backup:** Gateway runs on Studio with Ollama (local inference), can call cloud LLMs, persists memory locally and on OneDrive/Tailscale backup.

---

## 4. AGENT ARCHITECTURE

### 4.1 Three-Level Agent Hierarchy

**Level 1: Command Router (Fleet A, 3B model)**
- Classify incoming message into 8 categories
- Must complete in <1s
- Output: routing decision + confidence + fallback route
- If confidence < 0.7, route to General Knowledge first

**Level 2: Domain Specialists (8 domains)**

| Domain | Model | Fleet | SLA | Use Case |
|--------|-------|-------|-----|----------|
| Code | 7B Coder | A | <3s edits, <10s refactoring | Syntax validation, code generation |
| Reasoning | GPT-OSS 20b | B | <5s light, <15s heavy | Multi-step reasoning, CoT |
| Email | 7B general | A | <2s | Email drafts, tone management |
| Data Extraction | 8B model | A | <3s per 100 rows | Pattern matching, normalization |
| General Knowledge | 8B Qwen | A | <2s | Catch-all, memory search |
| Tool-Use | GPT-OSS (Harmony) | B | <3s planning | API calls, tool invocations |
| Complex Coordinator | 70B on-demand | B | <30s (async OK) | Multi-domain orchestration |
| Custom Tool Executor | Fleet A sandbox | A | <5s | Python, shell, custom scripts |

**Level 3: Support Agents (Async, background)**
- Memory Manager: Long-term memory updates, fact verification
- Monitoring Agent: Health checks every 30s, alerts
- Verification Agent: Cross-agent contract validation, output shape checking

### 4.2 Dispatch Logic and Conflict Resolution

**Rule 1:** Category > Urgency (speed is worthless if answer is wrong)
**Rule 2:** Permission > Everything (check before routing)
**Rule 3:** Confidence threshold (<0.7 goes to General Knowledge)
**Rule 4:** Timeout escalation (3s -> "let me think" -> async)

### 4.3 Cross-Agent Output Contract

Every agent must produce:
- agent, role, timestamp, category, status (success/timeout/error/escalated)
- duration_ms, response (content, confidence, sources, metadata)
- error, fallback_used, mcp_calls

Verification agent checks: presence, status validity, duration reasonableness, content not null, size <100KB, MCP counts match.

### 4.4 Cost Analysis (10,000 messages/month)

| Category | Model | Cost/req | Requests | Monthly |
|----------|-------|----------|----------|---------|
| Routing | 3B | $0.0005 | 10,000 | $5 |
| Fast | 7-8B | $0.003 | 6,000 | $18 |
| Reasoning | 20B | $0.010 | 2,000 | $20 |
| Complex | 70B | $0.050 | 500 | $25 |
| **Total** | -- | **avg $0.0068** | **10,000** | **~$68** |

### 4.5 Key Metrics Targets

| Metric | Target | Alert |
|--------|--------|-------|
| Router latency | <1s | >1.5s |
| Specialist latency | <3s | >5s |
| Verification pass rate | >99% | <98% |
| MCP call latency (p95) | <500ms | >1000ms |
| Fallback usage | <10% | >15% |
| Timeout rate | <5% | >10% |

---

## 5. LOCAL AI FLEET (TWIN PEAKS)

### 5.1 Twin Peaks Dual-Instance Ollama Architecture

Ollama's global environment variables (NUM_PARALLEL, KV_CACHE_TYPE, CONTEXT_LENGTH) are per-instance, not per-model. Two instances solve this:

**Fleet A (Port 11434) -- Fast/Small:**
- Models: llama3.2:3b (router), qwen3:8b (general), qwen2.5-coder:7b, mistral:7b, nomic-embed-text
- Settings: parallel=4, context=8K, KV=f16
- Use: Real-time, interactive, multi-agent swarm throughput

**Fleet B (Port 11435) -- Heavy/Long:**
- Models: GPT-OSS 20b (warm), llama3.3:70b (on-demand)
- Settings: parallel=2, context=16K, KV=q8_0
- Use: Synthesis, multi-document analysis, complex reasoning

### 5.2 GPT-OSS 20b Integration

- 22B total parameters, 3.6B active per token (MoE)
- MXFP4 quantization: native 4-bit format, ~16GB weight footprint
- Native tool calling via Harmony format
- 3-level reasoning control (low/medium/high)
- Apache 2.0 license

**MXFP4 is P0 blocker:** Must verify Ollama's llama.cpp backend supports MXFP4 before deployment.

### 5.3 Memory Budget (96GB Mac Studio M3 Ultra)

- macOS + kernel: ~15GB reserved
- Gateway process: 2GB
- Warm fleet footprint: 38.9GB (plan) to 47.3GB (corrected for parallel=4 KV)
- Peak with 70B swap-in: 74.6-78GB
- Headroom: 4.4-15.4GB before paging

**KV Cache Quantization Decision Tree:**
- Default: f16 (full precision)
- First optimization: q8_0 (~50% memory, very small quality loss)
- Last resort: q4_0 (~25% memory, noticeable impact at high context)

### 5.4 Model Routing with Reasoning Levels

GPT-OSS supports 3 reasoning levels via system message:
- urgency: realtime -> reasoning: low
- urgency: interactive -> reasoning: medium (default)
- urgency: batch -> reasoning: high
- Category override: reasoning-heavy/tool-use -> medium or high (category trumps urgency)

### 5.5 Model Lifecycle: keep_alive as Priority Signaling

- Router with keep_alive: -1 (infinite) -- never evicted
- General models: 10-15 min warm time
- Heavy/on-demand: 5 min then cool

### 5.6 Harmony Format (Non-Negotiable for GPT-OSS)

- Trained exclusively on Harmony response format with start/message/end tokens
- Tool calling, reasoning channels, structured outputs depend on exact format
- Ollama's built-in chat template correctly handles Harmony
- NEVER override TEMPLATE in Modelfiles for GPT-OSS

### 5.7 DeepSeek Ban (CONFIRMED HARD RULE)

**BLOCKED FROM PHOENIX ECOSYSTEM.**
- CrowdStrike: 50% spike in code vulnerabilities during geopolitical events
- Kill switch in model weights
- Security risk, IP risk, mission incompatibility
- Never pull deepseek-* models, exclude from fine-tuning, reject any evaluation proposals

### 5.8 P0 Blockers from 7-Agent Review

| ID | Blocker | Impact |
|----|---------|--------|
| P0-1 | MXFP4 support not verified | Inference fails or garbage output |
| P0-2 | Python sandbox / RCE | Bare-host code execution = compromise |
| P0-3 | KV cache wrong parallelism | 47.3GB not 38.9GB warm footprint |
| P0-4 | Circuit breaker timeout undifferentiated | Should be 45s warm / 90s cold |
| P0-5 | Error threshold too lenient | 40% -> should be 20% |
| P0-6 | Fleet B port dispatcher missing | Tool-use/reasoning goes to wrong fleet |
| P0-7 | Deployment commands wrong port | GPT-OSS models created on wrong instance |
| P0-8 | Missing top_p parameter | Sampling may differ from spec |
| P0-9 | Harmony format not smoke-tested | Tool calling may silently fail |
| P0-10 | LoRA missing MoE target_parameters | Fine-tuning misses expert layers |
| P0-11 | GGUF conversion pipeline unvalidated | MoE GGUF conversion is novel |
| P0-12 | PTY approach for dashboard | Must use HTTP API streaming |
| P0-13 | Fleet monitoring UI missing | No memory/cold-start/eviction visibility |

---

## 6. RAG PIPELINE

### 6.1 Architecture

Embed -> Store -> Retrieve -> Re-rank -> Prompt -> LLM -> Response

Three RAG types for Phoenix:
1. **Operational RAG** -- Pricebook, job history, playbooks
2. **Knowledge RAG** -- NEC code, product manuals, HVAC design guides
3. **Temporal RAG** -- Recent jobs, invoices, customer preferences (decay by age)

### 6.2 Chunking Strategy (Optimal: 200-500 tokens)

- Pricebook chunks: 200-400 tokens, by service type, self-contained with multipliers
- Job history chunks: 300-500 tokens, by customer + month, includes invoice data
- Playbook chunks: 200-300 tokens, by topic, actionable troubleshooting

### 6.3 Embedding Model Selection

| Model | Dimension | Quality | Cost | Best For |
|-------|-----------|---------|------|----------|
| ada-002 (OpenAI) | 1536 | Excellent | $0.10/1M | Production |
| text-embedding-3-small | 512 | Very Good | $0.02/1M | Cost-sensitive |
| MiniLM-L6 (local) | 384 | Good | Free | Privacy-critical |

Recommendation: OpenAI ada-002 with MiniLM fallback. NOTE: Shane requested FULL BREAKDOWN before deciding -- do not hardcode dimension.

### 6.4 Vector Store

Recommendation: Pinecone (serverless) -- $0.96/day (~$30/month), zero management, sub-100ms latency, built-in filtering

Alternatives: Weaviate (self-hosted), Milvus (local), pgvector (SQL + vectors), Supabase

### 6.5 Re-ranking

Optional but recommended. CrossEncoder model improves ranking beyond similarity. ~100ms per query overhead. Use ms-marco-MiniLM-L-12-v2.

### 6.6 Query Expansion

Expand incomplete queries with customer context, job context, recent conversation memory.

### 6.7 Time Decay

Temporal scoring with 30-day half-life: decayedScore = score * exp(-lambda * ageInDays)

---

## 7. VOICE AI

### 7.1 Technology Tiers

1. **OpenAI Realtime API (WebRTC)** -- GA Sept 2025, <200ms latency, ephemeral tokens, MVP choice
2. **ElevenLabs Conversational AI** -- Built-in RAG, $1/1000 min, enterprise alternative
3. **Twilio ConversationRelay** -- Telephony bridge for outbound calling
4. **MLX-Audio (local)** -- Apple Silicon optimized, 1-2s cold start, Month 2 work

### 7.2 Key Decisions

- WebRTC over WebSocket (non-negotiable for production)
- No Pipecat in MVP scope (Month 3+ if needed)
- HTTP API streaming for model interaction, NOT PTY

### 7.3 Anti-Patterns

- PTY-based terminal streaming for voice (MAJOR BLOCKER)
- Ignoring GPT-OSS 16s cold start
- WebSocket instead of WebRTC for browser voice
- Skipping TCPA compliance for Twilio outbound ($500-$1,500 fines per call)

---

## 8. DASHBOARD AND UX

### 8.1 Universal Pattern: Three-Panel Layout

- Left NavRail (64px -> 256px expanded)
- Center Workspace (fluid)
- Right Detail Panel (320px, collapsible)
- Header: 48px sticky
- Activity Feed: ~120px collapsed, expandable

Responsive: Desktop 3-panel, Tablet 2-panel, Mobile 1-column

### 8.2 Activity Feed (Central Nervous System)

Operators spend 80% of time here. Events: agent_started, tool_called, task_completed, error, warning, token_usage_spike. Color-coded by severity. Filterable by agent, severity, time range.

### 8.3 Real-Time Updates

WebSocket primary + SSE fallback + polling last resort. Page Visibility API pauses updates when tab is hidden. Zero background traffic when idle.

### 8.4 Progressive Disclosure

Three levels: Overview Card -> Detail Panel -> Full Page. Never jump from summary to max detail.

### 8.5 Design System

NOTE: Shane directive overrides research -- colors are **red, black, and gold** from Phoenix Echo logo, NOT #d97757 or #ff6b35.

Typography: Playfair Display H1/H2 (async), Inter body/UI, JetBrains Mono code
Components: Shadow-based elevation (not backdrop-filter on dark backgrounds)
Icons: SVG only via IconManager, 40+ icons, no emoji

---

## 9. TERMINAL AND CLI

### 9.1 Architecture Decision

Build custom terminal module (not WebSSH2 or ttyd) for deep JWT/RBAC integration, both local PTY and remote SSH, and theme matching.

### 9.2 Stack

- Backend: node-pty + ssh2 + Socket.IO
- Frontend: xterm.js (latest stable, verify actual version) + addons (fit, webgl, web-links, search) + Split.js
- WebGL renderer (3-5x faster) with canvas fallback

### 9.3 Security

- JWT validation on every WebSocket connection
- SSH keys server-side only (never reach browser)
- RBAC: terminal:access, terminal:ssh permissions
- Session idle timeout: 30 minutes
- Audit logging (metadata only, not keystrokes)

### 9.4 Effort Estimate

7-11 hours to full production: Basic terminal 2-3h, SSH bridge 1-2h, Multi-instance 2-3h, Security/polish 2-3h, Production hardening 1-2h

---

## 10. INTEGRATIONS

### 10.1 Service Fusion

- 74 MCP tools already 74% complete
- NO webhooks -- polling required: jobs 30s, calls 15s, customers 5min, invoices 10min
- Token bucket rate limiter mandatory
- Surface tools as grouped action panels

### 10.2 Microsoft Teams

- Bot Framework archived Dec 31, 2025
- Must use Microsoft 365 Agents SDK (@microsoft/agents-hosting)
- Shane priority: emails and calendar ONLY (not full bot framework)
- Structured training docs, verbose markdown, clear Echo identity
- Mistakes expected and communicated openly

### 10.3 Integration Architecture (Event-Driven)

Service Fusion (polls) -> Event Bus -> [Teams notify, SharePoint log, Metrics record]

Decoupled: each service listens to events it cares about. Easy to add Slack, Discord, email later.

### 10.4 Rate Limiting and Retry

- Token bucket algorithm for rate limiting
- Exponential backoff with jitter for retries
- 429 handling with Retry-After header
- Distinguish transient (retry) vs permanent (fail fast) errors

---

## 11. OPERATIONS AND MONITORING

### 11.1 Observability Stack

- Metrics: Prometheus + Grafana
- Logs: Structured JSON -> Loki
- Traces: OpenTelemetry + Jaeger
- Alerts: Prometheus Alertmanager
- External: Uptime Robot

### 11.2 Health Checks

Every service exposes /health with: status, uptime, component checks (database, ollama fleets, MCP servers), request metrics. Check every 30 seconds.

### 11.3 Key Instrumentation

Request metrics: duration histogram, count by method/status, error count
Model metrics: tokens/request, latency p50/p95/p99 by agent, error/timeout rate
System metrics: CPU, memory, GPU memory, disk, connections, cache hit rate

### 11.4 SLA Targets

| Metric | Target |
|--------|--------|
| Availability | 99.9% (8.76 hrs/year downtime) |
| RTO (recovery time) | <5 min |
| RPO (data loss) | <1 day |
| Model latency target | <10s p95 |

### 11.5 Monthly Cost Breakdown

| Component | Cost |
|-----------|------|
| VPS hosting | $20 |
| Vector store (Pinecone) | $30 |
| OpenAI embeddings | $5 |
| Claude API | $200 |
| PostgreSQL | $25 |
| Redis cache | $20 |
| Storage backups | $1 |
| **Total** | **~$301** |
| **Optimized (with caching)** | **~$158** |

### 11.6 Scaling Strategy

Vertical first (Mac Studio M3 Ultra 96GB), horizontal when maxed (Nginx load balancer + shared DB/Redis/vector store). Caching: L1 in-memory 5min, L2 Redis 1hr, L3 vector store permanent.

---

## 12. FINE-TUNING PIPELINE

### 12.1 Strategy

Prompt engineering now, data collection immediately, train later (Month 2+).

### 12.2 LoRA on M3 Ultra (Verified Working)

Pipeline: Install MLX -> Download model -> Prepare JSONL dataset -> Train LoRA (1000 iters) -> Fuse adapter -> Convert to GGUF -> Create Modelfile -> Load into Ollama

Dataset quality beats size: 500 high-quality examples > 5,000 noisy.

### 12.3 RAG vs Fine-Tuning Decision

- RAG when: knowledge changes frequently, need citations, large proprietary data
- Fine-tune when: behavior/format must be consistent, specialized terminology, company voice/tone
- Recommendation: Use both. Fine-tune for format + voice. RAG for current prices, customer history.

### 12.4 P0 Blocker

LoRA config missing MoE target_parameters for expert layers (mlp.experts.gate_up_proj, mlp.experts.down_proj). Without this, fine-tuning only adapts attention and misses experts.

### 12.5 Synthetic Data Generation

Use Claude to generate ideal examples, fine-tune smaller model (4B-8B) on those. Result: 10x cheaper inference with near-Claude quality. Model distillation is 2026 cutting edge.

---

## 13. BUILD SEQUENCE

### 13.1 Phase 1A: Foundation (No Visible Change) -- 2-3 hours
- design-system.css (tokens, colors, animations)
- icon-manager.js (40+ SVG icons)
- ws-manager.js (standalone WebSocket, exponential backoff)
- Add cleanup() to all 14 page modules

### 13.2 Phase 1B: Layout and Routing -- 4-5 hours
- layout.css (three-panel grid)
- panels.css (shadow elevation)
- panel-manager.js (resize, toggle, responsive)
- index.html rewrite (three-panel)
- app.js (tab bar routing, cleanup lifecycle)
- phoenix-echo.css (single concatenated)

### 13.3 Phase 1C: Chat (The Heartbeat) -- 3-4 hours
- chat.css (rolodex, messages, input, breathing glow)
- chat-manager.js (ws-manager, 200-node DOM cap, agent sessions)
- Wire chat into left panel (persistent across navigation)

### 13.4 Phase 1D: Visual Polish -- 4-5 hours
- components.css (cards, buttons, badges, tables)
- Adapt all 14 page modules
- Tab bar: 5 primary + menu dropdown
- Phoenix logo watermark (SVG, 5-10% opacity)

### 13.5 Phase 1E: Harden -- 3-4 hours
- Test all 14 pages, chat persistence, responsive, WebSocket reconnection
- Fix contrast/accessibility (ARIA labels)
- Deploy to VPS, verify live

### 13.6 Research Implementation (Parallel)

**Week 1:** Ollama tuning, model upgrades, modelfiles
**Week 2:** RAG pipeline, monitoring, model router
**Week 3:** CloudFlare Tunnel, MCP servers
**Week 4:** ServiceFusion, Email, Calendar
**Month 2:** Fine-tuning, synthetic data, eval sets

---

## 14. TOP 25 RESEARCH PRIORITIES (Ranked by ROI)

| Rank | Title | Effort | Impact |
|------|-------|--------|--------|
| 1 | Set Ollama Environment Variables | 5 min | Immediate |
| 2 | Set Up ChromaDB + RAG Pipeline | 1-2 days | Foundation |
| 3 | Deploy n8n on VPS + MCP | 1 day | 300+ integrations (NOTE: Shane rejected n8n) |
| 4 | Cloudflare Tunnel: Studio-to-VPS | 2-3 hrs | Connects systems |
| 5 | Install Conversation Logging | 2 hrs | Enables feedback loops |
| 6 | Pull Upgraded Models (Qwen3, Qwen2.5-Coder) | Download time | Capability boost |
| 7 | Build Prometheus /metrics Endpoint | ~100 LOC | Professional monitoring |
| 8 | Create Phoenix Modelfiles | 30-60 min | Named AI fleet |
| 9 | Install obra/superpowers + Official Skills | 2 commands | 30+ skills |
| 10 | Build Task-Based Model Router | Moderate | Core intelligence |
| 11 | Build ServiceFusion MCP Server | 1-2 days | Core business system |
| 12 | Implement Semantic Caching | Significant | 50-95% cost reduction |
| 13 | Build Daily Scrub Pipeline | Half day | AI research briefing |
| 14 | Collect Phoenix Business Data | Ongoing | Enables fine-tuning |
| 15 | Install Email MCP Server | 1-2 hrs | Inbox automation |
| 16 | Install MLX for Apple Silicon Fine-Tuning | pip install | Unlocks local training |
| 17 | Connect RAG to Gateway | 4 hrs | RAG production-ready |
| 18 | Pull llama3.2:3b Router Model | 2GB download | Fleet architecture |
| 19 | Implement Budget Controls with Hard Caps | Moderate | Prevent cost overruns |
| 20 | Build HVAC Quotes MCP | Moderate | Direct business use |
| 21 | Add Re-Ranking to RAG Pipeline | 2 hrs | RAG quality jump |
| 22 | Install Google Calendar/CalDAV MCP | Moderate | Scheduling automation |
| 23 | Fine-Tune Llama on Quote Format | Significant | First branded model |
| 24 | Generate Synthetic Training Data with Claude | Moderate | 2x-4x dataset |
| 25 | Build 50-Question Quality Eval Set | 3 hrs | Quality measurement |

---

## 15. CRUCIBLE REVIEW FINDINGS

The adversarial (Crucible) review gave PASS WITH CONDITIONS. Two critical fixes required:

1. **P0 blocker list incomplete in executive summary** -- Only 5 of 12 P0 blockers shown; Python sandbox isolation (single biggest security risk) was entirely missing as P0
2. **Color system contradiction** -- Three different base colors and two different accents in same document

Six major issues: model stack contradiction (qwen3:8b vs llama3.1:8b), security section loses depth, Pipecat framework omitted, PTY vs HTTP API decision buried, missing P1 benchmarking items, Azure Automation has zero research content.

Strengths confirmed: Shane's 18 vision points faithfully captured, OpenClaw correctly framed as reference not dependency, DeepSeek ban unambiguous, action items genuinely deduplicated, P0 blockers thorough in appendix, Phoenix Electric always "electrical company."

---

## 16. CRITICAL DEPENDENCIES

- Section 00 -> informs Section 04 (agent roles)
- Section 04 -> depends on Section 05 (MCP servers)
- Section 05 -> requires Section 09 (security)
- Section 06 -> blocks Section 07 (model availability)
- Section 07 -> depends on Section 03 (MCP ecosystem)
- All -> need Section 08 for production

---

*Extracted from Phoenix Echo Gateway Research Bible (2026-03-09/10)*
*Source: 17 files, 9 sections, 8,550+ lines, ~295KB*
*Adversarial reviewed by 7-agent swarm + Crucible*
