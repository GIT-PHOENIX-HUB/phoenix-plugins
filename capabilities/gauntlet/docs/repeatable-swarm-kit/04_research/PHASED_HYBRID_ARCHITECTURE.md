---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Phased hybrid architecture — the third option between "all 10 tools now" and "minimal core only"
assumptions: Phase triggers are estimates based on industry patterns, not Phoenix-observed data; all tool selections are candidates to evaluate, not pre-decided picks
status: DRAFT — pending Shane review
---

# Phased Hybrid Architecture

## Introduction

The adversarial review identified three architecture options:

- **Option A: Big Composed Stack** (10 tools) — integrates every legitimate tool the search party found. Too much surface area for a 2-person team. Integration cost dominates value delivery.
- **Option B: Focused Core** (4 components) — ships fast, stays lean. Works today but may under-serve if Phoenix grows beyond its current operational profile.
- **Option C: Phased Hybrid** (this document) — grows WITH need, not ahead of it.

The search party found legitimate tools that solve real problems. Those problems are real — but most of them do not exist yet at Phoenix's current scale. A 2-person electrical contracting team running 4 AI agents at under 300 RPS does not have the same operational profile as a 20-engineer platform team. Adopting tools designed for the latter creates maintenance burden without delivering proportional value.

The phased approach preserves optionality without paying integration cost upfront. Every tool remains a candidate. Nothing is rejected permanently. But nothing is adopted until a concrete trigger fires and an evaluation confirms the tool earns its place.

The V1 architecture already designed — React + xterm.js frontend, Node.js + Express + WebSocket backend, node-pty for process management, LEDGER file watcher — is the foundation. Everything in this document either builds on that foundation or extends it when conditions demand.

---

## P0 — Ship Now

**Criteria for inclusion:** Tool solves a problem Phoenix has TODAY. Integration cost is proportional to value delivered THIS WEEK.

### Components

**1. Claude Code**
Primary AI development tool. Already running on MacBook and Studio. No integration needed — it IS the baseline. The other agents (Gemini, Codex, Phoenix Echo) operate alongside it. Claude Code is first among equals because it drives the development workflow directly [E41].

**2. MCP (scoped, 5-10 servers)**
Agent-tool communication for file ops, git, API access. MCP is already native to Claude Code, so this is not a new dependency — it is a configuration of an existing one [E19].

Scope limit matters. Exposing 30 MCP servers to an agent creates tool overexposure: the agent spends tokens reasoning about tools it will never use in the current context. Start with 5-10 servers that match Phoenix's actual daily operations. Add servers only when a specific workflow requires them.

Security hardening is required before any MCP server touches live data:
- Authentication on all custom MCP servers [E17]
- No live customer data routed through MCP during the evaluation period [E20]
- Audit which servers have write access and restrict where possible

**3. Structured JSON logging**
Ship structured logs from day one. Not because Phoenix needs a log aggregation pipeline — but because structured logs are grep-able, jq-parseable, and machine-readable from the start. Retrofitting structure onto unstructured logs is always more expensive than starting structured [E42][E43].

The LEDGER file remains the operator truth layer. Structured JSON logs feed debugging and post-hoc analysis. These are complementary, not competing.

This is not fancy. It is sufficient.

**4. Direct API calls with retry logic**
Two to three model providers (Anthropic, OpenAI, Google) accessed directly via their native SDKs. No gateway, no proxy, no middleware sitting between Phoenix and the model endpoints [E44][E13].

At 2-3 providers and under 300 RPS, a routing layer adds latency and operational surface without delivering value. Retry logic and basic fallback (if provider A returns 5xx, try provider B) can be implemented in under 100 lines and maintained by the team that wrote it.

**5. Gauntlet V1 architecture**
React + xterm.js + Node.js + WebSocket + node-pty. Already designed and scoped. This is the mission control surface that ties the other P0 components together.

### Phase boundaries

**Entry criteria:** None. This is the starting state.

**Exit criteria (when to evaluate P1):** Any P1 trigger fires.

**Estimated integration surfaces:** 6 (upper-bound heuristic: N*(N-1)/2 where N=4 core components [E38]). This is a heuristic, not a precise count — actual integration surfaces depend on which components communicate directly.

**Estimated cost:** Near zero incremental. These tools are already in use or already designed. The work here is shipping, not selecting.

---

## P1 — When Scale Demands

P1 is not a calendar date. It is a set of conditions. When any of the following triggers fires, it is time to evaluate P1 candidates — not to adopt them automatically.

### Entry criteria (ANY of these triggers)

- **Provider sprawl:** Model provider count exceeds 5 and manual routing becomes operational overhead. Symptoms: copy-pasting API keys into new configs weekly, losing track of which agent uses which provider, rate limit collisions across agents.
- **Trace blindness:** Concurrent agent count exceeds 10 and structured logging cannot provide adequate trace visibility. Symptoms: debugging a failure requires correlating logs across 4+ files manually, root cause analysis takes longer than the original task.
- **Cost opacity:** API spend exceeds $500/month and cost attribution becomes necessary. Symptoms: the monthly bill surprises Shane, no clear mapping from spend to value delivered, inability to answer "which agent costs the most and why."
- **Failure frequency:** Agent failures increase and root cause analysis requires deeper observability than grep/jq can provide. Symptoms: the same failure mode recurs and the team cannot determine whether it is a prompt issue, a model issue, or an infrastructure issue.

### Candidate tools to evaluate

These are candidates, not selections. Each one must earn its place through the evaluation process described below.

**For routing and provider management:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| OpenRouter | Single API endpoint across providers, hosted infrastructure | 5% BYOK fee [E15], single point of failure risk [E14] |
| Helicone | 25-100x faster observability than LiteLLM [E12], lighter operational footprint | Primarily an observability layer, routing is secondary |
| Portkey | Emerging gateway alternative, unified API | Less mature ecosystem, evaluate stability [E51] |
| Enhanced direct API wrapper | Build retry/fallback logic in-house, no external dependency | Maintenance burden scales with provider count |

**For observability:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| Langfuse | Full tracing, prompt versioning, evaluation framework | 16GB RAM overhead [E26], heavy for a 2-person team |
| Arize Phoenix | Tracing platform with evaluation capabilities | Evaluate resource requirements against VPS capacity |
| Braintrust | Evaluation-focused observability, lighter tracing | Narrower scope than full-trace platforms |
| OpenTelemetry | Vendor-neutral standard, long-term portability [E53] | Requires more setup, not AI-specific out of the box |

### Evaluation process for each candidate

1. Deploy in an isolated test environment. Not production. Not alongside live customer workflows.
2. Run for 1 week with a synthetic workload that matches Phoenix's actual usage patterns — agent count, request volume, model mix.
3. Measure: latency impact on agent responses, resource consumption (CPU, RAM, disk) on the target machine, operational overhead (how much attention does this tool demand daily).
4. Compare against the "do nothing" baseline. The tool must demonstrably outperform the current approach on the dimension that triggered the evaluation.
5. Shane decides: adopt, defer for re-evaluation later, or reject.

"We evaluated X and decided not to adopt it" is a valid and expected outcome.

### Phase boundaries

**Exit criteria (when to evaluate P2):** Any P2 trigger fires.

**Estimated integration surfaces if 1 routing + 1 observability tool added:** 15 (upper-bound heuristic: N*(N-1)/2 where N=6 [E38]). This is a heuristic. Actual surfaces will be lower because not every new tool connects to every existing component.

**Estimated cost:** Tool-dependent. Budget 4-8 hours for evaluation per candidate, including setup, synthetic workload design, measurement, and write-up. Ongoing operational cost is TBD — that is what the evaluation determines.

---

## P2 — When Multi-Surface Demands

P2 addresses a different class of problem: not scale, but complexity. These triggers fire when Phoenix's operational model changes shape, not just size.

### Entry criteria (ANY of these triggers)

- **Team growth:** Team grows beyond 2 people and environment consistency becomes a real onboarding cost. Symptoms: the new person spends more than a day getting their machine to match the existing setup, or subtle environment differences cause "works on my machine" failures.
- **CI/CD maturity:** CI/CD pipeline maturity demands reproducible build environments. Symptoms: the build passes locally but fails in CI due to dependency drift, or CI setup requires manual intervention after routine dependency updates.
- **Multi-model comparison as daily workflow:** Multi-model comparison becomes a daily blocking workflow, not an occasional curiosity. Symptoms: Shane is comparing model outputs for the same prompt multiple times per day, and the current process (switching tabs, copy-pasting) is the bottleneck.
- **Mission durability:** Missions span multiple days and require crash-recovery durability across agent restarts. Symptoms: an agent restart loses context that took hours to build, and the recovery process is manual reconstruction.
- **Cross-surface coordination:** SharePoint integration or cross-surface coordination becomes necessary. Symptoms: information lives in multiple places (MacBook, Studio, VPS, SharePoint) and keeping them synchronized is manual and error-prone.

### Candidate tools to evaluate

**For environment consistency:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| Dev Containers | Mature spec, wide editor support, reproducible environments [E35][E36] | Docker dependency, resource overhead on Mac hardware |
| Nix/devenv | Container-free reproducibility, declarative environment definitions [E45] | Steep learning curve, less mainstream tooling support |
| Devbox | Nix under the hood with a friendlier interface [E46] | Newer project, evaluate stability and community support |

**For multi-model UI:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| Open WebUI | Self-hosted, multi-model chat interface | 6-model display limit [E32], reported memory leaks [E33] |
| Custom Gauntlet UI extension | Build exactly what Phoenix needs into the existing Gauntlet interface | Development cost, maintenance burden |
| Commercial alternatives (Poe, ChatHub) | Ready-made, no development required | Privacy concerns, vendor dependency, may not fit Phoenix's workflow |

**For workflow orchestration:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| Temporal | Enterprise-grade durability, automatic retry, workflow versioning | $6,770/month at scale [E52], massive overkill for current Phoenix |
| Redis + BullMQ | Lightweight job queue, well-understood primitives [E47] | Requires Redis infrastructure, manual durability patterns |
| Git-based state persistence | Extends existing LEDGER pattern, no new infrastructure [E48] | Limited query capabilities, not designed for high-throughput orchestration |

**For SharePoint and cross-surface coordination:**

| Candidate | What it offers | Known trade-offs |
|-----------|---------------|-----------------|
| SharePoint API integration | Ledger/control plane for cross-surface visibility | Microsoft API complexity, authentication overhead |
| Custom gateway extensions | Build on existing Gauntlet architecture | Development cost, scope creep risk |

### Phase boundaries

**Exit criteria:** None fixed. P2 is the growth layer. Each P2 adoption creates its own evaluation cycle. There is no P3 defined because defining it now would be speculative architecture — the conditions that would trigger P3 do not yet have enough signal to describe.

**Estimated integration surfaces if 2 P2 tools added to P1 stack:** 28 (upper-bound heuristic: N*(N-1)/2 where N=8 [E38]). This is a heuristic. Actual integration surfaces will be significantly lower because not every tool connects to every other tool. A multi-model UI does not need to integrate with the environment consistency tool, for example.

**Estimated cost:** Highly variable. Budget 1-2 weeks per P2 candidate evaluation. P2 tools tend to be more complex to evaluate because they change operational workflows, not just add a capability.

---

## Decision Framework

How Shane should use this document:

1. **Start with P0.** It is already mostly built. The work is shipping, not selecting.
2. **When a P1 trigger fires, do not automatically adopt a tool.** A trigger is a signal to begin evaluation, not a mandate to integrate. Run the evaluation process. Compare against the "do nothing" baseline.
3. **Tool selection is always a candidate evaluation, never a default adoption.** The tables above list options to consider, not recommendations to implement. The evaluation process exists to distinguish between "this tool is impressive" and "this tool earns its place in our stack."
4. **Each phase gate is a DECISION POINT, not an automatic escalation.** Reaching a trigger means the current setup has a specific, identifiable limitation. The response might be adopting a tool, building a lightweight custom solution, or adjusting the workflow to reduce the pressure that fired the trigger.
5. **"We evaluated X and decided not to adopt it" is a valid outcome at every phase.** Document the evaluation, record the decision, and move on. The tool remains a candidate for future re-evaluation if conditions change.

---

## Risk: Phase Discipline

The biggest risk of a phased approach is not picking the wrong tool. It is losing discipline at the phase boundaries.

**Failure mode 1: Tool excitement.** A new tool looks impressive in a demo. The team adopts it before any trigger fires, absorbing integration cost for a problem that does not yet exist. The tool works fine in isolation but adds cognitive load and maintenance surface to every future decision.

**Failure mode 2: Inertia.** A trigger fires — API spend hits $600/month with no cost attribution, or agent failures take 2 hours to debug — but the team does not act because the current setup is familiar. The cost of not acting compounds silently.

Both failure modes are mitigated by the same mechanisms:

- **Written trigger conditions.** This document defines when to evaluate. If the trigger has not fired, the evaluation is premature. If it has fired, the evaluation is overdue.
- **Required evaluation evidence.** No tool is adopted on vibes. The 1-week evaluation process produces concrete data: latency numbers, resource consumption, operational overhead. The data supports the decision.
- **Shane makes the final call at each gate.** Not the agent, not the tool vendor, not the excitement of a new capability. Shane, looking at the evaluation evidence, decides whether the tool earns its place.

This document is a map, not a mandate. The triggers are estimates based on industry patterns, not Phoenix-observed data. As Phoenix operates, the triggers may need adjustment. The phased structure — not the specific thresholds — is the durable contribution.
