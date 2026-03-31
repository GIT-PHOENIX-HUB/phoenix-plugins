# Architecture Reference — GPT-OSS Integration Plan

> Extracted from twin-peaks/01_ARCHITECTURE/GPT-OSS-INTEGRATION-PLAN.md
> 7-Agent Adversarial Review applied (twin-peaks/00_RESEARCH/gpt_oss_reference/research-summaries/)
> Generated: 2026-03-10

---

## 1. System Overview

### Target Hardware

**Mac Studio M3 Ultra — 96GB Unified Memory**
- 800 GB/s memory bandwidth
- Apple Metal GPU (integrated)
- 79 GB available for model inference (after OS + system overhead)

### Architecture Pattern: Dual-Instance Ollama

Two independent Ollama instances running on separate ports for workload isolation.

```
                    +-----------------+
                    |   Gateway       |
                    |   (port 18790)  |
                    +--------+--------+
                             |
                    +--------+--------+
                    |                 |
              +-----+-----+   +------+------+
              |  Fleet A   |   |   Fleet B   |
              | port 11434 |   |  port 11435 |
              +-----+------+   +------+------+
                    |                 |
              Fast / Small      Heavy / GPT-OSS
              Models            Models
```

---

## 2. Fleet Architecture

### Fleet A — Fast/Small Models (Port 11434)

| Model | Parameters | Context | Warm Footprint | Role |
|-------|-----------|---------|----------------|------|
| qwen3:4b | 4B | 16384 | ~3.2 GB | Router / fast triage |
| llama3.3:70b | 70B | 8192 | ~42 GB | Heavy reasoning (cold swap) |

- **Purpose:** Fast routing, triage, simple queries
- **Always warm:** qwen3:4b (router)
- **Cold swap:** llama3.3:70b loaded on demand, evicts other models

### Fleet B — GPT-OSS / Heavy Models (Port 11435)

| Model | Parameters (Active) | Context | Warm Footprint | Role |
|-------|-------------------|---------|----------------|------|
| gpt-oss:20b | 21B (3.6B active) | 16384 | ~18.1 GB | Primary general + tool use |
| echo-gptoss | 21B (3.6B active) | 16384 | ~18.1 GB | General persona |
| echo-gptoss-analyst | 21B (3.6B active) | 32768 | ~20 GB | Financial analysis |
| echo-gptoss-coder | 21B (3.6B active) | 32768 | ~20 GB | Code generation |

- **Purpose:** GPT-OSS workloads, tool calling, specialized personas
- **Note:** Personas share the same base model weights, only system prompts differ

### Memory Budget

```
Total Unified Memory:           96 GB
OS + System Overhead:          -17 GB
Available for Inference:        79 GB

Fleet A (warm):
  qwen3:4b router              ~3.2 GB

Fleet B (warm):
  gpt-oss:20b base             ~18.1 GB
  (personas share weights)

Warm Total:                    ~21.3 GB
Available Headroom:            ~57.7 GB

Cold Swap Budget (70b):        ~42 GB
Post-Swap Available:           ~15.7 GB
```

**CRITICAL:** KV cache at parallel=4 adds ~2.5-9 GB per model depending on context length. The stated 38.9 GB warm total at parallel=1 shifts to ~41.5-47.3 GB at parallel=4. Must reconcile.

### GPT-OSS Replaces phi-4:14b

| Property | phi-4:14b | gpt-oss:20b |
|----------|-----------|-------------|
| Parameters | 14B (dense) | 21B total / 3.6B active (MoE) |
| Tool Calling | No native | Native Harmony format |
| Reasoning Levels | None | 3 levels (low/medium/high) |
| Memory (warm) | ~10 GB | ~18.1 GB |
| License | MIT | Apache 2.0 |
| Architecture | Dense transformer | MoE (32 experts, 4 active) |

**phi-4 kept as cold fallback** rather than deleted (P1-14 recommendation).

---

## 3. Component Relationships

### Data Flow Diagram

```
User Request
    |
    v
+-------------------+
|   Gateway Router   |  Port 18790
|   (Node.js)       |
+--------+----------+
         |
         | 1. Classify request
         |    (qwen3:4b on Fleet A)
         |
    +----+----+
    |         |
    v         v
Fleet A    Fleet B
(11434)    (11435)
    |         |
    |    +----+----+----+
    |    |         |    |
    v    v         v    v
  70b  general  analyst  coder
(cold) persona  persona persona
    |    |         |    |
    +----+---------+----+
         |
         v
   +-----+------+
   | MCP Servers |
   +-----+------+
   |  8010: browser  |
   |  8011: python   |
   |  8012: files    |
   +-----------------+
         |
         v
   +-----+------+
   |  Dashboard  |
   | (SvelteKit) |
   +-------------+
```

### Request Flow

1. **User request** arrives at Gateway (port 18790)
2. **Router** (qwen3:4b on Fleet A, port 11434) classifies:
   - Category (8 types)
   - Urgency level
   - Required reasoning effort
3. **Gateway** routes to appropriate model/persona on correct fleet
4. **Model** generates response, optionally calling tools via MCP
5. **MCP servers** execute tools (browser, python, files)
6. **Response** streams back through Gateway to Dashboard/client

### Routing Categories

| Category | Target | Reasoning |
|----------|--------|-----------|
| general | echo-gptoss (Fleet B) | medium |
| tool-use | echo-gptoss (Fleet B) | medium |
| reasoning-heavy | echo-gptoss (Fleet B) | high |
| code | echo-gptoss-coder (Fleet B) | high |
| analysis | echo-gptoss-analyst (Fleet B) | medium |
| quick-answer | qwen3:4b (Fleet A) | low |
| complex-reasoning | llama3.3:70b (Fleet A, cold) | high |
| creative | echo-gptoss (Fleet B) | medium |

### Reasoning Level Mapping by Urgency

| Urgency | Reasoning Level | Model |
|---------|----------------|-------|
| Low | low | qwen3:4b (Fleet A) |
| Medium | medium | gpt-oss personas (Fleet B) |
| High | high | gpt-oss-coder or 70b (Fleet A/B) |
| Critical | high | llama3.3:70b (Fleet A, cold swap) |

---

## 4. Gateway Router Design

### Circuit Breaker Configuration

```javascript
// CORRECTED per P0-4 and P0-5 from adversarial review
const circuitBreaker = {
  warmTimeout: 45000,    // 45s for warm models (was single 60s)
  coldTimeout: 90000,    // 90s for cold start models
  errorThreshold: 0.20,  // 20% failure rate triggers break (was 40%)
  resetTimeout: 30000,   // 30s before retry
  halfOpenRequests: 3,   // Test requests in half-open state
};
```

### Cold Start Fallback

```
Request -> Warm Model (45s timeout)
              |
              | timeout or error
              v
           Cold Model (90s timeout)
              |
              | timeout or error
              v
           Error Response
```

### Conflict Resolution (P0-7)

When urgency and category signals conflict:

1. **Urgency always wins for safety-critical** — If urgency=Critical, route to 70b regardless of category
2. **Category wins for domain-specific** — code/analysis categories override urgency for routing to specialized personas
3. **Tie-break:** Higher reasoning effort wins

### Fleet B Port Dispatcher (P0-6)

Gateway must explicitly dispatch to Fleet B on port 11435 for all GPT-OSS models:

```javascript
function getFleetPort(model) {
  const fleetBModels = [
    'gpt-oss:20b',
    'echo-gptoss',
    'echo-gptoss-analyst',
    'echo-gptoss-coder'
  ];
  return fleetBModels.includes(model) ? 11435 : 11434;
}
```

---

## 5. MCP Server Architecture

### Server Layout

| Server | Port | Transport | Purpose | Isolation |
|--------|------|-----------|---------|-----------|
| Browser MCP | 8010 | SSE | Web search/browsing | Per-session state |
| Python MCP | 8011 | SSE | Code execution | Docker container (MANDATORY) |
| Files MCP | 8012 | SSE | File system access | Restricted temp dir |

### Security Architecture

```
+------------------+
|   Tailscale VPN  |
|   ACL Rules      |  <-- Limit MCP access to Claude Code device only (P1-6)
+--------+---------+
         |
         v
+--------+---------+
| Reverse Proxy    |
| (localhost only) |  <-- No external exposure
+--------+---------+
         |
    +----+----+----+
    |    |    |    |
    v    v    v    v
  8010 8011 8012  ...
  MCP  MCP  MCP
```

### LaunchAgent Persistence (macOS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phoenix.mcp.browser</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/mcp</string>
        <string>run</string>
        <string>-t</string>
        <string>sse</string>
        <string>browser_server.py:mcp</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### Python Sandbox Security (P0-2 — BLOCKING)

**MUST use Docker or macOS sandbox-exec. Bare-host execution = RCE surface.**

```bash
# Docker approach (recommended)
docker run --rm --network=none \
    --memory=512m --cpus=1 \
    -v /tmp/mcp-python:/workspace:rw \
    python:3.12-slim \
    python /workspace/script.py

# macOS sandbox-exec approach
sandbox-exec -f /path/to/sandbox.sb python3 script.py
```

### Shared Secret Auth (P1-2)

```
Gateway <---> MCP Server
  |              |
  | X-MCP-Secret: <token>
  |              |
  | Must define: generation, storage, rotation, header name
```

### SSE Connection Lifecycle

MCP servers use Server-Sent Events (SSE) transport:
- Connection established on first tool call
- Heartbeat to maintain connection
- Reconnect on disconnect
- Session state preserved per client_id

---

## 6. Dashboard Architecture

### Technology Stack

- **Framework:** SvelteKit
- **Pattern:** Single-panel mobile-first (NOT multi-panel grid)
- **Integration:** HTTP API streaming (`/api/chat` with `stream: true`) — NOT PTY

### CORRECTED Approach (P0-11)

The original plan assumed PTY-based agent management. This was rejected by Agent 3:
- PTY infrastructure does not exist
- Would require ~2-3 weeks ground-up build
- Correct path: Ollama HTTP API with `stream: true`

```javascript
// Correct: HTTP API streaming
const response = await fetch('http://localhost:11435/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: 'echo-gptoss',
    messages: [...],
    stream: true
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process streaming chunks
}
```

### Fleet Health Monitoring UI (P0-12)

Required dashboard panels:
- **Memory pressure gauge** — Current VRAM usage vs budget
- **Cold/warm badges** — Visual indicator per model
- **tok/s display** — Tokens per second for active model
- **Eviction alerts** — When 70b swap-in triggers eviction
- **Model status** — Which models loaded on which fleet/port

### Agent Panel

Uses existing `AgentRunner` pattern from codebase.

### GPT-OSS Agent Panel Color

`#7B5EA7` (purple) — Designated color for GPT-OSS in dashboard theme.

---

## 7. Cross-Instance Eviction Protocol

### Problem

When llama3.3:70b (42 GB) is loaded on Fleet A, it may trigger eviction of other models due to memory pressure on unified memory shared across both fleets.

### Protocol (P1-1)

```
1. Request arrives requiring 70b
2. Gateway checks current memory usage across BOTH fleets
3. If insufficient headroom:
   a. Identify lowest-priority warm models
   b. Send keep_alive=0 to evict them
   c. Wait for VRAM release
4. Load 70b on Fleet A
5. After 70b completes:
   a. Send keep_alive=0 to 70b
   b. Trigger automatic re-warm of evicted models (P1-4)
```

### Auto Re-Warm After 70b Eviction (P1-4)

```javascript
async function reWarmAfterEviction(evictedModels) {
  // After 70b unloads
  for (const model of evictedModels) {
    await fetch(`http://localhost:${model.port}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.name,
        prompt: '',
        keep_alive: -1  // Keep warm forever
      })
    });
  }
}
```

---

## 8. Benchmarking Architecture

### Test Suite Design

- **34 prompts** across 5 categories
- **3 test conditions:** solo, fleet (concurrent), concurrent (stress)
- **5 categories:** general, code, analysis, tool-use, reasoning

### Shadow Routing

```
Production Traffic
    |
    +---> Primary Model (serves response)
    |
    +---> Shadow Model (GPT-OSS, response discarded)
              |
              v
         Benchmark Collection
         (latency, quality, tok/s)
```

**Minimum:** 1000 requests per category (P1-8, upgraded from 500)

### Decision Gates

| Gate | Criteria | Action if Fail |
|------|----------|---------------|
| Gate 1: Solo Performance | Quality >= threshold, latency <= 2x phi-4 | Do not proceed |
| Gate 2: Fleet Performance | No degradation under concurrent load | Investigate memory |
| Gate 3: Shadow Routing | GPT-OSS >= phi-4 quality on production traffic | Keep phi-4 primary |

**Quality metric** must be defined with scale and rubric (P1-7).

### Business Domain Prompts (P1-9)

Must include electrical contracting domain prompts:
- NEC code interpretation
- Job costing calculations
- Material takeoff estimation
- Permit application review

### Comparison Matrix

| Model | Role | Benchmark |
|-------|------|-----------|
| gpt-oss:20b | Candidate primary | Full suite |
| phi-4:14b | Current primary (baseline) | Full suite |
| qwen3:4b | Router | Routing accuracy only |
| llama3.3:70b | Heavy reasoning | Reasoning subset |
| mistral | Comparison | Selected prompts |

---

## 9. Fine-Tuning Pipeline Architecture

### Strategy: "Prompt Now, Collect Now, Train Later"

```
Month 1-3: Prompt engineering + passive data collection
Month 4+:  Evaluate if enough data, worth training
```

### Data Collection Schema (P1-10)

Must define:
- Input/output format
- Quality labels
- Domain categories
- Rejection criteria
- Storage format

### LoRA Configuration (CORRECTED per P0-13)

```yaml
# CORRECTED: Must include MoE target_parameters
lora_config:
  r: 16
  lora_alpha: 32
  lora_dropout: 0.05
  target_parameters:           # P0-13: CRITICAL — was missing
    - "mlp.experts.gate_up_proj"
    - "mlp.experts.down_proj"
    - "self_attn.q_proj"
    - "self_attn.k_proj"
    - "self_attn.v_proj"
    - "self_attn.o_proj"
```

**Without `target_parameters`:** Fine-tuning only adapts attention layers and MISSES the MoE experts entirely.

### GGUF Conversion Pipeline (P1-11)

```
Fine-tuned Model (safetensors)
    |
    v
GGUF Conversion
    |
    v
Quantization (q4_K_M or q8_0)
    |
    v
Ollama Import (FROM path.gguf)
    |
    v
Test & Validate
```

**Risk:** GGUF conversion may fail for fine-tuned MoE models. Fallback: vLLM serving.

---

## 10. Implementation Phases (Revised)

### Phase 1: Foundation (Week 1) — HARD GATE

- [ ] **P0-1:** `ollama pull gpt-oss:20b` — verify MXFP4 loads
- [ ] **P0-3:** Measure actual KV cache with `ollama ps` under target parallelism
- [ ] **P0-9:** Create Modelfiles with corrected context (32768 coder, 16384 general)
- [ ] **P0-8/P0-10:** Target Fleet B port 11435, add `top_p 1.0`
- [ ] **P1-3:** Harmony format smoke test — verify tool calling works
- [ ] **IF MXFP4 FAILS: FULL STOP** — wait for Ollama update

### Phase 2: Gateway Integration (Week 2)

- [ ] **P0-4/P0-5:** Circuit breaker with split timeouts (45s/90s), 20% threshold
- [ ] **P0-6:** Fleet B port dispatcher
- [ ] **P0-7:** Urgency/category conflict resolution
- [ ] **P1-1:** Cross-instance eviction protocol
- [ ] **P1-4:** Auto re-warm after 70b eviction
- [ ] **P1-5:** Router disambiguation rules for 8 categories

### Phase 3: Security & MCP (Week 2-3)

- [ ] **P0-2:** Python sandbox — Docker or sandbox-exec (MANDATORY)
- [ ] **P1-2:** Shared secret auth (generation, storage, rotation, header)
- [ ] **P1-6:** Tailscale ACL rules limiting MCP access
- [ ] SSE connection lifecycle management
- [ ] LaunchAgent configs for MCP servers

### Phase 4: Dashboard (Week 3-4) — REVISED SCOPE

- [ ] **P0-11:** HTTP API streaming integration (NOT PTY)
- [ ] **P0-12:** Fleet health monitoring UI
- [ ] Memory pressure gauge, cold/warm badges, tok/s display
- [ ] Agent panel via existing AgentRunner pattern

### Phase 5: Benchmarking (Week 4)

- [ ] **P1-7:** Define quality metric scale and rubric
- [ ] **P1-8:** 1000-request shadow routing minimum
- [ ] **P1-9:** Electrical contracting domain prompts
- [ ] Full benchmark suite: solo, fleet, concurrent
- [ ] Compare GPT-OSS vs phi-4, qwen3, mistral

### Phase 6: Data Pipeline (Ongoing)

- [ ] **P0-13:** Corrected LoRA config with MoE target_parameters
- [ ] **P1-10:** Define collection schema
- [ ] **P1-11:** Test GGUF conversion pipeline
- [ ] Start passive data collection from Day 1
- [ ] Month 3 checkpoint: enough data? Worth training?

---

## 11. Risk Matrix

| Risk | Level | Mitigation |
|------|-------|------------|
| MXFP4 not supported in Ollama | **HIGH** | Test first. Full stop if fails. |
| Python RCE via model-generated code | **HIGH** | Docker/sandbox-exec mandatory |
| Memory pressure during 70b swap-in | **HIGH** | Cross-instance eviction protocol |
| KV cache exceeds budget at parallel=4 | **MEDIUM-HIGH** | Reconcile before deploy |
| Harmony format breaks in custom Modelfiles | **MEDIUM** | Smoke test tool calling |
| GGUF conversion fails for fine-tuned MoE | **MEDIUM** | vLLM fallback serving |
| Dashboard requires ground-up build | **MEDIUM** | Revised scope in Phase 4 |
| Router cannot distinguish 8 categories | **MEDIUM** | Disambiguation rules |
| 3B router latency under load | **LOW** | Already fastest in fleet |
| MoE routing overhead on M3 Ultra | **LOW** | 800 GB/s bandwidth handles it |

---

## 12. Blocking Items Summary (P0 — Must Fix Before Deploy)

| ID | Item | Source | Phase |
|----|------|--------|-------|
| P0-1 | Verify MXFP4 support in installed Ollama version | Agents 1, 5 | 1 |
| P0-2 | Python execution must use container/sandbox isolation | Agent 4 | 3 |
| P0-3 | Reconcile KV cache numbers with actual parallel settings | Agents 1, 5 | 1 |
| P0-4 | Split circuit breaker timeout: 45s warm / 90s cold | Agent 2 | 2 |
| P0-5 | Lower error threshold from 40% to 20% | Agent 2 | 2 |
| P0-6 | Add Fleet B port dispatcher to routing logic | Agents 2, 5 | 2 |
| P0-7 | Define conflict resolution for urgency vs category | Agent 2 | 2 |
| P0-8 | Deployment commands must target Fleet B port 11435 | Agent 5 | 1 |
| P0-9 | Reduce coder context from 65536 to 32768 | Agent 5 | 1 |
| P0-10 | Add `top_p 1.0` per model spec recommendation | Agent 5 | 1 |
| P0-11 | Replace PTY approach with HTTP API streaming | Agent 3 | 4 |
| P0-12 | Build fleet monitoring UI | Agent 3 | 4 |
| P0-13 | Add MoE `target_parameters` to LoRA config | Agent 7 | 6 |

---

## 13. Strengths of the Architecture

1. **Dual-instance Ollama pattern** — Validated approach for workload isolation
2. **GPT-OSS as phi-4 replacement** — Native tool calling, 3-level reasoning, MoE efficiency
3. **Memory budget fits on 96GB** — Even with corrections, warm total (~47GB) leaves headroom
4. **Fine-tuning timeline is realistic** — Prompt now, collect data, train later
5. **Benchmarking before routing** — Shadow routing prevents bad model from getting production traffic
6. **Apache 2.0 license** — No commercial restrictions, no patent risk
7. **Ollama native support** — `ollama pull gpt-oss:20b` just works

---

*Phoenix AI System — Architecture Reference*
*Source: twin-peaks/01_ARCHITECTURE/ + twin-peaks/00_RESEARCH/gpt_oss_reference/research-summaries/*
