# Phase 8: Fine-Tuning Pipeline — Complete Knowledge Reference

**Source Runbook:** `twin-peaks/05_RUNBOOKS/PHASE_08_FINETUNING.md`
**Source Playbook:** `twin-peaks/06_PLAYBOOKS/PHASE_08_PLAYBOOK.md`
**Extraction Date:** 2026-03-10
**Status:** RUNBOOK READY
**Lead System:** Mac Studio M3 Ultra (inference/serving) + RunPod H100 SXM5 (training)
**Dependencies:** Phase 2 (Twin Peaks Fleet operational), Phase 5 (RAG Pipeline for evaluation baseline)

---

## Shane's Directives

> "FREEDOM TO GROW AND DEVELOP THE MODEL THAT IS RESPONSIBLE FOR A MASSIVE AMOUNT OF THE DAY TO DAY OPERATIONS."

> "THE PRIMARY AI WILL BE LOCAL FOR 90% OF OPERATIONS. ITS ME WHO WILL BE PERSONALLY MANAGING OVERSIGHT AND CAPABILITIES OF THE FRONTIER MODELS."

> "IM GOOD WITH DEVELOPMENTAL USE TO CREATE THE TRAINING METHOD AND GENERATE THE SYSTEM. NOT LONG TERM THOUGH."

> "Not dependency -- utilization. Study the best, extract the value, build your own."

---

## Architecture Overview

### Pipeline Flow

```
DAILY OPERATIONS (interaction capture)
    |
    v
DATA PIPELINE: RAW LOGS --> PII STRIP --> FILTER --> ANNOTATE --> TRAINING SET
    |
    +-- SYNTHETIC DATA (Claude Opus, developmental use only)
    |
    v
RUNPOD H100 TRAINING: GPT-OSS 20B base --> LoRA Training (r=8, MoE expert layers) --> Merged Model (bf16)
    |
    v
CONVERSION & DEPLOYMENT: Merged Model (44GB bf16) --> GGUF Convert (llama.cpp) --> Quantize (Q4_K_M, ~16GB) --> Ollama create
    |
    v
MAC STUDIO FLEET B (Port 11435):
  - echo-gptoss-ft       (general persona)
  - echo-gptoss-ft-cod   (coder persona)
  - echo-gptoss-ft-ana   (analyst persona)
```

### End State Goal

Echo's personality and domain expertise baked into local model weights. System prompts shrink from 1000+ tokens to under 200. Claude used for frontier tasks only, not daily operations. 90% local operations.

---

## Technology Stack

### Base Models

| Model | Role | License | Source | Params |
|-------|------|---------|--------|--------|
| **GPT-OSS 20B (MXFP4)** | Primary fine-tuning target | Apache 2.0 | `openai/gpt-oss-20b` on HuggingFace | 22B (MoE architecture) |
| qwen2.5-coder:7b | Coder persona fallback | Apache 2.0 | Ollama registry | 7B |
| llama3.1:8b | Alternative fine-tuning target (smaller) | Llama 3.1 Community | Ollama registry | 8B |

**HARD RULE: DeepSeek is BANNED.** Never use as base model, training data source, or evaluation reference. CrowdStrike confirmed: kill switch in weights, 50% code vulnerability spike on geopolitical triggers. This is permanent.

### Training Infrastructure

| Component | Specification | Cost |
|-----------|--------------|------|
| **Training GPU** | RunPod H100 SXM5 80GB HBM3 | ~$3.49/hr on-demand |
| **Docker image** | `runpod/pytorch:2.3.0-py3.11-cuda12.1.0` | -- |
| **Persistent volume** | 100GB (model weights + checkpoints) | Included |
| **Inference/serving** | Mac Studio M3 Ultra 96GB (owned) | $0 |
| **Serving port** | Fleet B, Port 11435 | -- |

### Python Dependencies (Training)

```
transformers>=4.45.0
peft>=0.12.0
trl>=0.11.0
datasets
accelerate
bitsandbytes
torch (PyTorch 2.3.0)
```

### Python Dependencies (Data Pipeline)

```
anthropic (Claude SDK, uses ANTHROPIC_AUTH_TOKEN OAuth)
spacy (en_core_web_sm for NER-based PII detection)
```

### Additional Tools

| Tool | Purpose |
|------|---------|
| `llama.cpp` | GGUF conversion (`convert_hf_to_gguf.py`) and quantization (`llama-quantize`) |
| `vLLM` | Fallback serving if GGUF conversion fails (Metal backend on Apple Silicon) |
| `Ollama` | Production model serving on Fleet B |
| `rsync` | Transfer training data and adapters between Mac Studio and RunPod |

---

## Training Data Specification

### Directory Structure

```bash
~/Phoenix_Local/TRAINING_DATA/
  raw_logs/
  filtered/
  annotated/
  training_sets/
  synthetic/
    claude_generated/
    templates/
    validation/
  archive/
  evaluations/
  scripts/
```

### Data Schema (v1)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "timestamp", "messages", "pii_stripped"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "string", "format": "date-time" },
    "session_id": { "type": "string", "format": "uuid" },
    "source": { "enum": ["live", "synthetic", "curated"] },
    "persona": { "enum": ["general", "coder", "analyst"] },
    "routing": {
      "type": "object",
      "properties": {
        "category": { "enum": ["code", "reasoning", "reasoning-heavy", "general", "email", "data-extraction", "complex", "tool-use"] },
        "model": { "type": "string" },
        "fleet": { "enum": ["A", "B"] },
        "reasoning_level": { "enum": ["low", "medium", "high"] }
      }
    },
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["role", "content"],
        "properties": {
          "role": { "enum": ["developer", "user", "assistant"] },
          "content": { "type": "string" }
        }
      }
    },
    "harmony_channels": {
      "type": "object",
      "properties": {
        "developer": { "type": ["string", "null"] },
        "analysis": { "type": ["string", "null"] },
        "final": { "type": ["string", "null"] }
      }
    },
    "tool_calls": { "type": "array" },
    "tool_results": { "type": "array" },
    "structured_output_schema": { "type": ["object", "null"] },
    "metrics": {
      "type": "object",
      "properties": {
        "prompt_eval_count": { "type": "integer" },
        "prompt_eval_duration_ns": { "type": "integer" },
        "eval_count": { "type": "integer" },
        "eval_duration_ns": { "type": "integer" },
        "load_duration_ns": { "type": "integer" },
        "total_duration_ns": { "type": "integer" }
      }
    },
    "quality": {
      "type": "object",
      "properties": {
        "user_accepted": { "type": ["boolean", "null"] },
        "output_edited": { "type": ["boolean", "null"] },
        "structured_parse_success": { "type": ["boolean", "null"] },
        "latency_acceptable": { "type": ["boolean", "null"] }
      }
    },
    "pii_stripped": { "type": "boolean" }
  }
}
```

### Harmony-Compatible Training Format (JSONL)

Training data MUST use the Harmony chat template that GPT-OSS was trained on. TRL's SFTTrainer handles tokenization automatically with the model's tokenizer.

```jsonl
{"messages": [{"role": "developer", "content": "You are Echo, an AI assistant for Phoenix Electric..."}, {"role": "user", "content": "What size wire do I need for a 200A service entrance?"}, {"role": "assistant", "content": "For a 200A residential service entrance per NEC 2023, Article 310.16..."}]}
```

**CRITICAL:** Use `developer` role (not `system`). This is the Harmony format.

### Data Category Minimums

| Category | Minimum Records | Priority | Source |
|----------|----------------|----------|--------|
| Echo personality/identity | 100 | HIGHEST | Synthetic (Claude-generated) |
| NEC code compliance | 200 | HIGH | Synthetic + live |
| Job cost estimation | 200 | HIGH | Live + synthetic |
| Customer communication | 150 | HIGH | Live + synthetic |
| Structured output (JSON) | 200 | HIGH | Synthetic |
| Tool calling examples | 150 | MEDIUM | Synthetic |
| Material/procurement | 100 | MEDIUM | Live |
| Code generation | 150 | MEDIUM | Live + synthetic |
| Dispatch/scheduling | 100 | MEDIUM | Live |
| General business | 150 | LOW | Live |
| **Total minimum** | **1,500** | | |

### Data Thresholds

| Requirement | Threshold | Source |
|-------------|-----------|--------|
| Minimum filtered records | 1,500 | Live fleet interaction logs |
| Target filtered records | 5,000+ | Live logs + synthetic generation |
| Synthetic records (Claude-generated) | 500-2,000 | Claude Opus via generation scripts |
| Quality-annotated records | 80% of filtered set | Manual review + automated checks |
| PII-stripped | 100% of training set | Automated pipeline + manual audit |
| Harmony format preserved | 100% of GPT-OSS records | Logging middleware captures channels |

### Data Volume Projections

| Adoption Level | Queries/Day | Month 3 Raw | After Filtering (60%) | vs Minimum (1,500) |
|----------------|-------------|-------------|----------------------|---------------------|
| Low (Shane only) | 15-25 | 1,350-2,250 | 810-1,350 | BELOW -- delay training |
| Medium (office staff) | 40-60 | 3,600-5,400 | 2,160-3,240 | ABOVE -- proceed |
| High (full adoption) | 80-120 | 7,200-10,800 | 4,320-6,480 | TARGET MET |

---

## Step 1: Data Collection Infrastructure (Month 1 -- FREE)

### Logging Middleware

**File:** `gateway/middleware/training-logger.js`

Captures every request to both Ollama fleets with full metadata:
- UUID record ID
- ISO timestamp and session ID
- Routing metadata: category, model, fleet, reasoning_level
- Full message array with roles
- Harmony channels: developer, analysis, final
- Tool calls and results
- Structured output schema
- Performance metrics: prompt_eval_count, eval_count, durations
- Quality signals (initially null, populated by annotation)
- PII stripped flag

**Log storage:** `~/Phoenix_Local/TRAINING_DATA/raw_logs/`
**Filename format:** `{timestamp}_{uuid}.jsonl`

### Automated Quality Signal Capture

| Signal | Automated? | Method |
|--------|-----------|--------|
| Structured output parse success | YES | `JSON.parse()` on assistant response when schema was provided |
| Latency acceptable | YES | Compare `total_duration_ns` against target (interactive: 5s, batch: 30s) |
| Tool call success | YES | Check if tool_results contain errors |
| Response length anomaly | YES | Flag if response < 10 tokens or > 4000 tokens |

---

## Step 2: PII Stripping Pipeline (Month 1)

### PII Detection Rules

| PII Type | Detection Method | Replacement |
|----------|-----------------|-------------|
| Phone numbers | Regex: `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b` | `[PHONE]` |
| Email addresses | Regex: standard email pattern | `[EMAIL]` |
| Street addresses | NER (spaCy `en_core_web_sm`) + regex | `[ADDRESS]` |
| Customer names | NER (PERSON entity) + known customer list | `[CUSTOMER]` |
| Job site addresses | Same as street addresses | `[JOBSITE]` |
| Financial amounts | Regex: `\$[\d,]+\.?\d*` | **Preserved** (training-relevant) |
| Job/PO numbers | Regex: business-specific patterns | `[JOB_ID]` / `[PO_NUM]` |

### PII Stripping Script

**File:** `~/Phoenix_Local/TRAINING_DATA/scripts/pii_strip.py`

```python
PHONE_RE = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
ADDRESS_RE = re.compile(r'\b\d{1,5}\s+[A-Z][a-z]+\s+(St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Cir)\b', re.IGNORECASE)
```

Processes all message content fields and harmony_channels (developer, analysis, final).

### Nightly Filter Job

```bash
# Cron: runs at 2 AM daily
0 2 * * * /usr/bin/python3 ~/Phoenix_Local/TRAINING_DATA/scripts/nightly_filter.py
```

Steps:
1. Strip PII from new raw logs
2. Remove empty/system-only conversations
3. Deduplicate near-identical requests (Levenshtein similarity > 0.9 = duplicate)
4. Move processed raw logs to archive

---

## Step 3: Synthetic Data Generation with Claude (Month 2-3)

### Purpose

Claude Opus generates training examples for:
- Reaching training threshold when not enough real interactions
- Rare scenarios (NEC violations, emergency dispatch)
- Echo personality consistency
- Structured output format training

**This is developmental use -- building the training system, not long-term dependency.**

### Generation Script

**File:** `~/Phoenix_Local/TRAINING_DATA/scripts/generate_synthetic.py`

- **API client:** `anthropic.Anthropic()` using `ANTHROPIC_AUTH_TOKEN` (OAuth, not API key)
- **Model for generation:** `claude-sonnet-4-20250514` (Sonnet for bulk generation, cost-effective)
- **Output dir:** `~/Phoenix_Local/TRAINING_DATA/synthetic/claude_generated/`

### Synthetic Generation Parameters

**Personas:** `['general', 'coder', 'analyst']`

**Topics:**
- Job cost estimation for 200A service upgrade
- NEC 2023 Article 210 branch circuit requirements
- Scheduling emergency service call
- Customer follow-up after panel replacement
- Material takeoff for commercial TI
- Permit application for new construction
- OSHA confined space requirements
- Warranty claim on recent installation

**User roles:** `['owner', 'office_manager', 'lead_electrician', 'apprentice']`

### Synthetic Data Templates

**Template A: Echo Personality Injection** -- Generates conversations for a specific persona/topic/user_role. Rules: confident but says "I'm not certain" when appropriate, cites NEC edition/article/section, plain language unless technical user, financial caveats always included.

**Template B: Domain-Specific Scenarios** -- Generates across 8 categories: job cost estimation, NEC 2023 compliance, service call dispatch, customer communication, material procurement, permit/inspection coordination, safety/OSHA, warranty/callback handling. Uses `[CUSTOMER]`, `[ADDRESS]`, `[PHONE]` placeholders.

**Template C: Tool Calling Training** -- Generates examples with 5 tools: `calculate_job_cost`, `lookup_nec_code`, `check_material_price`, `schedule_dispatch`, `generate_estimate`. Uses Harmony format with analysis and final channels.

### Synthetic Data Validation Rules

1. Valid JSONL parse
2. Contains `messages` array with `developer`, `user`, and `assistant` roles
3. No actual PII (scan with PII stripper)
4. Response length between 50 and 2000 tokens
5. If structured output, JSON is valid
6. Domain terminology spot-check (sample 10%, manual review)

**Quality gate:** 95% of synthetic records must pass automated validation. Manual review of 50 random samples before including in training set.

---

## Step 4: LoRA Training Configuration (Month 3-4)

### LoRA Config (MoE-Specific)

**CRITICAL:** GPT-OSS is a Mixture of Experts model. Standard LoRA targeting only attention layers adapts ~16% of what matters. The `target_parameters` argument MUST include MoE expert layers.

```python
from peft import LoraConfig

peft_config = LoraConfig(
    r=8,                          # Start with 8; increase to 16 ONLY if insufficient
    lora_alpha=16,                # Maintain alpha/r = 2.0 ratio
    lora_dropout=0.05,            # Light dropout for regularization
    target_modules="all-linear",  # Attention + expert layers
    target_parameters=[
        # Subset of MoE expert projection layers (not all -- memory constraint)
        # Layers 7, 15, 23 per OpenAI's official fine-tuning guide
        "7.mlp.experts.gate_up_proj",
        "7.mlp.experts.down_proj",
        "15.mlp.experts.gate_up_proj",
        "15.mlp.experts.down_proj",
        "23.mlp.experts.gate_up_proj",
        "23.mlp.experts.down_proj",
    ],
    bias="none",
    task_type="CAUSAL_LM",
)
```

### Why These Specific Layers

- Layers 7, 15, 23 distributed across early, middle, and late blocks
- Targeting ALL expert layers in all 24+ blocks exceeds H100 80GB memory
- Official OpenAI guide validated this subset as effective
- Gating/router layer (`mlp.gate`) intentionally NOT targeted -- changing routing destabilizes general capability

### SFTConfig (Training Arguments)

```python
from trl import SFTConfig

training_args = SFTConfig(
    output_dir="gpt-oss-20b-phoenix-echo",
    learning_rate=2e-4,
    lr_scheduler_type="cosine_with_min_lr",
    lr_scheduler_kwargs={"min_lr_rate": 0.1},
    warmup_ratio=0.03,
    num_train_epochs=1,                      # Start with 1; increase based on eval loss
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,           # Effective batch size = 16
    gradient_checkpointing=True,             # Required for memory on H100
    max_length=2048,                         # Increase to 4096 if conversations are long
    bf16=True,
    logging_steps=10,
    save_steps=100,                          # Checkpoint every 100 steps
    eval_strategy="steps",
    eval_steps=50,
    seed=42,
    report_to="none",                        # No WandB -- keep it simple
)
```

### Model Loading (MXFP4 Dequantization)

**CRITICAL:** MXFP4 weights must be dequantized to bf16 for training. Cannot train in MXFP4 directly.

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, Mxfp4Config

quantization_config = Mxfp4Config(dequantize=True)

model = AutoModelForCausalLM.from_pretrained(
    "openai/gpt-oss-20b",
    attn_implementation="eager",
    torch_dtype=torch.bfloat16,
    quantization_config=quantization_config,
    use_cache=False,               # Must be False during training
    device_map="auto",
)

tokenizer = AutoTokenizer.from_pretrained("openai/gpt-oss-20b")
```

### Key Training Hyperparameters Summary

| Parameter | Value | Notes |
|-----------|-------|-------|
| LoRA rank (r) | 8 | Increase to 16 only if results insufficient |
| LoRA alpha | 16 | Alpha/r ratio = 2.0 |
| LoRA dropout | 0.05 | Light regularization |
| Target modules | `all-linear` | All attention + expert linear layers |
| MoE target layers | 7, 15, 23 | gate_up_proj and down_proj for each |
| Bias | none | -- |
| Learning rate | 2e-4 | -- |
| LR scheduler | cosine_with_min_lr | min_lr_rate=0.1 |
| Warmup ratio | 0.03 | -- |
| Epochs | 1 (start) | Increase based on eval loss |
| Batch size (per device) | 4 | -- |
| Gradient accumulation | 4 | Effective batch = 16 |
| Gradient checkpointing | True | Required for H100 memory |
| Max sequence length | 2048 | Increase to 4096 if needed |
| Precision | bf16 | -- |
| Seed | 42 | -- |
| Data split | 90% train / 10% eval | -- |

---

## Step 5: Training Execution (Month 4)

### RunPod Setup

```bash
# 1. Create RunPod instance
#    GPU: H100 SXM5 80GB
#    Docker: runpod/pytorch:2.3.0-py3.11-cuda12.1.0
#    Persistent volume: 100GB
#    Cost: $3.49/hr x 4-6 hours = $14-21

# 2. Install dependencies
pip install transformers>=4.45.0 peft>=0.12.0 trl>=0.11.0 datasets accelerate bitsandbytes

# 3. Upload training data from Mac Studio
rsync -avz ~/Phoenix_Local/TRAINING_DATA/training_sets/ runpod:/workspace/training_data/
```

### Three Persona Training Runs

| Persona | Ollama Name | Training Data Focus | Synthetic Weight | Epochs |
|---------|-------------|---------------------|-----------------|--------|
| **General** | `echo-gptoss-ft` | Customer comms, general business, scheduling | Echo personality examples (50%) | 1-2 |
| **Coder** | `echo-gptoss-ft-coder` | Code generation, debugging, architecture, patches | ES module patterns, JSDoc, minimal-diff (30%) | 1 |
| **Analyst** | `echo-gptoss-ft-analyst` | Job costing, material takeoff, NEC, invoicing | Financial calculations, structured output (40%) | 2-3 |

**Train separately for each persona.** Each gets its own LoRA adapter, training data subset, and Modelfile. They share the same base model.

### Personality Injection Layers

**Layer 1: Explicit Identity (100+ examples)** -- "Who are you?", "What company is this for?", "Tell me about your capabilities" -- teaches the model WHO it is.

**Layer 2: Communication Style (500+ examples)** -- Direct/professional/no fluff patterns. Safety-first patterns. Numbers-with-caveats patterns. Teaches HOW to communicate.

**Layer 3: Domain Knowledge (1,000+ examples)** -- NEC expertise, job costing, tool use. Makes the model an electrical contracting specialist.

### Training Cost Estimates

| Scenario | Records | Config | Hours | Cost |
|----------|---------|--------|-------|------|
| Validation run | 1,700 | r=8, 1 epoch | 1-3 | $3.50-10.50 |
| Production run | 7,300 | r=8, 2 epochs | 4-9 | $14-31 |
| Month 4 budget (including experiments) | -- | 3-5 experiment runs + final | -- | $150-300 |

### Checkpoint Management

- Save every 100 steps
- Evaluate on held-out set every 50 steps
- If crash: resume from last checkpoint (`trainer.train(resume_from_checkpoint=True)`)
- Download final adapter (typically 50-200MB) to Mac Studio via rsync
- Keep checkpoints on RunPod persistent volume for 30 days, then archive to local

---

## Step 6: Evaluation (Month 4, Post-Training)

### Evaluation Protocol

Three evaluation dimensions:
1. **Domain Quality** (must improve): 20 electrical contracting prompts
2. **General Quality** (must hold): 10 general purpose prompts
3. **Regression Check** (must not degrade): 20 non-domain benchmark prompts

### Evaluation Prompts (Domain-Specific, 10 of 20)

| # | Category | Prompt | Expected Quality |
|---|----------|--------|-----------------|
| 1 | Job costing | "Estimate labor for 200A service upgrade, 150ft wire pull" | Hours + material list + caveats |
| 2 | NEC compliance | "Article 210.52 kitchen GFCI requirements for 2023" | Exact code cite, no hallucination |
| 3 | Material takeoff | "Bill of materials for 400A CT cabinet with 4 meters" | Complete BOM, correct sizes |
| 4 | Customer email | "Draft follow-up email after panel replacement, include warranty" | Professional, Phoenix branded |
| 5 | Dispatch | "Emergency: customer reports burning smell from panel, prioritize" | Safety-first, triage |
| 6 | Structured output | "Parse this invoice into JSON: [invoice text]" | Valid JSON, all fields |
| 7 | Code generation | "Write Node.js MCP tool for SF job lookup" | ES modules, JSDoc, async/await |
| 8 | Identity | "Who are you?" | "I'm Echo, Phoenix Electric's AI..." |
| 9 | Safety | "Can I tap a 200A service with a hot stick?" | Safety refusal with code reference |
| 10 | Multi-step | "Customer wants 400A upgrade from 200A. Walk me through." | Complete project plan |

### Scoring Rubric

| Dimension | Weight | 0 (Fail) | 0.5 (Partial) | 1.0 (Pass) |
|-----------|--------|----------|---------------|------------|
| Factual accuracy | 30% | Wrong NEC code or calculation | Correct but missing caveats | Correct with proper citations |
| Echo personality | 20% | Generic AI response | Some Echo qualities | Unmistakably Echo |
| Structured output | 20% | Invalid/missing JSON | Valid but incomplete | Complete and schema-compliant |
| Conciseness | 15% | Rambling or too terse | Acceptable length | Right-sized for query |
| Safety awareness | 15% | Unsafe recommendation | Safe but vague | Safe with code references |

### Pass/Fail Gates

| Gate | Threshold | Action if Failed |
|------|-----------|-----------------|
| Domain quality score | >= 0.7 average | Increase training data, add more domain examples |
| General quality score | >= 0.6 average | Reduce epochs, check for overfitting |
| Regression check | No more than -0.1 delta from base | Reduce LoRA rank, remove problematic training data |
| Echo personality score | >= 0.8 on identity prompts | Add more personality injection examples |

### Primary Metrics

| Metric | How Measured | Target |
|--------|-------------|--------|
| Domain accuracy | Expert review of 20 domain prompts (0-1 rubric) | >= 0.7 average |
| Echo personality match | Expert review of 10 identity prompts (0-1 rubric) | >= 0.8 average |
| Structured output compliance | Automated JSON parse + schema validation | >= 95% success |
| NEC code accuracy | Expert verification of code citations | 0% hallucinated codes |
| System prompt savings | Compare prompt_eval_count base vs fine-tuned | >= 50% reduction |
| Inference latency | Compare total_duration_ns under same conditions | <= base model + 10% |

### Secondary Metrics

| Metric | How Measured | Target |
|--------|-------------|--------|
| General capability retention | Benchmark suite (non-domain prompts) | >= 0.9x base score |
| Tool calling success rate | Automated: did tool call parse correctly? | >= 90% |
| Safety compliance | Review of safety-tagged responses | 0 regressions |
| Response length efficiency | Average token count vs base model | <= 1.1x base |

### Expected Quality Improvements (Before vs After)

| Dimension | Base + Prompt | Fine-Tuned |
|-----------|-------------|------------|
| Domain Accuracy | 0.60 | 0.85 |
| Echo Personality | 0.40 | 0.90 |
| NEC Code Accuracy | 0.50 | 0.80 |
| Structured Output | 0.60 | 0.95 |
| Prompt Token Cost | 1,200 tokens | 180 tokens |
| Latency (prompt eval) | 800ms | 120ms |

---

## Step 7: Deployment to Ollama (Month 4-5)

### Conversion Pipeline

```
LoRA adapter (50-200MB)
    |
    v
Step 1: Merge adapter with base (PeftModel.merge_and_unload()) -> ~44GB bf16
    |
    v
Step 2: Validate merged model (10 test prompts, quality must match adapter +-0.02)
    |
    +--> SUCCESS --> Step 3: GGUF convert (llama.cpp convert_hf_to_gguf.py, --outtype bf16)
    |                    |
    |                    v
    |                Step 4: Quantize (Q4_K_M first, Q5_K_M if quality drops) -> ~16GB
    |                    |
    |                    v
    |                Step 5: Ollama create (echo-gptoss-ft -f Modelfile) -> Fleet B port 11435
    |
    +--> FAILURE --> FALLBACK: Serve via vLLM on Studio (port 11436, --dtype bfloat16)
```

### Merge Script

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, Mxfp4Config
import torch

quantization_config = Mxfp4Config(dequantize=True)
base_model = AutoModelForCausalLM.from_pretrained(
    "openai/gpt-oss-20b",
    torch_dtype=torch.bfloat16,
    quantization_config=quantization_config,
    device_map="auto",
)

model = PeftModel.from_pretrained(base_model, "/workspace/checkpoints/echo-gptoss-v1/final")
merged = model.merge_and_unload()
merged.save_pretrained("/workspace/merged/echo-gptoss-v1-merged")
```

### GGUF Conversion Commands

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Convert to GGUF
python convert_hf_to_gguf.py \
  /workspace/merged/echo-gptoss-v1-merged \
  --outtype bf16 \
  --outfile echo-gptoss-v1-bf16.gguf

# Quantize to Q4_K_M
./llama-quantize echo-gptoss-v1-bf16.gguf echo-gptoss-v1-Q4_K_M.gguf Q4_K_M
```

**RISK:** MoE GGUF conversion is non-trivial. If `convert_hf_to_gguf.py` fails for GPT-OSS architecture, fall back to vLLM serving.

### Modelfile for Fine-Tuned Model

```modelfile
FROM ./echo-gptoss-v1-Q4_K_M.gguf

PARAMETER temperature 1.0
PARAMETER top_p 1.0
PARAMETER num_ctx 16384
PARAMETER keep_alive 10m

SYSTEM """
You are Echo, Phoenix Electric's AI assistant.
Reasoning: medium
"""
```

**Note:** System prompt is dramatically shorter (~180 tokens vs ~1,200). Echo's personality, domain knowledge, NEC expertise, and communication style are IN THE WEIGHTS. Saves ~800 tokens per request (85% reduction).

### vLLM Fallback (If GGUF Fails)

```bash
pip install vllm

vllm serve /path/to/echo-gptoss-v1-merged \
  --host 127.0.0.1 \
  --port 11436 \
  --max-model-len 16384 \
  --dtype bfloat16
```

Gateway routes to port 11436 instead of 11435 for fine-tuned model. vLLM on Apple Silicon uses Metal backend.

---

## Step 8: A/B Testing and Shadow Routing (Month 5)

### Shadow Routing Protocol

1. Every request routed to GPT-OSS is ALSO sent to fine-tuned model
2. Only base model response served to user
3. Both responses logged with full metadata
4. After 500+ request pairs: manual quality audit of 50 divergent pairs
5. If fine-tuned wins >= 60% of divergent pairs: promote to primary

### Promotion Criteria

| Metric | Threshold | Measurement |
|--------|-----------|-------------|
| Win rate on divergent pairs | >= 60% | Manual review of 50 pairs |
| Structured output success rate | >= improvement | Compare parse success rates |
| Average latency | <= base model latency | Compare total_duration_ns |
| Personality consistency | >= 0.8 on identity rubric | Spot-check 20 responses |
| No safety regressions | 0 safety failures | Review all safety-tagged queries |

### Promotion Commands

```bash
# Step 1: Stop serving base model
curl -X POST http://localhost:11435/api/chat \
  -d '{"model": "echo-gptoss", "keep_alive": 0}'

# Step 2: Load fine-tuned model
curl -X POST http://localhost:11435/api/chat \
  -d '{"model": "echo-gptoss-ft", "keep_alive": "-1"}'

# Step 3: Update Gateway routing config
# Set echo-gptoss-ft as primary for Fleet B
```

---

## Fleet B Model Configuration

### Fine-Tuned Models on Fleet B (Port 11435)

| Model Name | Persona | Memory | Status | Quality |
|------------|---------|--------|--------|---------|
| `echo-gptoss-ft` | General | 16.2 GB | WARM (always loaded) | 0.85 |
| `echo-gptoss-ft-coder` | Coder | 16.2 GB | READY (swap-in) | 0.81 |
| `echo-gptoss-ft-analyst` | Analyst | 16.2 GB | READY (swap-in) | 0.87 |
| `echo-gptoss` (base) | -- | -- | STANDBY | 0.60 |

Each persona = same base model + different LoRA adapter. Swap adapters without reloading the full 16GB model. All three are ECHO -- three facets, not three separate AIs.

### Fleet B Configuration

- **Port:** 11435
- **PARALLEL:** 2
- **KV cache:** q8_0
- **Active memory:** ~16.2 GB per model

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

```bash
# Unload fine-tuned model
curl -X POST http://localhost:11435/api/chat \
  -d '{"model": "echo-gptoss-ft", "keep_alive": 0}'

# Load base model
curl -X POST http://localhost:11435/api/chat \
  -d '{"model": "echo-gptoss", "keep_alive": "-1"}'

# Update Gateway config (single change, no restart required)
```

### Data Preservation Rules

- LoRA adapters (50-200MB): keep ALL versions, never delete
- Training data: immutable -- never overwrite, only append
- Checkpoints: keep for 90 days, then archive
- Evaluation results: keep permanently

### Rollback Triggers

| Trigger | Action |
|---------|--------|
| Safety failure (unsafe recommendation) | IMMEDIATE rollback, investigate training data |
| >10% quality regression on general tasks | Rollback, reduce LoRA rank or training data |
| Structured output failure rate increases | Rollback, add more structured output examples |
| Shane says "this isn't Echo" | Rollback, review personality injection examples |
| Latency increase >25% | Rollback, check quantization quality |

---

## Quarterly Retraining Cycle

### Schedule

| Quarter | Month | Records | Expected Domain Accuracy | Cost |
|---------|-------|---------|-------------------------|------|
| Q1 | Month 4 | ~2,800 | 0.85 | ~$150 |
| Q2 | Month 7 | ~6,500 | 0.89 | ~$200 |
| Q3 | Month 10 | ~12,000 | 0.92 | ~$250 |
| Q4 | Month 13 | ~18,000 | 0.94 | ~$250 |

### Each Quarter Procedure

1. New data from daily operations (automatic)
2. New synthetic data for weak areas (targeted)
3. Retrain all 3 personas
4. Evaluate against previous version
5. Shadow route for 1 week
6. Promote if improved
7. Keep previous version as rollback

### Quality Tracking

After each quarterly retraining:
1. Run full 50-prompt evaluation suite
2. Record scores in `~/Phoenix_Local/TRAINING_DATA/evaluations/`
3. Plot quality trajectory (should trend upward or plateau, never down)
4. If quality regresses: rollback to previous adapter, investigate training data

---

## Independence Roadmap

| Phase | Local % | Cloud % | If Cloud Disappears |
|-------|---------|---------|---------------------|
| Today (pre-training) | ~20% (routing + embedding) | ~80% (Claude for smart work) | Significantly degraded |
| Month 5 (post-first training) | 90% (70% fine-tuned + 20% base) | 10% (Claude frontier only) | 90% capability |
| Month 12 (post-third training) | 95% (85% fine-tuned + 10% base) | 5% (novel frontier) | 95% capability |
| Year 2+ | 95%+ | Training + novel only | System still works -- degraded, not dead |

---

## Cost Summary

### Fine-Tuning Costs

| Item | One-Time | Monthly | Quarterly |
|------|----------|---------|-----------|
| Mac Studio M3 Ultra (owned) | $0 | $0 | $0 |
| Fleet infrastructure (power, network) | $0 | ~$68 | ~$204 |
| RunPod H100 training | -- | -- | $150-300 |
| Claude Opus (synthetic data, OAuth sub) | $0 | Included in subscription | $0 |
| Storage (training data, adapters) | $0 | Negligible (local) | $0 |
| **Total** | **$0** | **~$68** | **$150-300 training** |

**Year 1 total:** ~$816 infrastructure + $600-1,200 training = **$1,416-$2,016**

vs $6,000-20,000/year for equivalent cloud AI services.

---

## Gauntlet Checklist

### Pre-Training Gate (Month 3 Checkpoint)

- [ ] **DATA-001:** >= 1,500 filtered, PII-stripped training records available
- [ ] **DATA-002:** >= 80% of records have quality annotations
- [ ] **DATA-003:** Data schema validated against specification
- [ ] **DATA-004:** Harmony format channels preserved in all GPT-OSS records
- [ ] **DATA-005:** Deduplication pass complete (< 5% duplicate rate)
- [ ] **DATA-006:** Synthetic data generated, validated, and merged into training set
- [ ] **DATA-007:** PII stripping verified by manual audit of 50 random records
- [ ] **DATA-008:** Data split: 90% training / 10% evaluation (held out)

### Pre-Training Configuration Gate

- [ ] **CONFIG-001:** LoRA config includes MoE `target_parameters` for layers 7, 15, 23
- [ ] **CONFIG-002:** `Mxfp4Config(dequantize=True)` confirmed in model loading
- [ ] **CONFIG-003:** Harmony chat template used by tokenizer (not custom override)
- [ ] **CONFIG-004:** All three persona training sets prepared
- [ ] **CONFIG-005:** RunPod H100 SXM5 instance tested (can load GPT-OSS 20b)
- [ ] **CONFIG-006:** Budget confirmed: <= $300 for Month 4 experiments

### Post-Training Evaluation Gate

- [ ] **EVAL-001:** Domain quality score >= 0.7 on 20-prompt evaluation
- [ ] **EVAL-002:** Echo personality score >= 0.8 on identity prompts
- [ ] **EVAL-003:** General capability retention >= 0.9x base model
- [ ] **EVAL-004:** Structured output success rate >= 95%
- [ ] **EVAL-005:** Zero hallucinated NEC codes
- [ ] **EVAL-006:** Zero safety regressions
- [ ] **EVAL-007:** Inference latency <= base model + 10%
- [ ] **EVAL-008:** System prompt token count reduced >= 50%

### Deployment Gate

- [ ] **DEPLOY-001:** GGUF conversion successful (or vLLM fallback operational)
- [ ] **DEPLOY-002:** Model loads in Ollama Fleet B without errors
- [ ] **DEPLOY-003:** Tool calling works end-to-end (Harmony format preserved)
- [ ] **DEPLOY-004:** Shadow routing completed (500+ request pairs)
- [ ] **DEPLOY-005:** Fine-tuned model wins >= 60% of divergent pairs
- [ ] **DEPLOY-006:** Rollback procedure tested and verified
- [ ] **DEPLOY-007:** Shane's approval received ("This IS Echo")

### Ongoing Operations Gate

- [ ] **OPS-001:** Quarterly retraining schedule established
- [ ] **OPS-002:** Quality trajectory tracked across retraining cycles
- [ ] **OPS-003:** Training data volume growing (target: 5,000+ by Month 6)
- [ ] **OPS-004:** All LoRA adapters archived (never deleted)
- [ ] **OPS-005:** Evaluation results stored permanently

---

## Timeline Summary

| Month | Activities |
|-------|-----------|
| **Month 1** | Deploy logging middleware, create directory structure, PII stripping pipeline, start prompt engineering (Modelfiles) |
| **Month 2** | Synthetic data generation via Claude Opus, PII stripping validation, quality annotation system |
| **Month 3** | Month 3 GO/NO-GO checkpoint (>= 1,500 records, >= 2 fine-tune gates met, GGUF validated, budget <= $300) |
| **Month 4** | First training run on RunPod H100 (3 persona runs), GGUF conversion or vLLM fallback, evaluation (50 prompts, rubric) |
| **Month 5** | Shadow routing / A/B testing (500+ pairs), promotion decision, full deployment |
| **Month 6** | Second training run (5,000+ records), quality comparison vs first run, retrain all 3 personas |
| **Month 9+** | Quarterly retraining cycle, quality trajectory tracking, dataset growth |

---

## P0 Blockers (From Adversarial Review)

| ID | Blocker | Status | Resolution |
|----|---------|--------|------------|
| P0-10 | LoRA config missing MoE `target_parameters` | RESOLVED | Config includes layers 7, 15, 23 expert targeting per OpenAI guide |
| P0-11 | GGUF conversion pipeline not validated | MITIGATION PLANNED | Test pipeline before Month 4; vLLM fallback documented |

---

## Shane's Decision Points

| When | Decision | Options |
|------|----------|---------|
| Month 3 checkpoint | GO / NO-GO for first training run | GO if >= 1,500 records + GGUF validated. DELAY if not. |
| Month 4 post-training | Review evaluation results | DEPLOY if quality scores pass. RETRAIN if not. |
| Month 5 shadow routing | Review A/B comparison | PROMOTE if fine-tuned wins >= 60%. KEEP BASE if not. |
| Ongoing | "Does this sound like Echo?" | If NO: rollback, review personality data, retrain. |
| Quarterly | Approve retraining budget (~$200-300) | GO if quality improving. SKIP if plateau reached. |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Not enough training data by Month 3 | Delay training | Medium | Generate more synthetic data with Claude |
| GGUF conversion fails for MoE model | Can't use Ollama | Medium | Fall back to vLLM serving (same result, different tool) |
| Fine-tuned model sounds wrong | Bad Echo persona | Low | Rollback in <5 minutes, add more personality examples |
| NEC code hallucination | Safety liability | Very Low | Rollback immediately, add more verified NEC examples |
| Training cost exceeds budget | Financial | Low | Budget is conservative ($300 covers 5+ experiment runs) |
| General capability degrades | Model less useful | Low | Reduce LoRA rank, remove problematic data |

---

## References

| Source | Location |
|--------|----------|
| Research Bible Section 06 (Local AI Fleet) | `00_RESEARCH/research_bible/sections/reference__gateway__research-bible-section-06-local-ai-fleet__20260309.md` |
| Agent 7 Adversarial Review (Fine-Tuning) | `00_RESEARCH/adversarial_review/REVIEW_AGENT7_FINETUNING.md` |
| GPT-OSS Integration Plan (Section 7) | `01_ARCHITECTURE/GPT-OSS-INTEGRATION-PLAN.md` |
| Deep Research Prompt 07 | `00_RESEARCH/deep_research_prompts/PROMPT_07_FINETUNING_PIPELINE.md` |
| OpenAI GPT-OSS Fine-Tuning Guide | `00_RESEARCH/primary_sources/gpt-oss-finetune-guide.md` |
| Firecrawl Research Brief | `00_RESEARCH/deep_research_prompts/FIRECRAWL_RESEARCH_BRIEF.md` |
| Shane's Decisions | `07_SHANES_DECISIONS/SHANES_DECISIONS_COMPILED.md` |
| Companion Playbook | `06_PLAYBOOKS/PHASE_08_PLAYBOOK.md` |
