---
name: phoenix-lookup
description: Query the Phoenix Electric knowledge base — architecture, API endpoints, configs, Shane's decisions, build specs, and all 8 phase runbooks. Use when anyone asks about Phoenix systems, Service Fusion, M365, RAG, Voice AI, fine-tuning, security, Gateway UI, Twin Peaks fleet, or build procedures.
---

# Phoenix Knowledge Base Lookup

You have access to a comprehensive knowledge base extracted from the Phoenix Electric Twin Peaks build documentation. Use it to answer questions accurately.

## Knowledge Files

All files are in `${CLAUDE_PLUGIN_ROOT}/knowledge/`:

### Phase Runbooks (8 files in `phases/`)
| File | Covers |
|------|--------|
| `phase_01_gateway_ui.md` | Dashboard UI, CSS design system, panel layout, component classes, responsive breakpoints, deployment |
| `phase_02_twin_peaks.md` | Dual-Ollama fleet, memory budgets, model assignments, circuit breakers, routing categories, 70B swap protocol |
| `phase_03_service_fusion.md` | SF MCP server, 16 active tools, OAuth flow, pricebook tiers, Rexel catalog, polling engine, rate limiter |
| `phase_04_m365.md` | Microsoft Graph, Outlook/Calendar/SharePoint/Teams, 17 API endpoints, Teams bot, Echo identity training |
| `phase_05_rag_pipeline.md` | ChromaDB, embedding pipeline, chunking strategies, retrieval engine, re-ranking, semantic cache, generation |
| `phase_06_security.md` | OAuth PKCE, JWT, RBAC, WebAuthn biometric, sandbox replacement, CSP, Key Vault, threat model |
| `phase_07_voice_ai.md` | WebRTC, Twilio, Whisper STT, voice tools, Echo personality, voice routing, cost analysis |
| `phase_08_fine_tuning.md` | LoRA config, SFT training, synthetic data, RunPod H100, GGUF conversion, A/B shadow routing, evaluation |

### Reference Files (3 files in `reference/`)
| File | Covers |
|------|--------|
| `research_bible.md` | 12-agent research swarm findings, technology comparisons, ecosystem analysis, top 25 priorities |
| `gpt_oss_reference.md` | GPT-OSS model specs, Ollama CLI/API, Harmony format, MCP patterns, cookbooks, performance tuning |
| `architecture.md` | System architecture, data flows, fleet design, circuit breakers, MCP security, dashboard arch, risk matrix |
| `build_specs.md` | Modelfiles, gateway config, MCP server code, benchmark suites, LaunchAgent plists, port map, LoRA config |

### Decisions (1 file in `decisions/`)
| File | Covers |
|------|--------|
| `shanes_decisions.md` | Shane's 8 core principles, all 12 Q&A decisions, technology choices, rejected alternatives, open questions |

## How to Use

1. **Identify the topic** from the user's question
2. **Read the relevant knowledge file(s)** using the Read tool
3. **Answer with specifics** — exact config values, endpoint paths, command lines, not vague summaries
4. **Cite the source** — mention which phase or document the answer comes from
5. **Flag open questions** — if the answer involves a pending Shane decision, say so

## Example Queries

- "What port does Fleet B run on?" → Read phase_02, find port 11435
- "What are the SF pricebook tiers?" → Read phase_03, find 7-tier structure
- "What did Shane decide about DeepSeek?" → Read shanes_decisions.md, find permanent ban
- "How does the RAG chunking work?" → Read phase_05, find chunking pipeline config
- "What's the WebAuthn flow?" → Read phase_06, find biometric gate section
