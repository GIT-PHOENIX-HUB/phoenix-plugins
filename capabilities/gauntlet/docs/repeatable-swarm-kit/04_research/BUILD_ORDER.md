---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Surface-aware P0/P1/P2 build order mapped to MacBook, Studio, VS Code, gateway, future SharePoint
assumptions: Build order reflects adversarial review recommendations; tool selections at P1/P2 are candidates to evaluate, not pre-decided picks
status: DRAFT — pending Shane review
---

# Surface-Aware Build Order

Phoenix Electric runs a 2-person electrical contracting team with 4 AI agents (Echo Pro/Claude Code, Gemini, Codex, Phoenix Echo) across MacBook, Mac Studio, and VPS. This document defines the build order for the AI agent stack, organized by priority phase and mapped to the physical and logical surfaces where each piece runs.

Citations use the `[E#]` format tied to EVIDENCE_APPENDIX.md.

---

## Surface Map

These are the surfaces that exist today and what they do.

```
+-------------------------------------------------------------+
|  MacBook Browser ---- Gauntlet V1 Dashboard (primary)       |
|  Studio Browser  ---- Gauntlet V1 Dashboard (secondary)     |
|  VS Code (both)  ---- Claude Code + MCP servers             |
|  Gateway         ---- Node.js backend + LEDGER watcher      |
|  SharePoint      ---- Future: cross-surface ledger          |
+-------------------------------------------------------------+
```

The V1 architecture is React + xterm.js on the frontend, Node.js + Express + WebSocket on the backend, node-pty for process management, and a chokidar file watcher on LEDGER.md.

---

## P0 — Ship Now

These tasks form the minimum viable agent stack. Nothing here is optional. Each task lists what it is, why it matters now, what it replaces, how to know it works, and which surfaces it touches.

### P0-1: Verify & Harden Gauntlet V1 Dashboard

- **What:** React + xterm.js frontend with 4 terminal panels, command bar, LEDGER feed, and Mission Control panel. **Already implemented** in `client/src/` — this task is verification and hardening, not greenfield build.
- **Why now:** The dashboard code exists but needs a controlled deployment pass to confirm it renders correctly, handles WebSocket reconnection, and displays agent status reliably.
- **What it replaces:** Manually switching between terminal windows and tabs.
- **Success criteria:** `npm run build` passes clean, 4 agent terminals render, command bar routes @agent messages, LEDGER feed updates in real-time, Mission Control shows swarm state.
- **Surfaces:** **MacBook browser** (primary), **Studio browser** (secondary).
- **Depends on:** P0-2 (Gateway Backend).

### P0-2: Verify & Harden Gateway Backend

- **What:** Node.js + Express + WebSocket server with node-pty process management, multi-ledger registry, and swarm state parser. **Already implemented** in `server/` (index.js, supervisor.js, agents.js, ledgers.js, swarm-state.js) — this task is verification and hardening.
- **Why now:** The gateway code exists and boots successfully. Remaining hardening: structured JSON logging (done — `server/logger.js`), `.env` configuration, and confirming agent CLI paths resolve on each target machine.
- **What it replaces:** Manually starting each agent CLI in separate terminal windows.
- **Success criteria:** `node --check` passes on all server files, server boots with structured JSON output, all 4 agents spawn, WebSocket streams terminal output, crashed agents restart (max 3 retries).
- **Surfaces:** **Gateway**.
- **Depends on:** Nothing. This is the critical path root.

### P0-3: Configure MCP Servers (Scoped, 5-10)

- **What:** MCP servers for file operations, git integration, and API tool access.
- **Why now:** MCP is the one tool rated USE IMMEDIATELY in the adversarial review. It is native to Claude Code and fills a real gap in tool invocation [E19].
- **What it replaces:** Manual tool invocation and ad-hoc scripting.
- **Success criteria:** 5-10 servers configured, auth enforced on custom servers, no live customer data exposed through MCP endpoints [E17][E20].
- **Surfaces:** **VS Code** (both machines).
- **Depends on:** Nothing. Can run in parallel with P0-2.

### P0-4: Structured JSON Logging

- **What:** Structured log output from all server processes, queryable with grep and jq. **Already implemented** — `server/logger.js` outputs `{ts, level, event, ...data}` JSON lines, used by both `server/index.js` and `server/supervisor.js`.
- **Why now:** Observability from day one without infrastructure overhead. grep + jq on structured JSON is free and sufficient at this scale [E42][E43].
- **What it replaces:** Unstructured console.log output.
- **Success criteria:** Zero `console.log`/`console.error` calls in server code, all server output in structured JSON format, queryable by event name, timestamp, and level. **DONE.**
- **Surfaces:** **Gateway** (log collection), **MacBook browser** (log viewing in dashboard).
- **Depends on:** P0-2 (Gateway Backend).

### P0-5: Wire Direct API Calls with Retry Logic

- **What:** Direct API client modules for Anthropic, OpenAI, and Google with exponential backoff retry.
- **Why now:** Avoids proxy latency and eliminates single-point-of-failure from gateway routing tools. Direct calls are the simplest thing that works [E13][E44].
- **What it replaces:** Nothing. This IS the baseline approach.
- **Success criteria:** API calls succeed with retry on transient failures, all failures logged with provider and status code, no middleware dependency between the agent and the provider.
- **Surfaces:** **Gateway**.
- **Depends on:** Nothing. Can run in parallel with P0-2.

### P0-6: LEDGER Integration

- **What:** chokidar file watcher on LEDGER files, streaming changes to the frontend via WebSocket. **Already implemented** — `server/ledgers.js` provides a multi-ledger registry watching Gauntlet Session, Agent Bridge, and Shared Ops ledgers. `server/swarm-state.js` parses ledger content into structured swarm state.
- **Why now:** LEDGER is the existing operator truth system [E42]. The implementation is live — this task is verification that ledger paths resolve and updates stream correctly.
- **What it replaces:** Manually reading LEDGER.md in a text editor or terminal.
- **Success criteria:** Ledger file changes appear in the dashboard LedgerPanel within 1 second of file write, swarm state updates broadcast to all connected clients.
- **Surfaces:** **Gateway** (watcher), **MacBook browser** + **Studio browser** (display).
- **Depends on:** P0-2 (Gateway Backend).

---

## P1 — When Scale Demands

P1 work begins only when a trigger fires. These are not scheduled tasks. They are responses to operational pressure.

### Entry Triggers

Any one of the following justifies starting P1 work:

- Provider count exceeds 5, making manual routing an operational overhead.
- Concurrent agents exceed 10, making structured logging inadequate for correlation.
- API spend exceeds $500/month, making cost attribution a financial necessity.
- Agent failure rate increases to the point where grep/jq cannot diagnose root causes fast enough.

### P1-1: Evaluate Routing and Observability Candidates

- **What:** Test 1-2 routing tools and 1-2 observability tools against real Phoenix workloads.
- **Why now:** Only when a P1 trigger fires. Not before.
- **Candidates to evaluate:** OpenRouter [E14][E15], Helicone [E12], Portkey [E51], Langfuse [E26], OpenTelemetry [E53]. These are candidates to test, not pre-decided picks. The evaluation determines whether any of them earn a place in the stack.
- **What it replaces:** Direct API calls (if routing is adopted), grep/jq (if observability tooling is adopted).
- **Success criteria:** Each candidate tested for a minimum of 1 week on live workloads. Latency impact, resource consumption, and cost measured. Shane makes the adopt/defer/reject decision based on data.
- **Surfaces:** **Gateway** (integration point), **MacBook browser** (observability UI if adopted).
- **Depends on:** All P0 tasks complete, plus at least one P1 trigger firing.

### P1-2: Enhanced Dashboard Observability

- **What:** Add an observability panel to the Gauntlet dashboard showing cost tracking, error rates, and agent performance trends.
- **Why now:** When scale makes these metrics operationally necessary for daily decision-making.
- **What it replaces:** Manual calculation from logs and LEDGER review.
- **Success criteria:** Cost per agent visible in the dashboard, error rate trends displayed over time, no new infrastructure required. Data sourced from structured logs established in P0-4.
- **Surfaces:** **MacBook browser**, **Studio browser**.
- **Depends on:** P1-1 evaluation (to determine data sources and tooling).

---

## P2 — When Multi-Surface Demands

P2 work addresses problems that do not exist yet. These tasks become relevant when the team, the workflow complexity, or the infrastructure footprint outgrows what P0 and P1 provide.

### Entry Triggers

Any one of the following justifies starting P2 work:

- Team grows beyond 2 people, making environment consistency matter for onboarding.
- CI/CD pipeline maturity demands reproducible builds.
- Multi-model comparison becomes a daily blocking workflow that the current UI cannot support.
- Missions span multiple days, requiring crash-recovery durability beyond what LEDGER + git provides.
- SharePoint integration becomes necessary for cross-surface coordination.

### P2-1: Evaluate Environment Consistency Candidates

- **What:** Test containerized or reproducible environment tools to replace manual Homebrew + version manager setup.
- **Candidates to evaluate:** Dev Containers [E35][E36], Nix/devenv [E45], Devbox [E46]. These are candidates to test, not commitments.
- **What it replaces:** Manual Homebrew and version manager setup on each machine.
- **Success criteria:** A new team member reaches productivity within 1 hour using the environment tool.
- **Surfaces:** **VS Code** (both machines), potentially **Gateway** (for CI/CD integration).
- **Depends on:** P1 complete, plus at least one P2 trigger firing.

### P2-2: Evaluate Multi-Model UI Candidates

- **What:** Test multi-model comparison interfaces for side-by-side prompt evaluation.
- **Candidates to evaluate:** Open WebUI [E32][E33], custom Gauntlet UI extension, commercial alternatives. These are candidates to test.
- **What it replaces:** Manually switching between model provider UIs to compare outputs.
- **Success criteria:** Side-by-side comparison of 3+ models on the same prompt, stable for 4+ hour sessions without UI degradation.
- **Surfaces:** **MacBook browser**, **Studio browser**.
- **Depends on:** P1 complete, plus at least one P2 trigger firing.

### P2-3: Evaluate Workflow Orchestration Candidates

- **What:** Test durable workflow tools IF missions require crash recovery beyond what LEDGER and git provide.
- **Candidates to evaluate:** Temporal [E52], Redis + BullMQ [E47], extended LEDGER/git persistence [E48]. These are candidates to test only if the trigger fires.
- **What it replaces:** LEDGER + git state persistence (if a candidate is adopted).
- **Success criteria:** A multi-day mission survives agent restart without state loss.
- **Surfaces:** **Gateway**.
- **Depends on:** P1 complete, plus at least one P2 trigger firing.

### P2-4: SharePoint Ledger / Control Plane

- **What:** Cross-surface visibility layer using SharePoint for ledger coordination across all machines and surfaces.
- **Why now:** Only when multi-surface coordination becomes a real operational need that manual LEDGER synchronization cannot handle.
- **What it replaces:** Manual cross-machine LEDGER synchronization (copying files, git pull across machines).
- **Success criteria:** LEDGER updates are visible across all surfaces within 30 seconds of write.
- **Surfaces:** **All surfaces**. This is the integration layer that ties everything together.
- **Depends on:** P1 complete, plus at least one P2 trigger firing.

---

## Build Order Summary

| Phase | Task | Surfaces | Depends On |
|:---:|------|----------|------------|
| P0 | P0-1: Verify & Harden V1 Dashboard (built) | MacBook browser, Studio browser | P0-2 |
| P0 | P0-2: Verify & Harden Gateway Backend (built) | Gateway | — |
| P0 | P0-3: MCP Servers (scoped) | VS Code | — |
| P0 | P0-4: Structured JSON Logging (done) | Gateway, MacBook browser | P0-2 |
| P0 | P0-5: Direct API + Retry | Gateway | — |
| P0 | P0-6: LEDGER Integration (built) | Gateway, MacBook/Studio browser | P0-2 |
| P1 | P1-1: Evaluate Routing/Observability | Gateway, MacBook browser | P0 complete + trigger |
| P1 | P1-2: Enhanced Dashboard | MacBook/Studio browser | P1-1 evaluation |
| P2 | P2-1: Environment Consistency | VS Code, Gateway | P1 + trigger |
| P2 | P2-2: Multi-Model UI | MacBook/Studio browser | P1 + trigger |
| P2 | P2-3: Workflow Orchestration | Gateway | P1 + trigger |
| P2 | P2-4: SharePoint Control Plane | All | P1 + trigger |

---

## Critical Path

P0-2 (Gateway Backend) was the critical path item — and **it is already built**. P0-4 (Structured Logging) is **done**. P0-6 (LEDGER Integration) is **built**. P0-1 (Dashboard) is **built**.

Current P0 status:
- **Done:** P0-2 (Gateway), P0-4 (Structured Logging), P0-6 (LEDGER Integration), P0-1 (Dashboard)
- **Remaining:** P0-3 (MCP server configuration — lives in Claude Code settings, not this repo), P0-5 (Direct API + Retry — implement when a real in-repo caller needs it)

P1 and P2 do not start on a schedule. They start when a trigger fires.
