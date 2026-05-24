---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Quantitative tool scorecard for all proposed Gauntlet components
assumptions: Scores based on research findings dated 2026-03-07; Phoenix context = 2-person team, MacBook + Studio + VPS, <300 RPS
status: DRAFT — pending Shane review
---

# Tool Scorecard — Gauntlet Search Party Adversarial Review

Quantitative 1-10 rating matrix for every tool proposed in the Gauntlet Search Party Report. Each score is anchored to evidence in `EVIDENCE_APPENDIX.md` using `[E#]` citations. Scoring criteria are defined below the summary table.

---

## Summary Table

| Tool | Production Readiness | Integration Cost | Operational Burden | Phoenix Fit | Alternative Quality | Avg | Verdict |
|------|:---:|:---:|:---:|:---:|:---:|:---:|---------|
| **Coder/code-server** | 5 | 3 | 4 | 3 | 2 | 3.4 | REJECT NOW |
| **LiteLLM** | 3 | 6 | 3 | 2 | 2 | 3.2 | REJECT NOW |
| **OpenRouter** | 6 | 9 | 9 | 5 | 4 | 6.6 | DEFER UNTIL SCALE |
| **MCP ("the spine")** | 6 | 7 | 5 | 7 | 8 | 6.6 | USE IMMEDIATELY (scoped) |
| **Langfuse** | 5 | 5 | 3 | 2 | 3 | 3.6 | DEFER UNTIL SCALE |
| **OpenHands** | 4 | 4 | 4 | 2 | 1 | 3.0 | REJECT NOW |
| **Continue (VS Code)** | 4 | 3 | 5 | 2 | 1 | 3.0 | REJECT NOW |
| **Open WebUI** | 4 | 5 | 4 | 4 | 5 | 4.4 | DEFER UNTIL SCALE |
| **Dev Containers** | 7 | 5 | 5 | 4 | 5 | 5.2 | DEFER UNTIL SCALE |
| **Temporal** | 9 | 4 | 4 | 2 | 3 | 4.4 | DEFER UNTIL SCALE |

**Key:** 10 = best possible score in that dimension. See Scoring Criteria below for what each number means.

**Verdict distribution:** 4 REJECT NOW, 1 USE IMMEDIATELY (scoped), 5 DEFER UNTIL SCALE.

---

## Scoring Criteria

Each dimension is scored 1-10. Higher is better.

| Dimension | What 10 Means | What 1 Means |
|-----------|---------------|--------------|
| **Production Readiness** | Battle-tested for years, predictable failure modes, large user base | Alpha-quality, undocumented failure modes, few production deployments |
| **Integration Cost** | Drop-in replacement, < 1 day to wire up | Months of custom integration work, invasive architecture changes |
| **Operational Burden** | Zero-touch after deployment, self-healing, no maintenance | Full-time operator required, frequent manual intervention |
| **Phoenix Fit** | Perfect match for 2-person team, macOS-native, < 300 RPS scale | Designed for 1000-person enterprise, requires infrastructure Phoenix does not have |
| **Alternative Quality** | Nothing better exists for this job | Clearly superior alternatives already available and proven |

---

## Detailed Assessments

### 1. Coder / code-server

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| Production Readiness | **5** | Agent Boundaries feature is approximately 3 months old [E1]. Extension host crashes reported across multiple environments [E3][E4]. Core remote IDE functionality is stable, but the AI-agent features Phoenix would rely on are immature. |
| Integration Cost | **3** | Multi-device sync requires bolting on Syncthing or equivalent, which is not native to Coder [E2]. AGPL licensing [E2] adds legal review overhead. Configuration sprawl across devcontainer.json, Coder templates, and Syncthing topology. |
| Operational Burden | **4** | Each idle workspace consumes 0.1 vCPU + 256 MB RAM [E5]. At even modest workspace counts, this is non-trivial infrastructure to manage on a VPS. Requires monitoring, restart policies, and workspace lifecycle management. |
| Phoenix Fit | **3** | Coder is designed for enterprise teams sharing standardized environments. Phoenix is 2 people on known machines. The multi-device sync problem it would solve does not currently exist in the Phoenix workflow. Shane already has a working local setup. |
| Alternative Quality | **2** | DevPod [E6] provides workspace orchestration with less overhead. More importantly, Claude Code already delivers the agent-assisted workspace experience Shane uses daily — adding Coder creates a redundant layer. |

**Verdict: REJECT NOW**

Coder solves a problem Phoenix does not have. It adds enterprise workspace management to a team that already has a working local development setup with Claude Code. The integration cost (Syncthing, AGPL review, infra management) produces no proportional benefit at this scale.

---

### 2. LiteLLM

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| Production Readiness | **3** | Documented breakage at 300 RPS [E7]. Database bottleneck emerges at 1M log entries [E8]. Over 800 open issues on the tracker [E11]. This is an active project with fast iteration, but production stability is not yet reliable under load. |
| Integration Cost | **6** | Well-documented OpenAI-compatible API surface. Straightforward configuration for basic use cases. However, Claude extended thinking breaks through the proxy [E9][E10], which directly impacts Phoenix's primary model provider. |
| Operational Burden | **3** | Requires PostgreSQL or equivalent for logging. Database management, scaling workarounds for the log bottleneck, and version monitoring for breaking changes across rapid releases. Not zero-touch by any measure. |
| Phoenix Fit | **2** | Phoenix operates at less than 300 RPS — exactly the threshold where LiteLLM breaks. But even below that threshold, the proxy adds latency without proportional benefit [E13]. Phoenix uses 2-3 model providers; a gateway designed for dozens of providers is architectural excess. |
| Alternative Quality | **2** | Helicone benchmarks at 25-100x faster for the observability use case [E12]. For the routing use case at Phoenix scale, direct API calls with retry logic are simpler, faster, and cheaper. No gateway overhead, no proxy latency, no database dependency. |

**Verdict: REJECT NOW**

At Phoenix's scale, LiteLLM is a net negative. It adds latency, infrastructure burden, and a known failure point (extended thinking breakage) while solving a problem that direct API calls handle cleanly. The gateway abstraction becomes relevant at enterprise scale with 10+ providers and thousands of RPS.

**Candidates to evaluate if scale changes:** Helicone, Portkey [E51], direct API with retry wrapper.

---

### 3-10: [See full assessments in the complete file — OpenRouter, MCP, Langfuse, OpenHands, Continue, Open WebUI, Dev Containers, Temporal]

---

## Cross-Cutting Observations

### 1. The "REJECT NOW" tools share a pattern
Coder, LiteLLM, OpenHands, and Continue all fail for the same reason: they duplicate a capability Claude Code already provides, at higher operational cost. The Search Party Report did not account for the fact that Claude Code is already the primary tool and covers workspace management, model access, coding assistance, and IDE integration.

### 2. The "DEFER UNTIL SCALE" tools are not bad tools
OpenRouter, Langfuse, Open WebUI, Dev Containers, and Temporal are all legitimate solutions to real problems. The issue is timing and scale — Phoenix does not yet have the problems these tools solve. Each has a concrete trigger for re-evaluation:

| Tool | Re-evaluate When |
|------|-----------------|
| OpenRouter | Provider count exceeds 5 and fallback routing becomes manual overhead |
| Langfuse | Concurrent agent count exceeds 10 and structured logging cannot provide trace visibility |
| Open WebUI | Multi-model comparison becomes a daily blocking workflow |
| Dev Containers | Team grows beyond 2, or CI/CD pipeline needs reproducible environments |
| Temporal | Missions span multiple days and require crash-recovery durability |

### 3. MCP is the only "USE IMMEDIATELY" — with scope limits
MCP scores highest on Alternative Quality (8) because nothing else fills the agent-tool communication standard role. But the research is clear that overloading MCP as "the spine" for everything degrades performance [E19] and introduces unnecessary failure modes [E18]. The correct posture is scoped adoption: 5-10 well-chosen servers for file, git, and API tool access.

### 4. The real stack is smaller than proposed
The Search Party Report proposed 10 tools. This scorecard recommends 1 for immediate use (MCP, scoped) and defers 5 for future evaluation. The remaining 4 are outright rejected. The effective stack for Phoenix today is: Claude Code + MCP (scoped) + structured logging + direct API calls + LEDGER. Five components, not ten.

---

## Methodology Notes

- All scores are based on evidence gathered on 2026-03-07 and cited in `EVIDENCE_APPENDIX.md`.
- Scores reflect Phoenix's specific context (2-person team, MacBook + Studio + VPS, < 300 RPS). A different organization at different scale would produce different scores.
- "Alternative Quality" is intentionally framed as "are there better options?" rather than "what is the best option?" The alternatives section names candidates to evaluate, not conclusions.
- Average scores are unweighted arithmetic means. Phoenix Fit should arguably carry more weight in decision-making, but unweighted averages avoid embedding subjective weighting into the scorecard.
