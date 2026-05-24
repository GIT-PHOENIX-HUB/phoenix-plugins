# Product Bible — service-fusion (Claude Code Plugin)
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Purpose

`service-fusion` is the Claude Code plugin that surfaces the Phoenix Electric Service Fusion integration to Claude Code sessions. It is a pure plugin repo — no compiled code, no build step. It provides: 6 slash commands for day-to-day SF operations (`/sf-briefing`, `/sf-jobs`, `/sf-customers`, `/sf-estimate`, `/sf-schedule`, `/sf-pricebook`), one autonomous `sf-operations-agent`, a contextual skill (`servicefusion-operations`) with 6 on-demand reference docs, a hooks scaffold, and a comprehensive Plugin Development Guide for the Phoenix Electric team. The plugin is installed locally to `~/.claude/plugins/` on the MacBook and wires the `@phoenix/servicefusion-mcp` MCP server (built from the `current` repo) via stdio transport.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Plugin type | Claude Code local plugin | — |
| Manifest | plugin.json (name: servicefusion, v2.0.0) | 2.0.0 |
| MCP server | @phoenix/servicefusion-mcp (from `current` repo) | 2.0.0 |
| Transport | stdio (node dist/index.js) | — |
| Languages | Markdown, JSON | — |
| Build | None — markdown/JSON only | — |
| Test | None — verified via Claude Code `--plugin-dir` flag | — |
| CI/CD | None configured | — |
| Deploy Target | ~/.claude/plugins/servicefusion (MacBook) | — |

## Architecture

`service-fusion` is a stateless Claude Code plugin directory. It contains no runnable source code itself — all execution happens through the wired MCP server (from the `current` repo). Components are auto-discovered by Claude Code at session load:

```
service-fusion/
├── .claude-plugin/
│   └── plugin.json               Plugin manifest (name, description, version, author, keywords)
├── .mcp.json                     MCP server wiring — points to servicefusion-mcp dist/index.js
├── commands/                     6 slash commands (one .md per command)
│   ├── sf-briefing.md            Morning operations summary — jobs, appointments, capacity
│   ├── sf-jobs.md                Job listing, creation, status lookup
│   ├── sf-customers.md           Customer search, view, create
│   ├── sf-estimate.md            Guided estimate/proposal creation workflow
│   ├── sf-schedule.md            Calendar tasks, technician availability
│   └── sf-pricebook.md           Pricebook reference + Rexel pricing lookups
├── agents/
│   └── sf-operations-agent.md   Autonomous multi-step SF orchestrator
├── hooks/
│   └── hooks.json               Event hook scaffold (minimal — no active hooks yet)
├── skills/
│   └── servicefusion-operations/
│       ├── SKILL.md             Trigger phrases + SF operational knowledge (auth, conventions, tool list)
│       └── references/          6 reference docs loaded on demand
│           ├── api-reference.md      SF v1 API surface, endpoints, pagination
│           ├── workflows.md          Common multi-step SF workflows
│           ├── financials.md         Invoices, payments, financial operations
│           ├── rexel-integration.md  Rexel pricebook integration notes
│           ├── browser-fallback.md   When MCP is unavailable — manual SF web UI steps
│           └── future-gateway.md     Gateway integration roadmap for this plugin
├── CODEOWNERS                    * @GIT-PHOENIX-HUB/humans-maintainers
└── PLUGIN_DEVELOPMENT_GUIDE.md  Team reference — full guide for building Claude Code plugins
```

**Skill trigger phrases (partial):** "check service fusion", "look up a customer", "create an estimate", "check the schedule", "morning briefing", "what jobs are open", "who's on call", "missed calls", "build a proposal", "Rexel prices", and any SF operations task.

**Progressive disclosure:** Claude Code loads only the skill description at session start. SKILL.md loads on trigger match. Reference files (`references/*.md`) load only when Claude explicitly needs them — keeps context lean.

**MCP wiring:** `.mcp.json` defines the stdio command and environment for the MCP server. The server binary is built from the `current` repo (`packages/mcp-server`) and must be compiled before the plugin is functional. Current `.mcp.json` points to a path that requires updating after the `current` repo is built locally.

## Auth & Security

- **No credentials in this repo.** All authentication is handled by the MCP server (`current` repo).
- MCP server pulls secrets from Azure Key Vault at startup via OIDC. The plugin passes the vault URI via environment in `.mcp.json`.
- Write operations in the MCP server require an approval token or explicit env flag. This plugin's commands invoke read operations freely and prompt for confirmation before write operations.
- CODEOWNERS: all files require approval from `@GIT-PHOENIX-HUB/humans-maintainers`.

## Integrations

| Integration | Type | Direction |
|------------|------|-----------|
| @phoenix/servicefusion-mcp (current repo) | MCP stdio | Outbound (plugin spawns the server) |
| Service Fusion API v1 | Via MCP server | Indirect |
| Azure Key Vault | Via MCP server | Indirect |
| Claude Code session | Plugin auto-discovery | Inbound |

## File Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Required manifest — plugin identity and version |
| `.mcp.json` | MCP server registration (node command + env) |
| `commands/sf-briefing.md` | Morning ops summary command |
| `commands/sf-jobs.md` | Job operations command |
| `commands/sf-customers.md` | Customer operations command |
| `commands/sf-estimate.md` | Estimate creation command |
| `commands/sf-schedule.md` | Schedule/calendar command |
| `commands/sf-pricebook.md` | Pricebook/Rexel command |
| `agents/sf-operations-agent.md` | Autonomous agent definition |
| `hooks/hooks.json` | Hook event scaffold |
| `skills/servicefusion-operations/SKILL.md` | Core operational skill |
| `skills/servicefusion-operations/references/` | 6 on-demand reference docs |
| `CODEOWNERS` | Branch protection ownership |
| `PLUGIN_DEVELOPMENT_GUIDE.md` | Team guide for building Claude Code plugins |

## Current State

- **Status:** active
- **Last Commit:** 2026-03-27 — `Add CODEOWNERS for Phoenix Electric governance` (8c4219e)
- **Open PRs:** None at time of audit
- **Open Branches:** main only (1 branch)
- **Known Issues:**
  - `.mcp.json` points to old `phoenix-ai-core-staging` path — must be updated to point at built `current/packages/mcp-server/dist/index.js` after that repo is compiled
  - `hooks/hooks.json` is a scaffold only — no active hooks implemented
  - No test procedure beyond manual `claude --plugin-dir` smoke test
  - Plugin split across two repos (`service-fusion` = plugin, `current` = MCP server) requires both repos to be maintained in sync

## Branding & UI

N/A — Claude Code plugin only. No visual UI.

## Action Log

| Date (approx) | Commit | Description |
|---------------|--------|-------------|
| 2026-03-27 | 8c4219e | Add CODEOWNERS for Phoenix Electric governance |
| 2026-03-27 | a2dc030 | feat: align plugin with SF v1 API (23 active tools, 35 deprecated stubs) |
| 2026-03-27 | 0beadce | fix: add Node 25 ESM resolution flag to MCP server args |
| 2026-03-27 | 679a0cc | feat: add hooks scaffold (minimal for now) |
| 2026-03-27 | e66ee46 | feat: add SF operations autonomous agent |
| 2026-03-27 | d744448 | feat: add 6 slash commands for SF operations |
| 2026-03-27 | b238e9e | feat: add 6 reference files for SF operations skill |
| 2026-03-27 | 188c39e | feat: add servicefusion-operations core skill |
| 2026-03-27 | 8f32398 | feat: scaffold servicefusion plugin with MCP server wiring |
| 2026-03-27 | f34c5ec | docs: add Plugin Development Guide — team reference |

## Key Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-08 | Plugin Development Guide written (first-hand experience) |
| 2026-03-27 | Full plugin scaffold committed — 6 commands, agent, skill, 6 refs, hooks |
| 2026-03-27 | Aligned with SF v1 API (23 active tools, 35 deprecated stubs) |
| 2026-03-27 | CODEOWNERS added — governance enforced |
| 2026-03-27 | Product Bible + Build Doc added (governance phase) |
