---
name: kb
description: Query the Phoenix Electric knowledge base. Usage: /kb <question>
arguments:
  - name: query
    description: Your question about Phoenix systems, architecture, configs, or decisions
    required: true
---

# Knowledge Base Query

Look up the answer to: $ARGUMENTS

## Instructions

1. Parse the query to identify which knowledge domain(s) it touches
2. Read the relevant file(s) from `${CLAUDE_PLUGIN_ROOT}/knowledge/`
3. Provide a concise, specific answer with exact values
4. Cite the source file

## Domain Routing

| Keywords | Read These Files |
|----------|-----------------|
| gateway, UI, dashboard, CSS, panels | `phases/phase_01_gateway_ui.md` |
| ollama, fleet, models, twin peaks, routing, circuit breaker | `phases/phase_02_twin_peaks.md` |
| service fusion, SF, customers, jobs, estimates, pricebook, rexel | `phases/phase_03_service_fusion.md` |
| M365, outlook, email, calendar, teams, sharepoint, graph | `phases/phase_04_m365.md` |
| RAG, embeddings, chromadb, vector, chunking, retrieval | `phases/phase_05_rag_pipeline.md` |
| security, auth, RBAC, JWT, WebAuthn, CSP, sandbox, key vault | `phases/phase_06_security.md` |
| voice, whisper, STT, TTS, WebRTC, twilio | `phases/phase_07_voice_ai.md` |
| fine-tune, LoRA, training, GGUF, runpod, evaluation | `phases/phase_08_fine_tuning.md` |
| research, comparison, ecosystem, priorities | `reference/research_bible.md` |
| GPT-OSS, harmony, modelfile, ollama API, cookbook | `reference/gpt_oss_reference.md` |
| architecture, data flow, system design, risk | `reference/architecture.md` |
| build, config, launchagent, ports, MCP server code | `reference/build_specs.md` |
| shane, decision, philosophy, rejected, priority, budget | `decisions/shanes_decisions.md` |
