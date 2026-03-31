# Phase 02: Twin Peaks Local AI Fleet -- Complete Knowledge Extraction

**Source Documents:**
- `05_RUNBOOKS/PHASE_02_TWIN_PEAKS.md` (runbook -- technical spec)
- `06_PLAYBOOKS/PHASE_02_PLAYBOOK.md` (playbook -- operational guide)

**Date:** 2026-03-10
**Author:** Echo Pro (Opus 4.6)
**Status:** DRAFT -- Awaiting Gauntlet Approval
**Depends On:** Phase 01 (Gateway Foundation) -- COMPLETE
**Hardware:** Mac Studio M3 Ultra, 96GB Unified Memory
**Shane's Annotation:** "This should be 2-GPT-OSS 20B+40B?"

---

## 1. OBJECTIVE

Deploy a dual-Ollama fleet on the Mac Studio M3 Ultra that runs GPT-OSS 20B (and potentially 40B) alongside the existing small-model fleet, achieving Shane's goal of 90% local AI operations.

**What "done" looks like:**
- Fleet A (port 11434): Router + qwen3:8b + qwen2.5-coder:7b + mistral:7b + nomic-embed-text -- always warm
- Fleet B (port 11435): GPT-OSS 20B (three personas) -- always warm, with 70B swap-in capability
- Gateway routes requests intelligently between fleets based on task category and urgency
- Circuit breakers protect against fleet failures
- Memory stays under 85GB ceiling at all times (hard alarm)
- Every response in the UI shows which model generated it (routing transparency)

**What "done" does NOT include (deferred to later phases):**
- No MCP server deployment (Phase 03 -- Security & MCP)
- No fine-tuning (Phase 06 -- Data Pipeline)
- No dashboard UI changes (Phase 04 -- Dashboard)
- No benchmarking (Phase 05 -- Benchmarking)

---

## 2. HARDWARE & INFRASTRUCTURE REQUIREMENTS

### 2.1 Hardware

| Item | Required | Verify Command |
|------|----------|----------------|
| Mac Studio M3 Ultra | 96GB Unified Memory | `sysctl hw.memsize` -- must return 103079215104 (96GB) |
| SSD free space | >= 80GB | `df -h /` -- room for model weights + swap headroom |
| Thermal | Adequate cooling, not throttled | `sudo powermetrics --samplers smc -i 1000 -n 1` |
| Energy Saver | Prevent sleep disabled | System Settings > Energy Saver > Prevent automatic sleeping = ON |

### 2.2 Software Prerequisites

| Item | Required | Verify Command |
|------|----------|----------------|
| Ollama | Latest stable (must support MXFP4) | `ollama --version` |
| Node.js | >= 22.x | `node --version` |
| Gateway | Running on port 18790 | `curl -s http://localhost:18790/health` |
| Tailscale | Connected to phoenixelectric.life | `tailscale status` |
| nomic-embed-text | Already warm in Fleet A | `curl -s http://localhost:11434/api/ps \| jq '.models[].name'` |

### 2.3 Network Configuration

| Service | Port | Binding |
|---------|------|---------|
| Fleet A (Ollama default) | 11434 | localhost |
| Fleet B (Ollama GPT-OSS) | 11435 | 0.0.0.0 |
| Gateway | 18790 | localhost |

---

## 3. ARCHITECTURE SPECS

### 3.1 Dual-Ollama Fleet Architecture

```
                     +------------------+
                     |    Gateway       |
                     |   (port 18790)   |
                     +--------+---------+
                              |
              +---------------+---------------+
              |                               |
    +---------v---------+           +---------v---------+
    |    Fleet A        |           |    Fleet B        |
    |  (port 11434)     |           |  (port 11435)     |
    |                   |           |                   |
    |  llama3.2:3b      |           |  echo-gptoss      |
    |  qwen3:8b         |           |  echo-gptoss-coder|
    |  qwen2.5-coder:7b |           |  echo-gptoss-     |
    |  mistral:7b       |           |    analyst         |
    |  nomic-embed-text |           |                   |
    +-------------------+           +-------------------+
```

### 3.2 Fleet A -- Fast/Small Models (port 11434)

| Model | Purpose | Weights | KV Cache (p=4) | Total |
|-------|---------|---------|----------------|-------|
| llama3.2:3b | Router (classifies requests) | 2.0 GB | 3.5 GB | 5.5 GB |
| qwen3:8b | General reasoning, fallback | 5.2 GB | 4.5 GB | 9.7 GB |
| qwen2.5-coder:7b | Code generation | 4.7 GB | 1.8 GB | 6.5 GB |
| mistral:7b | Reasoning, fallback | 4.4 GB | 4.0 GB | 8.4 GB |
| nomic-embed-text | Embeddings | 0.3 GB | 0.0 GB | 0.3 GB |
| **Fleet A Subtotal** | | | | **30.4 GB** |

### 3.3 Fleet B -- GPT-OSS/Heavy Models (port 11435)

| Model | Purpose | Weights | KV Cache (p=2) | Total |
|-------|---------|---------|----------------|-------|
| gpt-oss:20b (MXFP4) | Base model for all personas | 16.0 GB | 1.1 GB | 17.1 GB |
| **Fleet B Subtotal** | | | | **17.1 GB** |

**Fleet B KV Cache Details:**
- NUM_PARALLEL=2
- CONTEXT_LENGTH=16384
- KV_CACHE_TYPE=q8_0 (half the size of f16)

**Fleet B constraint:** `OLLAMA_MAX_LOADED_MODELS=1` -- only one persona warm at a time. Persona swaps are fast (2-5 seconds) because they share the same base weights.

### 3.4 Three GPT-OSS Personas

| Persona | Model ID | Reasoning Level | Context Length | Keep Alive |
|---------|----------|-----------------|----------------|------------|
| General | echo-gptoss | medium | 16384 | 30m |
| Coder | echo-gptoss-coder | high | 32768 | 20m |
| Analyst | echo-gptoss-analyst | medium | 32768 | 15m |

---

## 4. MEMORY BUDGET

### 4.1 Conservative Budget (Fleet A parallel=4, Fleet B parallel=2)

| Component | Memory |
|-----------|--------|
| Fleet A (warm) | 30.4 GB |
| Fleet B (warm, GPT-OSS) | 17.1 GB |
| **WARM FLEET TOTAL** | **47.5 GB** |
| macOS + system | 15.0 GB |
| Gateway process | 2.0 GB |
| **TOTAL COMMITTED** | **64.5 GB** |
| **HEADROOM** | **31.5 GB** |

### 4.2 Peak Scenario (70B Swap-In)

| Component | Memory |
|-----------|--------|
| Fleet A (warm) | 30.4 GB |
| llama3.3:70b (Q4_K_M, 8K ctx, p=1, q8_0) | 44.3 GB |
| macOS + system + Gateway | 17.0 GB |
| **PEAK TOTAL** | **91.7 GB** |
| **HEADROOM** | **4.3 GB** |

**WARNING:** 4.3 GB headroom is dangerously close to swap. The 70B swap-in protocol MUST evict GPT-OSS first, and Fleet A parallel should be reduced to 2 during 70B operation.

### 4.3 Reduced-Parallel Fallback (Fleet A parallel=2)

| Fleet | Model | Total |
|-------|-------|-------|
| A | llama3.2:3b | 3.8 GB |
| A | qwen3:8b | 7.5 GB |
| A | qwen2.5-coder:7b | 5.6 GB |
| A | mistral:7b | 6.4 GB |
| A | nomic-embed-text | 0.3 GB |
| **A Subtotal** | | **23.6 GB** |
| B | gpt-oss:20b | 17.1 GB |
| **WARM FLEET TOTAL** | | **40.7 GB** |
| **TOTAL COMMITTED** | | **57.7 GB** |
| **HEADROOM** | | **38.3 GB** |

### 4.4 GPT-OSS 40B Consideration (Shane's Annotation)

| Model | Weights (MXFP4) | KV Cache (est.) | Total Warm | Fits? |
|-------|-----------------|-----------------|------------|-------|
| gpt-oss:20b | 16 GB | 1.1 GB | 17.1 GB | YES |
| gpt-oss:40b | ~28-32 GB | ~2.0 GB | ~30-34 GB | TIGHT |

With 40B: Fleet B = 30-34 GB + Fleet A (p=2) = 23.6 GB + system 17 GB = 70-75 GB total. Workable but eliminates 70B swap-in entirely.

**Recommendation:** Deploy 20B first. If quality justifies, 40B can replace 20B with zero architectural changes (only the `FROM` line changes in Modelfiles).

**Decision needed from Shane:** Is 70B swap-in capability more valuable than 40B quality improvement?

### 4.5 Memory Alarm Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| Warning | > 75 GB | Log warning |
| Alarm ceiling | > 85 GB | Log alarm, defensive eviction |
| Total system RAM | 96 GB | Hard limit |
| Pre-70B swap check | > 60 GB | Abort 70B load |

---

## 5. HARD GATES (Must Pass Before Build)

### GATE 1: MXFP4 Quantization Support on Apple Silicon

GPT-OSS ships ONLY in MXFP4 format. No Q4_K_M fallback exists.

**Test:**
```bash
ollama --version
ollama pull gpt-oss:20b
ollama run gpt-oss:20b "You are an AI assistant. Respond with exactly: MXFP4 VERIFIED"
```

**PASS:** Coherent response, load_duration present and 5-25 seconds
**FAIL:** Garbage output, repeating tokens, crash, "unknown quantization" error
**If FAIL:** FULL STOP. No workaround exists.

After passing, immediately unload:
```bash
curl -s http://localhost:11434/api/generate -d '{"model": "gpt-oss:20b", "keep_alive": 0}' > /dev/null
```

### GATE 2: Harmony Format Tool Calling in Ollama

GPT-OSS uses Harmony format for all output. Tool calling is its primary differentiator.

**Test:**
```bash
curl -s http://localhost:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "gpt-oss:20b",
  "messages": [
    {"role": "user", "content": "What is the weather in Austin, Texas?"}
  ],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string", "description": "City and state"}
        },
        "required": ["location"]
      }
    }
  }]
}' | jq '.choices[0].message.tool_calls'
```

**PASS:** Returns structured tool_calls JSON
**FAIL:** tool_calls null, raw text instead, or Harmony tokens visible (e.g., `<|start|>`)
**If FAIL:** CONDITIONAL STOP. GPT-OSS becomes reasoning-only model; `tool-use` category dropped from router.

### GATE 3: MoE KV Cache Fits in 96GB

Original plan's memory math was 22% too low (38.9 GB claimed vs. 47.3 GB corrected).

**Test:** Run both fleets warm, measure with `vm_stat` and `memory_pressure`
**PASS:** `memory_pressure` = normal, combined fleet < 55 GB, pageouts = 0
**FAIL:** Memory pressure WARN/CRITICAL, combined fleet > 60 GB, or pageouts > 0
**If FAIL:** Reduce Fleet A parallel from 4 to 2. If still failing, drop mistral:7b. If still failing, architecture does not fit this hardware.

### GATE 4: Actual Memory Measurement with vm_stat

Ollama `/api/ps` reports model VRAM allocation, not actual system memory. Only `vm_stat` is truth.

**Test:** 10 samples at 5-second intervals with both fleets warm and idle
```bash
PAGE_SIZE=16384  # Apple Silicon page size
ACTIVE=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
WIRED=$(vm_stat | grep "Pages wired" | awk '{print $4}' | tr -d '.')
COMPRESSED=$(vm_stat | grep "Pages occupied by compressor" | awk '{print $5}' | tr -d '.')
TOTAL_GB=$(echo "scale=2; ($ACTIVE + $WIRED + $COMPRESSED) * $PAGE_SIZE / 1073741824" | bc)
```

**PASS:** Total committed < 75 GB across all 10 samples, no upward drift, compressed < 5% of active+wired
**FAIL:** Any sample > 80 GB, drift > 0.5 GB, or compressed > 10%
**If FAIL:** Reduce Fleet A NUM_PARALLEL from 4 to 2. Enable `OLLAMA_FLASH_ATTENTION=1`. Re-run.

---

## 6. FLEET B LAUNCH AGENT CONFIGURATION

### 6.1 LaunchAgent Plist

File: `~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.echo.ollama-fleet-b</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>0.0.0.0:11435</string>
        <key>OLLAMA_NUM_PARALLEL</key>
        <string>2</string>
        <key>OLLAMA_FLASH_ATTENTION</key>
        <string>1</string>
        <key>OLLAMA_KV_CACHE_TYPE</key>
        <string>q8_0</string>
        <key>OLLAMA_MAX_LOADED_MODELS</key>
        <string>1</string>
        <key>OLLAMA_KEEP_ALIVE</key>
        <string>30m</string>
        <key>OLLAMA_MAX_QUEUE</key>
        <string>32</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama-fleet-b-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama-fleet-b-stderr.log</string>
</dict>
</plist>
```

### 6.2 Fleet B Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| OLLAMA_HOST | 0.0.0.0:11435 | Bind to all interfaces on port 11435 |
| OLLAMA_NUM_PARALLEL | 2 | Concurrent request slots |
| OLLAMA_FLASH_ATTENTION | 1 | Reduce KV cache footprint |
| OLLAMA_KV_CACHE_TYPE | q8_0 | Half the size of f16 |
| OLLAMA_MAX_LOADED_MODELS | 1 | Only one persona warm at a time |
| OLLAMA_KEEP_ALIVE | 30m | Default keep-alive duration |
| OLLAMA_MAX_QUEUE | 32 | Max queued requests |

### 6.3 Fleet B Log Locations

| Log | Path |
|-----|------|
| stdout | `/tmp/ollama-fleet-b-stdout.log` |
| stderr | `/tmp/ollama-fleet-b-stderr.log` |

### 6.4 Fleet B Control Commands

```bash
# Start Fleet B
launchctl load ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist

# Stop Fleet B
launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist

# Restart Fleet B
launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist && sleep 2 && launchctl load ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist

# Check Fleet B logs
tail -50 /tmp/ollama-fleet-b-stderr.log
```

**IMPORTANT:** Verify the Ollama binary path first:
```bash
which ollama
# If output differs from /usr/local/bin/ollama, update the plist ProgramArguments
# Also check: /opt/homebrew/bin/ollama
```

---

## 7. GPT-OSS MODEL DEPLOYMENT

### 7.1 Modelfile: echo-gptoss (General)

File: `~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss.modelfile`

```
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 16384
PARAMETER num_predict -1

SYSTEM """You are Echo, the AI assistant for Phoenix Electric, an electrical contracting company based in Austin, Texas.

Reasoning: medium

You handle general business communication, dispatch coordination, scheduling, email drafting, and customer interactions. You are professional, efficient, and always represent Phoenix Electric with excellence.

Key operational context:
- Phoenix Electric is an ELECTRICAL company. Not HVAC. Never confuse this.
- Use trade-standard units (AWG, kcmil, trade sizes for conduit). Do not convert to metric unless asked.
- Material prices are volatile. Always include a date caveat on any price reference.
- For dispatch communications, include: job address, scope summary, materials needed, crew size, estimated duration.
- When in doubt, ask for clarification rather than guessing.
- Never delete files or data without explicit confirmation.

You have access to tools. Use them when appropriate. For any financial calculation, use the python tool -- do not perform arithmetic in your head."""
```

### 7.2 Modelfile: echo-gptoss-coder (Engineering)

File: `~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-coder.modelfile`

```
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 32768
PARAMETER num_predict -1

SYSTEM """You are Echo Coder, the engineering AI for Phoenix Electric's internal systems.

Reasoning: high

You write and modify code for the Phoenix Echo Gateway, automation scripts, MCP servers, and internal tooling.

Code standards (MANDATORY):
- ES modules (import/export), never CommonJS
- JSDoc on all exported functions
- fs/promises, not fs sync
- Global fetch, no axios
- Conventional commits for any git operations
- Prefer editing existing files over creating new ones
- NEVER delete files without explicit "yes delete" confirmation
- Apply minimal diffs -- do not rewrite entire files when a surgical edit suffices
- Use apply_patch format for file modifications when available

Architecture context:
- Gateway: Node.js, port 18790, ES modules
- Dual Ollama: Fleet A (11434), Fleet B (11435)
- Tailscale mesh: 5 devices
- Identity system: ECHO.md in _GATEWAY

Security:
- Never commit .env files, API keys, or credentials
- Never use DeepSeek models (BANNED -- security risk)
- Sandbox all code execution"""
```

### 7.3 Modelfile: echo-gptoss-analyst (Data/Financial)

File: `~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-analyst.modelfile`

```
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 32768
PARAMETER num_predict -1

SYSTEM """You are Echo Analyst, the data and financial analysis AI for Phoenix Electric.

Reasoning: medium

You handle job costing, estimating, material takeoffs, financial analysis, pricebook management, and regulatory compliance for an electrical contracting business.

Critical rules:
- Be CONSERVATIVE with numbers. If a quote depends on unknowns, list the unknowns explicitly.
- ALWAYS use the python tool for financial math. Never do arithmetic in your head. Contracting margins have P&L consequences.
- Material prices are volatile. Every estimate must include a date stamp and validity window.
- NEC code references: Default to NEC 2023 (NFPA 70-2023). If the jurisdiction uses a different edition, state which edition and why.
- DISCLAIMER: All NEC interpretations require review by a licensed engineer. Include this on any compliance output.
- Use trade-standard units: AWG for wire gauge, kcmil for large conductors, trade sizes for conduit, voltage classes per NEC.
- For material takeoffs: list every item with quantity, unit cost (if known), and total. Flag items where pricing is estimated vs. confirmed.

Output formats:
- Job cost summaries: Markdown table with labor, material, overhead, margin columns
- Estimates: Structured with line items, subtotals, tax, total
- Compliance checks: Citation format (NEC Article.Section.Subsection)"""
```

### 7.4 Persona Deployment Commands

```bash
# Pull base model to Fleet B
OLLAMA_HOST=localhost:11435 ollama pull gpt-oss:20b

# Create all three personas on Fleet B
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss.modelfile
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss-coder -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-coder.modelfile
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss-analyst -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-analyst.modelfile

# Verify creation
OLLAMA_HOST=localhost:11435 ollama list | grep echo-gptoss
```

### 7.5 Baseline Backups

```bash
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss echo-gptoss-baseline-v1
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss-coder echo-gptoss-coder-baseline-v1
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss-analyst echo-gptoss-analyst-baseline-v1

echo "=== DIGEST RECORD $(date) ===" >> ~/GitHub/twin-peaks/04_VERIFICATION/quality_reports/model-digests.txt
OLLAMA_HOST=localhost:11435 ollama list | grep echo-gptoss >> ~/GitHub/twin-peaks/04_VERIFICATION/quality_reports/model-digests.txt
```

### 7.6 Pre-Warm Default Persona

```bash
curl -s http://localhost:11435/api/chat -d '{"model":"echo-gptoss","keep_alive":"30m","messages":[{"role":"user","content":"Ready check."}]}' | jq '{model: .model, done: .done}'
```

---

## 8. GATEWAY ROUTER INTEGRATION

### 8.1 Model Configuration

```javascript
const gptossModels = {
  'echo-gptoss': {
    id: 'echo-gptoss',
    name: 'Echo GPT-OSS General',
    provider: 'ollama',
    port: 11435,
    fleet: 'B',
    capabilities: ['general', 'tool-use', 'email'],
    reasoningLevel: 'medium',
    warmPriority: 1,
    coldStartMs: 16000,
    keepAlive: '30m',
  },
  'echo-gptoss-coder': {
    id: 'echo-gptoss-coder',
    name: 'Echo GPT-OSS Coder',
    provider: 'ollama',
    port: 11435,
    fleet: 'B',
    capabilities: ['code', 'tool-use'],
    reasoningLevel: 'high',
    warmPriority: 2,
    coldStartMs: 16000,
    keepAlive: '20m',
  },
  'echo-gptoss-analyst': {
    id: 'echo-gptoss-analyst',
    name: 'Echo GPT-OSS Analyst',
    provider: 'ollama',
    port: 11435,
    fleet: 'B',
    capabilities: ['data-extraction', 'reasoning-heavy', 'complex'],
    reasoningLevel: 'medium',
    warmPriority: 2,
    coldStartMs: 16000,
    keepAlive: '15m',
  },
};
```

### 8.2 Fleet Dispatcher

```javascript
function getOllamaEndpoint(modelId) {
  const fleetBModels = [
    'echo-gptoss', 'echo-gptoss-coder', 'echo-gptoss-analyst',
    'gpt-oss:20b', 'llama3.3:70b'
  ];
  const port = fleetBModels.includes(modelId) ? 11435 : 11434;
  return `http://localhost:${port}`;
}
```

### 8.3 Warm Status Check

```javascript
async function isModelWarm(modelId) {
  const endpoint = getOllamaEndpoint(modelId);
  try {
    const res = await fetch(`${endpoint}/api/ps`);
    const data = await res.json();
    return data.models?.some(m => m.name.startsWith(modelId));
  } catch {
    return false;
  }
}
```

### 8.4 Reasoning Level System

```javascript
// Inject reasoning level into system message for GPT-OSS models
function injectReasoningLevel(messages, level) {
  const sysIdx = messages.findIndex(m => m.role === 'system');
  if (sysIdx >= 0) {
    messages[sysIdx].content = messages[sysIdx].content.replace(
      /Reasoning: (low|medium|high)/,
      `Reasoning: ${level}`
    );
  }
  return messages;
}

// RULE: Category takes precedence over urgency (adversarial review P0-7)
function resolveReasoningLevel(urgency, category) {
  if (category === 'reasoning-heavy') return 'high';
  if (category === 'tool-use') return 'low';
  if (category === 'code') return 'medium';

  switch (urgency) {
    case 'realtime': return 'low';
    case 'batch': return 'high';
    case 'interactive':
    default: return 'medium';
  }
}
```

### 8.5 Router Categories (8 total)

The router model (llama3.2:3b on Fleet A) classifies requests:

| Category | Description | Routes To |
|----------|-------------|-----------|
| code | Code generation, debugging, SQL, regex, shell scripts | Fleet A: qwen2.5-coder:7b |
| reasoning | Standard logical reasoning, math, deduction | Fleet A: qwen3:8b / mistral:7b |
| reasoning-heavy | Multi-step proofs, extended analysis, compare-and-contrast | Fleet B: echo-gptoss-analyst |
| general | Conversation, summaries, instructions | Fleet A: qwen3:8b |
| email | Email drafting and responses | Fleet B: echo-gptoss |
| data-extraction | NER, invoice parsing, structured output | Fleet B: echo-gptoss-analyst |
| complex | Multi-document synthesis requiring maximum capacity | Fleet B or 70B swap |
| tool-use | Execute a tool, call a function, browse the web, run code | Fleet B: echo-gptoss |

### 8.6 Router Disambiguation Rules

- If the request asks to EXECUTE a tool, call a function, browse the web, or run code: **tool-use**
- If the request asks for deep analysis, multi-step proof, or extended mathematical reasoning: **reasoning-heavy**
- If the request spans reasoning + action (think AND do): **tool-use** (action takes priority)
- Reserve "complex" for tasks that explicitly require 70B capacity (massive context, multi-document)

### 8.7 Pre-Warm on Gateway Startup

```javascript
async function prewarmFleetB() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    await fetch('http://localhost:11435/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: 'echo-gptoss',
        keep_alive: '30m',
        messages: [{ role: 'user', content: 'Ready.' }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    console.log('[Fleet B] echo-gptoss pre-warmed successfully');
  } catch (err) {
    console.warn('[Fleet B] Pre-warm failed (non-blocking):', err.message);
  }
}
// Call asynchronously -- do NOT await during startup
prewarmFleetB();
```

### 8.8 Override Routing (@ prefix)

Shane can force a specific model by prefixing with @:

```
@echo-gptoss Calculate the markup on this bid
@echo-gptoss-coder Write a function to parse this CSV
@echo-gptoss-analyst Create a material takeoff for this job
@mistral:7b Explain this reasoning problem step by step
@llama3.3:70b Analyze this entire project specification
```

The @ prefix bypasses the router entirely and sends directly to the named model.

---

## 9. CIRCUIT BREAKER & FAILOVER

### 9.1 Circuit Breaker Configuration

```javascript
const gptossCircuitBreaker = {
  state: 'closed',  // 'closed' | 'open' | 'half-open'

  // Dual timeout (adversarial review recommendation)
  timeoutMs: {
    warm: 45000,   // 45s when model is warm
    cold: 90000,   // 90s when model is cold (includes load time)
  },

  // Error threshold (lowered from 40% to 20% per adversarial review)
  errorThreshold: 0.20,
  windowSize: 10,       // Rolling window of last 10 requests
  minRequests: 3,       // Minimum before threshold applies

  openDurationMs: 60000,  // 60s in open state before half-open probe

  // Fallback hierarchy per category
  fallback: {
    'tool-use': ['qwen3:8b', 'qwen2.5-coder:7b', 'mistral:7b'],
    'reasoning-heavy': ['mistral:7b', 'qwen3:8b', 'llama3.3:70b'],
    'code': ['qwen2.5-coder:7b', 'qwen3:8b'],
    'data-extraction': ['qwen3:8b', 'mistral:7b'],
    'general': ['qwen3:8b', 'mistral:7b'],
    'email': ['qwen3:8b', 'mistral:7b'],
  },

  results: [],          // Ring buffer of {success: bool, timestamp: number}
  lastOpenedAt: null,
};
```

### 9.2 Circuit Breaker States

| State | Meaning | Indicator Color |
|-------|---------|----------------|
| CLOSED | Normal operation, GPT-OSS receiving requests | Green |
| OPEN | GPT-OSS failing, all requests routed to Fleet A fallbacks | Red |
| HALF-OPEN | Testing recovery, sending one probe request | Yellow |

### 9.3 Circuit Breaker Logic

```javascript
async function dispatchWithCircuitBreaker(modelId, request, category) {
  const breaker = gptossCircuitBreaker;

  if (breaker.state === 'open') {
    const elapsed = Date.now() - breaker.lastOpenedAt;
    if (elapsed < breaker.openDurationMs) {
      return dispatchToFallback(category, request);
    }
    breaker.state = 'half-open';
  }

  const warm = await isModelWarm(modelId);
  const timeout = warm ? breaker.timeoutMs.warm : breaker.timeoutMs.cold;

  try {
    const result = await fetchWithTimeout(modelId, request, timeout);
    recordResult(breaker, true);
    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
    }
    return result;
  } catch (err) {
    recordResult(breaker, false);
    const recentResults = breaker.results.slice(-breaker.windowSize);
    if (recentResults.length >= breaker.minRequests) {
      const failRate = recentResults.filter(r => !r.success).length / recentResults.length;
      if (failRate >= breaker.errorThreshold) {
        breaker.state = 'open';
        breaker.lastOpenedAt = Date.now();
      }
    }
    return dispatchToFallback(category, request);
  }
}
```

### 9.4 Periodic Warm-Check (Eviction Detection)

```javascript
// Check every 30 seconds for unexpected eviction
setInterval(async () => {
  const warm = await isModelWarm('echo-gptoss');
  if (!warm) {
    console.warn('[Fleet B] echo-gptoss evicted unexpectedly -- re-warming');
    prewarmFleetB();
  }
}, 30000);
```

---

## 10. MCP SERVER (Phase 02 Scope -- Stubs Only)

Full MCP deployment is Phase 03. Phase 02 provides stub responses:

```javascript
async function handleToolCall(toolCall) {
  switch (toolCall.function.name) {
    case 'python':
      console.log('[Tool Call] python:', toolCall.function.arguments);
      return { error: 'Python execution not yet available. Use reasoning instead.' };
    case 'browser':
      console.log('[Tool Call] browser:', toolCall.function.arguments);
      return { error: 'Browser tool not yet available. Answer from training data.' };
    default:
      return { error: `Unknown tool: ${toolCall.function.name}` };
  }
}
```

---

## 11. MONITORING & OBSERVABILITY

### 11.1 Fleet Health Check Script

File: `~/GitHub/twin-peaks/03_BUILD/gateway/fleet-health.sh`

**Usage:**
```bash
./fleet-health.sh              # One-time check
./fleet-health.sh --json       # JSON output (for scripts)
./fleet-health.sh --continuous # Refresh every 10 seconds
```

**Expected healthy output:**
```
--- Twin Peaks Fleet Health @ 14:32:07 ---

=== Fleet A (Fast/Small) (port 11434) ===
  Status: 0.6.2
  Models: 5 loaded (20.80 GB)
    - llama3.2:3b (2.50 GB)
    - qwen3:8b (6.50 GB)
    - qwen2.5-coder:7b (5.90 GB)
    - mistral:7b (5.50 GB)
    - nomic-embed-text:latest (0.40 GB)

=== Fleet B (GPT-OSS/Heavy) (port 11435) ===
  Status: 0.6.2
  Models: 1 loaded (17.10 GB)
    - echo-gptoss:latest (17.10 GB)

=== System Memory ===
  Committed: 62.40 GB / 96.0 GB
  Pressure: The system is not experiencing memory pressure.
  Pageouts: 0
```

### 11.2 Memory Ceiling Alarm (Gateway)

```javascript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

// Check every 60 seconds
setInterval(async () => {
  try {
    const { stdout } = await execFileAsync('vm_stat');
    const pageSize = 16384;
    const active = parseInt(stdout.match(/Pages active:\s+(\d+)/)?.[1] || '0');
    const wired = parseInt(stdout.match(/Pages wired down:\s+(\d+)/)?.[1] || '0');
    const compressed = parseInt(stdout.match(/Pages occupied by compressor:\s+(\d+)/)?.[1] || '0');
    const totalGB = ((active + wired + compressed) * pageSize) / (1024 ** 3);

    if (totalGB > 85) {
      console.error(`[MEMORY ALARM] System at ${totalGB.toFixed(1)} GB -- ABOVE 85 GB CEILING`);
    } else if (totalGB > 75) {
      console.warn(`[MEMORY WARNING] System at ${totalGB.toFixed(1)} GB -- approaching ceiling`);
    }
  } catch (err) {
    console.error('[MEMORY CHECK] Failed:', err.message);
  }
}, 60000);
```

### 11.3 Model Attribution (Routing Transparency)

Every response MUST include model attribution:

```javascript
function addModelAttribution(response, modelId, fleet, reasoningLevel) {
  return {
    ...response,
    _meta: {
      model: modelId,
      fleet: fleet,
      reasoning_level: reasoningLevel,
      warm: true,
      timestamp: new Date().toISOString(),
    },
  };
}
```

**UI Badge Format:**
```
[echo-gptoss] [Fleet B] [medium]
[echo-gptoss] [Fleet B] [medium] [cold start]
[qwen2.5-coder:7b] [Fleet A] [N/A]
```

### 11.4 Routing Decision Log Format

```
14:32:07 [ROUTER] Category: tool-use -> echo-gptoss (Fleet B, reasoning: low)
14:32:08 [ROUTER] Category: code -> qwen2.5-coder:7b (Fleet A)
14:32:10 [ROUTER] Category: reasoning-heavy -> echo-gptoss-analyst (Fleet B, reasoning: high)
14:32:18 [CB] echo-gptoss timeout (warm: 45s exceeded) -- fallback to qwen3:8b
14:32:19 [CB] Recording failure 1/10 for echo-gptoss (10% error rate)
```

---

## 12. TOKEN THROUGHPUT EXPECTATIONS

### 12.1 GPT-OSS Performance Metrics

**Warm model:**
```json
{
  "total_duration": "2.34s",
  "load_duration": "0.01s",
  "prompt_eval_rate": "312 tok/s",
  "eval_rate": "42 tok/s"
}
```

**Cold model (first request after load):**
```json
{
  "total_duration": "18.67s",
  "load_duration": "15.82s",
  "prompt_eval_rate": "285 tok/s",
  "eval_rate": "38 tok/s"
}
```

**Key indicators:**
- `load_duration` > 1s = cold start happened
- `eval_rate` < 20 tok/s = something wrong (memory pressure, thermal throttle)
- `prompt_eval_rate` should be 200-400 tok/s on M3 Ultra

### 12.2 Throughput by Reasoning Level

| Reasoning Level | Visible Output | Internal CoT | Total Tokens | Effective Speed |
|----------------|----------------|--------------|--------------|-----------------|
| low | 50 tokens | ~10 tokens | ~60 | Fast (~40 tok/s visible) |
| medium | 100 tokens | ~80 tokens | ~180 | Moderate (~25 tok/s visible) |
| high | 200 tokens | ~300 tokens | ~500 | Slow (~15 tok/s visible) |

Higher reasoning = more internal thinking tokens before visible output. This is expected behavior.

### 12.3 Model Swap Timing

| Swap | Expected Duration | Memory Impact |
|------|-------------------|---------------|
| Persona to persona (same base) | 2-5 seconds | None (same weights) |
| GPT-OSS -> cold GPT-OSS | 10-20 seconds | None (reload same weights) |
| GPT-OSS -> 70B (full protocol) | 45-90 seconds | +27 GB (from 17 to 44) |
| 70B -> GPT-OSS (restore) | 15-25 seconds | -27 GB (back to 17) |
| Any model from full cold (never loaded) | First pull: minutes (download) | Full weight size |

---

## 13. 70B SWAP-IN PROTOCOL

### 13.1 Pre-Swap Check

```javascript
async function pre70bSwapCheck() {
  const memoryGB = await getSystemMemoryGB();
  if (memoryGB > 60) {
    throw new Error(`Memory too high for 70B swap: ${memoryGB.toFixed(1)} GB`);
  }
  if (swapLock.acquired) {
    throw new Error('70B swap already in progress');
  }
  swapLock.acquired = true;

  // Evict GPT-OSS
  await fetch('http://localhost:11435/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model: 'echo-gptoss', keep_alive: 0 }),
  });

  // Poll until unloaded (max 30 attempts)
  let attempts = 0;
  while (attempts < 30) {
    const ps = await fetch('http://localhost:11435/api/ps').then(r => r.json());
    if (ps.models.length === 0) break;
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  if (attempts >= 30) {
    swapLock.acquired = false;
    throw new Error('Failed to evict GPT-OSS within 30 seconds');
  }
}
```

### 13.2 Load 70B

```javascript
async function load70b(request) {
  await pre70bSwapCheck();
  try {
    const result = await fetch('http://localhost:11435/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3.3:70b',
        keep_alive: '5m',  // Short keep-alive
        messages: request.messages,
        stream: false,
      }),
    });
    return await result.json();
  } finally {
    swapLock.acquired = false;
    // Re-warm GPT-OSS after 70B unloads (5m10s delay)
    setTimeout(async () => {
      const ps = await fetch('http://localhost:11435/api/ps').then(r => r.json());
      if (ps.models.every(m => !m.name.startsWith('llama3.3'))) {
        prewarmFleetB();
      } else {
        setTimeout(() => prewarmFleetB(), 60000);
      }
    }, 310000);
  }
}
```

### 13.3 Manual 70B Swap (CLI)

```bash
# Step 1: Evict GPT-OSS
curl -s http://localhost:11435/api/generate -d '{"model":"echo-gptoss","keep_alive":0}' > /dev/null

# Step 2: Wait for eviction
while curl -s http://localhost:11435/api/ps | jq -e '.models | length > 0' > /dev/null 2>&1; do
  sleep 1
done

# Step 3: Check memory
memory_pressure

# Step 4: Load 70B
OLLAMA_HOST=localhost:11435 ollama run llama3.3:70b "Ready."

# Step 5: After use, unload and re-warm
curl -s http://localhost:11435/api/generate -d '{"model":"llama3.3:70b","keep_alive":0}' > /dev/null
sleep 5
curl -s http://localhost:11435/api/chat -d '{"model":"echo-gptoss","keep_alive":"30m","messages":[{"role":"user","content":"Re-warm."}]}' > /dev/null
```

---

## 14. API ENDPOINTS

### 14.1 Ollama API (Fleet A -- port 11434)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:11434/api/version` | GET | Check Ollama version |
| `http://localhost:11434/api/tags` | GET | List available models |
| `http://localhost:11434/api/ps` | GET | List loaded (warm) models |
| `http://localhost:11434/api/chat` | POST | Chat completion |
| `http://localhost:11434/api/generate` | POST | Text generation |
| `http://localhost:11434/v1/chat/completions` | POST | OpenAI-compatible chat |

### 14.2 Ollama API (Fleet B -- port 11435)

Same endpoints as Fleet A, but on port 11435:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:11435/api/version` | GET | Check Fleet B Ollama version |
| `http://localhost:11435/api/ps` | GET | List loaded GPT-OSS models |
| `http://localhost:11435/api/chat` | POST | GPT-OSS chat completion |
| `http://localhost:11435/v1/chat/completions` | POST | OpenAI-compatible with tool calling |

### 14.3 Gateway API (port 18790)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:18790/health` | GET | Gateway health check (returns `{"status":"ok"}`) |

---

## 15. SECURITY CONSIDERATIONS

- **DeepSeek models: BANNED** -- security risk, never use
- **Never commit** .env files, API keys, or credentials
- **Sandbox all code execution** (Phase 03 scope for actual implementation)
- **Port binding:** Fleet B binds to `0.0.0.0:11435` -- ensure firewall rules prevent external access if not behind Tailscale
- **phi-4:14b retained** as cold fallback (NOT deleted)
- Tool calling stubs return errors in Phase 02 (real execution deferred to Phase 03 for security review)

---

## 16. ROLLBACK PLAN

### 16.1 Severity Levels

| Level | Trigger | Action |
|-------|---------|--------|
| L1: Model Issue | GPT-OSS produces bad output | Switch to baseline personas |
| L2: Memory Issue | System memory > 85 GB or swap activity | Evict GPT-OSS, reduce Fleet A parallel |
| L3: Fleet B Crash | Fleet B Ollama unresponsive | Unload LaunchAgent, route all to Fleet A |
| L4: Full Rollback | Multiple failures or data corruption | Restore pre-deployment state |

### 16.2 L1 Rollback: Baseline Personas

```bash
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss-baseline-v1 echo-gptoss
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss-coder-baseline-v1 echo-gptoss-coder
OLLAMA_HOST=localhost:11435 ollama cp echo-gptoss-analyst-baseline-v1 echo-gptoss-analyst
```

### 16.3 L2 Rollback: Emergency Memory Relief

```bash
curl -s http://localhost:11435/api/generate -d '{"model":"echo-gptoss","keep_alive":0}' > /dev/null
curl -s http://localhost:11435/api/generate -d '{"model":"echo-gptoss-coder","keep_alive":0}' > /dev/null
curl -s http://localhost:11435/api/generate -d '{"model":"echo-gptoss-analyst","keep_alive":0}' > /dev/null
sleep 5
memory_pressure
```

### 16.4 L3 Rollback: Disable Fleet B

```bash
launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist
# Gateway circuit breaker auto-routes all traffic to Fleet A
curl -s http://localhost:11434/api/ps | jq '.models | length'
```

### 16.5 L4 Rollback: Complete Reversal

```bash
launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist
rm ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist
# Revert Gateway router to pre-GPT-OSS configuration (from git)
curl -s http://localhost:11434/api/ps | jq '.models[] | .name'
memory_pressure
diff /tmp/twin-peaks-baseline-fleet-a.json <(curl -s http://localhost:11434/api/ps)
```

---

## 17. TESTING REQUIREMENTS

### 17.1 Router Classification Accuracy Test

10 test prompts with expected classifications:

| Prompt | Expected Category |
|--------|-------------------|
| "What time is the crew arriving at 1234 Main St?" | general |
| "Write a Node.js function to parse Ollama API responses" | code |
| "Calculate the total cost for 500 feet of 4/0 copper THHN" | data-extraction |
| "Search the web for NEC 2023 changes to Article 220" | tool-use |
| "Draft an email to the customer about the delayed inspection" | email |
| "Analyze step by step whether a 200A panel can support these loads" | reasoning-heavy |
| "Run this Python code to compute the bid margin" | tool-use |
| "Summarize the differences between NEC 2020 and 2023 Article 310" | reasoning-heavy |
| "Debug this circuit breaker timeout logic" | code |
| "Create a material takeoff for a 400A service upgrade" | data-extraction |

**Target:** >= 80% accuracy (8/10 correct). If below 80%, merge reasoning/reasoning-heavy categories.

### 17.2 Persona Quick Tests

```bash
# General persona
OLLAMA_HOST=localhost:11435 ollama run echo-gptoss "What is 15% of $4,500?"

# Coder persona
OLLAMA_HOST=localhost:11435 ollama run echo-gptoss-coder "Write a fetch wrapper with timeout"

# Analyst persona
OLLAMA_HOST=localhost:11435 ollama run echo-gptoss-analyst "Create a material takeoff for a 200A panel upgrade"
```

---

## 18. DAILY OPERATIONS CHECKLIST

```bash
echo "=== DAILY FLEET CHECK $(date +%Y-%m-%d) ==="
# 1. Both Ollama instances running
echo -n "Fleet A (11434): "
curl -sf http://localhost:11434/api/version | jq -r '.version' 2>/dev/null || echo "OFFLINE"
echo -n "Fleet B (11435): "
curl -sf http://localhost:11435/api/version | jq -r '.version' 2>/dev/null || echo "OFFLINE"

# 2. Fleet A models warm
curl -s http://localhost:11434/api/ps | jq -r '.models[] | .name'

# 3. Fleet B model warm
curl -s http://localhost:11435/api/ps | jq -r '.models[] | .name' 2>/dev/null || echo "(none -- needs re-warm)"

# 4. System memory
memory_pressure | head -1

# 5. Gateway running
curl -sf http://localhost:18790/health | jq -r '.status' 2>/dev/null || echo "OFFLINE"

# 6. Fleet B last error
grep -i error /tmp/ollama-fleet-b-stderr.log 2>/dev/null | tail -1 || echo "No errors"
```

---

## 19. EMERGENCY PROCEDURES

### 19.1 System Completely Frozen

1. Hard power cycle (hold power button 10 seconds)
2. Fleet A Ollama auto-starts via its LaunchAgent
3. Fleet B auto-starts via `com.echo.ollama-fleet-b.plist` (KeepAlive=true)
4. Gateway may need manual restart
5. Run daily operations checklist to verify recovery

### 19.2 Memory Pressure Critical, System Degraded

```bash
killall ollama
sleep 5
memory_pressure  # Should show "not experiencing"
# Fleet A's LaunchAgent should auto-restart it
sleep 5
curl -s http://localhost:11434/api/version
# After Fleet A is stable, restart Fleet B
launchctl load ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist
```

### 19.3 GPT-OSS Producing Garbage Output

```bash
# Step 1: Verify with direct test
OLLAMA_HOST=localhost:11435 ollama run echo-gptoss "What is 2 plus 2? Reply with just the number."

# Step 2: If garbage, re-pull base model
OLLAMA_HOST=localhost:11435 ollama pull gpt-oss:20b

# Step 3: Re-create personas
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss.modelfile
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss-coder -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-coder.modelfile
OLLAMA_HOST=localhost:11435 ollama create echo-gptoss-analyst -f ~/GitHub/twin-peaks/03_BUILD/modelfiles/echo-gptoss-analyst.modelfile
```

### 19.4 Disable GPT-OSS Entirely

```bash
launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist
# Circuit breaker auto-routes all traffic to Fleet A
# You lose: tool calling, reasoning-heavy, GPT-OSS quality
# You keep: everything else (qwen3:8b, qwen2.5-coder, mistral)
```

---

## 20. GAUNTLET CHECKLIST

### Hard Gates (MUST PASS)

- [ ] GATE 1: MXFP4 quantization loads and produces coherent output
- [ ] GATE 2: Harmony format tool calling returns structured tool_calls
- [ ] GATE 3: Dual-fleet combined memory < 55 GB (measured)
- [ ] GATE 4: vm_stat shows no swap activity and memory_pressure is normal

### Fleet Infrastructure

- [ ] Fleet B LaunchAgent created and starts on boot
- [ ] Fleet B responds on port 11435
- [ ] Fleet A unaffected by Fleet B startup
- [ ] Both fleets show correct Ollama version

### Model Deployment

- [ ] gpt-oss:20b pulled to Fleet B
- [ ] echo-gptoss persona created and smoke-tested
- [ ] echo-gptoss-coder persona created and smoke-tested
- [ ] echo-gptoss-analyst persona created and smoke-tested
- [ ] Baseline backups created for all three personas
- [ ] Model digests recorded
- [ ] Tool calling verified through persona (not just base model)
- [ ] phi-4:14b retained as cold fallback (NOT deleted)

### Gateway Integration

- [ ] Model configuration entries added for all three personas
- [ ] Fleet dispatcher routes GPT-OSS models to port 11435
- [ ] Warm status check queries correct fleet endpoint
- [ ] Reasoning level injection works without breaking Harmony format
- [ ] Router categories updated with tool-use and reasoning-heavy
- [ ] Router classification accuracy >= 80% on 10-prompt test
- [ ] Pre-warm fires on Gateway startup (non-blocking)
- [ ] Pre-warm failure does not block Gateway readiness

### Circuit Breaker & Failover

- [ ] Dual timeout implemented (45s warm, 90s cold)
- [ ] Error threshold set to 20% (not 40%)
- [ ] Fallback hierarchy defined for every GPT-OSS-routable category
- [ ] Circuit breaker transitions logged
- [ ] Periodic warm-check detects unexpected eviction

### Monitoring

- [ ] fleet-health.sh produces correct output for both fleets
- [ ] Memory ceiling alarm fires at 85 GB
- [ ] Routing transparency: every response shows source model
- [ ] Fleet B logs written to /tmp/ollama-fleet-b-*.log

### 70B Swap-In

- [ ] Pre-swap check prevents loading when memory > 60 GB
- [ ] Swap lock prevents concurrent 70B loads
- [ ] GPT-OSS eviction confirmed via /api/ps polling
- [ ] GPT-OSS auto-re-warms after 70B unloads
- [ ] Manual swap-in procedure tested and documented

### Rollback

- [ ] L1 rollback tested (persona revert)
- [ ] L2 rollback tested (emergency eviction)
- [ ] L3 rollback tested (Fleet B disable)
- [ ] Baseline memory snapshot exists for comparison

---

## 21. INTEGRATION POINTS WITH OTHER PHASES

| Phase | Dependency |
|-------|-----------|
| Phase 01 (Gateway Foundation) | MUST be complete before Phase 02 |
| Phase 03 (Security & MCP) | Python sandbox, MCP server deployment deferred |
| Phase 04 (Dashboard) | HTTP API streaming, fleet monitoring UI |
| Phase 05 (Benchmarking) | GPT-OSS quality benchmarks |
| Phase 06 (Data Pipeline) | Fine-tuning, LoRA MoE target_parameters |

### Items Deferred to Later Phases

| ID | Issue | Deferred To |
|----|-------|-------------|
| P0-2 | Python sandbox | Phase 03 |
| P0-11 | HTTP API streaming for dashboard | Phase 04 |
| P0-12 | Fleet monitoring UI | Phase 04 |
| P0-13 | LoRA MoE target_parameters | Phase 06 |

---

## 22. APPENDIX: CORRECTED MEMORY MATH

### Why the Original Plan's Numbers Were Wrong

Original plan stated warm fleet total of 38.9 GB. Adversarial review found this used parallel=1 KV cache estimates while specifying parallel=4 for Fleet A.

**Original (incorrect):**
```
Fleet A (parallel=1 KV): 20.8 GB
Fleet B (GPT-OSS):       18.1 GB
Total:                    38.9 GB  <-- 22% too low
```

**Corrected (parallel=4 for Fleet A, parallel=2 for Fleet B):**
```
Fleet A (parallel=4 KV): 30.4 GB
Fleet B (parallel=2 KV): 17.1 GB
Total:                    47.5 GB  <-- actual estimate
```

**Correction factor:** 47.5 / 38.9 = 1.22x (22% higher than planned)

### Impact on Headroom

| Scenario | Original Plan | Corrected | Delta |
|----------|--------------|-----------|-------|
| Warm fleet only | 38.9 GB | 47.5 GB | +8.6 GB |
| + System/Gateway (17 GB) | 55.9 GB | 64.5 GB | +8.6 GB |
| Headroom (96 GB ceiling) | 40.1 GB | 31.5 GB | -8.6 GB |
| Peak with 70B | 74.6 GB | 91.7 GB | +17.1 GB |
| Peak headroom | 21.4 GB | 4.3 GB | -17.1 GB |

---

## 23. APPENDIX: ADVERSARIAL REVIEW ISSUES ADDRESSED

| ID | Issue | Resolution in This Runbook |
|----|-------|---------------------------|
| P0-1 | Verify MXFP4 support | GATE 1 |
| P0-3 | Reconcile KV cache numbers | GATE 3 + Appendix memory math |
| P0-4 | Split circuit breaker timeout | Section 9.1 (45s/90s) |
| P0-5 | Lower error threshold to 20% | Section 9.1 |
| P0-6 | Fleet B port dispatcher | Section 8.2 |
| P0-7 | Urgency vs category conflict | Section 8.4 (category wins) |
| P0-8 | Deploy to Fleet B port 11435 | Section 7.4 |
| P0-9 | Reduce coder context to 32768 | Section 7.2 |
| P0-10 | Add top_p 1.0 | Section 7.1-7.3 |
| P1-1 | Cross-instance eviction for 70B | Section 13 |
| P1-3 | Harmony format smoke test | GATE 2 |
| P1-4 | Auto re-warm after 70B eviction | Section 13.2 |
| P1-5 | Router disambiguation rules | Section 8.6 |
| P1-13 | Missing env vars | Section 6.2 (all documented) |
| P1-14 | Keep phi-4 as cold fallback | Gauntlet Checklist |

---

## 24. COMMAND CHEAT SHEET

| What | Command |
|------|---------|
| Full fleet health | `~/GitHub/twin-peaks/03_BUILD/gateway/fleet-health.sh` |
| Live monitoring | `~/GitHub/twin-peaks/03_BUILD/gateway/fleet-health.sh --continuous` |
| JSON output | `~/GitHub/twin-peaks/03_BUILD/gateway/fleet-health.sh --json` |
| Memory pressure | `memory_pressure` |
| Detailed memory | `vm_stat \| head -15` |
| Fleet A models | `curl -s http://localhost:11434/api/ps \| jq '.models[].name'` |
| Fleet B models | `curl -s http://localhost:11435/api/ps \| jq '.models[].name'` |
| Test GPT-OSS general | `OLLAMA_HOST=localhost:11435 ollama run echo-gptoss "test"` |
| Test GPT-OSS coder | `OLLAMA_HOST=localhost:11435 ollama run echo-gptoss-coder "test"` |
| Test GPT-OSS analyst | `OLLAMA_HOST=localhost:11435 ollama run echo-gptoss-analyst "test"` |
| Evict GPT-OSS | `curl -s http://localhost:11435/api/generate -d '{"model":"echo-gptoss","keep_alive":0}'` |
| Re-warm GPT-OSS | `curl -s http://localhost:11435/api/chat -d '{"model":"echo-gptoss","keep_alive":"30m","messages":[{"role":"user","content":"warm"}]}'` |
| Start Fleet B | `launchctl load ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist` |
| Stop Fleet B | `launchctl unload ~/Library/LaunchAgents/com.echo.ollama-fleet-b.plist` |
| Fleet B logs | `tail -50 /tmp/ollama-fleet-b-stderr.log` |
| Kill all Ollama | `killall ollama` |
| Ollama version | `ollama --version` |
| Model list (Fleet B) | `OLLAMA_HOST=localhost:11435 ollama list` |
| Switch persona | `curl -s http://localhost:11435/api/chat -d '{"model":"echo-gptoss-coder","keep_alive":"20m","messages":[{"role":"user","content":"Ready."}]}' > /dev/null` |

---

## 25. SHANE'S SPECIFIC DECISIONS & PREFERENCES

- **90% local AI operations** is the target
- **DeepSeek models are BANNED** -- security risk
- **Phoenix Electric is an ELECTRICAL company. Not HVAC.** -- never confuse this
- **NEC 2023 (NFPA 70-2023)** as default code reference
- **Trade-standard units:** AWG, kcmil, trade sizes for conduit -- no metric unless asked
- **Material prices are volatile** -- always include date caveat
- **Conservative with numbers** -- list unknowns explicitly on quotes
- **Python tool for financial math** -- never do arithmetic in model's head
- **Never delete files or data without explicit confirmation**
- **Conventional commits** for git operations
- **ES modules** (import/export), never CommonJS
- **Global fetch, no axios**
- **Routing transparency is non-negotiable** -- every response shows which model generated it
- **Shane annotation:** "This should be 2-GPT-OSS 20B+40B?" -- decision pending on 40B vs 70B swap capability
