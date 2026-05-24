---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Security teardown of all proposed Gauntlet components
assumptions: Based on publicly documented vulnerabilities as of 2026-03-07; Phoenix-specific risk = 2-person team with sensitive customer/business data
status: DRAFT — pending Shane review
---

# Security Teardown: 10-Tool Gauntlet Stack

This document examines the security surface of each tool proposed for the Gauntlet stack. The analysis is written for a 2-person team (Phoenix Electric) handling sensitive customer data, pricing information, and business-critical workflows. Every tool that touches this environment is a potential entry point for data exposure, operational disruption, or legal liability.

Mitigations are framed as **candidates to evaluate**, not prescriptions. Tool selection decisions should not be driven by this document alone — but no tool should be adopted without acknowledging the risks documented here.

Citations use `[E#]` format and reference `EVIDENCE_APPENDIX.md` in this directory.

---

## 1. MCP — Prompt Injection Surface

**Verdict: USE (with hardening)**
**Priority: P0 — MCP is already in the recommended stack; its security posture matters immediately.**

### Risk Profile

The Model Context Protocol was designed with interoperability as the primary goal. Security was not the leading design constraint [E17]. This is not a criticism of the protocol designers — it is a factual observation about engineering tradeoffs that now become Phoenix's responsibility to compensate for.

**Exposure scale.** Over 2,000 MCP servers have been deployed across the ecosystem without authentication requirements [E20]. The protocol does not mandate auth at the server level, which means any server Phoenix connects to — or any server someone else connects to Phoenix's infrastructure through — is an open channel by default.

**Documented failure modes.** Seven distinct failure patterns have been cataloged in MCP deployments [E18], including the "Kitchen Sink" server pattern — where a single MCP server exposes an excessive number of tools and capabilities, creating an attack surface that grows with every added function. Tool overexposure is not a theoretical risk; it is a documented pattern where servers expose more capabilities than any single consumer needs [E19].

**Prompt injection.** MCP's core mechanism — passing structured tool calls between a model and external servers — is a prompt injection surface [E21]. If an attacker can influence the data returned by an MCP server, they can potentially alter model behavior downstream. For Phoenix, where MCP would touch customer data and pricing logic, this is not an abstract concern.

### Candidate Mitigations

- Scope MCP connections to fewer than 10 servers. Every additional server is an additional trust boundary.
- Enforce authentication on all custom MCP servers Phoenix deploys. No anonymous connections.
- Never expose real-time production data (customer records, live pricing) through MCP tool surfaces. Use read-only snapshots or synthetic data where possible.
- Audit which tools each MCP server exposes. Remove any tool that is not actively used.
- Monitor MCP server logs for unexpected tool invocations — these may indicate injection attempts.

---

## 2. LiteLLM — Centralized Key Store

**Verdict: REJECT NOW**
**Priority: P0 if adopted — but current recommendation is to reject.**

### Risk Profile

LiteLLM's core value proposition — a single interface to multiple LLM providers — requires storing API keys for every provider in one location. This is a centralized key store by design, and centralized key stores are high-value targets.

**Issue volume.** LiteLLM carries over 800 open issues on its repository [E11]. The sheer volume makes it difficult to assess how many of those issues have security implications. Unknown vulnerability exposure in a tool that holds all your API keys is not an acceptable risk posture for a small team that cannot dedicate resources to continuous security auditing of upstream dependencies.

**Blast radius.** If LiteLLM is compromised — through a dependency vulnerability, a configuration error, or an upstream supply chain attack — the attacker gains keys to every model provider simultaneously. This is not a single-provider breach; it is a total key compromise across Anthropic, OpenAI, Google, and any other provider configured.

### Candidate Mitigations

If LiteLLM is ever reconsidered (e.g., at scale where multi-provider routing becomes necessary):

- Vault-backed key injection (e.g., HashiCorp Vault, AWS Secrets Manager) — keys never stored in plaintext config files.
- Per-provider key rotation on a schedule shorter than LiteLLM's average issue resolution time.
- Network isolation: LiteLLM instance should not be reachable from the public internet under any circumstances.
- Runtime key injection via environment variables, never baked into Docker images or config files.

---

## 3. OpenRouter — Data Exposure / Single Point of Failure

**Verdict: DEFER**
**Priority: Not immediate, but data exposure risk must be noted for future evaluation.**

### Risk Profile

OpenRouter acts as a proxy layer between Phoenix and model providers. Every prompt and every response transits OpenRouter's infrastructure. This means a third party has visibility into all Phoenix interactions routed through the service.

**Outage history.** February 2026 outages [E14] demonstrated the single-point-of-failure risk. When OpenRouter goes down, every request routed through it fails. For a 2-person team, this is not a "degrade gracefully" scenario — it is a full stop.

**BYOK fee structure.** The 5% fee on Bring Your Own Key usage [E15] means OpenRouter is handling Phoenix's API keys as part of the transaction. This adds another party to the key custody chain, increasing the surface area for key exposure.

**Data residency.** Prompts containing customer information, pricing data, or internal business logic would transit OpenRouter's servers. Phoenix has no control over OpenRouter's data retention, logging, or internal access policies beyond what is publicly documented.

### Candidate Mitigations

If OpenRouter is adopted in the future:

- Use direct API calls for any workflow involving sensitive customer data or proprietary business logic. OpenRouter only for research, comparison, or non-sensitive workloads.
- Never route BYOK traffic through OpenRouter for production workloads — the 5% fee is a signal that key handling is part of the service.
- Maintain direct-API fallback paths so that an OpenRouter outage does not halt all operations.
- Review OpenRouter's data retention and logging policies before routing any Phoenix data through the service.

---

## 4. Open WebUI — Memory Leaks + SQLite

**Verdict: DEFER**
**Priority: Not immediate, but stability risks are relevant if evaluated as a UI layer.**

### Risk Profile

Open WebUI presents three intersecting risks: memory instability, database limitations, and authentication gaps.

**pypdf memory leak.** The pypdf-based document processing pipeline has a documented memory leak where memory consumption grows unbounded during PDF processing until the service is restarted [E33]. For a team processing electrical specs, manufacturer datasheets, or customer documents, this is not an edge case — it is a predictable failure mode.

**SQLite under load.** The default SQLite backend creates a bottleneck under concurrent access [E32]. SQLite uses file-level locking, which means multiple simultaneous users or automated agents competing for database access will cause write contention and potential data corruption. For a single user, this is manageable. For an agent-assisted workflow where multiple processes may interact with the UI simultaneously, it is a structural limitation.

**Authentication.** No documented auth hardening path exists for multi-user or multi-agent deployment. If Open WebUI is exposed beyond localhost — even on a private network — it is effectively an unauthenticated endpoint.

### Candidate Mitigations

If Open WebUI is adopted:

- Replace SQLite with PostgreSQL backend before any production use.
- Implement scheduled restarts (e.g., nightly) to bound memory leak impact from pypdf processing.
- Deploy behind an authentication proxy (e.g., OAuth2 Proxy, Authelia) — do not rely on Open WebUI's built-in auth for anything beyond local development.
- Monitor memory consumption as a first-class metric, with automated restarts when thresholds are exceeded.

---

## 5. Coder — AGPL License Trap

**Verdict: REJECT**
**Priority: Legal risk is immediate upon adoption — not just a technical concern.**

### Risk Profile

Coder is licensed under AGPL v3 [E2]. This is the most restrictive common open-source license and has direct implications for any organization that modifies and deploys the software.

**AGPL mechanics.** If Phoenix modifies Coder in any way — configuration changes that constitute derivative works, custom plugins, integration scripts — and serves the modified version over a network (which is the entire point of Coder as a remote development platform), Phoenix is legally required to open-source those modifications. For a company with proprietary pricing logic, customer data workflows, and competitive business processes, this is a material legal risk.

**Agent Boundaries.** Coder's Agent Boundaries feature launched in December 2025 [E1]. This is the mechanism intended to contain agent actions within defined scopes. At roughly three months old, this feature has not undergone the sustained adversarial testing that security-critical containment mechanisms require. The security properties are documented but not yet battle-tested at scale.

**Extension vulnerabilities.** code-server, the VS Code implementation that Coder relies on, has documented extension vulnerabilities [E3][E4]. Extensions run with the same privileges as the development environment, meaning a compromised extension has access to everything the developer (or agent) can access.

### Note

The AGPL risk is not a technical risk that can be mitigated with configuration. It is a legal constraint. If Phoenix's legal counsel has not reviewed AGPL v3 obligations in the context of the business, adoption should not proceed.

---

## 6. OpenHands — Agent Autonomy Risk

**Verdict: REJECT**
**Priority: Agent containment failures are a direct risk to code integrity and customer data.**

### Risk Profile

OpenHands provides autonomous code execution capabilities — agents that can read, write, and execute code with limited human oversight. This is inherently a high-risk capability.

**Migration instability.** The V0 to V1 migration [E28] introduced stability gaps in agent containment. Migration periods are historically when security invariants are most likely to break — old assumptions no longer hold, new guarantees are not yet proven, and edge cases emerge in production that were not anticipated in testing.

**Failure rate.** Documented failure rates of 68-73% on standard benchmarks [E27] mean that the majority of agent-initiated tasks do not complete successfully. Failed tasks are not clean failures — they leave behind partial changes, uncommitted modifications, half-written files, and potentially broken build states. In a codebase that touches customer data or pricing logic, partial changes are a data integrity risk.

**Guardrail limitations.** Autonomous code execution with limited guardrails means the blast radius of a single agent error is bounded only by the agent's filesystem and network access. Without robust sandboxing, an agent error can propagate beyond the intended task scope.

### Note

Agent autonomy tools are evolving rapidly. OpenHands may become a viable option as containment mechanisms mature. The rejection is based on current stability, not on the concept of autonomous coding agents.

---

## 7. Continue — IDE Conflict Surface

**Verdict: REJECT**
**Priority: IDE stability is a daily workflow concern, not just a security issue.**

### Risk Profile

Continue introduces a second AI orchestrator into the IDE environment. When combined with Claude Code (or any other AI assistant), this creates a multi-agent conflict surface within the development environment.

**Context window competition.** Two AI systems operating in the same IDE compete for context window resources [E31]. Token conflicts arise when both systems attempt to process the same file, the same terminal output, or the same error message simultaneously. The result is unpredictable behavior — not because either system is broken, but because they were not designed to share context.

**Extension Host crashes.** Continue's operation within the VS Code Extension Host has documented crash patterns [E30]. Extension Host crashes are not graceful — they can terminate during active file edits, potentially causing data loss or file corruption. For a developer working on pricing logic or customer-facing code, an Extension Host crash at the wrong moment is a data integrity risk.

### Note

The conflict is architectural, not a bug. Two AI orchestrators in one IDE is a design pattern that has not been solved at the protocol level. Mitigation would require one or both tools to implement cooperative scheduling, which neither currently supports.

---

## 8. Dev Containers — Docker Attack Surface

**Verdict: DEFER**
**Priority: Docker risks are well-understood but require active management.**

### Risk Profile

Dev Containers rely on Docker, and Docker's security model has known limitations — particularly on macOS.

**Docker Desktop on macOS.** Memory management vulnerabilities in Docker Desktop on macOS [E36] can lead to container instability, host resource exhaustion, and in extreme cases, privilege escalation paths. These are not theoretical — they are documented and periodically patched, which means they are periodically exploitable.

**Apple Silicon and QEMU.** Running x86 containers on Apple Silicon requires QEMU emulation [E35]. Emulation adds a layer of complexity — and every layer of complexity is a potential escape vector. QEMU itself has a history of security vulnerabilities, and the interaction between QEMU, Docker, and macOS introduces a three-way trust boundary.

**Container escape.** Container escape is a known risk category in Docker deployments. While modern Docker versions have significantly hardened isolation, the fundamental architecture — containers sharing a kernel with the host — means that a kernel vulnerability is a container escape vulnerability.

### Candidate Mitigations

If Dev Containers are adopted:

- Keep Docker Desktop updated to the latest stable release. Do not defer Docker updates.
- Use ARM-native base images on Apple Silicon to avoid QEMU emulation where possible.
- Do not mount sensitive host directories (customer data, API keys, SSH keys) into containers.
- Run containers with the minimum required privileges — avoid `--privileged` mode.
- Consider container runtime alternatives (e.g., Podman) that offer rootless execution by default.

---

## 9. Temporal — Cost Escalation Risk

**Verdict: DEFER**
**Priority: Cost escalation is an operational security concern, not a code vulnerability.**

### Risk Profile

Temporal's pricing model scales with action volume. At 100 million actions per month, the cost reaches approximately $6,770/month [E52]. For a 2-person team, this is a significant and potentially surprising expense.

**Cost as security.** Unexpected cost is an operational security concern. A runaway workflow — whether triggered by a bug, a misconfiguration, or an agent executing an unbounded loop — can generate millions of actions in hours. Without cost visibility and hard caps, Temporal's pricing model transforms a software bug into a financial event.

**No vulnerability per se.** Temporal itself is not presenting a code-level security vulnerability in this analysis. The risk is structural: usage-based pricing without automatic circuit breakers means the blast radius of an operational error is measured in dollars.

### Candidate Mitigations

If Temporal is adopted:

- Set hard budget caps at the Temporal Cloud level before any workflow goes live.
- Implement action-count monitoring with alerts at 50%, 75%, and 90% of budget.
- Design all workflows with explicit termination conditions — no unbounded loops.
- Start with self-hosted Temporal (free) and only migrate to Temporal Cloud when the action volume and workflow complexity justify the cost.

---

## 10. Stack-Level: Composition Attack Surface

**Priority: P0 — this risk exists regardless of which individual tools are selected.**

### Risk Profile

The proposed stack includes 10 tools. Each tool has its own release cycle, its own vulnerability disclosure process, its own dependency tree, and its own update cadence. The composition of these tools creates a security surface that is greater than the sum of its parts.

**Multiplicative surface.** 10 tools means 10 independent update cycles. Each update is a potential vulnerability window — the period between when a vulnerability is disclosed in a dependency and when the tool releases a patch. With 10 tools, the probability that at least one tool has an unpatched vulnerability at any given time approaches certainty.

**Integration boundaries.** Every integration point between tools — MCP to Claude Code, Docker to Dev Containers, SQLite to Open WebUI — is a security boundary. Data crossing these boundaries must be validated, sanitized, and authorized. The more boundaries, the more opportunities for boundary violations.

**Breaking changes.** A breaking change in one tool [E49] can create security gaps in integrations that depend on the old behavior. If Tool A changes its authentication flow and Tool B still expects the old flow, the integration may silently downgrade to unauthenticated communication.

**Phoenix-specific impact.** A 2-person team cannot monitor 10 security advisory feeds, evaluate 10 sets of release notes for security implications, and test 10 update paths — all while running a business. The toolchain complexity must be proportional to the team's capacity to maintain it securely.

### Candidate Mitigations

- Minimize the tool count. Every tool that is rejected or deferred reduces the composition surface.
- Pin dependency versions and update on a deliberate schedule — not automatically, not never.
- Maintain a single document listing every tool in the stack, its version, its last security audit date, and its update cadence.
- When evaluating new tools, ask: "Does this tool replace an existing tool, or does it add to the count?" Only additions that replace should be considered at this team size.

---

## Summary Table

| Tool | Top Risk | Severity | Status |
|------|----------|----------|--------|
| **MCP** | Prompt injection via unauthenticated servers, tool overexposure | **P0** | **USE** (with hardening) |
| **LiteLLM** | Centralized API key compromise across all providers | **P0** (if adopted) | **REJECT** |
| **OpenRouter** | All prompts transit third-party infra; SPOF on outage | **P1** | **DEFER** |
| **Open WebUI** | Unbounded memory leak; SQLite write contention; no auth hardening | **P1** | **DEFER** |
| **Coder** | AGPL v3 license forces open-sourcing of modifications | **P0** (legal) | **REJECT** |
| **OpenHands** | 68-73% task failure rate; partial changes to codebase | **P0** | **REJECT** |
| **Continue** | Dual-AI context conflicts; Extension Host crash data loss | **P1** | **REJECT** |
| **Dev Containers** | Docker escape vectors; QEMU emulation on Apple Silicon | **P2** | **DEFER** |
| **Temporal** | Runaway workflow cost escalation without circuit breakers | **P2** | **DEFER** |
| **Stack Composition** | Multiplicative attack surface across 10 integration boundaries | **P0** | N/A — structural |

---

## Key Takeaway

The highest-severity risks cluster around tools that Phoenix would **actively depend on** (MCP) or that create **irreversible exposure** (Coder's AGPL, LiteLLM's key centralization, OpenHands' autonomous execution). The REJECT verdicts are not assessments of tool quality — they are assessments of risk-to-team-size ratio. A 10-person security team could manage these risks. A 2-person electrical contracting team cannot, and should not be expected to.

The tools marked DEFER are not safe — they are lower priority. If any deferred tool is revisited, this security analysis should be updated with current vulnerability data before adoption proceeds.

---

*This document references evidence compiled in `EVIDENCE_APPENDIX.md`. All citations should be verified against primary sources before making final adoption decisions.*
