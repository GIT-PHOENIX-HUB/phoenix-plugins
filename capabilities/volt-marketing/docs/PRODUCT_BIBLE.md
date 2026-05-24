# Product Bible — phoenix-marketing
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Purpose

Phoenix Marketing is the marketing automation system for Phoenix Electric LLC (Colorado Springs, CO). It executes the Volt campaign architecture — a structured combination of human research and decision-making (Stephanie and Ash) with AI-driven automation (Echo and Codex MCP servers). The system covers Google Business Profile management, CallRail call tracking, Google Ads campaign monitoring, storm-triggered response automation (NWS alerts driving GBP posts and guarded budget increases), and Nextdoor reporting. Hard rule: no money moves without a human gate. Automation monitors, reports, and proposes. Humans approve spend.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (planned for MCP servers) | NEEDS SHANE INPUT |
| Language | Markdown (content/config), YAML (storm profiles), TypeScript/JS (planned MCP servers) | — |
| MCP Servers | Model Context Protocol SDK (planned, 6 servers) | NEEDS SHANE INPUT |
| CI/CD | NEEDS SHANE INPUT | — |
| Deploy Target | NEEDS SHANE INPUT (Echo + Codex local execution or VPS) | — |
| Config Format | YAML (storm profiles, hard caps) | — |

## Architecture

Three-lane execution model:

| Lane | Owner | Work Type |
|------|-------|-----------|
| HUMAN | Stephanie + Ash | Research, vendor calls, account setup, creative decisions, decision logging |
| CODE | Echo + Codex | MCP servers, automation, landing pages, integrations |
| GATE | Shane | Approval checkpoints; no money moves, no config changes, no MCP deployments without Shane's sign-off |

Six planned MCP servers, each responsible for one external platform. An orchestrator server provides a unified command surface. Storm profiles (YAML configs) define NWS alert triggers, budget multipliers, GBP post templates, and cooldown rules — all with server-enforced caps that cannot be overridden in config without the owner.

```
phoenix-marketing/
├── config/
│   └── storm-profiles/
│       ├── high-wind.yaml          # NWS High Wind Warning/Watch/Advisory profile
│       ├── severe-thunderstorm.yaml
│       ├── winter-storm.yaml
│       ├── power-outage.yaml
│       └── hail-storm.yaml
├── decisions/                      # Logged decisions with date and reasoning (Stephanie/Ash/Shane)
├── landing-pages/                  # Generator page, storm damage page (Echo builds)
├── mcp-servers/
│   ├── mcp-gbp/
│   │   └── SPEC.md                 # GBP server spec — 5 tools, OAuth 2.0 (Google APIs)
│   ├── mcp-callrail/
│   │   └── SPEC.md                 # CallRail server spec
│   ├── mcp-google-ads/             # Google Ads campaign monitoring (gitkeep — not yet built)
│   ├── marketing-orchestrator/
│   │   └── DESIGN.md               # Unified command surface design
│   ├── weather-trigger/            # NWS alert monitoring (gitkeep — not yet built)
│   └── nextdoor-adapter/           # Export ingestion and reporting (gitkeep — not yet built)
├── research/
│   ├── google-ads-market-data.md   # Google Ads CPCs, LSA costs for Colorado Springs
│   ├── conversion-history.md       # Historical conversion data
│   ├── gbp-audit.md                # GBP profile audit
│   ├── generac-coop-program.md     # Generac co-op program research
│   └── nws-weather-trigger-spec.md # NWS API weather trigger specification
├── runbook/
│   ├── RUNBOOK.md                  # Full campaign execution runbook (Phase 0–N)
│   └── IMPLEMENTATION_PLAN.md      # Implementation sequencing
├── templates/
│   └── gbp-posts/
│       ├── gbp-post-templates.md
│       ├── storm-response-wind.md
│       ├── storm-response-winter.md
│       ├── storm-response-hail.md
│       ├── storm-response-outage.md
│       └── storm-response-thunderstorm.md
├── CODEOWNERS                      # Protected paths: config/, mcp-servers/, runbook/ → Shane approval
├── CONTRIBUTORS.md                 # Team roles: Shane, Stephanie, Ash, Echo, Codex
├── TEAM_GUIDE.md                   # Onboarding guide for Stephanie and Ash (GitHub Desktop workflow)
└── README.md                       # System overview
```

## Auth & Security

The storm profile YAML configs enforce hard caps server-side (budget multipliers, max daily spend). Config values cannot override the server-enforced caps — enforced in code, not just policy. `requires_approval: true` is mandatory on all storm profile actions and cannot be set to `false` without owner-level override.

MCP server auth for Google APIs will use OAuth 2.0 (Google APIs use standard OAuth — specific grant type per server TBD based on whether user-delegated or service-account access is required). CallRail uses API key auth (details in mcp-callrail SPEC.md). No secrets are stored in this repository.

CODEOWNERS enforces Shane's required approval on all changes to `config/`, `mcp-servers/`, and `runbook/`.

## Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| Google Business Profile API | GBP posts, review replies, insights | SPEC complete — pending credentials and API access |
| CallRail API | Call tracking, attribution, lead source reporting | SPEC complete |
| Google Ads API | Campaign monitoring, budget guard, keyword reporting | Design phase — not yet built |
| NWS (National Weather Service) API | Storm alert monitoring for Colorado Springs (El Paso County) | Research complete — implementation pending |
| Nextdoor | Export ingestion and reporting | Design phase — not yet built |
| Echo (Phoenix Echo) | Automation execution — MCP server invocation, landing pages, template creation | Active |
| Codex | Policy/orchestration/weather trigger automation | Active |

## File Structure

| Path | Purpose |
|------|---------|
| `config/storm-profiles/*.yaml` | Storm trigger definitions — NWS event types, budget multipliers, GBP post bindings, TTLs, cooldowns |
| `decisions/` | Logged decisions with dates and reasoning — human-authored (Stephanie, Ash, Shane) |
| `landing-pages/` | Generator landing page and storm damage landing page — Echo-built |
| `mcp-servers/mcp-gbp/SPEC.md` | GBP server spec: 5 tools, auth model, guardrails, error model, mock test plan |
| `mcp-servers/mcp-callrail/SPEC.md` | CallRail server spec |
| `mcp-servers/marketing-orchestrator/DESIGN.md` | Unified orchestrator design — single command surface across all MCP servers |
| `research/google-ads-market-data.md` | Market research: actual CPCs and LSA costs for Colorado Springs electrical market |
| `research/nws-weather-trigger-spec.md` | NWS API spec for weather trigger integration |
| `runbook/RUNBOOK.md` | Full campaign execution runbook: Phase 0 (Foundation) through campaign launch |
| `runbook/IMPLEMENTATION_PLAN.md` | Implementation sequencing and phase plan |
| `templates/gbp-posts/` | GBP post templates for each storm type |
| `CODEOWNERS` | Access control — config/, mcp-servers/, runbook/ require Shane approval |
| `CONTRIBUTORS.md` | Team roles and access levels |
| `TEAM_GUIDE.md` | GitHub Desktop onboarding for Stephanie and Ash (no terminal required) |

## Current State

- **Status:** Active — structured content and specs complete, MCP server implementation not yet started
- **Last Commit:** 2026-03-27 — `Add humans-maintainers fallback to CODEOWNERS` (hash `6e7f45e`)
- **Open PRs:** NEEDS SHANE INPUT
- **Open Branches:** 1 — `main` only (no feature branches)
- **Known Issues:**
  - 6 MCP servers are planned; 0 are implemented. Specs and design docs exist for mcp-gbp, mcp-callrail, and marketing-orchestrator. mcp-google-ads, weather-trigger, and nextdoor-adapter are gitkeep stubs only.
  - `landing-pages/` is a gitkeep stub — no landing pages built yet.
  - `decisions/` is a gitkeep stub — no decisions logged yet.
  - Google Ads API access requires a developer token (Google approval process) — this is a known external blocker.
  - GBP API access requires credentials and approval — flagged in mcp-gbp SPEC.md as pending.
  - RUNBOOK.md status is listed as "PROPOSAL — Awaiting Shane approval before distribution."

## Branding & UI

Phoenix Electric LLC — Colorado Springs, CO electrical contractor. No specific color codes or logo assets in this repo. Landing pages (planned in `landing-pages/`) will follow Phoenix Electric branding. NEEDS SHANE INPUT on brand guidelines for landing page builds.

## Action Log

| Commit | Date | Description |
|--------|------|-------------|
| `6e7f45e` | 2026-03-27 | Add humans-maintainers fallback to CODEOWNERS |
| `6d0c540` | 2026-03-27 | Fix 5 contract alignment issues from Codex adversarial audit |
| `8d1aa52` | 2026-03-25 | Add mcp-gbp API spec — completes 7/7 builder deliverables |
| `0b722be` | 2026-03-25 | Add 6/7 builder agent deliverables — marketing automation design specs |
| `86fe222` | 2026-03-23 | Add team guide for Stephanie and Ash — detailed task expectations and instructions |
| `b53b11e` | 2026-03-23 | Initialize phoenix-marketing repo with full campaign execution structure |

## Key Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-23 | Repo initialized with full campaign execution structure (Volt architecture) |
| 2026-03-23 | Team guide published for Stephanie and Ash |
| 2026-03-25 | All 7 builder agent deliverables complete — specs, design docs, runbook, storm profiles |
| 2026-03-27 | CODEOWNERS finalized — Shane approval enforced on config, mcp-servers, runbook |
| NEEDS SHANE INPUT | GATE-01: Shane approves Phase 0 research deliverables → Google Ads billing and developer token unlock |
| NEEDS SHANE INPUT | mcp-gbp implementation begins (pending credentials and API access) |
| NEEDS SHANE INPUT | First storm-triggered GBP post executed end-to-end |
| NEEDS SHANE INPUT | Google Ads campaign live with Echo monitoring |
