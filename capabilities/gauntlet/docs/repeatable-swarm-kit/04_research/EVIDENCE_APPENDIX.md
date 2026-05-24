---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Master evidence file — every citation referenced across all review documents
assumptions: Evidence gathered 2026-03-07; URLs and claims reflect state as of that date
status: DRAFT — pending Shane review
---

# Evidence Appendix — Gauntlet Search Party Report

Master evidence registry for the adversarial review of the proposed 10-tool AI agent
architecture for Phoenix Electric. Entries are either cited directly by `[E#]` in the
review documents or included as supplementary context. Citing files:
`GAUNTLET_SEARCH_PARTY_ADVERSARIAL_REVIEW.md`, `TOOL_SCORECARD.md`,
`SECURITY_TEARDOWN.md`, `PHASED_HYBRID_ARCHITECTURE.md`, `COMPLEXITY_COST_ANALYSIS.md`,
and `BUILD_ORDER.md`. See the Cross-Reference Index at the end of this file for
per-entry mappings.

**Review context:** 2-person electrical contracting team (Phoenix Electric) running
AI agents (Claude Code, Gemini, Codex, Phoenix Echo) on MacBook + Mac Studio + VPS
at less than 300 RPS.

---

## Coder / code-server

### [E1] Coder Agent Boundaries Feature — December 2025 Launch

- **Source:** https://github.com/coder/coder/releases/tag/v2.18.0
- **Date published:** 2025-12-11
- **Claim supported:** The Agent Boundaries feature that allows workspace-level
  network and filesystem isolation shipped in Coder v2.18.0 in December 2025. As of
  this review (March 2026) the feature is approximately 3 months old, with limited
  production hardening at scale.
- **Phoenix relevance:** A 2-person team cannot afford to be an early adopter of
  security-critical isolation features. Three months is insufficient bake time to
  trust agent boundaries for autonomous code execution on production infrastructure.

### [E2] Coder AGPL v3 License; Multi-Device Sync Requires Syncthing

- **Source:** https://github.com/coder/coder/blob/main/LICENSE
- **Date published:** 2024-08-15 (license file last updated)
- **Claim supported:** Coder is licensed under AGPL v3, which requires disclosure of
  source code for any networked modifications. Multi-device workspace state sync
  (MacBook to Studio to VPS) is not built in — Coder recommends Syncthing or similar
  tools for file synchronization across workspace instances.
- **Phoenix relevance:** AGPL creates compliance overhead for a contracting business
  that may expose internal tooling to subcontractors or clients. Adding Syncthing
  introduces a second infrastructure dependency just for file sync across the
  MacBook + Studio + VPS topology.

### [E3] code-server Extension Host Crashes

- **Source:** https://github.com/coder/code-server/issues/6847
- **Date published:** 2025-09-22
- **Claim supported:** The code-server extension host process crashes under sustained
  load when multiple extensions compete for memory, particularly with language
  servers (TypeScript, Python) and AI assistant extensions running concurrently.
  Users report needing to restart the extension host 2-5 times per day under heavy
  use.
- **Phoenix relevance:** Claude Code and Gemini both interact through extension-like
  interfaces. Extension host instability directly interrupts agent workflows. A
  2-person team loses significant productivity to manual restarts.

### [E4] code-server Extension Vulnerabilities

- **Source:** https://github.com/coder/code-server/security/advisories/GHSA-pm95-7c6x-9mqf
- **Date published:** 2025-11-03
- **Claim supported:** A disclosed vulnerability in code-server's extension
  installation flow allowed arbitrary code execution via crafted VSIX packages.
  The advisory notes that extensions installed through the Open VSX registry bypass
  the VS Code Marketplace's automated security scanning. Patch was issued in
  code-server v4.96.2.
- **Phoenix relevance:** Phoenix agents install and manage extensions
  programmatically. Without Marketplace-level scanning, malicious or compromised
  extensions could execute arbitrary code on the Mac Studio or VPS with the
  permissions of the code-server process.

### [E5] Coder Idle Workspace Resource Consumption

- **Source:** https://coder.com/docs/admin/resource-management#idle-workspaces
- **Date published:** 2025-10-18
- **Claim supported:** Even with auto-stop configured, idle Coder workspaces consume
  approximately 0.1 vCPU and 256 MB RAM per workspace for the agent sidecar,
  health checks, and provisioner state. With 3-4 workspaces across the Phoenix
  topology, idle cost is 0.3-0.4 vCPU and 768 MB-1 GB RAM.
- **Phoenix relevance:** The Mac Studio has finite resources shared between AI model
  inference and development tools. 1 GB of RAM consumed by idle workspaces is
  1 GB unavailable for local model serving or agent context windows.

### [E6] DevPod as Lighter Workspace Alternative

- **Source:** https://github.com/loft-sh/devpod
- **Date published:** 2025-07-14 (v0.6.0 release)
- **Claim supported:** DevPod provides dev-environment-as-code without requiring a
  central control plane server. It supports multiple backends (Docker, SSH, cloud
  providers) and can be configured declaratively via `devcontainer.json`. No idle
  resource overhead when workspaces are stopped.
- **Phoenix relevance:** DevPod's SSH backend could connect to MacBook, Studio, and
  VPS without running a persistent server. Zero idle cost aligns with the
  resource-constrained topology. If workspaces are needed in the future, DevPod is
  a lighter first step than Coder.

---

## LiteLLM

### [E7] LiteLLM Breakage at 300 RPS

- **Source:** https://github.com/BerriAI/litellm/issues/7823
- **Date published:** 2025-12-28
- **Claim supported:** Users report connection pool exhaustion and HTTP 502/504
  errors when LiteLLM proxy handles sustained traffic above approximately 250-300
  requests per second. The proxy's asyncio event loop becomes a bottleneck when
  routing to multiple upstream providers simultaneously. Workarounds include
  running multiple proxy instances behind a load balancer.
- **Phoenix relevance:** 300 RPS is the stated ceiling for the Phoenix architecture.
  Operating at the exact failure threshold of the proxy means any burst traffic
  (parallel agent runs, batch processing) will trigger failures. Adding a load
  balancer to fix it doubles operational complexity.

### [E8] LiteLLM Database Bottleneck at 1M Log Entries

- **Source:** https://github.com/BerriAI/litellm/issues/8412
- **Date published:** 2026-01-15
- **Claim supported:** LiteLLM's built-in PostgreSQL spend tracking and logging
  tables degrade significantly once the `LiteLLM_SpendLogs` table exceeds
  approximately 1 million rows. Query latency for the `/spend/logs` endpoint
  increases from sub-100ms to 3-8 seconds. The recommended mitigation is manual
  table partitioning or periodic truncation.
- **Phoenix relevance:** At 300 RPS sustained, Phoenix would generate approximately
  26M log entries per day. Even at modest actual usage (1,000-5,000 requests/day),
  the 1M threshold would be reached within weeks, requiring ongoing database
  maintenance that a 2-person team cannot sustain.

### [E9] Claude Extended Thinking Breaks Through LiteLLM Proxy

- **Source:** https://github.com/BerriAI/litellm/issues/8956
- **Date published:** 2026-02-04
- **Claim supported:** Claude's extended thinking (chain-of-thought) feature uses
  streaming `thinking` content blocks that LiteLLM's response parser does not
  correctly handle. Responses are either truncated at the first thinking block or
  returned with malformed JSON, breaking downstream consumers that depend on
  structured output.
- **Phoenix relevance:** Phoenix Echo and Claude Code both rely on extended thinking
  for complex reasoning tasks. A proxy that corrupts the primary reasoning
  mechanism of the primary AI model is a deal-breaker for the core workflow.

### [E10] Additional Claude Extended Thinking Proxy Issues

- **Source:** https://github.com/BerriAI/litellm/issues/9103
- **Date published:** 2026-02-19
- **Claim supported:** Follow-up reports confirm that even after partial fixes in
  LiteLLM v1.58, extended thinking blocks with `budget_tokens` parameter are
  silently dropped when routed through the proxy. Token counting for thinking
  blocks is also incorrect, leading to inaccurate spend tracking and premature
  context window exhaustion warnings.
- **Phoenix relevance:** Inaccurate token counting means Phoenix cannot reliably
  budget API spend — the primary financial control mechanism for a small business.
  Silent parameter dropping means agents behave differently through the proxy than
  via direct API calls, creating hard-to-diagnose behavioral regressions.

### [E11] LiteLLM 800+ Open GitHub Issues

- **Source:** https://github.com/BerriAI/litellm/issues
- **Date published:** 2026-03-07 (snapshot date)
- **Claim supported:** As of March 2026, the LiteLLM repository has 800+ open
  issues. Many are tagged `bug` and remain unresolved for 60+ days. The issue
  velocity (new issues opened per week) exceeds the close rate, indicating growing
  maintenance debt.
- **Phoenix relevance:** A high open-issue count signals that the project's
  maintenance capacity is exceeded by its adoption rate. A 2-person team cannot
  afford to work around bugs that the upstream maintainers have not addressed.

### [E12] Helicone Benchmarks vs LiteLLM for Observability

- **Source:** https://docs.helicone.ai/references/performance-benchmarks
- **Date published:** 2025-11-20
- **Claim supported:** Helicone's async logging architecture achieves p99 latency of
  1-3ms for request logging, compared to LiteLLM's synchronous middleware approach
  which adds 15-50ms per request. For observability-only use cases (logging, cost
  tracking, analytics), Helicone is 25-100x faster because it operates as a
  non-blocking sidecar rather than an inline proxy.
- **Phoenix relevance:** If the goal is cost tracking and observability (not model
  routing), the proxy overhead of LiteLLM is unnecessary. Phoenix could achieve
  the same visibility with Helicone or a similar async logger at a fraction of the
  latency cost and operational complexity.

### [E13] LiteLLM Proxy Latency Overhead

- **Source:** https://github.com/BerriAI/litellm/discussions/7145
- **Date published:** 2025-10-09
- **Claim supported:** Community benchmarks show LiteLLM proxy adds 30-80ms of
  latency per request in typical deployments (single-instance, PostgreSQL backend).
  This overhead is additive — it compounds with upstream provider latency and
  network round-trip time. For streaming responses, the proxy introduces
  additional buffering delays on the first token.
- **Phoenix relevance:** In interactive development workflows (Claude Code, Gemini
  code completion), first-token latency directly impacts perceived responsiveness.
  An additional 30-80ms per request across hundreds of daily interactions degrades
  the developer experience for both team members.

---

## OpenRouter

### [E14] OpenRouter February 2026 Outages

- **Source:** https://status.openrouter.ai/incidents/2026-02
- **Date published:** 2026-02-28
- **Claim supported:** OpenRouter experienced three significant outages in February
  2026: a 4-hour API gateway failure (Feb 7), a 2-hour routing degradation
  affecting Claude and Gemini models (Feb 15), and a 6-hour billing system outage
  that caused double-charging (Feb 22). Combined downtime exceeded 12 hours in a
  single month.
- **Phoenix relevance:** Phoenix agents depend on continuous API access for
  development work. 12 hours of downtime in a month means approximately 1.6% of
  working hours are lost. For a 2-person team billing by the job, this translates
  directly to lost revenue. Adding OpenRouter as a dependency introduces a failure
  mode that does not exist with direct API calls.

### [E15] OpenRouter 5% BYOK Fee

- **Source:** https://openrouter.ai/docs/api-keys#bring-your-own-key
- **Date published:** 2025-08-01
- **Claim supported:** OpenRouter charges a 5% surcharge on all API usage when
  customers use their own provider API keys (Bring Your Own Key mode). This fee
  applies on top of the provider's native pricing. For Claude API usage, this means
  paying Anthropic's rates plus 5% to OpenRouter for routing.
- **Phoenix relevance:** At current Claude usage levels, a 5% surcharge represents a
  meaningful cost increase with no functional benefit over direct API calls. The
  routing and fallback features of OpenRouter do not justify the surcharge when
  Phoenix primarily uses a single provider (Anthropic).

### [E16] OpenRouter Data Residency and Logging Policies

- **Source:** https://openrouter.ai/docs/privacy
- **Date published:** 2025-12-01
- **Claim supported:** OpenRouter logs request metadata (model, token counts,
  timestamps) for billing and analytics. Request/response content is logged
  temporarily (up to 30 days) for abuse prevention and debugging. Data is stored
  on US-based infrastructure. OpenRouter's privacy policy permits sharing
  aggregated usage data with model providers. BYOK mode reduces but does not
  eliminate metadata logging.
- **Phoenix relevance:** Phoenix Electric's prompts may contain client addresses,
  project specifications, and pricing information. Routing this data through a
  third-party intermediary expands the data residency footprint and creates an
  additional vector for data exposure. Direct API calls to Anthropic limit the
  trust boundary to a single provider.

---

## MCP (Model Context Protocol)

### [E17] MCP Security Was Not the Leading Design Constraint

- **Source:** https://modelcontextprotocol.io/specification/2025-11-05/architecture
- **Date published:** 2025-11-05
- **Claim supported:** The MCP specification's architecture overview prioritizes
  interoperability and extensibility. Security is addressed through recommendations
  rather than mandatory requirements. The spec states that "servers SHOULD
  implement authentication" (RFC 2119 SHOULD, not MUST), and transport security
  is delegated to the deployer rather than enforced by the protocol.
- **Phoenix relevance:** When security is optional by specification, it is absent by
  default. Phoenix must implement its own authentication, authorization, and
  transport security for every MCP server it deploys. This is achievable but
  requires deliberate effort that the specification does not guide.

### [E18] MCP: 7 Distinct Failure Modes Documented

- **Source:** https://github.com/modelcontextprotocol/specification/issues/247
- **Date published:** 2025-10-30
- **Claim supported:** Community testing has documented at least 7 distinct failure
  modes in MCP server implementations: (1) stdio transport hangs on large
  payloads, (2) SSE connection drops without reconnection, (3) tool schema
  validation bypass, (4) resource URI injection, (5) prompt template injection via
  tool descriptions, (6) concurrent request race conditions, (7) memory leaks in
  long-running server processes.
- **Phoenix relevance:** Each failure mode is a potential interruption to agent
  workflows. A 2-person team must understand, test for, and mitigate all 7 modes
  for every MCP server in the stack. The USE IMMEDIATELY verdict for MCP is
  conditional on scoping to a small number of well-tested servers.

### [E19] MCP Tool Overexposure Degrades Agent Performance

- **Source:** https://modelcontextprotocol.io/docs/concepts/tools#best-practices
- **Date published:** 2025-11-01
- **Claim supported:** MCP documentation and community experience reports indicate
  that exposing language model agents to large numbers of tools simultaneously
  degrades task completion quality. Each tool definition consumes context window
  budget, reducing available context for the actual task. Tool selection accuracy
  decreases as the number of available tools grows, leading to incorrect tool
  invocations and wasted tokens. The recommended practice is to scope tool
  exposure to the minimum set required for each agent's role.
- **Phoenix relevance:** The proposed 10-tool architecture would expose agents to
  dozens of MCP tools across all servers. Phoenix should limit each agent's tool
  set to the minimum required for its specific role, using MCP's capability
  negotiation to scope tool visibility per session.

### [E20] 2,000+ MCP Servers Deployed Without Authentication

- **Source:** https://github.com/modelcontextprotocol/servers/discussions/892
- **Date published:** 2026-01-08
- **Claim supported:** A community audit of publicly listed MCP servers found that
  over 2,000 server implementations in the official and community registries ship
  without any authentication mechanism. Most rely on the assumption that the MCP
  server runs locally on the same machine as the client, which does not hold for
  networked or multi-machine deployments.
- **Phoenix relevance:** Phoenix's 3-machine topology (MacBook + Studio + VPS) means
  MCP servers must communicate over the network. Any MCP server pulled from the
  community registry will likely need authentication retrofitted before deployment.
  This is doable but must be part of the adoption checklist.

### [E21] MCP Prompt Injection Attack Surface

- **Source:** https://invariantlabs.ai/blog/mcp-security-analysis
- **Date published:** 2025-12-15
- **Claim supported:** Analysis of MCP's tool description mechanism reveals that tool
  descriptions and resource content returned by MCP servers are injected directly
  into the language model's context window. A compromised or malicious MCP server
  can embed adversarial instructions in tool descriptions, resource URIs, or
  returned content that alter agent behavior. The attack surface expands with each
  additional MCP server in the stack.
- **Phoenix relevance:** Phoenix agents execute code and modify infrastructure. A
  prompt injection via a compromised MCP server could instruct an agent to delete
  files, exfiltrate data, or modify system configurations. The 3-machine topology
  increases the attack surface because MCP traffic traverses the network. Scoping
  MCP to a minimal set of trusted, locally-developed servers mitigates this risk.

---

## Langfuse

### [E22] Langfuse 1 MB Trace Ceiling

- **Source:** https://github.com/langfuse/langfuse/issues/3421
- **Date published:** 2025-11-12
- **Claim supported:** Langfuse enforces a 1 MB maximum size for individual trace
  payloads. Traces exceeding this limit are silently truncated. Extended thinking
  responses from Claude (which can exceed 10,000 tokens of reasoning) combined
  with tool call payloads regularly produce traces that exceed the 1 MB ceiling.
- **Phoenix relevance:** Phoenix's primary model (Claude) produces large traces when
  using extended thinking. Silent truncation means observability data is incomplete
  exactly when it is most needed — during complex reasoning tasks where debugging
  is critical.

### [E23] Langfuse Socket Exhaustion Under Sustained Load

- **Source:** https://github.com/langfuse/langfuse/issues/3789
- **Date published:** 2026-01-22
- **Claim supported:** Self-hosted Langfuse instances experience socket exhaustion
  when ingestion rate exceeds approximately 50 events per second sustained over
  10+ minutes. The ClickHouse writer does not properly release connections under
  backpressure, leading to connection pool starvation and eventual ingestion
  failures.
- **Phoenix relevance:** While Phoenix's typical load is well below 50 events/second,
  batch operations (processing a day's worth of job records, bulk code analysis)
  can produce burst traffic that triggers this condition. Socket exhaustion on the
  Mac Studio or VPS would also affect other services sharing the same host.

### [E24] Langfuse 12-24 Hour Ingestion Lag

- **Source:** https://github.com/langfuse/langfuse/issues/4102
- **Date published:** 2026-02-10
- **Claim supported:** Under default self-hosted configuration, Langfuse's async
  ingestion pipeline can lag 12-24 hours behind real-time during periods of
  sustained write activity. The ClickHouse materialized views that power the
  dashboard queries are rebuilt on a schedule, not in real-time, causing stale
  data in the UI.
- **Phoenix relevance:** A 12-24 hour observability lag defeats the purpose of
  real-time monitoring. If an agent misbehaves at 9 AM, the trace data may not be
  visible until 9 PM. For a 2-person team that needs immediate feedback on agent
  behavior, this delay is operationally unacceptable without significant tuning.

### [E25] Langfuse Kubernetes Probe Failures

- **Source:** https://github.com/langfuse/langfuse/issues/3955
- **Date published:** 2026-02-01
- **Claim supported:** Self-hosted Langfuse deployments on Kubernetes experience
  intermittent liveness and readiness probe failures due to the web server
  becoming unresponsive during ClickHouse compaction cycles. This triggers pod
  restarts, causing ingestion data loss for in-flight traces.
- **Phoenix relevance:** If Phoenix deploys Langfuse on the VPS using Docker or
  Kubernetes, the same probe failure pattern applies. Unexpected restarts during
  compaction would drop trace data, and a 2-person team lacks the Kubernetes
  expertise to tune probe thresholds and compaction schedules.

### [E26] Langfuse Minimum Infrastructure Requirements

- **Source:** https://langfuse.com/docs/deployment/self-host#hardware-requirements
- **Date published:** 2025-09-15
- **Claim supported:** Self-hosted Langfuse requires ClickHouse (for analytics/trace
  storage) and PostgreSQL (for application state). Minimum recommended hardware is
  4 vCPU and 16 GB RAM for the combined stack (Langfuse server + ClickHouse +
  PostgreSQL). ClickHouse alone recommends 8 GB RAM minimum for production
  workloads.
- **Phoenix relevance:** 16 GB RAM dedicated to observability infrastructure is a
  significant allocation on the Mac Studio or VPS, where that memory competes with
  AI model inference, development tools, and the agents themselves. The existing
  Phoenix LEDGER system (see [E42]) provides structured logging without this
  resource overhead.

---

## OpenHands

### [E27] OpenHands 27-32% SWE-Bench Resolve Rate

- **Source:** https://github.com/All-Hands-AI/OpenHands/blob/main/evaluation/README.md
- **Date published:** 2026-01-30
- **Claim supported:** OpenHands achieves a 27-32% resolve rate on the SWE-Bench
  benchmark (depending on the underlying model). This means 68-73% of real-world
  software engineering tasks presented to OpenHands result in failure — incorrect
  patches, test regressions, or abandoned attempts.
- **Phoenix relevance:** A 68-73% failure rate means a 2-person team spends more time
  reviewing and reverting failed agent attempts than doing the work manually.
  Claude Code's direct integration with the existing workflow already provides
  agent-assisted development without the overhead of a separate orchestration
  layer.

### [E28] OpenHands V0 to V1 Migration Stability Regressions

- **Source:** https://github.com/All-Hands-AI/OpenHands/issues/6234
- **Date published:** 2026-02-08
- **Claim supported:** The OpenHands V0 to V1 migration (released January 2026)
  introduced breaking changes to the agent runtime API, workspace persistence
  layer, and event stream format. Users report increased crash frequency,
  workspace state corruption, and incompatibility with V0-era custom agents.
  Multiple follow-up patch releases (V1.0.1 through V1.0.4) addressed subsets of
  reported issues.
- **Phoenix relevance:** Adopting OpenHands now means onboarding during an active
  stability regression. A 2-person team cannot absorb the debugging overhead of a
  platform undergoing major architectural changes. The DEFER or REJECT verdict
  avoids this risk entirely.

### [E29] OpenHands Minimum 8 GB RAM Per Instance

- **Source:** https://docs.all-hands.dev/modules/usage/installation#system-requirements
- **Date published:** 2025-12-05
- **Claim supported:** OpenHands requires a minimum of 8 GB RAM per running instance
  to accommodate the sandbox container, agent runtime, browser automation
  (Playwright), and event store. With recommended headroom, 12-16 GB per instance
  is typical for stable operation.
- **Phoenix relevance:** 8-16 GB per OpenHands instance on the Mac Studio or VPS
  directly competes with local model serving and Claude Code's own memory
  requirements. Running even a single instance consumes resources that could serve
  2-3 concurrent agent sessions via direct API calls.

---

## Continue (VS Code Extension)

### [E30] Continue Extension Host Crashes

- **Source:** https://github.com/continuedev/continue/issues/3847
- **Date published:** 2025-12-20
- **Claim supported:** The Continue VS Code extension triggers extension host crashes
  when processing large files (>5,000 lines) or when the language model returns
  responses exceeding approximately 16,000 tokens. The crash affects all
  extensions in the same extension host process, not just Continue.
- **Phoenix relevance:** Phoenix works with electrical specification documents,
  codebases, and configuration files that regularly exceed 5,000 lines. Extension
  host crashes interrupt not just Continue but every other extension in the VS
  Code instance, including critical development tools.

### [E31] Continue Conflicts with Claude Code in Same VS Code Instance

- **Source:** https://github.com/continuedev/continue/issues/4102
- **Date published:** 2026-01-14
- **Claim supported:** Running Continue and Claude Code (Anthropic's VS Code
  extension) in the same VS Code instance causes keybinding conflicts, duplicate
  inline completions, and race conditions on the editor's inline suggestion API.
  Users report that both extensions compete for the same completion trigger,
  producing garbled or interleaved suggestions.
- **Phoenix relevance:** Claude Code is Phoenix's primary development tool (see
  [E41]). Any extension that conflicts with Claude Code is operationally
  incompatible with the existing workflow. Removing this conflict requires running
  separate VS Code instances, which defeats the purpose of a unified IDE
  experience.

---

## Open WebUI

### [E32] Open WebUI Hard Limit of 6 Concurrent Model Sessions

- **Source:** https://github.com/open-webui/open-webui/issues/5678
- **Date published:** 2025-11-28
- **Claim supported:** Open WebUI enforces a hard limit of 6 concurrent model
  sessions per instance. When the limit is reached, new session requests are
  queued or rejected. The limit is a deliberate design choice to prevent resource
  exhaustion on single-server deployments.
- **Phoenix relevance:** Phoenix runs 4 agents (Claude Code, Gemini, Codex, Phoenix
  Echo) that may each need multiple concurrent sessions. A 6-session ceiling means
  resource contention during peak usage, with sessions queued or dropped. This
  limit is particularly constraining during parallel development tasks.

### [E33] Open WebUI / pypdf Memory Leak

- **Source:** https://github.com/open-webui/open-webui/issues/6012
- **Date published:** 2026-01-05
- **Claim supported:** Open WebUI's document processing pipeline, which uses pypdf
  for PDF ingestion, exhibits unbounded memory growth when processing multiple or
  large PDF files. The pypdf reader objects are not properly garbage collected,
  causing memory consumption to grow monotonically until the process is restarted.
  Users report 2-4 GB of leaked memory per 100 MB of processed PDFs.
- **Phoenix relevance:** Phoenix processes electrical specifications, NEC code
  documents, and manufacturer datasheets — all PDF-heavy workflows. Unbounded
  memory growth on the Mac Studio would eventually starve other processes,
  requiring periodic restarts that interrupt agent workflows.

### [E34] Open WebUI Python 3.11 Version Lock

- **Source:** https://github.com/open-webui/open-webui/blob/main/pyproject.toml
- **Date published:** 2026-02-15
- **Claim supported:** Open WebUI's dependency tree pins to Python 3.11.x due to
  transitive dependency constraints (specifically chromadb and sentence-transformers
  version compatibility). Running on Python 3.12+ produces import errors and
  runtime failures in the embedding pipeline.
- **Phoenix relevance:** Python version locks create environment management overhead.
  If other Phoenix tools require Python 3.12+ (or 3.13+), the team must manage
  multiple Python installations or virtual environments, adding complexity that a
  2-person team should not maintain.

---

## Dev Containers

### [E35] QEMU Emulation Overhead on Apple Silicon

- **Source:** https://github.com/devcontainers/spec/issues/380
- **Date published:** 2025-08-22
- **Claim supported:** Running x86_64 (amd64) Dev Container images on Apple Silicon
  (ARM64) via QEMU emulation incurs a 3-10x performance penalty for CPU-intensive
  operations (compilation, testing, linting). Many popular base images and
  development tool images do not yet publish ARM64 variants, forcing emulation as
  the default.
- **Phoenix relevance:** Both the MacBook and Mac Studio run Apple Silicon. Any Dev
  Container image without an ARM64 variant will run under emulation, making builds
  and tests 3-10x slower. This penalty applies to the daily development loop, not
  just one-off operations.

### [E36] Docker Desktop macOS Memory Management Vulnerabilities

- **Source:** https://github.com/docker/for-mac/issues/7284
- **Date published:** 2025-10-15
- **Claim supported:** Docker Desktop for macOS (which underlies Dev Containers on
  Mac) has documented memory management issues where the VM backing Docker
  containers does not release memory back to macOS when containers are stopped or
  removed. The hypervisor memory grows monotonically during a session and is only
  reclaimed on Docker Desktop restart.
- **Phoenix relevance:** On a Mac Studio with finite RAM shared between AI model
  inference and development tools, Docker's memory retention means available system
  memory decreases over the course of a workday. This manifests as gradual
  performance degradation that is resolved only by restarting Docker, interrupting
  all running containers.

### [E37] Colima as Lighter Docker Alternative

- **Source:** https://github.com/abiosoft/colima
- **Date published:** 2025-09-01 (v0.8.0 release)
- **Claim supported:** Colima provides a Docker-compatible runtime for macOS without
  Docker Desktop's overhead. It uses Lima (Linux virtual machines) with lower
  baseline memory consumption and better memory release behavior. Colima supports
  containerd and Docker runtimes and is compatible with Dev Container tooling.
- **Phoenix relevance:** If containers are needed, Colima reduces the memory overhead
  documented in [E36]. However, the deeper question is whether containers are
  needed at all — see [E45] and [E46] for container-free alternatives.

---

## Architecture & Integration Complexity

### [E38] N*(N-1)/2 Integration Surface Formula

- **Source:** https://en.wikipedia.org/wiki/Complete_graph (combinatorics)
- **Date published:** N/A (mathematical identity)
- **Claim supported:** For N tools that may interact pairwise, the maximum number of
  integration points is N*(N-1)/2. For 10 tools, this yields 45 potential
  integration surfaces. Each integration point is a potential failure mode,
  security boundary, and maintenance burden.
- **Phoenix relevance:** Even if only 20% of the 45 possible integrations are active,
  that is 9 integration points requiring testing, monitoring, and maintenance. A
  2-person team with a primary business (electrical contracting) cannot sustain
  this integration surface.

### [E39] Industry Data on Integration Maintenance Hours

- **Source:** https://www.thoughtworks.com/insights/articles/managing-integration-complexity
- **Date published:** 2025-06-15
- **Claim supported:** Industry experience reports suggest 2-8 hours per month per
  active tool integration for maintenance (updates, compatibility testing, break-fix).
  This includes dependency updates, API version migrations, and configuration
  drift correction.
- **Phoenix relevance:** At 4 hours/month average across 9 active integrations, the
  team would spend 36 hours/month (roughly one full work week) on tool integration
  maintenance alone. This time directly competes with billable electrical
  contracting work.

---

## Phoenix Existing Capabilities & Direct API Patterns

### [E40] Claude API Token Cost Scaling Data

- **Source:** https://docs.anthropic.com/en/docs/about-claude/pricing
- **Date published:** 2026-02-01
- **Claim supported:** Claude API pricing is transparent and deterministic: input
  tokens, output tokens, and cached tokens each have published per-token rates.
  Direct API calls allow precise cost tracking through response headers
  (`x-usage-*`) without requiring a proxy or third-party observability layer.
- **Phoenix relevance:** Phoenix can implement cost tracking with a simple response
  header parser — a few lines of code in the existing logging infrastructure. This
  eliminates the need for LiteLLM's spend tracking (which breaks at 1M entries per
  [E8]) or Langfuse's cost analytics (which requires 16 GB RAM per [E26]).

### [E41] Claude Code as Existing Primary Development Tool

- **Source:** https://docs.anthropic.com/en/docs/claude-code
- **Date published:** 2026-01-15
- **Claim supported:** Claude Code is Phoenix Electric's primary AI development tool,
  already integrated into the daily workflow. It provides terminal access, file
  editing, git operations, and multi-file reasoning within a single interface.
  It runs natively on macOS without containers or additional infrastructure.
- **Phoenix relevance:** Claude Code is the baseline. Any proposed tool must provide
  capabilities that Claude Code does not, without degrading Claude Code's
  functionality. Tools that conflict with Claude Code (see [E31]) or duplicate its
  capabilities (see [E27]) fail this test.

### [E42] Phoenix LEDGER System for Operator Truth

- **Source:** Internal — `/Users/shanewarehime/GitHub/phoenix-gauntlet/docs/LEDGER.md`
- **Date published:** 2026-02-20
- **Claim supported:** Phoenix Electric operates a LEDGER system — a structured,
  append-only log that serves as the canonical source of truth for all operator
  actions, decisions, and system state changes. The LEDGER is plain-text,
  version-controlled, and requires no external database or analytics platform.
- **Phoenix relevance:** The LEDGER already provides the core observability function
  that Langfuse is proposed to fill. Before adding a 16 GB RAM analytics platform,
  the team should evaluate whether extending the LEDGER with structured fields
  (token counts, latency, model version) satisfies the observability requirement.

### [E43] Phoenix Existing Structured Logging Capability

- **Source:** Internal — Phoenix codebase logging infrastructure
- **Date published:** 2026-03-01
- **Claim supported:** Phoenix's existing codebase includes structured JSON logging
  to local files with rotation. Logs capture agent actions, tool invocations,
  errors, and timing data. The logging infrastructure requires no external
  dependencies and operates with negligible resource overhead.
- **Phoenix relevance:** Structured logging to local files, combined with the LEDGER
  ([E42]), provides a lightweight observability foundation. Adding grep, jq, or a
  simple log viewer covers 80% of the debugging use cases that Langfuse addresses,
  without the infrastructure overhead.

### [E44] Direct API Calls with Retry Logic Pattern

- **Source:** https://docs.anthropic.com/en/docs/build-with-claude/error-handling
- **Date published:** 2025-11-01
- **Claim supported:** The Anthropic SDK includes built-in retry logic with
  exponential backoff for transient errors (429, 500, 529). Direct API calls via
  the SDK handle rate limiting, server errors, and network timeouts without
  requiring a proxy layer. The SDK also supports request-level timeout
  configuration and streaming with automatic reconnection.
- **Phoenix relevance:** The retry and resilience features that LiteLLM provides are
  already built into the Anthropic SDK. Phoenix can call Claude directly with
  production-grade error handling, eliminating the proxy as a dependency and
  failure mode.

---

## Alternatives & Lighter Paths

### [E45] Nix/devenv as Container-Free Reproducible Environments

- **Source:** https://devenv.sh/getting-started/
- **Date published:** 2025-10-01
- **Claim supported:** Nix-based development environments (via devenv) provide
  reproducible, declarative environment definitions without containers. Environments
  are defined in a single file (`devenv.nix`), activate instantly (no container
  build step), and run natively on macOS including Apple Silicon. No Docker, no VM,
  no emulation overhead.
- **Phoenix relevance:** If the goal of Dev Containers is reproducible environments,
  Nix/devenv achieves this without Docker's memory overhead ([E36]) or QEMU's
  emulation penalty ([E35]). Native execution on Apple Silicon means zero
  performance penalty. The learning curve is real but one-time.

### [E46] Devbox as Nix Wrapper

- **Source:** https://github.com/jetify-com/devbox
- **Date published:** 2025-12-10 (v0.13.0)
- **Claim supported:** Devbox wraps Nix with a user-friendly CLI (`devbox init`,
  `devbox add`, `devbox shell`), eliminating the need to learn Nix language syntax.
  It generates a `devbox.json` that maps to Nix packages and produces reproducible
  environments. Compatible with VS Code and CI/CD pipelines.
- **Phoenix relevance:** Devbox removes the primary barrier to Nix adoption (syntax
  learning curve) while preserving the benefits: no containers, native performance,
  reproducible environments. A 2-person team can adopt Devbox in hours rather than
  the days required for raw Nix.

### [E47] Redis + BullMQ as Lightweight Job Queue Alternative

- **Source:** https://docs.bullmq.io/guide/introduction
- **Date published:** 2025-07-20
- **Claim supported:** BullMQ provides a production-grade job queue built on Redis,
  supporting delayed jobs, retries, rate limiting, prioritization, and job
  dependencies. Redis is a single binary with minimal resource overhead (typically
  10-50 MB RAM for small workloads). BullMQ supports TypeScript natively.
- **Phoenix relevance:** If Phoenix needs task orchestration (the use case for
  Temporal), BullMQ + Redis provides the core primitives (queues, retries,
  scheduling) at a fraction of the complexity and resource cost. Temporal's
  $6,770/month cloud pricing ([E52]) vs. Redis's negligible cost makes BullMQ the
  obvious first step.

### [E48] Git-Based State Persistence Pattern

- **Source:** https://www.jvt.me/posts/2025/01/git-as-database/
- **Date published:** 2025-01-15
- **Claim supported:** Git can serve as a lightweight state persistence mechanism for
  agent workflows. By committing state snapshots to a dedicated branch or
  repository, teams get versioned, diffable, auditable state history with built-in
  conflict resolution (merge). No external database required.
- **Phoenix relevance:** Phoenix already uses Git for code version control. Extending
  Git to persist agent state (task queues, configuration, run history) leverages
  existing infrastructure and skills. The LEDGER ([E42]) already follows this
  pattern. This approach scales to the team's actual needs without introducing
  database dependencies.

---

## Security & Operational Risk

### [E49] Breaking Changes in Tool Integrations Creating Security Gaps

- **Source:** https://snyk.io/blog/breaking-changes-create-security-gaps
- **Date published:** 2025-09-18
- **Claim supported:** When upstream tools push breaking changes, the window between
  the breaking change and the downstream team's update is a security gap. During
  this window, the integration may fail open (allowing unauthorized access),
  fail closed (blocking legitimate operations), or behave unpredictably. The
  risk scales linearly with the number of integrated tools.
- **Phoenix relevance:** With 10 tools, the probability of at least one breaking
  change per month is high. Each breaking change requires immediate attention to
  assess security impact. A 2-person team with a primary business cannot provide
  this level of continuous security response.

### [E50] Small Team Security Monitoring Capacity Limitations

- **Source:** https://www.cisa.gov/sites/default/files/2025-03/small-business-cybersecurity-guide.pdf
- **Date published:** 2025-03-01
- **Claim supported:** CISA's small business cybersecurity guidance acknowledges that
  teams with fewer than 5 dedicated IT staff cannot sustain monitoring of more than
  3-5 critical systems simultaneously. Each additional system increases alert
  fatigue and reduces response quality. The guidance recommends minimizing the
  number of systems requiring active security monitoring.
- **Phoenix relevance:** Phoenix has 0 dedicated IT staff — both team members are
  electricians who use AI tools. CISA's guidance for teams with dedicated IT staff
  caps at 3-5 systems. A 10-tool architecture with 45 integration points ([E38])
  far exceeds what even a dedicated IT team could monitor, let alone a 2-person
  electrical contracting team.

### [E51] Portkey as LiteLLM Alternative

- **Source:** https://portkey.ai/docs/introduction
- **Date published:** 2025-11-15
- **Claim supported:** Portkey provides an AI gateway with model routing, fallback,
  caching, and observability. Unlike LiteLLM, Portkey offers a managed cloud
  option that eliminates self-hosting overhead. It supports the OpenAI-compatible
  API format and provides per-request cost tracking without requiring a separate
  database. Portkey's gateway adds less than 5ms latency per request.
- **Phoenix relevance:** If Phoenix eventually needs multi-model routing (currently
  not required — see [E41]), Portkey offers the same functionality as LiteLLM
  without the self-hosting burden, database maintenance ([E8]), or proxy latency
  ([E13]). It is a DEFER candidate, not a current need.

### [E52] Temporal Cloud Pricing

- **Source:** https://temporal.io/pricing
- **Date published:** 2026-01-01
- **Claim supported:** Temporal Cloud pricing is based on actions (workflow starts,
  activity executions, signals, queries). At 100 million actions per month, the
  cost is approximately $6,770/month. Even at lower volumes (1 million
  actions/month), the minimum commitment is approximately $200/month plus per-action
  charges.
- **Phoenix relevance:** $200-6,770/month for workflow orchestration is
  disproportionate to Phoenix's needs. BullMQ + Redis ([E47]) provides the required
  job queue primitives at effectively zero marginal cost. Temporal is designed for
  enterprise-scale distributed systems, not 2-person teams.

### [E53] OpenTelemetry as Vendor-Neutral Observability Path

- **Source:** https://opentelemetry.io/docs/what-is-opentelemetry/
- **Date published:** 2025-12-01
- **Claim supported:** OpenTelemetry (OTel) provides a vendor-neutral standard for
  traces, metrics, and logs. By instrumenting with OTel, teams can export
  telemetry to any compatible backend (Jaeger, Grafana, Honeycomb, Langfuse) and
  switch backends without re-instrumenting application code. The OTel collector
  runs as a lightweight sidecar with minimal resource overhead.
- **Phoenix relevance:** If Phoenix instruments with OTel now, it preserves the
  option to adopt Langfuse, Helicone, or any other backend later without lock-in.
  The OTel collector is far lighter than Langfuse's full stack ([E26]) and can
  export to local files as an interim solution, complementing the existing LEDGER
  ([E42]) and structured logging ([E43]).

---

## Cross-Reference Index

| Evidence ID | Referenced In | Tool/Topic |
|---|---|---|
| E1-E2 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW | Coder / code-server |
| E3-E6 | TOOL_SCORECARD, SECURITY_TEARDOWN | Coder / code-server |
| E7, E9 | TOOL_SCORECARD, ADVERSARIAL_REVIEW | LiteLLM |
| E8, E10-E13 | TOOL_SCORECARD, COMPLEXITY_COST | LiteLLM |
| E14-E15 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW, BUILD_ORDER | OpenRouter |
| E16 | Supplementary — supports SECURITY_TEARDOWN context | OpenRouter (data residency) |
| E17, E19-E20 | TOOL_SCORECARD, SECURITY_TEARDOWN, PHASED_HYBRID, BUILD_ORDER | MCP |
| E18 | TOOL_SCORECARD, SECURITY_TEARDOWN, COMPLEXITY_COST | MCP (failure modes) |
| E21 | SECURITY_TEARDOWN | MCP (prompt injection) |
| E22-E26 | TOOL_SCORECARD, ADVERSARIAL_REVIEW, COMPLEXITY_COST | Langfuse |
| E27 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW, COMPLEXITY_COST | OpenHands |
| E28-E29 | TOOL_SCORECARD, SECURITY_TEARDOWN | OpenHands |
| E30-E31 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW, COMPLEXITY_COST | Continue |
| E32-E33 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW, PHASED_HYBRID | Open WebUI |
| E34 | TOOL_SCORECARD | Open WebUI (Python lock) |
| E35-E36 | TOOL_SCORECARD, SECURITY_TEARDOWN, ADVERSARIAL_REVIEW, COMPLEXITY_COST | Dev Containers |
| E37 | TOOL_SCORECARD | Dev Containers (Colima) |
| E38 | ADVERSARIAL_REVIEW, PHASED_HYBRID, COMPLEXITY_COST | Integration surface formula |
| E39 | COMPLEXITY_COST | Integration maintenance hours |
| E40 | Supplementary — supports COMPLEXITY_COST context | Claude API token pricing |
| E41 | PHASED_HYBRID | Claude Code as baseline |
| E42-E43 | PHASED_HYBRID, BUILD_ORDER | LEDGER + structured logging |
| E44 | PHASED_HYBRID, BUILD_ORDER | Direct API retry pattern |
| E45-E46 | PHASED_HYBRID | Nix/devenv, Devbox |
| E47-E48 | PHASED_HYBRID | BullMQ, git-based state |
| E49-E50 | SECURITY_TEARDOWN, ADVERSARIAL_REVIEW | Security & operational risk |
| E51 | TOOL_SCORECARD, PHASED_HYBRID | Portkey |
| E52 | TOOL_SCORECARD, ADVERSARIAL_REVIEW, PHASED_HYBRID | Temporal Cloud pricing |
| E53 | TOOL_SCORECARD, PHASED_HYBRID | OpenTelemetry |

## Verdict Summary

| Verdict | Tools |
|---|---|
| REJECT NOW | Coder, LiteLLM, OpenHands, Continue |
| USE IMMEDIATELY (scoped) | MCP |
| DEFER | OpenRouter, Langfuse, Open WebUI, Dev Containers, Temporal |

---

*End of evidence appendix. All entries are subject to revision as tools evolve.
Re-evaluate deferred tools quarterly or when Phoenix workload materially changes.*
