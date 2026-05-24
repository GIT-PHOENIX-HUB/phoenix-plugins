# GPT-OSS Reference — Complete Local AI Deployment Guide

> Extracted from twin-peaks/00_RESEARCH/gpt_oss_reference/ (40+ source files)
> Generated: 2026-03-10

---

## 1. GPT-OSS Model Specifications

### Model Variants

| Property | gpt-oss-20b | gpt-oss-120b |
|----------|-------------|--------------|
| Total Parameters | 21B | 117B |
| Active Parameters | 3.6B | 5.1B |
| Architecture | MoE (Mixture of Experts) | MoE (Mixture of Experts) |
| Layers | 24 | 36 |
| Total Experts | 32 | 128 |
| Active Experts per Token | 4 | 4 |
| Tokenizer | o200k_harmony | o200k_harmony |
| Quantization | MXFP4 (native) | MXFP4 (native) |
| License | Apache 2.0 | Apache 2.0 |
| Training Data | English text-only, STEM/coding focus | English text-only, STEM/coding focus |
| Post-Training | SFT + high-compute RL (similar to o4-mini) | SFT + high-compute RL (similar to o4-mini) |

### MXFP4 Format

MXFP4 = Microscaling 4-bit floating point. Native quantization format for GPT-OSS.

- `tensor.blocks` — fp4 values packed in uint8 (2 values per byte)
- `tensor.scales` — block scaling factors
- Reference implementations: torch (4xH100), triton (single H100 with MXFP4), metal (Apple Silicon)

### Recommended Sampling Parameters

```
temperature: 1.0
top_p: 1.0
```

### Reasoning Efforts

Three levels: `low`, `medium`, `high`

- Low: minimal chain-of-thought, fastest responses
- Medium: balanced reasoning depth
- High: deep reasoning, most thorough analysis

---

## 2. Ollama — Installation & Configuration

### Installation

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux manual install (ARM64):**
```bash
# Download binary, create service user, configure systemd
```

**Docker:**
```bash
# CPU only
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# NVIDIA GPU
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# AMD GPU (ROCm)
docker run -d --device /dev/kfd --device /dev/dri -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama:rocm

# Vulkan (experimental)
docker run -d -e OLLAMA_VULKAN=1 -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

**Specific version install:**
```bash
OLLAMA_VERSION=0.5.12 curl -fsSL https://ollama.com/install.sh | sh
```

### Model Storage Paths

| Platform | Path |
|----------|------|
| macOS | `~/.ollama/models` |
| Linux | `/usr/share/ollama/.ollama/models` |
| Windows | `%USERPROFILE%\.ollama\models` |

### Critical Environment Variables

```bash
# Core server config
OLLAMA_HOST=0.0.0.0:11434          # Bind address (default: 127.0.0.1:11434)
OLLAMA_CONTEXT_LENGTH=64000         # Default context window override
OLLAMA_FLASH_ATTENTION=1            # Enable Flash Attention
OLLAMA_KV_CACHE_TYPE=q8_0           # KV cache quantization: f16 | q8_0 | q4_0
OLLAMA_NUM_PARALLEL=4               # Concurrent requests per model
OLLAMA_MAX_LOADED_MODELS=3          # Max models in VRAM simultaneously
OLLAMA_MAX_QUEUE=512                # Max queued requests (default: 512)
OLLAMA_KEEP_ALIVE=5m                # Model stay loaded: -1=forever, 0=immediate unload, default=5m
OLLAMA_NO_CLOUD=1                   # Disable cloud features

# GPU selection
CUDA_VISIBLE_DEVICES=0,1            # NVIDIA GPU selection
ROCR_VISIBLE_DEVICES=0,1            # AMD GPU selection
GGML_VK_VISIBLE_DEVICES=0           # Vulkan GPU selection

# Proxy config
HTTPS_PROXY=https://proxy:port      # HTTPS proxy (HTTPS_PROXY only, not HTTP_PROXY)
```

**Setting env vars by platform:**

- **macOS (launchctl):** `launchctl setenv OLLAMA_HOST "0.0.0.0"` then restart Ollama app
- **Linux (systemd):** Edit `/etc/systemd/system/ollama.service`, add `Environment="OLLAMA_HOST=0.0.0.0"`, then `systemctl daemon-reload && systemctl restart ollama`
- **Windows:** System Properties > Environment Variables > System variables

**Disable cloud features:**
```json
// ~/.ollama/server.json
{ "disable_ollama_cloud": true }
```
Or set `OLLAMA_NO_CLOUD=1`.

### Context Length Defaults (Auto by VRAM)

| VRAM | Default Context |
|------|----------------|
| < 24 GiB | 4,096 |
| 24-48 GiB | 32,768 |
| >= 48 GiB | 256,000 |

Override: `OLLAMA_CONTEXT_LENGTH=64000 ollama serve` or `/set parameter num_ctx 4096` in CLI or `num_ctx` in API options.

### GPU Support

**NVIDIA (compute capability 5.0+):**
GTX 750 Ti through RTX 5090, Tesla P40, A100, H100, H200

**AMD Radeon (ROCm):**
RX 5500 XT through RX 9070 XT, Instinct MI100 through MI350X, Ryzen AI

**Apple Metal:**
All Apple Silicon (M1/M2/M3/M4 and variants)

**Vulkan (experimental):**
Broad GPU support

---

## 3. Ollama CLI Commands

```bash
# Run / chat with a model
ollama run gpt-oss:20b

# Pull a model
ollama pull gpt-oss:20b

# List local models
ollama ls

# Show model info
ollama show gpt-oss:20b

# Remove a model
ollama rm gpt-oss:20b

# Create model from Modelfile
ollama create echo-gptoss -f ./echo-gptoss.modelfile

# List running models
ollama ps

# Stop a running model
ollama stop gpt-oss:20b

# Start Ollama server
ollama serve

# Copy a model
ollama cp gpt-oss:20b my-gptoss:latest

# Push model to registry
ollama push myuser/my-model

# Sign in / sign out
ollama signin
ollama signout

# Launch integrations
ollama launch opencode
ollama launch claude-code
ollama launch codex
ollama launch droid
```

---

## 4. Ollama API Reference

Base URL: `http://localhost:11434`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate completion (streaming) |
| POST | `/api/chat` | Chat completion (streaming) |
| POST | `/api/create` | Create model from Modelfile |
| GET | `/api/tags` or `/api/list` | List local models |
| POST | `/api/show` | Show model info |
| POST | `/api/copy` | Copy a model |
| DELETE | `/api/delete` | Delete a model |
| POST | `/api/pull` | Pull model from registry |
| POST | `/api/push` | Push model to registry |
| POST | `/api/embed` | Generate embeddings |
| GET | `/api/ps` | List running models |
| GET | `/api/version` | Server version |

### Chat Completion Example

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gpt-oss:20b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello"}
  ],
  "stream": true
}'
```

### OpenAI-Compatible Endpoint

```bash
curl http://localhost:11434/v1/chat/completions -d '{
  "model": "gpt-oss:20b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello"}
  ]
}'
```

### Model Name Format

`model:tag` — e.g., `gpt-oss:20b`, `llama3.3:70b`, `phi-4:14b`

### keep_alive Parameter

```json
{"keep_alive": -1}   // Stay loaded forever
{"keep_alive": 0}    // Unload immediately after response
{"keep_alive": "5m"} // Default: 5 minutes
{"keep_alive": "1h"} // Custom duration
```

---

## 5. Ollama Modelfile Format

### Complete Instruction Set

```dockerfile
# Required: base model
FROM gpt-oss:20b

# Parameters
PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 16384
PARAMETER num_predict -1
PARAMETER repeat_last_n 64
PARAMETER repeat_penalty 1.1
PARAMETER presence_penalty 0.0
PARAMETER frequency_penalty 0.0
PARAMETER seed 0
PARAMETER stop "<|end|>"
PARAMETER top_k 40
PARAMETER min_p 0.0

# System prompt
SYSTEM """Your system prompt here."""

# Template (Go template syntax)
TEMPLATE """{{ .System }}
{{ .Prompt }}
{{ .Response }}"""

# Adapter (LoRA or QLoRA)
ADAPTER /path/to/adapter

# License
LICENSE """Apache 2.0"""

# Pre-seeded messages
MESSAGE system You are a helpful assistant.
MESSAGE user Hello
MESSAGE assistant Hi there!

# Minimum Ollama version
REQUIRES >= 0.5.0
```

### All PARAMETER Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `temperature` | Creativity/randomness | 0.8 |
| `top_p` | Nucleus sampling threshold | 0.9 |
| `top_k` | Top-K sampling | 40 |
| `min_p` | Minimum probability threshold | 0.0 |
| `num_ctx` | Context window size | Model default |
| `num_predict` | Max tokens to generate (-1 = unlimited) | 128 |
| `repeat_last_n` | Lookback window for repeat penalty | 64 |
| `repeat_penalty` | Penalty for repeated tokens | 1.1 |
| `presence_penalty` | Penalize tokens that appeared at all | 0.0 |
| `frequency_penalty` | Penalize tokens by frequency | 0.0 |
| `seed` | Random seed (0 = random) | 0 |
| `stop` | Stop sequence(s) | Model default |

### Importing Models

```bash
# From safetensor adapter (LoRA)
FROM llama3.3:70b
ADAPTER /path/to/adapter/directory

# From safetensor model (full)
FROM /path/to/safetensor/directory

# From GGUF file
FROM /path/to/model.gguf

# Quantize during create
ollama create mymodel --quantize q4_K_M -f Modelfile
```

Supported quantization types: `q8_0`, `q4_K_S`, `q4_K_M`

---

## 6. Harmony Response Format

### Overview

Harmony is the required prompt format for GPT-OSS models. Rust core with Python PyO3 bindings.

**Install:**
```bash
pip install openai-harmony
```

### Special Tokens

| Token | ID | Purpose |
|-------|-----|---------|
| `<\|start\|>` | 200006 | Start of message |
| `<\|end\|>` | 200007 | End of message |
| `<\|message\|>` | 200008 | Start of message content |
| `<\|channel\|>` | 200005 | Channel delimiter |
| `<\|constrain\|>` | 200003 | Constrained generation |
| `<\|return\|>` | 200002 | Return/yield |
| `<\|call\|>` | 200012 | Function call |

### Tiktoken Encoding

`o200k_harmony` — Extended tokenizer for GPT-OSS Harmony format.

### Roles (Priority Order)

1. **system** — Highest priority, model identity and capabilities
2. **developer** — Instructions and tool definitions
3. **user** — User messages
4. **assistant** — Model responses
5. **tool** — Tool/function results

### Channels

| Channel | Purpose | Visibility |
|---------|---------|------------|
| `analysis` | Chain-of-thought reasoning | Internal only (not shown to user) |
| `commentary` | Tool calls and structured output | Internal routing |
| `final` | User-facing response | Shown to user |

### Message Format

```
<|start|>{role}({optional_metadata})<|message|>{content}<|end|>
```

Example:
```
<|start|>user<|message|>What is 2+2?<|end|>
<|start|>assistant<|channel|>analysis<|message|>Simple arithmetic...<|channel|>final<|message|>2+2 = 4<|end|>
```

### System Message Format

Contains: identity, date, reasoning level, channel definitions, function routing note.

### Developer Message Format

Contains: instructions + TypeScript-like tool definitions in namespace format.

### Function Calling Flow

1. Assistant emits tool call: `to=functions.{name}` with constrain token + call stop token
2. Tool result returned as tool message
3. Multi-tool calls use preambles between calls

### Structured Output (Response Formats)

JSON schema support in Response Formats section.

### Python Usage

```python
from openai_harmony import (
    Conversation,
    DeveloperContent,
    HarmonyEncodingName,
    Message,
    ReasoningEffort,
    Role,
    SystemContent,
    load_harmony_encoding,
)

# Load encoding
encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)

# Build system message
system_content = (SystemContent.new()
    .with_reasoning_effort(ReasoningEffort.LOW)
    .with_conversation_start_date("2026-03-10"))

# Add tools
system_content = system_content.with_tools(browser_tool.tool_config)
system_content = system_content.with_tools(python_tool.tool_config)

# Create messages
system_message = Message.from_role_and_content(Role.SYSTEM, system_content)
developer_content = DeveloperContent.new().with_instructions("")
developer_message = Message.from_role_and_content(Role.DEVELOPER, developer_content)

# Build conversation and render
conversation = Conversation.from_messages([system_message, developer_message])
tokens = encoding.render_conversation(conversation)

# For completions
tokens = encoding.render_conversation_for_completion(conversation)

# Parse response
messages = encoding.parse_messages_from_completion_tokens(response_tokens)
```

### Chain-of-Thought Handling Rules

1. Analysis channel contains CoT — do NOT show to user
2. Drop CoT after final message on next turn
3. Preserve CoT during tool call sequences (between tool calls)
4. Chat Completions API convention (OpenRouter): `reasoning` property on messages
5. Responses API: `reasoning_text` content type, `response.reasoning_text.delta` and `response.reasoning_text.done` events

---

## 7. MCP Server Patterns

### Architecture

Two MCP servers for GPT-OSS reference tools:

| Server | Port | Transport | Purpose |
|--------|------|-----------|---------|
| `browser_server.py` | 8001 | SSE | Web search, page browsing, pattern finding |
| `python_server.py` | 8000 | SSE | Python code execution in Docker |

### Installation

```bash
uv pip install -r requirements.txt
uv pip install mcp[cli]

# Start servers
mcp run -t sse browser_server.py:mcp
mcp run -t sse python_server.py:mcp
```

### Browser Server (`browser_server.py`)

```python
from mcp.server.fastmcp import Context, FastMCP
from gpt_oss.tools.simple_browser import SimpleBrowserTool
from gpt_oss.tools.simple_browser.backend import YouComBackend, ExaBackend

@dataclass
class AppContext:
    browsers: dict[str, SimpleBrowserTool] = field(default_factory=dict)
    def create_or_get_browser(self, session_id: str) -> SimpleBrowserTool:
        # Creates per-session browser instances
        # Backend selected via BROWSER_BACKEND env var: "youcom" or "exa"

mcp = FastMCP(
    name="browser",
    instructions=r"""Tool for browsing. Cursor appears in brackets...""",
    lifespan=app_lifespan,
    port=8001,
)

# Tools:
# search(query, topn=10, source=None) — Search web
# open(id, cursor, loc, num_lines, view_source, source) — Open link/scroll page
# find(pattern, cursor) — Find text in current page
```

**Browser citation format:** `[{cursor}+L{line_start}(-L{line_end})?]`

### Python Server (`python_server.py`)

```python
from mcp.server.fastmcp import FastMCP
from gpt_oss.tools.python_docker.docker_tool import PythonTool

mcp = FastMCP(name="python", instructions=r"""...""")

@mcp.tool(
    name="python",
    title="Execute Python code",
    annotations={"include_in_prompt": False},  # Harmony format annotation
)
async def python(code: str) -> str:
    tool = PythonTool()
    # Executes in stateless Docker container
    # Returns stdout
```

### MCP Service Discovery (`build-system-prompt.py`)

```python
from openai_harmony import ToolNamespaceConfig
from mcp import ClientSession

# Connect to MCP servers via SSE
async with sse_client(url) as streams:
    async with ClientSession(*streams) as session:
        await session.initialize()
        tools = await session.list_tools()
        # Trim JSON schemas for Harmony compatibility
        # Build system prompt with ToolNamespaceConfig
```

---

## 8. Cookbook Recipes

### Running GPT-OSS on Ollama

```bash
# Pull model
ollama pull gpt-oss:20b

# Run interactively
ollama run gpt-oss:20b

# OpenAI SDK compatibility
from openai import OpenAI
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
response = client.chat.completions.create(
    model="gpt-oss:20b",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**Function calling with Ollama:**
```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather",
        "parameters": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"]
        }
    }
}]
response = client.chat.completions.create(
    model="gpt-oss:20b",
    messages=messages,
    tools=tools
)
```

**Responses API via reference server:**
```bash
python -m gpt_oss.responses_api.serve --inference_backend=ollama
```

Or via Hugging Face Responses.js proxy.

**Agents SDK (Python via LiteLLM):**
```python
from agents import Agent, Runner
from agents.models.litellm_model import LitellmModel

agent = Agent(
    name="assistant",
    instructions="You are a helpful assistant.",
    model=LitellmModel(model="ollama/gpt-oss:120b"),
)
result = Runner.run_sync(agent, "Hello")
```

### Running GPT-OSS on vLLM

```bash
uv pip install --pre vllm==0.10.1+gptoss
vllm serve openai/gpt-oss-20b
```

Exposes OpenAI-compatible Chat Completions + Responses API.

**Direct sampling with Harmony:**
```python
encoding = load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
tokens = encoding.render_conversation_for_completion(conversation)
# Send tokens to vLLM, parse response
messages = encoding.parse_messages_from_completion_tokens(response_tokens)
```

**Agents SDK:**
```python
from agents.models.openai_responses import OpenAIResponsesModel
model = OpenAIResponsesModel(model="openai/gpt-oss-20b", openai_client=client)
```

### Running GPT-OSS on Transformers

```bash
pip install -U transformers accelerate torch triton==3.4 kernels
```

**Pipeline API:**
```python
from transformers import pipeline
pipe = pipeline("text-generation", model="openai/gpt-oss-20b")
result = pipe([{"role": "user", "content": "Hello"}])
```

**Manual generation with tokenizer:**
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("openai/gpt-oss-20b")
tokenizer = AutoTokenizer.from_pretrained("openai/gpt-oss-20b")
inputs = tokenizer.apply_chat_template(messages, return_tensors="pt")
outputs = model.generate(inputs, max_new_tokens=512)
```

**API endpoint:**
```bash
transformers serve openai/gpt-oss-20b
```

**Multi-GPU:**
- Tensor parallelism: `tp_plan="auto"`
- Expert parallelism for MoE
- Flash Attention 3 support

### Running GPT-OSS on LM Studio

```bash
# CLI
lms get openai/gpt-oss-20b
lms load gpt-oss-20b
lms chat

# Local API at /v1/chat/completions
```

**MCP config (`~/.lmstudio/mcp.json`)** for tool integration.

**Python SDK:**
```python
import lmstudio
model = lmstudio.llm("gpt-oss-20b")
result = model.act("What's the weather?", tools=[...])
```

**TypeScript SDK:**
```typescript
import { LMStudio } from "@lmstudio/sdk";
const model = await client.llm.model("gpt-oss-20b");
```

### GPT-OSS Safeguard Model

`gpt-oss-safeguard` — Fine-tuned safety classification model.

**Policy prompt structure:**
1. Instruction — What to evaluate
2. Definitions — Key terms
3. Criteria — Decision rules
4. Examples — Edge cases

**Output formats:**
- Binary: `0` (safe) / `1` (unsafe)
- Policy-referencing JSON with category
- Rationale with citations

**Optimal policy length:** 400-600 tokens.
**Reasoning effort** controls classification depth.
**Integration:** ROOST's Osprey rules engine.

### Verifying Implementations

**Three key verification areas:**
1. Harmony format correctness
2. CoT handling between tool calls
3. MXFP4 inference code correctness

**Compatibility test suite:**
```bash
cd gpt-oss/compatibility-test/
npm test
```

**Evals:**
```bash
python -m gpt_oss.evals  # AIME, GPQA, Healthbench
```

---

## 9. Performance Tuning

### Flash Attention

```bash
OLLAMA_FLASH_ATTENTION=1 ollama serve
```

Required for efficient long-context inference.

### KV Cache Quantization

```bash
OLLAMA_KV_CACHE_TYPE=q8_0 ollama serve   # 8-bit (good balance)
OLLAMA_KV_CACHE_TYPE=q4_0 ollama serve   # 4-bit (most memory savings)
OLLAMA_KV_CACHE_TYPE=f16 ollama serve    # 16-bit (default, highest quality)
```

### Concurrent Requests

```bash
OLLAMA_NUM_PARALLEL=4            # Requests per model
OLLAMA_MAX_LOADED_MODELS=3       # Models in VRAM
OLLAMA_MAX_QUEUE=512             # Queue depth
```

### keep_alive Tuning

```bash
# For always-hot models (production)
curl http://localhost:11434/api/generate -d '{"model": "gpt-oss:20b", "keep_alive": -1}'

# For memory-constrained environments
curl http://localhost:11434/api/generate -d '{"model": "gpt-oss:20b", "keep_alive": "1m"}'
```

### Memory Estimates (GPT-OSS 20b)

- Model weights: ~12-14 GB (MXFP4)
- KV cache per context (16k, f16): ~2-4 GB
- Warm footprint: ~18.1 GB
- With parallel=4: ~20-23 GB

---

## 10. API Compatibility Layers

### OpenAI SDK Compatibility (via Ollama)

```python
from openai import OpenAI
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # Any string works
)
```

### Agents SDK (Python via LiteLLM)

```python
from agents.models.litellm_model import LitellmModel
model = LitellmModel(model="ollama/gpt-oss:20b")
```

### Agents SDK (TypeScript via AI SDK)

```typescript
import { ollama } from "ollama-ai-provider";
const model = ollama("gpt-oss:20b");
```

### Responses API (via gpt-oss reference server)

```bash
python -m gpt_oss.responses_api.serve \
    --inference_backend=ollama \
    --host=0.0.0.0 \
    --port=8080
```

Backends: `triton`, `metal`, `ollama`, `vllm`, `transformers`

### vLLM OpenAI-Compatible Server

```bash
vllm serve openai/gpt-oss-20b
# Exposes /v1/chat/completions and Responses API
```

### Transformers API Server

```bash
transformers serve openai/gpt-oss-20b
```

---

## 11. Community Integration Ecosystem

### Web Chat Interfaces
Open WebUI, Enchanted, Hollama, HTML UI, Saddle, Chatbot UI, Lollms-Webui, LibreChat, Bionic GPT, Cheshire Cat AI, Amica, Maid

### Desktop Applications
Ollamac, Enchanted (macOS/iOS), MindMac, NextChat, Jan, ConfiChat, Archyve, TwinChat, Cherry Studio

### Code Editors
VS Code (Continue, Twinny, Wingman AI), JetBrains (Continue), Neovim (gen.nvim, ollama.nvim, codecompanion), Emacs (ellama, le-chat), Zed, Obsidian, Theia, Cursor (via API)

### Libraries & SDKs
ollama-python, ollama-js, LangChain (Python/JS), LlamaIndex, Spring AI, LiteLLM, Semantic Kernel, Haystack, Genkit, OllamaSharp, Swarm, Pydantic AI

### Frameworks & Agents
CrewAI, Eliza, SwarmNode, Dify, AgentStack, Composio, Camel-AI

### RAG Systems
LangChain, LlamaIndex, Cognita, Vanna.ai, R2R, Weaviate Verba

### Database Integrations
MindsDB, Weaviate, Chroma, pgai

---

## 12. Building Ollama from Source

### Prerequisites
- Go 1.22+
- C/C++ compiler (GCC or Clang)
- macOS: Xcode Command Line Tools (Metal built-in)
- Linux: CUDA toolkit or ROCm for GPU support

### Build Commands
```bash
git clone https://github.com/ollama/ollama.git
cd ollama
go generate ./...
go build .
```

### MLX Engine
For safetensor models on Apple Silicon. Automatically detected.

### Docker Build
```bash
docker build -t ollama .
# With ROCm:
docker build --build-arg FLAVOR=rocm -t ollama:rocm .
```

---

## 13. Uninstalling Ollama

### Linux
```bash
sudo systemctl stop ollama
sudo systemctl disable ollama
sudo rm /etc/systemd/system/ollama.service
sudo rm /usr/local/bin/ollama
sudo rm -rf /usr/share/ollama
sudo userdel ollama
sudo groupdel ollama
```

### macOS
Quit Ollama from menu bar, then:
```bash
rm -rf ~/.ollama
sudo rm -rf /usr/local/bin/ollama
```

---

*Phoenix AI System — GPT-OSS Complete Reference*
*Source: twin-peaks/00_RESEARCH/gpt_oss_reference/*
