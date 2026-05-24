# VERIFICATION — Wave B D1 Hub Pass (ARCHIVED)

> **ARCHIVED — 2026-03-31.** This document reflects the pre-Phase-1 verification of the old `phoenix-plugins` structure.
> The repo has been restructured. See `CAPABILITY_REGISTRY.md` for current state.

**Date:** 2026-03-28
**Agent:** Phoenix Echo (Sonnet 4.6)
**Scope:** phoenix-plugins repo — local only, no push

---

## Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Inventory current structure | DONE | 8 plugins, full tree mapped |
| 2 | Create D1 hub structure: skills/, mcps/, plugins/ | DONE | Directories created, .gitkeep added |
| 3 | Identify what maps to which directory | DONE | All plugins confirmed in plugins/, skills and MCPs documented |
| 4 | Read each plugin.json / SKILL.md | DONE | All 8 plugin.json files read |
| 5 | Check divergence with Phoenix-ECHO/plugins | DONE | 17 diverged files found, 3 hub-only plugins found |
| 6 | Create 3 triage folders | DONE | triage/NEEDS_REVIEW, triage/DIVERGED, triage/HUB_ONLY |
| 7 | Write HUB_STRUCTURE.md | DONE | `/phoenix-plugins/HUB_STRUCTURE.md` |
| 8 | Write VERIFICATION.md | DONE | This file |

---

## Plugin Inventory (Complete)

8 plugins found in `plugins/`:

### echo-persistence v1.0.0
- Category: Identity / Persistence
- Commands: `/echo`, `/health`, `/log`, `/scout`, `/status`, `/swarm`, `/wrapup` (7)
- Skills: `echo-leadership/SKILL.md` (1)
- Agents: context-reader, gateway-health-check, handoff-generator, ledger-logger, skill-scout (5)
- Hooks: pre-compact-log.sh, session-start-check.sh, stop-reminder.sh (3)
- MCP: None
- HAS `.claude-plugin/plugin.json` — CONFIRMED

### electrical-guru v1.0.0
- Category: Domain Knowledge
- Commands: `/nec` (1)
- Skills: `electrical-guru/SKILL.md` (1)
- Agents: None
- Hooks: None
- MCP: None
- HAS `.claude-plugin/plugin.json` — CONFIRMED

### file-steward v1.0.0
- Category: Infrastructure
- Commands: `/files`, `/research-library`, `/triage` (3)
- Skills: None
- Agents: file-clerk (1)
- Hooks: None
- MCP: None
- HAS `.claude-plugin/plugin.json` — CONFIRMED
- NOTE: HUB-ONLY — does not exist in Phoenix-ECHO

### phoenix-comms v1.0.0
- Category: Infrastructure
- Commands: `/check`, `/config`, `/start`, `/status`, `/stop` (5)
- Skills: None
- Agents: None
- Hooks: hooks.json (1)
- MCP: None
- Codex-hooks: comms-stop-codex.sh, heartbeat-codex.sh
- HAS `.claude-plugin/plugin.json` — CONFIRMED
- NOTE: HUB-ONLY — does not exist in Phoenix-ECHO

### phoenix-knowledge v1.0.0
- Category: Domain Knowledge
- Commands: `/kb` (1)
- Skills: `phoenix-lookup.md` (1)
- Agents: knowledge-agent (1)
- Hooks: None
- MCP: None
- Knowledge dirs: decisions/, phases/ (8 files), reference/ (4 files)
- HAS `.claude-plugin/plugin.json` — CONFIRMED

### rexel v1.0.0
- Category: Business Operations
- Commands: `/rexel-history`, `/rexel-lookup`, `/rexel-margin`, `/rexel-sync` (4)
- Skills: `rexel-operations/SKILL.md` + 4 reference docs (1)
- Agents: rexel-pricing-agent (1)
- Hooks: hooks.json (1)
- MCP: Yes — rexel + pricebook servers via phoenix-ai-core-staging
- HAS `.claude-plugin/plugin.json` — CONFIRMED

### servicefusion v2.0.0
- Category: Business Operations
- Commands: `/sf-briefing`, `/sf-customers`, `/sf-estimate`, `/sf-jobs`, `/sf-pricebook`, `/sf-schedule` (6)
- Skills: `servicefusion-operations/SKILL.md` + 6 reference docs (1)
- Agents: sf-operations-agent (1)
- Hooks: hooks.json (1)
- MCP: Yes — servicefusion server via phoenix-ai-core-staging
- HAS `.claude-plugin/plugin.json` — CONFIRMED

### volt-marketing v1.0.0
- Category: Business Operations
- Commands: `/volt` (1)
- Skills: `volt-marketing/SKILL.md` (1)
- Agents: None
- Hooks: None
- MCP: Source included — `mcp-server/volt-marketing-server.js`
- Has PLAYBOOK.md, RUNBOOK.md, README.md
- HAS `.claude-plugin/plugin.json` — CONFIRMED
- NOTE: HUB-ONLY — does not exist in Phoenix-ECHO

---

## Hub Structure Created

```
phoenix-plugins/
├── plugins/          EXISTING — 8 plugins (confirmed above)
├── skills/           NEW — empty, ready for Wave 5A extractions
├── mcps/             NEW — empty, ready for Wave 5A extractions
├── triage/
│   ├── NEEDS_REVIEW/ NEW — staging for new extractions
│   ├── DIVERGED/     NEW — items with content differences between repos
│   └── HUB_ONLY/     NEW — items that exist here but not in Phoenix-ECHO
├── HUB_STRUCTURE.md  NEW — full directory spec and hub rules
└── VERIFICATION.md   NEW — this file
```

---

## Divergence Findings — phoenix-plugins vs Phoenix-ECHO/plugins

**Method:** `diff -rq` between `Phoenix-ECHO/plugins` and `phoenix-plugins/plugins`

### Files Diverged (content differs, exists in both)
17 files have content differences:

| File | Direction | Risk |
|------|-----------|------|
| `echo-persistence/agents/context-reader.md` | Unknown | Medium |
| `echo-persistence/agents/handoff-generator.md` | Unknown | Medium |
| `echo-persistence/agents/ledger-logger.md` | Unknown | Medium |
| `echo-persistence/commands/log.md` | Unknown | Medium |
| `echo-persistence/commands/wrapup.md` | Unknown | Low |
| `echo-persistence/hooks/pre-compact-log.sh` | Unknown | HIGH — shell hook |
| `phoenix-knowledge/knowledge/decisions/shanes_decisions.md` | Unknown | High |
| `phoenix-knowledge/knowledge/phases/phase_01_gateway_ui.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_02_twin_peaks.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_03_service_fusion.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_04_m365.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_05_rag_pipeline.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_07_voice_ai.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/phases/phase_08_fine_tuning.md` | Unknown | Low |
| `phoenix-knowledge/knowledge/reference/build_specs.md` | Unknown | Low |
| `servicefusion/PLUGIN_DEVELOPMENT_GUIDE.md` | Unknown | Low |
| (hooks.json files — identical, no diff) | — | — |

**Key flag:** `pre-compact-log.sh` diverges — this is an active shell hook. Needs manual review before any sync.
**Key flag:** `shanes_decisions.md` diverges — this is Shane's own decision log. Hub version may be more current or stale. Requires Shane review.

### Hub-Only (exists in phoenix-plugins, NOT in Phoenix-ECHO)
3 plugins:
- `file-steward` — file management plugin
- `phoenix-comms` — cross-agent comms
- `volt-marketing` — marketing strategist

These are hub-exclusive. Decision needed: back-propagate to Phoenix-ECHO or keep hub-only?

### Phoenix-ECHO-Only (exists in Phoenix-ECHO, NOT in phoenix-plugins)
1 file:
- `plugins/marketplace.json` — marketplace registry

This should be evaluated for hub inclusion.

### Missing Plugin Manifest (echo-persistence)
`echo-persistence` in Phoenix-ECHO has NO `.claude-plugin/` directory.
`echo-persistence` in phoenix-plugins HAS `.claude-plugin/plugin.json`.
Hub version is MORE COMPLETE on this point.

---

## Action Items for Shane

| Priority | Item | Decision Needed |
|----------|------|-----------------|
| HIGH | `pre-compact-log.sh` diverged — active hook | Which version is correct? |
| HIGH | `shanes_decisions.md` diverged — Shane's decision log | Which version is canonical? |
| MEDIUM | 3 hub-only plugins (file-steward, phoenix-comms, volt-marketing) | Back-propagate to Phoenix-ECHO? |
| MEDIUM | 13 phoenix-knowledge phase/reference files diverged | Hub or Phoenix-ECHO more current? |
| LOW | `marketplace.json` in Phoenix-ECHO, not in hub | Add to hub? |
| LOW | `echo-persistence` agents/commands diverged (4 files) | Hub or Phoenix-ECHO more current? |

---

## Wave 5A Readiness

Hub structure is ready to receive extractions. Before Wave 5A:
- `skills/` and `mcps/` directories are empty and waiting
- `triage/NEEDS_REVIEW/` is the landing zone for all incoming extractions
- Divergence items in the table above should be resolved before any cross-repo sync

**Hub is READY for Wave 5A.**

---

*Phoenix Echo — Wave B D1 Hub Pass Complete*
*Local only — no push performed*
