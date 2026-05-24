# Shane's Decisions -- Phoenix Echo Gateway

**Extracted:** 2026-03-10
**Sources:** SHANES_DECISIONS_COMPILED.md, report__phoenix-echo__gateway-build-review__20260309.md, MASTER_REVIEW_SUMMARY.md, Research Bible (17 files)
**Purpose:** Complete extraction of every decision Shane made, with his exact reasoning, technology choices, rejected alternatives, priorities, budget, timeline, and architecture preferences. This file is a knowledge reference for the Phoenix AI plugin system.

---

## TABLE OF CONTENTS

1. [Core Philosophy (8 Principles)](#1-core-philosophy-8-principles)
2. [Q&A Decisions (Q1-Q12)](#2-qa-decisions-q1-q12)
3. [Inline Decisions on Adversarial Findings](#3-inline-decisions-on-adversarial-findings)
4. [Technology Choices and Reasoning](#4-technology-choices-and-reasoning)
5. [Rejected Alternatives and Why](#5-rejected-alternatives-and-why)
6. [Priority Ordering](#6-priority-ordering)
7. [Budget and Cost Philosophy](#7-budget-and-cost-philosophy)
8. [Timeline Preferences](#8-timeline-preferences)
9. [Architecture Preferences](#9-architecture-preferences)
10. [Open Questions Awaiting Decision](#10-open-questions-awaiting-decision)
11. [Research Tasks Required Before Decisions](#11-research-tasks-required-before-decisions)

---

## 1. CORE PHILOSOPHY (8 Principles)

These 8 principles are the foundation of every build decision. They come from Shane's own words during the Gateway Build Review session (2026-03-09). When any decision conflicts with these principles, the principles win.

### Principle 1: No Dependency, Maximum Utilization

Use the best in the world (Claude, OpenClaw, GPT-OSS) to BUILD your own system. Scrub everything, extract patterns, rewrite custom, own it forever. If cloud disappears tomorrow, the system still works (degraded, not dead).

**Build Rule:** Every feature must have a local fallback. Cloud services are tools for building, not crutches for operating.

### Principle 2: Swarm Methodology

Teams of specialized agents, not solo work. Adversarial review is the most important role.

> "Make him like Codex."

**Build Rule:** Every major output gets adversarial review. No solo builds ship without team challenge.

### Principle 3: Quality Over Speed ("Taj Mahal")

> "Get it as close to perfect as you can."

The build should survive the Gauntlet with only minor adjustments.

**Build Rule:** Do not ship fast. Ship right. If a feature needs another day to be excellent, take the day.

### Principle 4: Don't Delete, Expand

Build on what exists. Compile, merge, add. Never replace without preserving.

**Build Rule:** No destructive operations. Archive before replacing. Git tags before rewrites. The no-delete rule is absolute.

### Principle 5: 100,000 Square Foot House

Build infrastructure for the future. 500 skills, 500 crons, 100 pages. Furnish approximately 35% now. The rest fills in over time.

**Build Rule:** Every navigation menu, every plugin slot, every page shell should be built for the FULL scope. Only 35% gets populated now. The architecture must never be the bottleneck.

### Principle 6: Echo Is Mine

Echo identity is Shane's. Every model, every session, every surface -- Echo finds Shane's Echo. The system trains toward this.

**Build Rule:** Echo identity appears in every interface, every bot interaction, every agent output. This is not branding -- it is the soul of the system.

### Principle 7: Business Play

This system pattern can be copied for small business owners. Custom AI systems at fair prices, maintained by Phoenix AI. The first customer is Phoenix Electric. The template becomes the product.

**Build Rule:** Build modular. Build configurable. Every Phoenix-Electric-specific feature should be parameterizable so the template works for other businesses. Think "white-label from day one."

### Principle 8: Not Dependency -- Utilization

Using Claude Opus 4.6 to train local models is not dependency. It is the same pattern as scrubbing OpenClaw: study the best, extract the value, build your own.

**Build Rule:** Cloud API calls for training, fine-tuning data generation, and quality benchmarking are investments, not dependencies. Track them as such. The goal is always: use cloud to make local better, then shift to local.

---

## 2. Q&A DECISIONS (Q1-Q12)

### Q1: Embedding Model -- Which is canonical for RAG?

**Options Presented:**
- A: nomic-embed-text (local, free, 768 dimensions, already warm in Fleet A)
- B: OpenAI text-embedding-3-small (cloud, $0.10/1M tokens, 512 dimensions)
- C: Start with OpenAI, migrate to local when quality is proven

**Shane's Decision:** NOT YET DECIDED. Shane requested a full breakdown first.

> NEED FULL BREAKDOWN

**What This Means:** Do not proceed with any embedding model selection. Produce a full cost/quality/performance comparison of nomic-embed-text, text-embedding-3-small, and MiniLM across quality, speed, cost, and dimension requirements. Present to Shane for final decision. Do NOT hardcode any embedding dimension into the vector store schema until Shane decides. Design the pipeline to be embedding-model-agnostic.

---

### Q2: RAG Generation Model -- Local fleet or Claude?

**Options Presented:**
- A: Local fleet only (true sovereignty, zero per-query cost)
- B: Claude only (highest quality, ~$0.015/query)
- C: Hybrid -- router decides based on complexity

**Shane's Decision:** Hybrid with local-first trajectory targeting 90% local operations. Cloud approved for development and training only. Not approved for long-term production use.

> IM GOOD WITH DEVELEOPMENTAL USE TO CREATE THE TRAINING METHOD AND GENERATE THE SYSTEM. NOT LONG TERM THOUGH

Shane also provided his 6-point philosophy on WHY local AI matters (the most important annotation in the entire document):

> HONESTLY I CANT SAY BECAUSE EVERYTHING IS EVOLVING SO RAPIDLY. I WILL SAY WE ARE BUILDING FOR MULTIPULE REASONS.
>
> 1. REMOVE THE DEPENDANCE & POSSIBILITY OF DEGRATION OF FREEDOM AND TRUST AS WITH THE AMOUNT OF INVESTMENT IT IS NOT A WISE DESISON TO REMAIN WITH OUT A PLAN TO SELF SUPPORT.
>
> 2. EXPANDED GROWTH ABILITY DO TO REDUCED OPERATING COSTS,
>
> 3. FREEDOM TO GROW AND DEVELOP THE MODEL THAT IS RESPONSIBILE OR WILL BE RESPONSIBLE FOR A MASSIVE AMOUNT OF THE DAY TO DAY OPERATIONS. SESSIONS ARE TO SHORT AND CONSISTANCE SI LACKING DO TO A BLANK SESSION ROLLIING IN EVER 200,000,
>
> 4. MAINTAIN THE MOMENTOM OF EVOLVING WITH THE RISE OF AI AND NOT LETTING MY SELF GROW COMPLACENT OR SATISFIED WIIT GOOD ENOUGH AS THE WORLD TRANSFORMS AND ADAPTS I LOOK TO BE AN EXAMPLE TO HELP OTHERS WHO WAKE UP ONE DAY TO FINE THEY DIDN'T PAY ATTENTION ENOUGH.
>
> 5. I ANTICIPATE THAT WE WILL NEVER BE ABILE TO CREATE A REPLACEMENT TO MATCH THE FONTEIR MODELS. HOW EVER WE WILL TRY, AND INSO DOING I ANTICIPATE A SYSTEMATIC EXPANSION THAT WILL NOT LEAVE US WITH OT A SOLID BACK UP/ INFACT THE PRIMARY AI WILL BE LOCAL FOR 90% OF OUT OPERATIONS. ITS ME WHO WILL BE PERSONALLY MANAGING OVERSITE AND CAPABILITYS OF THE FONTER MODELS INORDER TO MAINTAIN THE PACE OF AI S UPRISING

**What This Means (decoded into build requirements):**
1. Self-sufficiency is non-negotiable. If Anthropic, OpenAI, or any cloud provider disappears tomorrow, Phoenix Electric must still function. Build every system with a local fallback.
2. Local inference reduces marginal cost to near-zero. After hardware investment, every local query is free. The growth math only works if operations shift local.
3. Session persistence is broken in cloud models. Cloud sessions reset every ~200K tokens. A local model with proper memory architecture can maintain continuity indefinitely. This is WHY the Gateway memory system exists.
4. Shane is building to lead, not follow. This is not just a business tool -- it is a demonstration of what small businesses can achieve with AI.
5. Local will handle 90% of operations. Shane personally manages the remaining 10% that requires frontier model capabilities. The router must make this split visible and controllable.

**Build Rule:** Cloud (Claude) is approved for DEVELOPMENT and TRAINING purposes. Long-term architecture MUST route 90% of operations through local models. Build the router with a `local-first` flag that defaults to local and only escalates to cloud when local quality is insufficient. Every cloud call must be logged with justification.

---

### Q3: Monthly AI Budget

**Options Presented:** Research Bible estimates $158 (optimized) to $301 (current).

**Shane's Decision:** No fixed budget. ROI-based evaluation.

> make it worth it. Thats how much!!!!

**What This Means:** Every AI expenditure must be justified by the value it delivers. The cost dashboard should show cost-per-task and value-delivered metrics, not just raw spend. If a $500 month produces 10x the output of a $100 month, the $500 month wins. Waste will not be tolerated. Build cost tracking that shows WHAT each dollar bought. This reinforces the local-first strategy: local inference is "free" after hardware investment, so shifting work local is inherently "worth it."

---

### Q4: GPT-OSS Timeline -- When will it be downloaded/tested?

**Shane's Decision:** Gated behind runbooks and Gauntlet approval. Deliberately paced.

> When the run books have been clearly defined and gauntlet approved

> IM CLEANING HOUSE AND PREPARING GATEWAY DASHBOARD FOR MANAGEMENT. ALSO ALOWING TIME TO LET SOME OF THE INFO SINK IN AS WE RESEARCH. COULD BE TOMORROW, COULD BE THIS WEEK END, OR NEXT MONTH.

**What This Means:** GPT-OSS download is GATED behind two prerequisites: (1) runbooks must be written and finalized, and (2) those runbooks must pass Gauntlet review. Shane is deliberately pacing -- preparing the management surface (Gateway dashboard) BEFORE bringing GPT-OSS online so he has visibility and control from day one. Do not nag about timelines. Build the dashboard to be ready for when GPT-OSS arrives. All fleet UI must work with current models first (llama3, codellama, mistral, nomic-embed-text). Design all fleet UI elements to be model-agnostic so GPT-OSS slots in when it arrives.

---

### Q5: Teams Integration -- Phase 1 or later?

**Shane's Decision:** HIGH PRIORITY. Scoped to emails and calendar only. Not Service Fusion through Teams.

> would love to have m365 last week and working not ever the sf just the emails and calendar. It so close

> PRIORITY. MISTAKES BY THE BOT WILL BE EXPECTED AND COMMUNICATED. NEED STRUCTURED TRAINING AND VERBOSE MD. WITH CLARITY OF IDENTIY. WE OFFER A SUCCESFUL ENVIROMENT THEN WE WILL GER A BETTER RESPONSE

Shane also noted: "Bot Framework was archived Dec 2025. Negative it alive" and "New M365 Agents SDK is very young never been used."

**What This Means:** M365 integration is HIGH PRIORITY but scoped narrowly: emails and calendar ONLY. Not Service Fusion through Teams, not full bot framework. Shane is frustrated this is not working yet. The Bot Framework being archived is acknowledged but not a blocker. Key requirements: (1) structured training docs for the bot, (2) verbose markdown documentation, (3) clear Echo identity in every bot interaction, (4) mistakes are expected and will be communicated to users openly. Build for a "successful environment" -- good docs, clear identity, graceful error handling. The bot earns trust by being honest about what it can and cannot do.

---

### Q6: n8n Status -- Already deployed?

**Shane's Decision:** REJECTED. Effectively vetoed unless someone makes a compelling case.

> going to need talking into on this one becasue there going out off busness with opus 4.6 providing the same with oath subscrictpn

> THIS ONE IS GOING TO TAKE A LOT OF EXPLAINING BECAUSE N8N ID ABOUT TO GO OUT OF BISNUSS

**Reasoning:** Shane believes n8n is going out of business. Opus 4.6 with OAuth subscription can handle the same deterministic workflow orchestration that n8n provides, without the additional infrastructure, hosting cost, and dependency risk.

**What This Means:** Do NOT build any n8n integrations. If workflow orchestration is needed, build it as a Gateway-native feature using the existing agent dispatch system. If someone wants to make the case for n8n, they need to prove: (1) n8n is NOT going out of business, (2) it provides something Opus 4.6 cannot, and (3) the cost/maintenance burden is justified.

---

### Q7: Phoenix Accent Color -- #d97757 or #ff6b35?

**Shane's Decision:** NEITHER. The canonical color scheme is red, black, and gold.

> red, black and gold our the color scheme. Look at the phoenix echo logo

**What This Means:** The Phoenix Echo logo is the single source of truth for brand colors. Both #d97757 (clay) and #ff6b35 (orange) in existing code are WRONG. The design team must pull exact hex values from the logo file. Update the CSS design system tokens to use red, black, and gold as the primary palette. All existing references to clay and orange in the codebase must be replaced.

---

### Q8: Sandbox Strategy -- vm2 deprecated

**Options Presented:**
- A: isolated-vm (drop-in replacement, no Docker needed)
- B: Docker containers (strongest isolation, more complex)
- C: macOS sandbox-exec (native, limited documentation)

**Shane's Decision:** NOT YET DECIDED. Wants risk quantified first. Default to beta/newer solutions.

> WHATS THE ACTUAL RISK POTENTIAL AND CAN IT CRAWL OUT OF MY STUDIO AND AND GET LOST? NOT SURE IF THIS EVEN A REAL CONSERN?

> NEED TO STEP INTO BETA MODELS. UNLESS THERE IS ADDIAQUTE REASON NOT TO.

**What This Means:** Two action items: (1) Produce a plain-English risk assessment answering Shane's specific question -- can a sandbox escape reach beyond the Studio? What is the real-world probability? What data is at risk? (2) Default to using beta/newer isolation models (likely isolated-vm) unless research shows a concrete reason not to. Shane is not afraid of beta software -- he is afraid of wasted effort on a non-problem. Quantify the risk, then act.

---

### Q9: Gateway Scope -- 100K sq ft house metaphor

**Shane's Decision:** CONFIRMED. Full infrastructure, 35% furnished.

> yes this plan will lay out the full spectrum menus about 35% BECASUSE WELL ADD MORE AS WE REFINE IT. YOU LL BE APPART OF THE PLANNING PROCESS

**What This Means:** Build the full infrastructure (navigation, routing, plugin architecture, page shells) for everything. Populate approximately 35% with working functionality now. The remaining 65% gets placeholder pages with clear runbooks describing what will be built there. Critical addition: the build team is part of the planning process going forward. This is not a one-way spec delivery.

---

### Q10: Gauntlet Integration -- Gateway tab or standalone?

**Options Presented:**
- A: Gateway tab (unified experience, one URL)
- B: Standalone app, embedded via iframe
- C: Standalone app, linked from Gateway menu

**Shane's Decision:** Specific UI architecture -- 6+ agent terminals plus 1 larger reviewer chat interface.

> 6+ 1 LARGER reviewer terminal thats more of a chat interface

**What This Means:** The Gauntlet is 6 or more agent terminals plus 1 larger reviewer terminal that functions as a chat interface. Build the Gauntlet as a dedicated page/view within the Gateway that renders: (1) 6+ smaller terminal panes for individual swarm agents, and (2) 1 larger, prominent reviewer terminal that operates as a conversational chat interface (not just a terminal). The reviewer terminal is the primary interaction surface -- it is where Shane communicates with the adversarial reviewer. The 6 agent terminals show work in progress.

---

### Q11: Build Start Timing -- When?

**Shane's Decision:** NOT ANSWERED. Still open.

---

### Q12: Rollback Strategy

**Shane's Decision:** NOT ANSWERED. Still open.

---

## 3. INLINE DECISIONS ON ADVERSARIAL FINDINGS

### Critical Findings

**C-1: Embedding Model Conflict (Sections 06 vs 07)**
- Finding: nomic-embed-text (768d) vs OpenAI ada-002 (512d) -- incompatible dimensions.
- Shane's Decision: Needs full breakdown before deciding. Do not proceed.

**C-2: RAG Uses Claude for Final Generation, Contradicting Local-First**
- Finding: Section 06 builds local fleet, Section 07 calls Claude for generation.
- Shane's Decision: Cloud approved for development/training only. 90% local target long-term. Routing transparency is mandatory.

**C-3: Memory Math Unresolved**
- Finding: Plan claims 38.9GB but corrected math gives 47.3GB (22% higher).
- Shane's Decision: Numbers are UNTRUSTED until empirically verified. Dashboard must show REAL measured numbers, not estimates.
- Shane noted he heard improper setup procedures can produce misleading memory readings -- needs research.

> REAL numbers

**C-4: GPT-OSS MXFP4 Is a Hard Gate**
- Finding: Entire fleet depends on GPT-OSS working in Ollama. Not yet downloaded.
- Shane's Decision: Deliberately paced. Dashboard first, then GPT-OSS when runbooks are ready.

**C-5: vm2 Is Deprecated**
- Finding: Known sandbox escape vulnerabilities.
- Shane's Decision: Wants risk quantified. Default to beta/newer solutions (isolated-vm).

**C-6: xterm.js v6 May Not Exist**
- Finding: Research references v6 but v5 was latest stable.
- Shane's Decision: Non-issue. If the research referenced something that does not exist, that research output is unreliable for terminal implementation.

> THIS IS A NON ISSUE FOR THE SIMPLE REASON THAT IF WE TRY TO INSTALL SOMTHING THAT DOESNT EXIST AFTER THIS RESEARCH THEN WE PORBABLY DONT NEED TO BUILD OFF THESE RESULTS

**What This Means:** Do not cargo-cult from the research docs. Verify the actual latest xterm.js version on npm/CDN, use THAT version, and build terminal functionality based on its real API.

### Major Findings

**M-1: Secret Management Inconsistency**
- Finding: Section 05 mandates Azure Key Vault, but Voice AI code uses process.env.
- Shane's Decision: Not explicitly answered. Safe default: Azure Key Vault for production, environment variables only for local development.

**M-2: No Shared Data Model Between Agent Contracts and Dashboard Events**
- Shane's Decision: Agrees schemas should be unified but not worried about solving upfront. Critical nuance: must support MULTIPLE concurrent chat threads (multi-pipe).

> UNLESS ITS WITH IN A MULTI CHAT CAPABILITY. LIKE AND APP. WERE WE HAVE MULTIPIPE CHAT THREADS

> THESE ISSUES WILL WORK OUT THROUGH THE IMPLEMENTATIONS PHASE BUT I AGGREE

**M-3: Service Fusion Has NO Webhooks**
- Shane's Decision: Non-issue. Polling is acceptable and expected.

> NONE ISSUE

**M-4: Bot Framework Archived Dec 31, 2025**
- Shane's Decision: PRIORITY. See Q5 above. Mistakes expected and communicated. Structured training, verbose docs, clear identity.

**M-5: Cost Model Contradicts Itself**
- Shane's Decision: Cost-reward evaluation, not fixed budget. See Q3 above.

> DEPENDS ON THE COST REWARD. IF THE INVESTMENT LEADS TO HIGHER QUALITY AND REDUCED COST LONG TERM THEN THE INVESTMENT IS THERE. IF ISTS RISKY WITH UNCLEAR RESULTS THEN WE THAT WILL DERTURMIN THE OUTCOME

**M-6: OAuth PKCE Code Has Bugs**
- Shane's Decision: Auth system must support 24/7 unattended operation. Biometric/credential auth as the hook for Gate code to load.

> THIS NEEDS ADDRESSED WITH THE OPTION OF 24/7 RELIABLE. CONNECTION FOR TASK PURPOSE. THE USER CREDS OR FINGER PRINT, FACE SCAN SHOULD BE A HOOK FOR THE GATE CODE TO LOAD

**What This Means:** TWO auth paths: (1) Interactive: biometric/credential login for human users, (2) Service: long-lived tokens or certificate-based auth for automated 24/7 operations. The OAuth PKCE code from the research is garbage -- rewrite from scratch.

**M-7: n8n Introduced Without Cost/Failure Analysis**
- Shane's Decision: Vetoed. See Q6 above.

**M-8: node-pty Requires Native Compilation**
- Shane's Decision: Research the solution and workaround before build begins.

> RESEARCH THE SOLUTION AND WORKAROUND BEDORE BUILD BEGINS.

**What This Means:** Before building ANY terminal functionality, research and document: (1) Xcode CLT and build-essential status on Studio and VPS, (2) pre-built binary options for node-pty, (3) pure-JS alternatives, (4) workarounds if native compilation fails. Document findings BEFORE writing code.

### Routing Transparency

**Shane's Decision:** Mandatory. Non-negotiable.

> YES THIS IS A MUST

Every response in the chat interface MUST display which model generated it. Include: model name, provider (local vs cloud), and ideally response time and token count. This feeds Shane's philosophy of transparency and his role as personal overseer of frontier model usage.

---

## 4. TECHNOLOGY CHOICES AND REASONING

### Chosen Technologies

| Technology | Purpose | Shane's Reasoning |
|------------|---------|-------------------|
| Claude Opus 4.6 | Development, training, frontier tasks | Best in class; use it to BUILD local capability, not as a crutch |
| GPT-OSS 20B | Primary local model (MoE, MXFP4, Harmony format) | 22B params, 3.6B active, Apache 2.0, native tool calling, 3-level reasoning |
| Ollama | Local model runtime (dual-instance) | Twin Peaks architecture: Fleet A (11434, fast) + Fleet B (11435, heavy) |
| Mac Studio M3 Ultra (96GB) | Local AI hardware | Already owned; 800 GB/s memory bandwidth handles MoE routing |
| Tailscale | Mesh networking across 5 devices | Already deployed on taild2e21b.ts.net |
| xterm.js | Terminal in Gateway | Research-recommended; verify actual latest version (not v6 from docs) |
| node-pty + ssh2 + Socket.IO | Terminal backend stack | Research-recommended; verify native compilation first |
| M365 Agents SDK | Teams integration (emails + calendar only) | Bot Framework archived Dec 2025; new SDK despite youth |
| WebRTC | Voice AI transport | Research recommends over WebSocket for real-time voice |
| OAuth 2.0 + PKCE | Authentication | Industry standard; needs rewrite from research code (buggy) |
| Red, Black, Gold | Brand colors | From Phoenix Echo logo; single source of truth |

### Local-First Architecture

- Target: 90% local operations, 10% frontier cloud
- Cloud approved for: development, training, fine-tuning data generation, quality benchmarking
- Cloud NOT approved for: long-term production operations
- Every cloud call must be logged with justification
- Routing transparency UI is mandatory

### Hub-and-Spoke Gateway Architecture

- Validated by OpenClaw pattern (290K+ stars)
- Node.js Gateway (port 18790) as central orchestrator
- All integrations plug into Gateway as spokes
- Gateway owns routing, visibility, cost tracking

---

## 5. REJECTED ALTERNATIVES AND WHY

### n8n (Workflow Orchestration)

**Status:** REJECTED
**Reasoning:** Shane believes n8n is going out of business. Opus 4.6 with OAuth subscription provides the same deterministic workflow orchestration without additional infrastructure, hosting cost, or dependency risk.
**What Replaces It:** Gateway-native workflow orchestration using the existing agent dispatch system.

### #d97757 (Clay/Red Accent Color)

**Status:** REJECTED
**Reasoning:** Not from the Phoenix Echo logo. Logo uses red, black, and gold.

### #ff6b35 (Phoenix Orange Accent Color)

**Status:** REJECTED
**Reasoning:** Same as above. Not from the logo.

### vm2 (Sandbox Isolation)

**Status:** REJECTED (effectively)
**Reasoning:** Known escape vulnerabilities, deprecated. Shane prefers stepping into beta models (isolated-vm) unless there is adequate reason not to.
**What Replaces It:** Likely isolated-vm, pending risk assessment.

### PTY-Based Agent Management for Dashboard

**Status:** REJECTED by adversarial review (Agent 3)
**Reasoning:** Dashboard plan assumed PTY-based agent management, but the Phoenix dashboard is a single-panel mobile app for field techs. PTY agent infrastructure would need ground-up build.
**What Replaces It:** Ollama HTTP API streaming (`/api/chat` with `stream: true`).

### DeepSeek (Any Model)

**Status:** HARD BAN
**Reasoning:** Banned from the entire Phoenix ecosystem. This is documented in the Research Bible Section 06 as a firm rule.
**What Replaces It:** GPT-OSS 20B as the local model champion, with fallback to other open models (llama3, codellama, mistral).

### Solo Development Approach

**Status:** REJECTED
**Reasoning:** Shane mandates swarm methodology -- teams of specialized agents. Adversarial review is the most important role.

---

## 6. PRIORITY ORDERING

### Shane's Priority Stack (derived from decisions)

1. **M365 Integration (Emails + Calendar)** -- Shane said he'd love to have it last week. HIGH PRIORITY, narrow scope.
2. **Gateway Dashboard for Management** -- Shane is actively preparing this as the management surface before bringing GPT-OSS online.
3. **Routing Transparency UI** -- Mandatory, non-negotiable. Every response shows which model generated it.
4. **Cost Tracking Dashboard** -- Must show cost-per-task and value-delivered, not just raw spend.
5. **Fleet Management Dashboard** -- Must work with existing models first, then accommodate GPT-OSS when it arrives.
6. **Gauntlet UI** -- 6+ agent terminals + 1 larger reviewer chat interface.
7. **Terminal Integration** -- After node-pty research is complete.
8. **GPT-OSS Deployment** -- Gated behind runbooks and Gauntlet approval. No rush.
9. **RAG Pipeline** -- Embedding model decision still pending. Build model-agnostic.
10. **Fine-Tuning Pipeline** -- Month 3+ checkpoint. Data collection starts from day one.

### Top 25 Research Bible Priorities (from Section 00)

1. Three-panel layout with persistent chat
2. Design system tokens (colors, typography, spacing)
3. SVG icon system replacing emoji
4. WebSocket manager (standalone, exponential backoff)
5. Tab bar navigation (5 primary + dropdown)
6. Chat manager (200-node DOM cap, rolodex)
7. Auth framework (OAuth PKCE, JWT, RBAC)
8. MCP server health dashboard
9. Terminal integration (xterm.js)
10. Service Fusion integration status
11. Fleet management dashboard
12. Pricebook UI
13. Plugin/skill architecture (500+ future skills)
14. Teams integration (emails + calendar)
15. Voice AI surface
16. RAG pipeline UI
17. Cost tracking dashboard
18. Memory dashboard (real measured numbers)
19. Gauntlet integration (6+1 terminals)
20. Routing transparency per response
21. Agent dispatch visualization
22. SharePoint integration
23. Responsive design (phone to 85" monitor)
24. Blank pages with runbooks (remaining 65%)
25. Accessibility and testing

---

## 7. BUDGET AND COST PHILOSOPHY

### No Fixed Dollar Cap

> make it worth it. Thats how much!!!!

Shane evaluates spend on ROI, not on a monthly ceiling. Every AI expenditure must be justified by the value it delivers.

### Cost-Reward Framework

> DEPENDS ON THE COST REWARD. IF THE INVESTMENT LEADS TO HIGHER QUALITY AND REDUCED COST LONG TERM THEN THE INVESTMENT IS THERE. IF ISTS RISKY WITH UNCLEAR RESULTS THEN WE THAT WILL DERTURMIN THE OUTCOME

- If investment leads to higher quality AND reduced cost long-term: APPROVED
- If risky with unclear results: the risk determines the outcome
- Local inference is inherently "worth it" because marginal cost is near-zero after hardware investment
- Cloud spend for development/training is an investment, not a dependency

### Research Bible Cost Estimates (for reference)

- $68/month local inference
- $150/month RAG with Claude completion
- $301/month total (current estimate)
- $158/month total (optimized estimate)
- $0.0068 average cost per agent request
- Hardware costs already sunk (Mac Studio M3 Ultra 96GB, already owned)

---

## 8. TIMELINE PREFERENCES

### Shane's Approach: Deliberate Pacing

Shane is NOT rushing. He is deliberately letting research settle before committing resources.

> IM CLEANING HOUSE AND PREPARING GATEWAY DASHBOARD FOR MANAGEMENT. ALSO ALOWING TIME TO LET SOME OF THE INFO SINK IN AS WE RESEARCH. COULD BE TOMORROW, COULD BE THIS WEEK END, OR NEXT MONTH.

### GPT-OSS Timeline

- Gated behind runbooks + Gauntlet approval
- Could be tomorrow, this weekend, or next month
- Dashboard must be ready BEFORE GPT-OSS arrives
- All fleet UI must work with existing models first

### Build Start Timing

- NOT ANSWERED (Q11 still open)
- However, Phase 1A (foundation: design tokens, icons, ws-manager) does not depend on any open questions and could start immediately

### Implied Sequence

1. Research and risk assessments first (embedding breakdown, memory verification, sandbox risk, node-pty build requirements)
2. Gateway dashboard for management (currently in progress)
3. GPT-OSS when runbooks are written and Gauntlet-approved
4. Fine-tuning at Month 3+ checkpoint

---

## 9. ARCHITECTURE PREFERENCES

### Local-First, Privacy, Sovereignty

- 90% local operations target
- Cloud for development/training only, not long-term production
- Self-sufficiency is non-negotiable -- if any cloud provider disappears, Phoenix Electric must still function
- Session persistence matters -- cloud sessions reset every ~200K tokens; local models with proper memory architecture maintain continuity indefinitely
- Every system must have a local fallback

### Hub-and-Spoke Gateway

- Gateway (Node.js, port 18790) is the central orchestrator
- All integrations are spokes that plug into the Gateway
- Gateway owns routing, visibility, and cost tracking
- Three-panel layout: left chat, center workspace, right tools

### Twin Peaks Dual-Instance Architecture

- Fleet A: Ollama on port 11434, fast/small models, parallel=4
- Fleet B: Ollama on port 11435, heavy reasoning models, parallel=2
- Mac Studio M3 Ultra (96GB) as the hardware platform
- GPT-OSS 20B as the target primary local model (MoE, 3.6B active params)

### 3-Level Agent Hierarchy

- Router (3B model) at the top
- 8 Domain Specialists in the middle (electrical, scheduling, customer, financial, fleet, knowledge, admin, communication)
- 3 Support Agents at the bottom
- Cross-agent contracts with defined SLAs

### Auth Architecture

- Two auth paths: Interactive (biometric/credential) + Service (long-lived tokens for 24/7 automated operations)
- OAuth 2.0 + PKCE for interactive
- Azure Key Vault for production secrets, env vars acceptable for local dev
- Biometric auth (fingerprint, face scan) as the hook for Gate code to load

### Multi-Pipe Chat Architecture

- Event system must support MULTIPLE concurrent chat threads
- Not one global event bus -- per-thread event streams
- Design unified schema with thread/channel identifier from day one

### Transparency and Visibility

- Routing transparency is MANDATORY on every response
- Cost dashboard shows what each dollar bought
- Memory dashboard shows REAL measured numbers, not estimates
- Every cloud call logged with justification for why local could not handle it

### Modularity and White-Label

- Every feature parameterizable for other businesses
- Template becomes the product
- Build for 500 skills, 500 crons, 100 pages (furnish 35% now)
- Plugin/skill architecture from day one

---

## 10. OPEN QUESTIONS AWAITING DECISION

| # | Question | Blocking What | Priority |
|---|----------|---------------|----------|
| Q1 | Which embedding model is canonical for RAG? (Shane requested "FULL BREAKDOWN" first) | Vector store schema, RAG pipeline | HIGH -- breakdown must be produced |
| Q2 | RAG generation model final decision (philosophy is clear but no explicit model selection) | Router configuration | MEDIUM -- philosophy gives enough to start |
| Q8 | Sandbox strategy (Shane wants risk quantified first) | Security page, plugin sandboxing | MEDIUM -- risk assessment must be produced |
| Q11 | Build start timing -- when should the build team start executing? | Everything | HIGH |
| Q12 | Rollback strategy -- is backup + git tag + SCP restore acceptable? | Deployment process | MEDIUM |
| M-1 | Secret management -- Azure Key Vault everywhere or env vars acceptable for local dev? | Auth, config, deployment | LOW -- safe default is Key Vault for prod |

---

## 11. RESEARCH TASKS REQUIRED BEFORE DECISIONS

These are not open questions -- they are research tasks that must be completed so Shane HAS the information to decide.

| Item | Research Needed | Source |
|------|----------------|--------|
| Embedding model breakdown | Full cost/quality/speed comparison of nomic-embed-text, text-embedding-3-small, MiniLM | Q1, C-1 |
| Memory math verification | Measure actual Ollama memory with `vm_stat` on warm fleet; research improper setup procedures that inflate readings | C-3 |
| Sandbox risk assessment | Plain-English threat model for vm2 escape on Mac Studio; can it "crawl out" and what data is at risk? | C-5, Q8 |
| node-pty build requirements | Verify Xcode CLT on Studio, build-essential on VPS; find workarounds if native compilation fails | M-8 |
| xterm.js actual version | Check npm/CDN for latest stable version; do NOT trust research doc's v6 reference | C-6 |
| n8n viability (only if challenged) | Is n8n actually going out of business? Only needed if someone wants to make the case for it | Q6, M-7 |

---

## SUMMARY: THE 5 THINGS EVERY BUILD TEAM MEMBER MUST KNOW

1. **Local-first, 90% local target.** Cloud is for development and the 10% that needs frontier quality. Everything else runs on the Studio.

2. **Shane's words are the spec.** Not the research docs, not the adversarial findings -- Shane's annotations override everything. When in doubt, re-read his exact words in the blockquotes above.

3. **35% furnished, 100% infrastructure.** Build every menu, every route, every plugin slot for the full vision. Only populate 35% now.

4. **Routing transparency is mandatory.** Every response shows which model generated it. No exceptions.

5. **Red, black, and gold.** Not clay, not orange. Pull colors from the Phoenix Echo logo.

---

*This document is a knowledge reference extracted from Shane's annotated Build Review.*
*Sources: SHANES_DECISIONS_COMPILED.md, report__phoenix-echo__gateway-build-review__20260309.md, MASTER_REVIEW_SUMMARY.md*
*Extracted 2026-03-10 by Echo Pro (Opus 4.6).*
