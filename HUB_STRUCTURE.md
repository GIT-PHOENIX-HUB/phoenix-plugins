# Phoenix Plugins — Hub Structure (ARCHIVED)

> **ARCHIVED — 2026-03-31.** This document reflects the pre-Phase-1 structure (`plugins/`, `skills/`, `mcps/`).
> The repo has been restructured to capability-first architecture. See `CAPABILITY_REGISTRY.md` for current state.

**Status:** ARCHIVED (was D1 Hub Structure ACTIVE)
**Created:** 2026-03-28 by Phoenix Echo (Sonnet 4.6)
**Purpose:** Capability hub. Receives extractions from other repos. Source of truth for all plugins, skills, and MCP servers.

---

## Directory Layout

```
phoenix-plugins/
├── plugins/          # Full plugin packages (self-contained, each has .claude-plugin/plugin.json)
│   ├── echo-persistence/     — Echo identity, session logging, context survival
│   ├── electrical-guru/      — NEC 2023 code consultant, Denver Metro / Douglas County
│   ├── file-steward/         — File management, triage, research library, filing conventions
│   ├── phoenix-comms/        — Cross-agent heartbeat (Echo ↔ Codex) via LEDGER
│   ├── phoenix-knowledge/    — Phoenix Electric knowledge base, portable across agents
│   ├── rexel/                — Rexel distributor integration, margin analysis, pricebook
│   ├── servicefusion/        — Service Fusion CRM, jobs, estimates, invoices, scheduling
│   └── volt-marketing/       — Phoenix Electric marketing strategist, ROI / lead gen
│
├── skills/           # Standalone skill files extracted from plugins, ready for direct use
│   └── (populated during Wave 5A extractions)
│
├── mcps/             # Standalone MCP server configs and source, extracted from plugins
│   └── (populated during Wave 5A extractions)
│
└── triage/           # Staging area for items needing human decision before promotion
    ├── NEEDS_REVIEW/ — Newly extracted items, not yet validated or categorized
    ├── DIVERGED/     — Items that differ between phoenix-plugins and Phoenix-ECHO
    └── HUB_ONLY/     — Items that exist here but have no equivalent in Phoenix-ECHO
```

---

## What Goes Where

### plugins/
Full plugin packages. A plugin is a self-contained capability unit with:
- `.claude-plugin/plugin.json` — manifest (name, version, description)
- `commands/` — slash commands (e.g., `/sf-jobs`, `/nec`)
- `skills/` — auto-activating knowledge the agent loads
- `agents/` — named subagents with specialized roles
- `hooks/` — event-driven automation (pre-compact, session-start, stop)
- `.mcp.json` — MCP server definitions (if the plugin has a live data connection)

Rule: Every plugin in `plugins/` must have a `plugin.json` and a `README.md`.

### skills/
Extracted skill files that can be loaded independently, without carrying a full plugin.
Use when: you want the knowledge but not the commands or hooks.
Format: `skills/<skill-name>/SKILL.md` or `skills/<skill-name>.md`

Current skills embedded in plugins (candidates for extraction):
| Skill | Source Plugin | Path |
|-------|--------------|------|
| echo-leadership | echo-persistence | `plugins/echo-persistence/skills/echo-leadership/SKILL.md` |
| electrical-guru | electrical-guru | `plugins/electrical-guru/skills/electrical-guru/SKILL.md` |
| rexel-operations | rexel | `plugins/rexel/skills/rexel-operations/SKILL.md` |
| servicefusion-operations | servicefusion | `plugins/servicefusion/skills/servicefusion-operations/SKILL.md` |
| phoenix-lookup | phoenix-knowledge | `plugins/phoenix-knowledge/skills/phoenix-lookup.md` |
| volt-marketing | volt-marketing | `plugins/volt-marketing/skills/volt-marketing/SKILL.md` |

### mcps/
Standalone MCP server configs and source files extracted from plugins.
Use when: you need to reference or deploy an MCP server independently of its plugin.
Format: `mcps/<mcp-name>/` containing `.mcp.json` and any source.

Current MCP configs embedded in plugins (candidates for extraction):
| MCP | Source Plugin | Tools |
|-----|--------------|-------|
| servicefusion | servicefusion | 60+ SF API tools via `phoenix-ai-core-staging` |
| rexel + pricebook | rexel | Rexel SKU lookup, margin analysis, pricebook tiers |
| volt-marketing-server | volt-marketing | MCP server JS source at `mcp-server/volt-marketing-server.js` |

### triage/
Staging. Items land here when extracted from other repos until they are validated and promoted.

- `NEEDS_REVIEW/` — New arrivals. Needs human review before promotion to `plugins/`, `skills/`, or `mcps/`.
- `DIVERGED/` — Files that exist in both `phoenix-plugins` and `Phoenix-ECHO` but have content differences. Requires a merge decision.
- `HUB_ONLY/` — Plugins/files that exist here but NOT in `Phoenix-ECHO`. May be intentional (hub-exclusive) or may need back-propagation.

---

## Plugin Inventory (as of 2026-03-28)

| Plugin | Version | Commands | Skills | Agents | Hooks | MCP | Category |
|--------|---------|----------|--------|--------|-------|-----|----------|
| echo-persistence | 1.0.0 | 7 | 1 | 5 | 3 | No | Identity/Persistence |
| servicefusion | 2.0.0 | 6 | 1 | 1 | 1 | Yes (SF API) | Business Operations |
| electrical-guru | 1.0.0 | 1 | 1 | 0 | 0 | No | Domain Knowledge |
| phoenix-knowledge | 1.0.0 | 1 | 1 | 1 | 0 | No | Domain Knowledge |
| rexel | 1.0.0 | 4 | 1 | 1 | 1 | Yes (Rexel + Pricebook) | Business Operations |
| phoenix-comms | 1.0.0 | 5 | 0 | 0 | 1 | No | Infrastructure |
| file-steward | 1.0.0 | 3 | 0 | 1 | 0 | No | Infrastructure |
| volt-marketing | 1.0.0 | 1 | 1 | 0 | 0 | Yes (MCP source) | Business Operations |

**Totals: 8 plugins, 28 commands, 6 skills, 9 agents, 3 MCP configurations**

---

## Hub Rules

1. This repo RECEIVES extractions — do not develop features here. Develop in the origin repo, then extract to hub.
2. No long-lived branches for capability storage. Main only.
3. When a plugin is updated in its origin repo, update it here too. Hub must stay current.
4. Diverged files go to `triage/DIVERGED/` — never silently overwrite.
5. Everything in `triage/` requires a Shane GO before promotion.
6. Do not delete — archive to `triage/` with a note if removing from active `plugins/`.

---

## MCP Server Paths (MacBook-specific)

Both embedded MCP `.mcp.json` files point to:
```
/Users/shanewarehime/GitHub/phoenix-ai-core-staging/packages/
```
These paths are MacBook-local. Studio and VPS will need updated paths or a shared mount.

---

*Phoenix Echo — Wave B D1 Hub Structure*
