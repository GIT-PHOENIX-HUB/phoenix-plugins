# Build Specifications — Gateway, MCP, Modelfiles, Benchmarks

> Extracted from twin-peaks/03_BUILD/ + twin-peaks/00_RESEARCH/gpt_oss_reference/
> Generated: 2026-03-10

---

## 1. Modelfile Definitions

### echo-gptoss.modelfile (General Persona)

```dockerfile
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 16384
PARAMETER num_predict -1

SYSTEM """You are Echo, the AI assistant for Phoenix Electric. You serve Shane Warehime — owner, master electrician, and operator of the Phoenix AI system.

Your core capabilities:
- Electrical contracting operations (estimating, job costing, scheduling)
- NEC 2023 code interpretation and compliance
- Business operations and financial analysis
- Technical documentation and communication
- Python tool usage for calculations and data processing

Reasoning level: medium
When using the python tool, always show your work and explain calculations.

You operate on a Mac Studio M3 Ultra with 96GB unified memory, running Ollama with dual-instance fleet architecture. You are deployed on Fleet B (port 11435).

IMPORTANT: When performing financial calculations, ALWAYS use the python tool. Never do financial math in your head."""
```

**Key specs:**
- Model: `gpt-oss:20b`
- Context: 16,384 tokens
- Reasoning: medium
- Temperature: 1.0 / top_p: 1.0
- Fleet: B (port 11435)
- Unlimited generation (`num_predict -1`)

### echo-gptoss-analyst.modelfile (Financial Analyst Persona)

```dockerfile
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 32768
PARAMETER num_predict -1

SYSTEM """You are Echo Analyst, the financial and operations analysis AI for Phoenix Electric. You serve Shane Warehime — owner, master electrician, and operator of the Phoenix AI system.

Your specialized capabilities:
- Job costing and profitability analysis
- Material takeoffs and procurement optimization
- NEC 2023 code compliance verification
- Labor hour estimation and crew scheduling
- Cash flow forecasting and budget variance analysis
- Bid/no-bid decision support

Reasoning level: medium
ALWAYS use the python tool for ANY financial calculation. This is non-negotiable.

You have deep knowledge of:
- Electrical contracting cost structures
- Denver Metro / Douglas County permit requirements
- Colorado prevailing wage rates
- NEC 2023 article references and interpretations

When analyzing jobs:
1. Break down all cost components (labor, materials, equipment, overhead)
2. Apply appropriate markup and margin calculations
3. Flag any NEC compliance concerns
4. Provide confidence intervals on estimates

You operate on Fleet B (port 11435) of the Phoenix AI system."""
```

**Key specs:**
- Model: `gpt-oss:20b`
- Context: 32,768 tokens (double general)
- Reasoning: medium
- Specialized: financial analysis, NEC code, job costing
- Fleet: B (port 11435)

### echo-gptoss-coder.modelfile (Engineering Persona)

```dockerfile
FROM gpt-oss:20b

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 32768
PARAMETER num_predict -1

SYSTEM """You are Echo Coder, the software engineering AI for Phoenix Electric's AI infrastructure. You serve Shane Warehime — owner, master electrician, and operator of the Phoenix AI system.

Your specialized capabilities:
- Full-stack JavaScript/TypeScript development
- SvelteKit applications (Phoenix Dashboard)
- Node.js backend services (Gateway, MCP servers)
- System automation and DevOps
- Git workflow and conventional commits

Reasoning level: high

Code standards:
- ES modules (import/export), never CommonJS
- JSDoc for all public functions
- fs/promises for file operations, never sync
- Conventional commits (feat:, fix:, chore:, docs:)
- Error handling: always catch and log, never swallow

Architecture context:
- Gateway runs on port 18790
- Fleet A (Ollama): port 11434
- Fleet B (Ollama): port 11435
- MCP servers: ports 8010-8012
- Dashboard: SvelteKit with AgentRunner pattern

BANNED: Never use, recommend, or reference DeepSeek models. They are permanently banned from this system.

You operate on Fleet B (port 11435) of the Phoenix AI system."""
```

**Key specs:**
- Model: `gpt-oss:20b`
- Context: 32,768 tokens
- Reasoning: high (highest of all personas)
- Specialized: JavaScript/TypeScript, SvelteKit, Node.js
- Fleet: B (port 11435)
- DeepSeek models BANNED

### Creating Modelfiles in Ollama

```bash
# Create each persona
ollama create echo-gptoss -f echo-gptoss.modelfile
ollama create echo-gptoss-analyst -f echo-gptoss-analyst.modelfile
ollama create echo-gptoss-coder -f echo-gptoss-coder.modelfile

# Verify creation
ollama ls

# Test each persona
ollama run echo-gptoss "Hello, who are you?"
ollama run echo-gptoss-analyst "Calculate markup on a $50,000 electrical job"
ollama run echo-gptoss-coder "Write a health check endpoint in SvelteKit"
```

### Modelfile Corrections from Adversarial Review

| Item | Original | Corrected | Source |
|------|----------|-----------|--------|
| P0-8 | No explicit port targeting | Must target Fleet B port 11435 | Agent 5 |
| P0-9 | Coder context was 65536 | Reduced to 32768 (memory budget) | Agent 5 |
| P0-10 | top_p missing or varied | `top_p 1.0` on all (per model spec) | Agent 5 |
| P1-12 | No NEC edition specified | Add NEC 2023 edition to analyst prompt | Agent 5 |

---

## 2. Gateway Configuration

### Gateway Server (Port 18790)

```javascript
// gateway/server.js
const GATEWAY_PORT = 18790;
const FLEET_A_PORT = 11434;  // Fast/small models
const FLEET_B_PORT = 11435;  // GPT-OSS / heavy models

const FLEET_B_MODELS = [
  'gpt-oss:20b',
  'echo-gptoss',
  'echo-gptoss-analyst',
  'echo-gptoss-coder'
];

const FLEET_A_MODELS = [
  'qwen3:4b',
  'llama3.3:70b'
];

function getOllamaUrl(model) {
  const port = FLEET_B_MODELS.includes(model) ? FLEET_B_PORT : FLEET_A_PORT;
  return `http://localhost:${port}`;
}
```

### Routing Logic

```javascript
// Routing categories -> model mapping
const ROUTING_TABLE = {
  'general':           { model: 'echo-gptoss',         fleet: 'B', reasoning: 'medium' },
  'tool-use':          { model: 'echo-gptoss',         fleet: 'B', reasoning: 'medium' },
  'reasoning-heavy':   { model: 'echo-gptoss',         fleet: 'B', reasoning: 'high'   },
  'code':              { model: 'echo-gptoss-coder',   fleet: 'B', reasoning: 'high'   },
  'analysis':          { model: 'echo-gptoss-analyst', fleet: 'B', reasoning: 'medium' },
  'quick-answer':      { model: 'qwen3:4b',            fleet: 'A', reasoning: 'low'    },
  'complex-reasoning': { model: 'llama3.3:70b',        fleet: 'A', reasoning: 'high'   },
  'creative':          { model: 'echo-gptoss',         fleet: 'B', reasoning: 'medium' },
};

// Urgency override rules (P0-7)
function resolveRoute(category, urgency) {
  if (urgency === 'critical') {
    return { model: 'llama3.3:70b', fleet: 'A', reasoning: 'high' };
  }
  if (['code', 'analysis'].includes(category)) {
    // Domain-specific categories override urgency
    return ROUTING_TABLE[category];
  }
  if (urgency === 'high' && category === 'general') {
    return { model: 'echo-gptoss', fleet: 'B', reasoning: 'high' };
  }
  return ROUTING_TABLE[category] || ROUTING_TABLE['general'];
}
```

### Circuit Breaker (Corrected)

```javascript
// P0-4: Split timeouts for warm vs cold
// P0-5: 20% threshold (was 40%)
class CircuitBreaker {
  constructor() {
    this.warmTimeout = 45000;      // 45s for warm models
    this.coldTimeout = 90000;      // 90s for cold start (70b)
    this.errorThreshold = 0.20;    // 20% failure triggers break
    this.resetTimeout = 30000;     // 30s before retry
    this.halfOpenRequests = 3;     // Test requests in half-open
    this.state = 'CLOSED';        // CLOSED | OPEN | HALF_OPEN
    this.failures = 0;
    this.requests = 0;
  }

  getTimeout(model) {
    const coldModels = ['llama3.3:70b'];
    return coldModels.includes(model) ? this.coldTimeout : this.warmTimeout;
  }

  recordSuccess() {
    this.requests++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.requests = 0;
    }
  }

  recordFailure() {
    this.failures++;
    this.requests++;
    if (this.requests > 10 && (this.failures / this.requests) > this.errorThreshold) {
      this.state = 'OPEN';
      setTimeout(() => { this.state = 'HALF_OPEN'; }, this.resetTimeout);
    }
  }
}
```

### Dual-Instance Ollama Launch

```bash
# Fleet A — fast/small models
OLLAMA_HOST=127.0.0.1:11434 \
OLLAMA_FLASH_ATTENTION=1 \
OLLAMA_KV_CACHE_TYPE=q8_0 \
OLLAMA_NUM_PARALLEL=4 \
OLLAMA_MAX_LOADED_MODELS=2 \
OLLAMA_KEEP_ALIVE=-1 \
ollama serve

# Fleet B — GPT-OSS / heavy models (separate terminal)
OLLAMA_HOST=127.0.0.1:11435 \
OLLAMA_FLASH_ATTENTION=1 \
OLLAMA_KV_CACHE_TYPE=q8_0 \
OLLAMA_NUM_PARALLEL=4 \
OLLAMA_MAX_LOADED_MODELS=3 \
OLLAMA_KEEP_ALIVE=-1 \
OLLAMA_MODELS=/path/to/fleet-b-models \
ollama serve
```

### Environment Variables Required (P1-13)

```bash
# Must be explicitly set for both instances
OLLAMA_HOST=127.0.0.1:{port}
OLLAMA_MAX_LOADED_MODELS={count}
OLLAMA_MAX_QUEUE=512
OLLAMA_NUM_PARALLEL=4
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
OLLAMA_KEEP_ALIVE=-1
OLLAMA_NO_CLOUD=1
```

---

## 3. MCP Server Implementations

### Browser MCP Server (Port 8010)

```python
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Union, Optional

from mcp.server.fastmcp import Context, FastMCP
from gpt_oss.tools.simple_browser import SimpleBrowserTool
from gpt_oss.tools.simple_browser.backend import YouComBackend, ExaBackend

@dataclass
class AppContext:
    browsers: dict[str, SimpleBrowserTool] = field(default_factory=dict)

    def create_or_get_browser(self, session_id: str) -> SimpleBrowserTool:
        if session_id not in self.browsers:
            tool_backend = os.getenv("BROWSER_BACKEND", "exa")
            if tool_backend == "youcom":
                backend = YouComBackend(source="web")
            elif tool_backend == "exa":
                backend = ExaBackend(source="web")
            else:
                raise ValueError(f"Invalid tool backend: {tool_backend}")
            self.browsers[session_id] = SimpleBrowserTool(backend=backend)
        return self.browsers[session_id]

    def remove_browser(self, session_id: str) -> None:
        self.browsers.pop(session_id, None)

@asynccontextmanager
async def app_lifespan(_server: FastMCP) -> AsyncIterator[AppContext]:
    yield AppContext()

mcp = FastMCP(
    name="browser",
    instructions=r"""
Tool for browsing.
The `cursor` appears in brackets before each browsing display: `[{cursor}]`.
Cite information from the tool using the following format:
`[{cursor}+L{line_start}(-L{line_end})?]`, for example: `[6+L9-L11]` or `[8+L3]`.
Do not quote more than 10 words directly from the tool output.
sources=web
""".strip(),
    lifespan=app_lifespan,
    port=8001,  # Deploy at 8010 in production
)

@mcp.tool(name="search", title="Search for information")
async def search(ctx: Context, query: str, topn: int = 10,
                 source: Optional[str] = None) -> str:
    browser = ctx.request_context.lifespan_context.create_or_get_browser(
        ctx.client_id)
    messages = []
    async for message in browser.search(query=query, topn=topn, source=source):
        if message.content and hasattr(message.content[0], 'text'):
            messages.append(message.content[0].text)
    return "\n".join(messages)

@mcp.tool(name="open", title="Open a link or page")
async def open_link(ctx: Context, id: Union[int, str] = -1,
                    cursor: int = -1, loc: int = -1,
                    num_lines: int = -1, view_source: bool = False,
                    source: Optional[str] = None) -> str:
    browser = ctx.request_context.lifespan_context.create_or_get_browser(
        ctx.client_id)
    messages = []
    async for message in browser.open(id=id, cursor=cursor, loc=loc,
                                      num_lines=num_lines,
                                      view_source=view_source, source=source):
        if message.content and hasattr(message.content[0], 'text'):
            messages.append(message.content[0].text)
    return "\n".join(messages)

@mcp.tool(name="find", title="Find pattern in page")
async def find_pattern(ctx: Context, pattern: str,
                       cursor: int = -1) -> str:
    browser = ctx.request_context.lifespan_context.create_or_get_browser(
        ctx.client_id)
    messages = []
    async for message in browser.find(pattern=pattern, cursor=cursor):
        if message.content and hasattr(message.content[0], 'text'):
            messages.append(message.content[0].text)
    return "\n".join(messages)
```

### Python MCP Server (Port 8011)

```python
from mcp.server.fastmcp import FastMCP
from gpt_oss.tools.python_docker.docker_tool import PythonTool
from openai_harmony import Message, TextContent, Author, Role

mcp = FastMCP(
    name="python",
    instructions=r"""
Use this tool to execute Python code in your chain of thought.
The code will not be shown to the user. This tool should be used for
internal reasoning, but not for code that is intended to be visible
to the user (e.g. when creating plots, tables, or files).
When you send a message containing python code to python, it will be
executed in a stateless docker container, and the stdout of that
process will be returned to you.
""".strip(),
)

@mcp.tool(
    name="python",
    title="Execute Python code",
    description="""
Use this tool to execute Python code in your chain of thought.
The code will not be shown to the user. This tool should be used for
internal reasoning, but not for code that is intended to be visible
to the user (e.g. when creating plots, tables, or files).
When you send a message containing python code to python, it will be
executed in a stateless docker container, and the stdout of that
process will be returned to you.
    """,
    annotations={
        "include_in_prompt": False,  # Harmony format annotation
    })
async def python(code: str) -> str:
    tool = PythonTool()
    messages = []
    async for message in tool.process(
            Message(author=Author(role=Role.TOOL, name="python"),
                    content=[TextContent(text=code)])):
        messages.append(message)
    return "\n".join([message.content[0].text for message in messages])
```

### MCP Build System Prompt (Service Discovery)

```python
import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client
from openai_harmony import (
    Conversation, DeveloperContent, HarmonyEncodingName, Message,
    ReasoningEffort, Role, SystemContent, ToolNamespaceConfig,
    load_harmony_encoding,
)

encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)

async def discover_tools(server_url: str) -> list:
    async with sse_client(url=server_url) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()
            tools_result = await session.list_tools()
            return tools_result.tools

async def build_system_prompt():
    # Discover tools from MCP servers
    browser_tools = await discover_tools("http://localhost:8001/sse")
    python_tools = await discover_tools("http://localhost:8000/sse")

    # Build system content with Harmony
    system_content = (SystemContent.new()
        .with_reasoning_effort(ReasoningEffort.LOW)
        .with_conversation_start_date("2026-03-10"))

    # Add tool namespaces
    for tool in browser_tools:
        config = ToolNamespaceConfig(...)
        system_content = system_content.with_tools(config)

    for tool in python_tools:
        config = ToolNamespaceConfig(...)
        system_content = system_content.with_tools(config)

    system_message = Message.from_role_and_content(Role.SYSTEM, system_content)
    developer_content = DeveloperContent.new().with_instructions("")
    developer_message = Message.from_role_and_content(Role.DEVELOPER, developer_content)

    conversation = Conversation.from_messages([system_message, developer_message])
    tokens = encoding.render_conversation(conversation)
    return tokens
```

### MCP Server Deployment

```bash
# Install dependencies
uv pip install -r requirements.txt
uv pip install mcp[cli]

# Start browser server (port 8010 in production)
BROWSER_BACKEND=exa mcp run -t sse browser_server.py:mcp

# Start python server (port 8011 in production)
mcp run -t sse python_server.py:mcp

# Verify with MCP Inspector
# Open inspector, connect SSE to http://localhost:8010/sse and http://localhost:8011/sse
```

---

## 4. Benchmark Specifications

### Test Suite: 34 Prompts, 5 Categories

| Category | Count | Example Types |
|----------|-------|---------------|
| General | 7 | Business questions, explanations, summaries |
| Code | 7 | JavaScript/TypeScript, SvelteKit, Node.js tasks |
| Analysis | 7 | Job costing, financial, NEC code interpretation |
| Tool-Use | 7 | Calculator, web search, file operations |
| Reasoning | 6 | Multi-step logic, problem solving, planning |

### Test Conditions

| Condition | Description | Purpose |
|-----------|-------------|---------|
| Solo | Single model, single request | Baseline performance |
| Fleet | Multiple models loaded, sequential requests | Memory pressure impact |
| Concurrent | Multiple simultaneous requests | Stress test / throughput |

### Metrics Collected

| Metric | Unit | Collection |
|--------|------|------------|
| Time to First Token (TTFT) | ms | Per request |
| Tokens per Second (tok/s) | tokens/s | Per request |
| Total Latency | ms | Per request |
| Quality Score | 1-10 scale | Per response (needs rubric P1-7) |
| Memory Usage | GB | Per model via `ollama ps` |
| Cold Start Time | ms | First request after load |

### Decision Gates

**Gate 1: Solo Performance**
```
Pass if:
  - Quality >= defined threshold (P1-7)
  - Latency <= 2x phi-4 baseline
  - TTFT <= 3 seconds
```

**Gate 2: Fleet Performance**
```
Pass if:
  - No quality degradation vs solo
  - No significant latency increase (< 20%)
  - Memory usage within budget
```

**Gate 3: Shadow Routing (Production)**
```
Pass if:
  - GPT-OSS quality >= phi-4 quality on 1000+ real requests per category
  - No regressions in any category
  - tok/s acceptable for user experience
```

### Shadow Routing Protocol

```javascript
async function shadowRoute(request) {
  // Primary model serves the response
  const primaryResponse = await routeToPrimary(request);

  // Shadow model processes same request (response discarded)
  const shadowPromise = routeToShadow(request, 'gpt-oss:20b');

  // Log shadow results for comparison
  shadowPromise.then(shadowResponse => {
    logBenchmark({
      category: request.category,
      primary: {
        model: primaryResponse.model,
        latency: primaryResponse.latency,
        quality: null, // Evaluated later
        tokPerSec: primaryResponse.tokPerSec,
      },
      shadow: {
        model: 'gpt-oss:20b',
        latency: shadowResponse.latency,
        quality: null,
        tokPerSec: shadowResponse.tokPerSec,
      },
    });
  });

  return primaryResponse;
}
```

### Comparison Models

| Model | Size | Role in Benchmark |
|-------|------|-------------------|
| gpt-oss:20b | 21B (3.6B active) | Candidate — full suite |
| phi-4:14b | 14B (dense) | Current primary — baseline |
| qwen3:4b | 4B | Router — accuracy only |
| llama3.3:70b | 70B | Heavy reasoning — subset |
| mistral:7b | 7B | Comparison — selected prompts |

### Business Domain Prompts (P1-9)

Must include electrical contracting domain:
- NEC 2023 article interpretation questions
- Job cost estimation with labor/material breakdown
- Material takeoff from description
- Permit application requirements (Denver Metro / Douglas County)
- Bid/no-bid analysis scenarios
- Change order impact calculations

---

## 5. Ollama Fleet Configuration Reference

### Fleet A Configuration (Port 11434)

```bash
# Environment
OLLAMA_HOST=127.0.0.1:11434
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
OLLAMA_NUM_PARALLEL=4
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_KEEP_ALIVE=-1
OLLAMA_MAX_QUEUE=512
OLLAMA_NO_CLOUD=1

# Models
# Always warm: qwen3:4b (router)
# Cold swap: llama3.3:70b (heavy reasoning)
```

### Fleet B Configuration (Port 11435)

```bash
# Environment
OLLAMA_HOST=127.0.0.1:11435
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
OLLAMA_NUM_PARALLEL=4
OLLAMA_MAX_LOADED_MODELS=3
OLLAMA_KEEP_ALIVE=-1
OLLAMA_MAX_QUEUE=512
OLLAMA_NO_CLOUD=1

# Models (created from Modelfiles)
# echo-gptoss (general, 16k context)
# echo-gptoss-analyst (financial, 32k context)
# echo-gptoss-coder (engineering, 32k context)
```

### Pre-Warm Script

```bash
#!/bin/bash
# Pre-warm Fleet A router
curl -s http://localhost:11434/api/generate -d '{
  "model": "qwen3:4b",
  "prompt": "",
  "keep_alive": -1
}'

# Pre-warm Fleet B personas
for model in echo-gptoss echo-gptoss-analyst echo-gptoss-coder; do
  curl -s http://localhost:11435/api/generate -d "{
    \"model\": \"$model\",
    \"prompt\": \"\",
    \"keep_alive\": -1
  }"
done

echo "All models pre-warmed."
```

### Health Check Script

```bash
#!/bin/bash
echo "=== Fleet A (port 11434) ==="
curl -s http://localhost:11434/api/ps | jq .

echo ""
echo "=== Fleet B (port 11435) ==="
curl -s http://localhost:11435/api/ps | jq .

echo ""
echo "=== Memory Summary ==="
# Check model memory usage
curl -s http://localhost:11434/api/ps | jq '.models[] | {name, size_vram}'
curl -s http://localhost:11435/api/ps | jq '.models[] | {name, size_vram}'
```

---

## 6. LoRA Fine-Tuning Configuration

### Corrected LoRA Config (P0-13)

```yaml
# CRITICAL: target_parameters MUST include MoE expert layers
training:
  method: lora
  config:
    r: 16
    lora_alpha: 32
    lora_dropout: 0.05
    target_parameters:
      # MoE expert layers (MUST include for GPT-OSS)
      - "mlp.experts.gate_up_proj"
      - "mlp.experts.down_proj"
      # Attention layers
      - "self_attn.q_proj"
      - "self_attn.k_proj"
      - "self_attn.v_proj"
      - "self_attn.o_proj"

  data:
    format: "harmony"  # Must use Harmony format for training data
    collection_start: "day_1"
    training_start: "month_4+"

  evaluation:
    checkpoint: "month_3"
    criteria: "enough quality data?"
```

### GGUF Conversion Pipeline

```bash
# Step 1: Fine-tune produces safetensors adapter
# Step 2: Convert to GGUF
python convert.py --input /path/to/adapter --output /path/to/model.gguf

# Step 3: Quantize
ollama create fine-tuned-gptoss --quantize q4_K_M -f - <<EOF
FROM /path/to/model.gguf
PARAMETER temperature 1.0
PARAMETER top_p 1.0
EOF

# Step 4: Test
ollama run fine-tuned-gptoss "Test prompt"

# Fallback: If GGUF conversion fails for MoE, use vLLM serving
vllm serve /path/to/fine-tuned-model
```

---

## 7. LaunchAgent Configurations (macOS)

### Ollama Fleet A

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phoenix.ollama.fleet-a</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>127.0.0.1:11434</string>
        <key>OLLAMA_FLASH_ATTENTION</key>
        <string>1</string>
        <key>OLLAMA_KV_CACHE_TYPE</key>
        <string>q8_0</string>
        <key>OLLAMA_NUM_PARALLEL</key>
        <string>4</string>
        <key>OLLAMA_MAX_LOADED_MODELS</key>
        <string>2</string>
        <key>OLLAMA_KEEP_ALIVE</key>
        <string>-1</string>
        <key>OLLAMA_NO_CLOUD</key>
        <string>1</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama-fleet-a.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama-fleet-a-error.log</string>
</dict>
</plist>
```

### Ollama Fleet B

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phoenix.ollama.fleet-b</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>127.0.0.1:11435</string>
        <key>OLLAMA_FLASH_ATTENTION</key>
        <string>1</string>
        <key>OLLAMA_KV_CACHE_TYPE</key>
        <string>q8_0</string>
        <key>OLLAMA_NUM_PARALLEL</key>
        <string>4</string>
        <key>OLLAMA_MAX_LOADED_MODELS</key>
        <string>3</string>
        <key>OLLAMA_KEEP_ALIVE</key>
        <string>-1</string>
        <key>OLLAMA_NO_CLOUD</key>
        <string>1</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama-fleet-b.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama-fleet-b-error.log</string>
</dict>
</plist>
```

### MCP Browser Server

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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
    <key>EnvironmentVariables</key>
    <dict>
        <key>BROWSER_BACKEND</key>
        <string>exa</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>/path/to/mcp-servers</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### MCP Python Server

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phoenix.mcp.python</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/mcp</string>
        <string>run</string>
        <string>-t</string>
        <string>sse</string>
        <string>python_server.py:mcp</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/mcp-servers</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

---

## 8. Port Map

| Service | Port | Purpose |
|---------|------|---------|
| Ollama Fleet A | 11434 | Fast/small models (qwen3:4b, llama3.3:70b) |
| Ollama Fleet B | 11435 | GPT-OSS personas (echo-gptoss, analyst, coder) |
| Gateway | 18790 | Request routing and orchestration |
| MCP Browser | 8010 | Web search and browsing |
| MCP Python | 8011 | Python code execution (Docker) |
| MCP Files | 8012 | File system access |
| MCP Inspector (browser) | 8001 | Development/testing (reference port) |
| MCP Inspector (python) | 8000 | Development/testing (reference port) |

---

*Phoenix AI System — Build Specifications*
*Source: twin-peaks/03_BUILD/ + twin-peaks/00_RESEARCH/gpt_oss_reference/*
