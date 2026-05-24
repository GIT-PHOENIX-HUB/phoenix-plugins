---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Main decision memo — executive summary, tool verdicts, architecture options, build order summary
assumptions: Based on adversarial research conducted 2026-03-07; all tool alternatives framed as candidates to evaluate
status: DRAFT — pending Shane review
---

# Gauntlet Search Party Adversarial Review

## 1. Executive Summary

Shane, here is the bottom line.

The Search Party Report proposed adopting 10 tools to build a composed AI agent architecture for Phoenix Electric. We stress-tested every one of those recommendations. The result: most of them solve problems you do not have yet, and four of them duplicate what Claude Code already does for you today.

**Our recommendation:** Use 1 tool immediately (MCP, scoped to 5-10 servers), defer 5 tools until specific scale triggers fire, and reject 4 tools outright.

The effective stack for Phoenix right now is five components, not ten:

1. **Claude Code** — your primary AI coding agent (already working)
2. **MCP (scoped)** — agent-to-tool communication layer, limited to 5-10 servers
3. **Structured JSON logging** — lightweight observability that runs on what you already have
4. **Direct API calls** — talk to model providers without a middleman proxy
5. **LEDGER + git** — state persistence and audit trail (already built into your V1 architecture)

Everything else in the Search Party Report is either premature, redundant, or operationally heavier than a 2-person electrical contracting team should carry. The tools are not bad. The timing is wrong. When Phoenix hits specific growth triggers — more than 5 model providers, more than 10 concurrent agents, a team larger than 2 — you re-evaluate. Until then, ship what works.

The rest of this memo walks through each tool verdict, presents three architecture options for your decision, and lays out a phased build order.

---

## 2. Tool-by-Tool Verdicts

### 2.1 Coder / code-server — Remote IDE

**Verdict: REJECT NOW**

Coder duplicates what Claude Code already provides. You already have a working IDE workflow on your MacBook, and Claude Code handles remote file editing, terminal access, and code generation without a separate remote IDE layer. The AGPL license also creates downstream licensing risk if Phoenix ever ships software built with it [E1][E2].

### 2.2 LiteLLM — Model Gateway Proxy

**Verdict: REJECT NOW**

LiteLLM sits between you and your model providers as a translation layer. The problem: it breaks under load at 300 requests per second [E7], and Claude's extended thinking mode fails when routed through the proxy [E9]. You are currently making direct API calls that work. Adding a proxy that degrades your best model's best feature is a net negative.

### 2.3 OpenRouter — Model Provider Routing

**Verdict: DEFER UNTIL SCALE**

OpenRouter routes requests across multiple model providers from a single API. Useful concept, but at Phoenix's current scale you are calling 2-3 providers directly. The 5% fee on every request adds up, and routing through a single third-party endpoint creates a single point of failure [E14][E15].

**Re-evaluation trigger:** When Phoenix uses more than 5 model providers and manually managing API keys and endpoints becomes a weekly time sink, evaluate OpenRouter alongside Helicone and Portkey as routing candidates.

### 2.4 MCP (Model Context Protocol) — Agent-Tool Communication

**Verdict: USE IMMEDIATELY (scoped to 5-10 servers)**

MCP is the right abstraction for how your agents talk to tools — file systems, git, APIs, databases. It gives you a standardized interface so agents can discover and use tools without custom glue code for each one. This is the one tool from the Search Party Report that solves a problem you have right now [E17][E19].

**The scope matters.** The Search Party Report positioned MCP as "the spine" of the entire architecture. That is overreach. At 5-10 MCP servers — file access, git operations, API connectors, maybe a few domain-specific tools — MCP stays manageable. Beyond that, you are building infrastructure instead of doing electrical work. Keep it scoped.

### 2.5 Langfuse — Observability and Tracing

**Verdict: DEFER UNTIL SCALE**

Langfuse is a serious observability platform. It is also a 16GB RAM footprint for tracing and monitoring [E26]. That is a disproportionate resource commitment when structured JSON logging — writing events to files with timestamps, agent IDs, and action types — gives you 90% of the insight at 1% of the infrastructure cost.

**Re-evaluation trigger:** When you have more than 10 concurrent agent sessions and structured logs become too noisy to read manually, evaluate Langfuse alongside Helicone for observability.

### 2.6 OpenHands — AI Coding Agent

**Verdict: REJECT NOW**

OpenHands is an autonomous coding agent. It has a 68-73% failure rate on benchmarks [E27]. Claude Code, which you already use daily, handles the same workload with significantly better reliability. Adding a second, less reliable coding agent creates confusion about which agent owns what work and doubles your debugging surface.

### 2.7 Continue — VS Code AI Extension

**Verdict: REJECT NOW**

Continue is a VS Code extension that provides AI code assistance. Claude Code already operates inside your VS Code environment. Running both creates conflicts — two AI assistants competing for the same context window, overlapping keybindings, and ambiguity about which agent is responding [E31]. One reliable agent is better than two that interfere with each other.

### 2.8 Open WebUI — Multi-Model Chat Interface

**Verdict: DEFER UNTIL SCALE**

Open WebUI gives you a browser-based chat interface for talking to multiple models side by side. The current version has a 6-model cap per session and known memory leaks during extended use [E32][E33]. More importantly, you do not currently need to compare models side by side in a chat UI — your agents are task-specialized, not interchangeable chat partners.

**Re-evaluation trigger:** When multi-model comparison becomes a weekly blocking task (e.g., evaluating which model handles permit language best), evaluate Open WebUI alongside a custom Gauntlet UI panel.

### 2.9 Dev Containers — Containerized Development Environments

**Verdict: DEFER UNTIL SCALE**

Dev Containers wrap your development environment in Docker so every machine runs identical tooling. Valuable for teams where "it works on my machine" is a daily problem. Phoenix is a 2-person team with known machines — your MacBook and your Mac Studio. The Docker learning curve and container management overhead do not pay off yet [E35].

**Re-evaluation trigger:** When Phoenix adds a third team member, or when you set up a CI/CD pipeline that needs reproducible build environments, evaluate Dev Containers alongside Nix as environment candidates.

### 2.10 Temporal — Durable Workflow Orchestration

**Verdict: DEFER UNTIL SCALE**

Temporal is industrial-grade workflow orchestration. It ensures long-running processes survive crashes and restarts. It is also priced at $6,770/month at scale [E52]. Your current LEDGER file-watching system plus git provides durable state for the workflows Phoenix runs today. You are not running multi-hour, multi-step workflows that need crash recovery across distributed systems.

**Re-evaluation trigger:** When agent workflows span more than 4 sequential steps with external dependencies (e.g., permit filing that waits on inspector response that triggers invoice generation), evaluate Temporal alongside simpler queue-based alternatives.

---

## 3. Three Architecture Options

All tool selections below are framed as candidates to evaluate, not final decisions. Shane picks the direction; the team evaluates specifics within that direction.

### Option A: Big Composed Stack (10 tools)

This is what the Search Party Report proposed: adopt all 10 tools and compose them into a unified architecture.

**What you get:**
- Comprehensive coverage of every capability category (IDE, routing, observability, orchestration, UI, environments)

**What it costs:**
- Up to 45 integration surfaces — the upper-bound heuristic for a 10-component system is N*(N-1)/2, meaning up to 45 places where things can break when two components interact [E38]
- Operational burden that exceeds what a 2-person team can maintain alongside actual electrical contracting work [E50]
- Multiplicative attack surface — every new tool is another place for credentials to leak, dependencies to break, and updates to miss [E49]

**The honest assessment:** This stack is designed for a 10-person software team, not a 2-person electrical team that uses software as leverage. Adopting it now means spending more time maintaining tools than using them.

### Option B: Focused Core (4 components)

Strip down to the minimum that ships today.

**What you get:**
- Claude Code + MCP (scoped to 5-10 servers) + structured JSON logging + direct API calls
- Plus your existing V1 architecture: LEDGER, git, node-pty, React + xterm.js dashboard
- Ships now with minimal new infrastructure
- Matches what a 2-person team can actually operate and maintain

**What it costs:**
- You may need to add tools later when scale demands them
- If Phoenix grows rapidly, you could find yourself under-engineered and scrambling to add capabilities

**The honest assessment:** This is the safe choice. It works today. The risk is that you defer too long and have to bolt things on under pressure later.

### Option C: Phased Hybrid (recommended for evaluation)

Build the focused core now, but define specific triggers for when to evaluate additional tools. Each phase has entry criteria (what triggers it) and exit criteria (what "done" looks like).

**P0 — Ship Now:**
- Claude Code + MCP (scoped, 5-10 servers) + structured JSON logging + direct API calls
- LEDGER + git for state persistence
- V1 dashboard (React + xterm.js) at localhost:3000

**P1 — When Scale Demands:**
- Evaluate routing/observability candidates (OpenRouter OR Helicone OR Portkey)
- Triggered by: provider count exceeding 5, or concurrent agents exceeding 10

**P2 — When Multi-Surface Demands:**
- Evaluate environment candidates (Dev Containers OR Nix)
- Evaluate UI candidates (Open WebUI OR custom Gauntlet UI)
- Triggered by: team growing beyond 2, or multi-model comparison becoming a weekly blocker

**What you get:**
- Everything from Option B, plus a concrete plan for growth
- Each phase gate forces an honest evaluation: "Do we actually need this now?"
- Avoids both over-engineering (Option A) and under-planning (Option B)

**What it costs:**
- Requires discipline to evaluate honestly at each phase gate instead of either rushing to adopt or endlessly deferring

**The honest assessment:** This is the recommended path for evaluation. It gives you the focused core today and a structured way to grow. Detail on phasing lives in PHASED_HYBRID_ARCHITECTURE.md.

---

## 4. P0 / P1 / P2 Build Order Summary

Full detail lives in BUILD_ORDER.md. Here is the overview.

### P0 Targets (Ship Now)

| Surface | What Ships | Where It Runs |
|---|---|---|
| MacBook browser | Gauntlet V1 dashboard — React + xterm.js, agent process panels, real-time output | localhost:3000 on MacBook |
| VS Code | MCP servers for file access, git operations, API tool connectors | 5-10 servers max, MacBook-local |
| Gateway layer | LEDGER watcher (chokidar) + structured JSON logging pipeline | Node.js backend, MacBook |

P0 is everything you need to run 4 agents with visibility into what they are doing, a shared state file they all respect, and a standardized way for agents to call tools.

### P1 Triggers and Candidates

| Trigger | Candidate Tools to Evaluate |
|---|---|
| Provider count exceeds 5 active API integrations | OpenRouter, Helicone, Portkey (routing/gateway) |
| Concurrent agent sessions exceed 10 | Langfuse, Helicone (observability/tracing) |

P1 is not scheduled. It fires when the triggers fire. If Phoenix stays at 2-4 providers and 4 agents for the next year, P1 never activates, and that is fine.

### P2 Triggers and Candidates

| Trigger | Candidate Tools to Evaluate |
|---|---|
| Team grows beyond 2, or CI/CD pipeline reaches maturity | Dev Containers, Nix (reproducible environments) |
| Multi-model comparison becomes a weekly blocking task | Open WebUI, custom Gauntlet UI (multi-model interface) |

P2 is the furthest horizon. These are real capabilities, but they solve problems that do not exist for Phoenix today.

---

## 5. What This Means for Shane

The search party did good work — they found real tools that solve real problems. But most of those problems belong to bigger teams running bigger operations. Phoenix Electric needs to ship a working agent dashboard, wire up MCP for tool access, and log what the agents do. That is P0. Everything else waits until a specific, measurable trigger says it is time. Build what you need now, evaluate the rest when the need is real.
