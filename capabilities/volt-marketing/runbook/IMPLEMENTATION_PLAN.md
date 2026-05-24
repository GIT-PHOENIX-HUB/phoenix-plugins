# Marketing Automation — Implementation Plan
## Phoenix Electric | Code Lane Build Order, Dependencies & Verification

**Author:** Builder Agent T7 (Opus 4.6)
**Date:** 2026-03-23
**Status:** DRAFT — Awaiting Codex adversarial gate review

---

## 1. Dependency Graph

```
WEEK 1 (Foundation — no human dependencies)
  C-001 Repo Setup .............. DONE ✓
  C-002 GBP Post Templates ...... NO BLOCKERS → start immediately
  C-003 Storm Profile Configs ... NO BLOCKERS → start immediately
  C-004 API Spec Research ....... NO BLOCKERS → Codex starts immediately

GATE-01 (Shane) ─── requires H-001B, H-004, H-005, H-006 ───

WEEKS 2-3 (First Builds)
  C-005 mcp-gbp ................ BLOCKED on H-003 (GBP owner access)
  C-006 mcp-callrail ........... BLOCKED on GATE-01 GO + API key
  C-007 marketing-orchestrator .. BLOCKED on C-005 (needs ≥1 MCP live)
  C-008 Landing Page ........... BLOCKED on H-008 (Stephanie content) + H-004

GATE-02 (Shane + Stephanie) ─── requires C-005, C-008, C-007 demo ───

WEEKS 4-6 (Ads + Weather)
  C-009 mcp-google-ads ......... BLOCKED on GATE-01 GO + H-009 (creds) + dev token approval
  C-010 weather-trigger ........ BLOCKED on C-003 (storm configs) + C-009 (budget API)

WEEKS 6-8 (Optimization)
  C-011 nextdoor-adapter ....... BLOCKED on H-006 decision (priority) — LOW
  C-012 Reporting Dashboard .... BLOCKED on C-007 + ≥2 MCPs live
```

### Parallelization Opportunities

| Parallel Track A (Echo) | Parallel Track B (Codex) |
|--------------------------|--------------------------|
| C-002 GBP Templates | C-004 API Spec Research |
| C-003 Storm Profiles (shared) | C-003 Storm Profiles (shared) |
| C-005 mcp-gbp | C-007 marketing-orchestrator (skeleton) |
| C-006 mcp-callrail | C-010 weather-trigger |
| C-009 mcp-google-ads | C-012 Reporting Dashboard |
| C-011 nextdoor-adapter | — |

**Key insight:** Codex can build the marketing-orchestrator skeleton and mock harness in parallel with Echo building mcp-gbp, because the orchestrator's interface contract (MCP tool names + schemas) can be defined from C-004 specs before any server is live.

---

## 2. Component Specifications

### C-002: GBP Post Templates
| Attribute | Value |
|-----------|-------|
| **Location** | `templates/gbp-posts/` |
| **Owner** | Echo |
| **Language** | Markdown (no runtime) |
| **Dependencies** | None |
| **Input requirements** | Runbook category list (seasonal, service, generator, storm) |
| **Output** | 10-15 `.md` template files with frontmatter (category, season, tags) |
| **File count** | ~15 files |
| **Complexity** | Low |
| **Verification** | Frontmatter parseable by orchestrator; Stephanie approves at GATE-02 |

### C-003: Storm Profile Configs
| Attribute | Value |
|-----------|-------|
| **Location** | `config/storm-profiles/` |
| **Owner** | Echo + Codex (CODEOWNERS: Shane) |
| **Language** | YAML |
| **Dependencies** | None |
| **Input requirements** | NWS event type taxonomy, runbook storm profile spec |
| **Output** | 4-6 YAML profiles (hail, tornado, severe-thunderstorm, winter-storm, high-wind, general-storm) |
| **File count** | ~8 (profiles + schema + README) |
| **Complexity** | Low-medium (schema validation matters) |
| **Key npm packages** | `js-yaml`, `ajv` (for schema validation in weather-trigger) |
| **Verification** | YAML lint passes; schema validates; `requires_approval: true` present in every profile; budget_multiplier ≤ 2.0 |

### C-005: mcp-gbp (Google Business Profile)
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/mcp-gbp/` |
| **Owner** | Echo |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `googleapis` (My Business API), `google-auth-library` |
| **Input requirements** | H-003 complete (GBP owner access confirmed), GBP API credentials in vault |
| **Output** | MCP server exposing 5 tools: `gbp-create-post`, `gbp-list-reviews`, `gbp-draft-review-reply`, `gbp-publish-review-reply`, `gbp-insights` |
| **File count** | ~12 files |
| **Complexity** | Medium |
| **Structure** | |
```
mcp-servers/mcp-gbp/
  package.json
  src/
    index.js              # MCP server entry, tool registration
    tools/
      create-post.js      # gbp-create-post
      list-reviews.js     # gbp-list-reviews
      draft-reply.js      # gbp-draft-review-reply (approval gate)
      publish-reply.js    # gbp-publish-review-reply
      insights.js         # gbp-insights
    lib/
      auth.js             # OAuth2 from vault
      client.js           # GBP API wrapper
      mock.js             # Mock mode for testing
  test/
    tools.test.js
    mock-data/
      reviews.json
      insights.json
```
| **Verification** | Unit tests pass; mock mode returns valid shaped data; live smoke test creates a draft post (not published) |

### C-006: mcp-callrail
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/mcp-callrail/` |
| **Owner** | Echo |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `node-fetch` (CallRail REST API) |
| **Input requirements** | GATE-01 GO on CallRail, API key in vault |
| **Output** | MCP server exposing 4 tools: `callrail-recent-calls`, `callrail-missed-calls`, `callrail-campaign-attribution`, `callrail-weekly-report` |
| **File count** | ~10 files |
| **Complexity** | Low-medium (REST API, straightforward) |
| **Verification** | Unit tests pass; mock mode returns shaped data; live test pulls recent calls |

### C-007: marketing-orchestrator
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/marketing-orchestrator/` |
| **Owner** | Codex |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk` (for sub-MCP calls) |
| **Input requirements** | At least C-005 live; tool schemas from C-004 |
| **Output** | MCP server exposing 4 slash commands: `/marketing-report`, `/marketing-post`, `/marketing-storm-check`, `/marketing-leads` |
| **File count** | ~15 files |
| **Complexity** | High (aggregation, error handling across multiple MCPs) |
| **Verification** | Unit tests with mocked MCP responses; integration test calling live mcp-gbp; end-to-end `/marketing-report` produces formatted output |

### C-009: mcp-google-ads
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/mcp-google-ads/` |
| **Owner** | Echo |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `google-ads-api` (or `googleapis`), `google-auth-library` |
| **Input requirements** | GATE-01 GO, H-009 creds, developer token approved by Google |
| **Output** | MCP server exposing 6 tools: `google-ads-spend-today`, `google-ads-campaign-status`, `google-ads-pause-campaign`, `google-ads-set-budget`, `google-ads-keyword-performance`, `google-ads-weekly-report` |
| **File count** | ~15 files |
| **Complexity** | High (GAQL queries, budget guardrails, approval gates) |
| **Hard guardrails** | Max daily budget from vault (not overridable); budget increase >20% requires approval; all mutations logged |
| **Verification** | Unit tests; mock mode with realistic GAQL responses; test account smoke test (Google Ads test account — no real spend) |

### C-010: weather-trigger
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/weather-trigger/` |
| **Owner** | Codex |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `node-fetch` (NWS API), `js-yaml`, `ajv`, `node-cron` |
| **Input requirements** | C-003 storm profiles, C-009 live (for budget actions) |
| **Output** | Service with: NWS poller (15-min cron), severity classifier, action proposer, approval gate, auto-rollback |
| **File count** | ~18 files |
| **Complexity** | High (state machine: poll → classify → propose → approve → act → rollback) |
| **Verification** | Unit test each stage; integration test with mock NWS alert JSON; end-to-end: inject fake alert → verify proposal generated → approve → verify action dispatched → TTL expires → verify rollback |

### C-011: nextdoor-adapter
| Attribute | Value |
|-----------|-------|
| **Location** | `mcp-servers/nextdoor-adapter/` |
| **Owner** | Echo |
| **Language** | Node.js ES modules |
| **Key npm packages** | `@modelcontextprotocol/sdk`, `csv-parse` |
| **Input requirements** | H-006 decision confirming Nextdoor priority |
| **Output** | MCP server exposing 2 tools: `nextdoor-import-data`, `nextdoor-performance` |
| **File count** | ~8 files |
| **Complexity** | Low (CSV ingest, no API) |
| **Verification** | Unit test with sample CSV export; parsed data matches expected schema |

---

## 3. Integration Plan

### 3a. MCP Server Registration with Claude Code

Each MCP server registers in `~/.claude.json` under the `mcpServers` key:

```json
{
  "mcpServers": {
    "mcp-gbp": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/mcp-gbp/src/index.js"],
      "env": {
        "MOCK_MODE": "false",
        "VAULT_NAME": "PhoenixaAiVault"
      }
    },
    "mcp-callrail": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/mcp-callrail/src/index.js"]
    },
    "mcp-google-ads": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/mcp-google-ads/src/index.js"]
    },
    "marketing-orchestrator": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/marketing-orchestrator/src/index.js"]
    },
    "weather-trigger": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/weather-trigger/src/index.js"]
    },
    "nextdoor-adapter": {
      "command": "node",
      "args": ["${TOOLBOX_ROOT}/mcp-servers/marketing-mcp/nextdoor-adapter/src/index.js"]
    }
  }
}
```

### 3b. Orchestrator Discovery Pattern

The marketing-orchestrator does NOT call MCP servers directly over stdio. Instead:

1. **Option A (recommended): Shared library imports.** Each MCP server exports its tool handlers as ES modules. The orchestrator imports them directly in-process. This avoids spawning 5 child processes and simplifies error handling.

2. **Option B: MCP client SDK.** The orchestrator uses `@modelcontextprotocol/sdk` Client to connect to each server over stdio. More isolated but heavier.

**Decision needed from Codex:** Which pattern? Recommendation is Option A for development speed, with Option B as a future refactor when servers need to run on separate hosts.

Regardless of pattern, each MCP server MUST:
- Export a `getTools()` function returning tool definitions
- Export individual tool handlers that accept structured input and return structured output
- Support a `MOCK_MODE` env var that returns realistic fake data without API calls

### 3c. Mock Mode (Testing Without Live API Keys)

Every MCP server implements a mock layer:

```
src/lib/mock.js     — returns canned responses shaped like real API data
MOCK_MODE=true      — env var, checked at startup
```

**Mock data lives in** `test/mock-data/` per server. Mock responses are committed to the repo so Codex can build the orchestrator against them before any live APIs are connected.

**End-to-end test flow:**
```
MOCK_MODE=true → start all MCPs → orchestrator calls /marketing-report
→ aggregates mock data from each MCP → produces formatted report
→ assert: report contains sections for GBP, CallRail, Google Ads
```

---

## 4. Risk Matrix

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Google Ads developer token approval takes weeks | **High** | **High** — blocks C-009 entirely | Build C-009 against test account (no token needed). Test account provides real API responses but no real ads. Developer token only needed for production. |
| R2 | GBP API deprecation / migration to new API | **Medium** | **Medium** — requires rewrite of C-005 | Google My Business API is migrating to Google Business Profile API. Build against the newer API from the start. Pin SDK versions. |
| R3 | Rate limiting during development | **Low** | **Low** — slows testing | Mock mode for all development. Live API calls only in smoke tests. NWS API has no auth and generous limits. |
| R4 | Scope creep from human lane findings | **Medium** | **Medium** — delays code lane | Gate system prevents this. Code lane only builds what GATE-01 approves. If Ash's research says "skip Google Ads," C-009 is deprioritized — not a surprise. |
| R5 | GATE-01 NO-GO on CallRail | **Medium** | **Low** — C-006 simply not built | CallRail is the most optional component. Orchestrator gracefully handles missing data sources (returns "CallRail: not configured"). |
| R6 | Integration failures between MCPs and orchestrator | **Medium** | **High** — blocks /marketing-report | Strict interface contracts from C-004. Every tool returns a typed JSON schema. Integration tests run in CI before merge. |
| R7 | Credential storage/rotation errors | **Low** | **High** — security incident | All creds in Azure Key Vault. No creds in repo. Break-glass procedure in Appendix B of runbook. |
| R8 | Weather trigger false positives | **Medium** | **Medium** — unnecessary spend proposals | `requires_approval: true` on ALL profiles. Human gate catches false positives. Dedupe by NWS alert ID. Cooldown period between activations. |

---

## 5. Verification Protocol

### Level 1: Unit Tests (per MCP server)
- Each server has `test/tools.test.js`
- Tests run in `MOCK_MODE=true` — no network calls
- Asserts: tool returns correct shape, error handling works, guardrails enforce limits
- **Runner:** `node --test` (Node.js built-in test runner, no extra deps)
- **Pass criteria:** 100% of tools have at least one happy-path and one error-path test

### Level 2: Integration Tests (orchestrator + MCPs)
- Orchestrator calls each MCP server's tool handlers
- All MCPs in mock mode
- Asserts: orchestrator correctly aggregates data from N sources, handles partial failures (one MCP down, others still report)
- **Pass criteria:** `/marketing-report` produces valid output with 1, 2, 3, and N data sources

### Level 3: End-to-End Test (full pipeline)
- Start all MCP servers (mock mode)
- Run `/marketing-report` through Claude Code
- Verify output contains: GBP section (post count, review count, insights), CallRail section (call count, attribution), Google Ads section (spend, CPC, conversions)
- **Pass criteria:** Ash (or Shane) reads the report and says "this makes sense"

### Level 4: Live Smoke Tests (per MCP, one at a time)
- Switch one MCP to `MOCK_MODE=false` with real credentials
- Execute a single read-only operation (e.g., `gbp-list-reviews`, `callrail-recent-calls`)
- Verify real data returns in expected shape
- **Pass criteria:** Real API response matches mock data schema

### Level 5: UAT (User Acceptance)
- Ash runs `/marketing-report` from Claude Code
- Ash runs `/marketing-post` to create a GBP draft
- Ash runs `/marketing-leads` to see recent leads
- **Pass criteria:** Ash confirms outputs are accurate and actionable

---

## 6. What Can Be Built RIGHT NOW (Zero Blockers)

These components have **no dependency on human lane tasks, GATE-01, or API credentials:**

| Component | ID | Owner | Est. Time | Why No Blockers |
|-----------|----|-------|-----------|-----------------|
| GBP Post Templates | C-002 | Echo | 2-3 hours | Content creation from runbook categories. Stephanie reviews later. |
| Storm Profile Configs | C-003 | Echo+Codex | 2-3 hours | YAML from runbook spec. NWS event taxonomy is public. |
| API Spec Research | C-004 | Codex | 3-4 hours | Public API docs. No account needed to read docs. |
| mcp-gbp scaffold + mock mode | C-005 (partial) | Echo | 4-6 hours | Full server structure, tool definitions, mock layer. Auth/live calls wait for H-003. |
| marketing-orchestrator scaffold | C-007 (partial) | Codex | 4-6 hours | Tool aggregation logic, mock harness, slash command routing. Live MCP calls wait for C-005. |
| mcp-google-ads scaffold + mock mode | C-009 (partial) | Echo | 4-6 hours | Full server structure against Google Ads test account API. Real creds wait for H-009. |
| nextdoor-adapter (full) | C-011 | Echo | 2-3 hours | CSV ingest — no API, no credentials, no human dependency. |
| weather-trigger NWS poller + classifier | C-010 (partial) | Codex | 3-4 hours | NWS API is public, no auth. Action dispatch waits for C-009. |

**Total immediately buildable work: ~25-35 hours across Echo + Codex in parallel.**

### Recommended Immediate Sprint (Week 1 Code Lane)

```
Echo (parallel track):                    Codex (parallel track):
─────────────────────                     ──────────────────────
Day 1: C-002 GBP templates               Day 1: C-004 API spec research
Day 2: C-003 Storm profiles              Day 2: C-007 orchestrator scaffold
Day 3-4: C-005 mcp-gbp (scaffold+mock)   Day 3-4: C-010 weather-trigger (NWS poller)
Day 5: C-011 nextdoor-adapter            Day 5: Integration test harness
```

By end of Week 1, even before GATE-01:
- 6 of 10 code tasks have scaffolds or are complete
- Mock mode enables full `/marketing-report` dry run
- Only live API connections and human-dependent content remain

---

## 7. Timeline Summary

| Week | Milestone | Gate | Blockers |
|------|-----------|------|----------|
| **1** | Repo done. Templates, storm configs, all scaffolds built. Mock mode e2e working. | — | None |
| **1 end** | GATE-01: Shane decides Google Ads, CallRail, platform priorities | GATE-01 | H-001B, H-004, H-005, H-006 |
| **2** | mcp-gbp live (needs H-003). mcp-callrail built (if approved). Orchestrator wired to mcp-gbp. | — | H-003 (GBP access) |
| **3** | Landing page built (needs H-008). Orchestrator demo. | GATE-02 | H-008 (content) |
| **4** | mcp-google-ads live (needs H-009 + dev token). First campaign launched (H-010). | — | Developer token approval |
| **5-6** | Weather trigger fully wired. Storm profiles tested. | — | C-009 live |
| **6-8** | Reporting dashboard. Optimization. Weekly cadence established. | — | All MCPs live |

---

## 8. Open Decisions (for Codex Gate Review)

1. **Orchestrator integration pattern:** Shared library imports (Option A) vs MCP client SDK (Option B)? Recommendation: A now, B later.
2. **Test runner:** Node.js built-in (`node --test`) vs vitest/jest? Recommendation: built-in, zero deps.
3. **Google Ads API client:** `google-ads-api` npm package vs raw `googleapis`? The dedicated package has better GAQL support.
4. **Monorepo package management:** Shared `node_modules` at root vs per-server? Recommendation: per-server `package.json` for isolation, with a root-level script to install all.

---

*This plan is designed to maximize parallel work, minimize idle time waiting for human lane, and ensure every component is testable in isolation before integration. The mock-first approach means code lane never blocks on credentials — scaffolds ship immediately, live connections plug in as gates clear.*
