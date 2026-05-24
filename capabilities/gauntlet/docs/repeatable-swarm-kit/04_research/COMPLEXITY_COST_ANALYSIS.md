---
date: 2026-03-07
branch: codex/repeatable-swarm-template-2026-03-07
author: Echo Pro (Opus 4.6)
scope: Integration complexity and cost analysis — quantifying the tax of tool composition
assumptions: N*(N-1)/2 integration surface counts are upper-bound heuristics, not observed Phoenix data; operational hour estimates use industry averages, not Phoenix-specific measurements; token cost data from public API pricing as of 2026-03-07
status: DRAFT — pending Shane review
---

# Complexity & Cost Analysis

Phoenix Electric runs 4 AI agents across a MacBook, a Mac Studio, and a VPS at fewer than 300 requests per second. Two people run the entire operation. Every tool adopted must justify its existence against that constraint. This document quantifies the integration complexity, operational burden, and infrastructure cost of three architecture options: the full 10-tool composed stack proposed by Search Party, the focused 4-tool core, and the phased hybrid that bridges them.

---

## 1. Integration Surface Analysis

### The Formula

For N tools that could potentially interact, the maximum number of pairwise integration surfaces is:

```
N * (N - 1) / 2
```

**This is an upper-bound heuristic from combinatorics [E38], not observed Phoenix data.** In practice, not every tool connects to every other tool. But every potential integration surface is a potential failure point, a debugging surface, and a maintenance obligation. The formula gives us a ceiling for reasoning about architectural complexity.

### 10-Tool Stack (Search Party Proposal)

N = 10 -> 10 * (10 - 1) / 2 = **45 potential integration surfaces**

*Label: UPPER-BOUND HEURISTIC — actual count depends on architecture topology.*

The 10 tools:

1. Claude Code
2. Claude API (direct)
3. LiteLLM proxy
4. MCP (Model Context Protocol)
5. Langfuse (observability)
6. OpenHands (code agent)
7. Coder (dev environments)
8. Continue (IDE extension)
9. Open WebUI (chat interface)
10. Dev Containers / Docker

**Highest-risk integration pairs:**

- **LiteLLM <-> Claude API:** Extended thinking breakage. LiteLLM's translation layer has documented incompatibilities with Claude's extended thinking feature [E9]. This is not a theoretical risk — it is a known failure mode.
- **MCP <-> every other tool:** The Search Party proposal frames MCP as the "spine" of the architecture, meaning MCP touches everything [E18]. A spine failure is a total system failure.
- **Coder <-> Dev Containers:** Layered abstraction — an IDE running on a container running on Docker [E35]. Three layers of indirection between the developer and the code.
- **OpenHands <-> Claude Code:** Competing code agents running in the same environment [E27]. Conflict resolution between autonomous agents is an unsolved problem at this scale.
- **Continue <-> Claude Code:** Competing IDE extensions [E31]. Both want to be the primary code assistant. Running both creates ambiguity about which agent handles which task.
- **Langfuse <-> LiteLLM:** Observability layered on a proxy layered on an API — three layers of indirection [E26]. When something breaks, you debug the observability tool, then the proxy, then the API call.

### 4-Tool Core Stack (Focused Core)

N = 4 (Claude Code, MCP scoped, structured logging, direct API calls) -> 4 * (4 - 1) / 2 = **6 potential integration surfaces**

*Label: UPPER-BOUND HEURISTIC.*

The key difference is not just the number. These 4 tools are mostly independent:

- Claude Code talks to MCP servers. That is one integration surface.
- Structured logging captures output from Claude Code and API calls. That is two more surfaces.
- Direct API calls are point-to-point — they do not pass through a proxy or translation layer.

The actual integration surface count is closer to 3-4, not the theoretical 6. The formula overestimates because these tools do not form a mesh — they form a shallow tree.

### Phased Hybrid at P1 (Adding 1-2 Tools)

N = 6 -> 6 * (6 - 1) / 2 = **15 potential integration surfaces**

*Label: UPPER-BOUND HEURISTIC.* Growth is controlled. Each new tool adds surfaces proportional to the existing count, not exponentially. The phased approach means each new tool is validated against the existing stack before the next tool is considered.

### Comparison Table

| Stack | Tool Count | Max Integration Surfaces | Label |
|---|:---:|:---:|---|
| Big Composed (Search Party) | 10 | 45 | Upper-bound heuristic |
| Focused Core | 4 | 6 | Upper-bound heuristic |
| Phased Hybrid (P0) | 4 | 6 | Upper-bound heuristic |
| Phased Hybrid (P1) | 6 | 15 | Upper-bound heuristic |
| Phased Hybrid (P2) | 8 | 28 | Upper-bound heuristic |

The jump from P0 to the full 10-tool stack is a 7.5x increase in maximum integration surfaces. The phased approach lets Phoenix control that growth rate.

---

## 2. Operational Hour Estimates

**These estimates use industry averages for small-team tool maintenance, NOT Phoenix-observed data.** Actual hours will vary based on tool stability, update frequency, and the specific failure modes encountered. These numbers are intended as order-of-magnitude comparisons, not precise forecasts.

### 10-Tool Stack

| Category | Calculation | Est. Hours/Month |
|---|---|:---:|
| Security advisory monitoring | ~10 tools x 1 hr/tool/month | 10.0 |
| Update testing and rollout | ~10 tools x 2 hrs/tool/month | 20.0 |
| Integration debugging | ~45 surfaces x 0.5 hrs/surface/month (heuristic, see [E39]) | 22.5 |
| Infrastructure monitoring | Langfuse (4 vCPU + 16 GB) [E26] + LiteLLM (PostgreSQL) [E8] + Coder (workspaces) [E5] + Docker | 15.0 |
| **Total estimate** | | **~67.5** |

That is approximately 40% of a full-time position dedicated to tool maintenance alone. For a 2-person team that also runs an electrical contracting business, this is **unsustainable**. The tools would consume the team instead of serving it.

The integration debugging estimate deserves scrutiny. At 0.5 hours per surface per month, we are assuming that most surfaces are quiet most of the time, with occasional breakage. This is generous. A single breaking change in LiteLLM's Claude API translation (which has happened [E9]) can consume 10+ hours of debugging in a single incident.

### 4-Tool Core Stack

| Category | Calculation | Est. Hours/Month |
|---|---|:---:|
| Security advisory monitoring | ~4 tools x 0.5 hrs/tool/month | 2.0 |
| Update testing and rollout | ~4 tools x 1 hr/tool/month | 4.0 |
| Integration debugging | ~6 surfaces x 0.25 hrs/surface/month | 1.5 |
| Infrastructure monitoring | Minimal — no heavy infrastructure beyond V1 Node.js app | 0.0 |
| **Total estimate** | | **~7.5** |

For a 2-person team: **sustainable**. Seven and a half hours per month is less than two hours per week. That leaves the team's capacity for the work that actually generates revenue — electrical contracting and the AI-assisted workflows that support it.

The per-tool hours are lower here not just because there are fewer tools, but because the tools themselves are simpler. Claude Code and MCP servers do not require dedicated infrastructure monitoring. Structured logging is filesystem-based. Direct API calls have no middleware to maintain.

### Phased Hybrid (at P1, 6 Tools)

Scales between the two extremes: **~15-25 hrs/month** depending on which tools are adopted.

This is still sustainable for a 2-person team IF the tools are chosen carefully. The operative word is "if." Adding Langfuse (which requires 4 vCPU + 16 GB RAM [E26]) pushes toward the high end. Adding a lightweight dashboard pushes toward the low end. Tool selection is not neutral — each tool carries its own maintenance weight.

---

## 3. Infrastructure Cost Analysis

### 10-Tool Stack Monthly Infrastructure

| Component | Resource Requirement | Est. Monthly Cost |
|---|---|:---:|
| Langfuse | 4 vCPU + 16 GB RAM [E26] | $80-120 (VPS) |
| LiteLLM | PostgreSQL instance [E8] | $20-40 |
| Coder workspaces | 0.1 vCPU + 256 MB per idle workspace [E5] | $10-30 |
| OpenHands | 8 GB RAM per instance [E29] | $40-60 |
| Open WebUI | Container + storage | $10-20 |
| Docker / Dev Containers overhead | Disk + compute | $10-20 |
| Temporal Cloud (if adopted) | Usage-based [E52] | $100-6,770 |
| OpenRouter BYOK fee | 5% of API spend [E15] | Variable |
| **Total** | | **$270-7,060+/month** |

The Temporal Cloud range deserves explanation. Temporal's pricing is usage-based, and the range from $100 to $6,770 per month reflects the difference between minimal orchestration and heavy workflow use [E52]. For Phoenix's scale (fewer than 300 RPS, 4 agents), the lower end is more likely — but the upper end is what happens when workflow complexity grows unchecked.

The OpenRouter BYOK fee is a percentage tax on every API dollar spent [E15]. It is small in isolation but compounds with volume. At $500/month in API spend, it adds $25. At $2,000/month, it adds $100. This is money spent on routing, not on intelligence.

### 4-Tool Core Stack Monthly Infrastructure

| Component | Resource Requirement | Est. Monthly Cost |
|---|---|:---:|
| Claude Code | Runs on existing MacBook / Mac Studio | $0 (hardware sunk cost) |
| MCP servers | Runs locally alongside Claude Code | $0 |
| Structured logging | Filesystem-based | $0 |
| Direct API calls | API provider pricing only | (existing spend) |
| V1 Node.js app | Runs on existing Mac hardware | $0 |
| **Total** | | **$0 incremental** |

The 4-tool core adds zero incremental infrastructure cost. All components run on hardware Phoenix already owns. The only ongoing cost is API token usage, which is present in every configuration and is not an incremental cost of the tooling itself.

---

## 4. Token Cost Scaling

*Based on public API pricing as of 2026-03-07.*

Every layer between the developer and the model adds tokens. System prompts get injected. Context gets padded. Metadata gets appended. These additions are individually small but they compound across layers.

### How Each Layer Adds Tokens

- **Direct API calls** are the baseline. The request contains exactly what the developer sends, nothing more.
- **LiteLLM proxy** adds proxy headers, logging metadata, and request/response translation overhead. The translation layer is especially costly for Claude-specific features like extended thinking, which may require reformatting or re-serialization [E13].
- **OpenRouter** adds routing metadata and BYOK processing overhead. Every request passes through OpenRouter's infrastructure before reaching the model provider.
- **MCP tool calls** inject tool descriptions into the model context. Each MCP server the model can access adds its tool schema to the context window. Research shows that overloading with too many MCP servers degrades model performance [E19] — this is partially a token-cost issue and partially a cognitive-load issue for the model.
- **The full 10-tool stack** compounds all of the above. A request might pass through MCP (tool descriptions added), then LiteLLM (translation headers added), then Langfuse (observability metadata added), before reaching the model. Each layer adds its own context.

### Token Overhead Estimates

| Configuration | Est. Token Overhead | Explanation |
|---|:---:|---|
| Direct API call | Baseline | No middleware injection |
| Via LiteLLM proxy | +5-15% | Proxy headers, logging, translation [E13] |
| Via OpenRouter | +3-10% | Routing metadata, BYOK processing |
| Via MCP (scoped) | +2-5% per server | Tool descriptions in context [E19] |
| Full 10-tool stack | +15-40% | Compounding overhead across layers |

*These percentages are estimates based on industry data and public documentation, not Phoenix-measured values.*

The scoped MCP approach in the 4-tool core keeps token overhead at the low end — a few tool descriptions per request, not a full catalog. Direct API calls for batch operations bypass the overhead entirely. The difference between +2% and +40% token overhead is the difference between a tool stack that stays within budget and one that slowly bleeds money.

---

## 5. The Real Cost of Composition

The numbers above tell part of the story. The rest is about what happens over time.

**Technical debt compounds.** Each deferred integration fix becomes harder to address as more tools are added [E49]. A LiteLLM compatibility issue that takes 2 hours to fix in month one takes 6 hours in month six, because by then three other tools depend on the specific behavior that the fix would change. Debt does not sit still — it accrues interest.

**Breaking changes cascade.** When one tool updates, every integration touching it must be validated [E49]. In a 10-tool stack with 45 potential integration surfaces, a single update to MCP (the "spine") could require validating 9 other integrations. In the 4-tool core, the blast radius of any single update is at most 3 other tools.

**The 2-person constraint is not temporary.** Phoenix is an electrical contracting business that uses AI to improve its operations. It is not an AI company that does electrical work. The team's primary expertise and revenue source is electrical contracting. The AI tooling must serve that business, not consume the business's operational capacity. A 67.5-hour monthly maintenance burden would make Shane and his partner part-time tool administrators and part-time electricians. That is backwards.

**A tool that saves 2 hours per month but costs 5 hours per month to maintain is a net loss.** This is the calculation that matters for every tool adoption decision. The question is not "does this tool have useful features?" — nearly every tool does. The question is "does this tool's operational value exceed its operational cost, given our team size and our primary business?"

For a 2-person team at fewer than 300 RPS running 4 agents, most tools in the 10-tool stack fail that test. Not because they are bad tools, but because their maintenance cost exceeds their value at Phoenix's scale.

---

## 6. Recommendation

The numbers support the Phased Hybrid approach:

| Metric | Focused Core (P0) | Full 10-Tool Stack | Ratio |
|---|:---:|:---:|:---:|
| Integration surfaces (max) | 6 | 45 | 7.5x |
| Operational hours/month (est.) | ~7.5 | ~67.5 | 9x |
| Incremental infra cost/month | $0 | $270-7,060+ | -- |

The gap between 6 and 45 integration surfaces is a 7.5x increase in maximum complexity. The gap between 7.5 and 67.5 operational hours is a 9x increase in maintenance burden. The cost gap is effectively infinite — zero versus hundreds or thousands of dollars per month.

**Start with P0.** Four tools, 6 integration surfaces, 7.5 hours per month, zero incremental cost. This configuration is sustainable for a 2-person team running a business.

**Add tools only when the operational pain of NOT having them exceeds the maintenance cost of having them.** That is the definition of a justified adoption. If the team spends 10 hours per month on a task that a new tool could reduce to 2 hours, and the tool costs 3 hours per month to maintain, the math works: 10 - 2 - 3 = 5 hours saved. If the tool costs 9 hours per month to maintain, the math does not work: 10 - 2 - 9 = -1 hours. The tool makes things worse.

**Every tool earns its place or it goes.** No tool gets adopted because it is interesting, because it is popular, or because it might be useful someday. Every tool gets adopted because the numbers say it should be, and it stays only as long as the numbers continue to say so.
