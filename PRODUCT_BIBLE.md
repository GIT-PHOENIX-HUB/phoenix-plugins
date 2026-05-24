> **ARCHIVED** — This Product Bible was written during Phase 1 (2026-03-27) when the repo was called "phoenix-plugins" with a flat `plugins/` directory of 8 plugins. The repo has since been restructured as **Phoenix Toolbox** with a capability-first architecture: 11 capabilities under `capabilities/`, 9 MCP servers under `mcp-servers/`, comprehensive templates under `templates/`, and development guides under `docs/`. This file is preserved for historical reference. For current architecture, see `docs/ARCHITECTURE.md` and `README.md`.
> >
> >> Archived: 2026-04-04 (Phase 5)
> >>
> >> ---
> >>
> >> # Product Bible — phoenix-plugins
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Purpose
phoenix-plugins is the central, organized registry for every custom Claude Code plugin, skill, subagent, and MCP server built for the Phoenix Electric AI platform. It exists so that any agent—Echo, Codex, or a future contributor—has a single authoritative source to build from, maintain, and extend. The repo eliminates reinvention: rather than each agent rebuilding tooling from scratch after a session reset, they clone this repo and have every capability available immediately. It is a public repo; no credentials or secrets live here.

## Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (ESM) | ≥18 (volt-marketing MCP server only) |
| Plugin format | Claude Code plugin spec | `.claude-plugin/plugin.json` manifest |
| MCP protocol | `@modelcontextprotocol/sdk` | ^1.x (ESM import — no package-lock present) |
| Commands | Claude Code slash commands | Markdown-defined |
| Skills | Claude Code skill system | Markdown-defined |
| Agents | Claude Code subagent spec | Markdown-defined |
| Hooks | Claude Code hooks (`hooks.json`) | JSON + shell scripts |
| Build | None (content repo — no compile step) | — |
| Test | None configured | — |
| CI/CD | None configured | — |
| Deploy Target | Local Claude Code marketplace symlink | MacBook primary |

## Architecture
The repo is organized as a flat collection of self-contained plugin directories under `plugins/`. Each plugin is a standalone unit that can be symlinked into Claude Code's local marketplace independently. There is no monorepo build step — everything is either Markdown, JSON, or shell scripts, with one exception: the `volt-marketing` plugin contains a JavaScript MCP server.

Plugin installation uses a symlink model: each plugin directory is symlinked into `~/.claude/plugins/marketplaces/local/plugins/` and enabled via `settings.json`. MCP server plugins additionally register their server config via `.mcp.json`.

```
phoenix-plugins/
├── CODEOWNERS                          # All files owned by @GIT-PHOENIX-HUB/humans-maintainers
├── README.md                           # Plugin inventory table and installation guide
├── PRODUCT_BIBLE.md                    # This file
├── BUILD_DOC.md                        # Roadmap and change process
└── plugins/
    ├── echo-persistence/               # Identity persistence — session logging, context survival
    │   ├── .claude-plugin/plugin.json
    │   ├── commands/                   # /echo, /health, /log, /scout, /status, /swarm, /wrapup
    │   ├── agents/                     # 5 agents: context-reader, gateway-health-check, handoff-generator, ledger-logger, skill-scout
    │   ├── skills/echo-leadership/     # echo-leadership SKILL.md
    │   └── hooks/                      # hooks.json + pre-compact-log.sh, session-start-check.sh, stop-reminder.sh
    ├── servicefusion/                  # Service Fusion CRM integration
    │   ├── .claude-plugin/plugin.json
    │   ├── .mcp.json                   # MCP server config (points to compiled package)
    │   ├── commands/                   # /sf-briefing, /sf-customers, /sf-estimate, /sf-jobs, /sf-pricebook, /sf-schedule
    │   ├── agents/sf-operations-agent.md
    │   ├── skills/servicefusion-operations/
    │   └── hooks/hooks.json
    ├── rexel/                          # Rexel distributor integration
    │   ├── .claude-plugin/plugin.json
    │   ├── .mcp.json                   # MCP server config (points to compiled package)
    │   ├── commands/                   # /rexel-history, /rexel-lookup, /rexel-margin, /rexel-sync
    │   ├── agents/rexel-pricing-agent.md
    │   ├── skills/rexel-operations/
    │   └── hooks/hooks.json
    ├── electrical-guru/                # NEC 2023 code consultant — standalone, no dependencies
    │   ├── .claude-plugin/plugin.json
    │   ├── commands/nec.md             # /nec command
    │   └── skills/electrical-guru/SKILL.md
    ├── phoenix-knowledge/              # Phoenix Electric knowledge base — build reference
    │   ├── .claude-plugin/plugin.json
    │   ├── commands/kb.md              # /kb command
    │   ├── agents/knowledge-agent.md
    │   ├── knowledge/                  # decisions/, phases/ (8 phases), reference/
    │   └── skills/phoenix-lookup.md
    ├── phoenix-comms/                  # Cross-agent heartbeat — Echo ↔ Codex presence awareness
    │   ├── .claude-plugin/plugin.json
    │   ├── commands/                   # /check, /config, /start, /status, /stop
    │   ├── codex-hooks/                # heartbeat-codex.sh, comms-stop-codex.sh (Codex CLI drop-ins)
    │   └── hooks/hooks.json
    ├── file-steward/                   # File management, triage, filing convention enforcement
    │   ├── .claude-plugin/plugin.json
    │   ├── commands/                   # /files, /research-library, /triage
    │   └── agents/file-clerk.md
    └── volt-marketing/                 # Elite marketing strategist + live MCP server
        ├── .claude-plugin/plugin.json
        ├── mcp-server/
        │   └── volt-marketing-server.js   # BROKEN — see Known Issues
        ├── commands/volt.md            # /volt command
        ├── skills/volt-marketing/SKILL.md
        ├── PLAYBOOK.md
        └── RUNBOOK.md
```

**Data flow (MCP plugins):** Claude Code reads `.mcp.json` → spawns MCP server process → tool calls routed over stdio transport → server returns structured JSON responses to Claude.

**Data flow (non-MCP plugins):** Claude Code reads `plugin.json` manifest → loads commands/skills/agents as context → user invokes slash command or skill activates automatically.

## Auth & Security
No credentials or secrets are stored in this repo. This is a public repository by design. Authentication for integrations (ServiceFusion OAuth 2.0, Rexel, Azure) is managed externally — see the organization's secure credential store. The `.mcp.json` files for servicefusion and rexel reference compiled package paths on the local machine; those packages handle their own auth. The volt-marketing MCP server requires no external auth — all data is hardcoded domain knowledge about Phoenix Electric CO.

## Integrations
| Integration | Plugin | Connection Method | Notes |
|------------|--------|-------------------|-------|
| Service Fusion CRM | servicefusion | MCP server (compiled package, external) | OAuth 2.0 — credentials managed externally |
| Rexel distributor | rexel | MCP server (compiled package, external) | Pricing and purchase history API |
| Gateway LEDGER | echo-persistence | File system paths on MacBook | Hardcoded to `~/Phoenix_Local/_GATEWAY/` |
| Codex CLI | phoenix-comms | Shared LEDGER heartbeat file | Cross-agent presence via file write/read |
| Phoenix Electric knowledge base | phoenix-knowledge | Embedded Markdown | No external API — static reference |
| NEC 2023 code | electrical-guru | Embedded Markdown | No external API — static reference |

## File Structure
| Path | Purpose |
|------|---------|
| `README.md` | Plugin inventory and installation guide |
| `CODEOWNERS` | All files assigned to `@GIT-PHOENIX-HUB/humans-maintainers` |
| `plugins/echo-persistence/` | Identity and session persistence — the most critical plugin |
| `plugins/servicefusion/` | Service Fusion CRM — jobs, estimates, scheduling |
| `plugins/rexel/` | Rexel pricing, margin analysis, purchase history |
| `plugins/electrical-guru/` | NEC 2023 consultant — standalone, no deps |
| `plugins/phoenix-knowledge/` | Build reference across all 8 Phoenix project phases |
| `plugins/phoenix-comms/` | Echo ↔ Codex heartbeat communication |
| `plugins/file-steward/` | Filing convention enforcement and file triage |
| `plugins/volt-marketing/` | Marketing strategist + MCP server (broken — see Known Issues) |
| `plugins/*/. claude-plugin/plugin.json` | Manifest for each plugin (name, version, description, author) |
| `plugins/*/.mcp.json` | MCP server registration config (servicefusion, rexel) |
| `plugins/*/hooks/hooks.json` | Event-driven hook definitions per plugin |
| `plugins/phoenix-comms/codex-hooks/` | Codex CLI drop-in hook scripts |
| `plugins/volt-marketing/mcp-server/volt-marketing-server.js` | Only JavaScript file in repo — broken, missing package.json |

## Current State
- **Status:** Active
- **Last Commit:** 2026-03-21 — `Add CODEOWNERS for Phoenix Electric governance`
- **Open PRs:** None (as of audit 2026-03-27)
- **Open Branches:** 3 total — `main` (active), `origin/feature/echo-persistence-updates` (unmerged), `origin/feature/phoenix-comms` (unmerged)
- **Known Issues:**
  - **CRITICAL — volt-marketing MCP server is broken:** `plugins/volt-marketing/mcp-server/volt-marketing-server.js` uses ESM `import` from `@modelcontextprotocol/sdk` but there is no `package.json` in `mcp-server/` (and none at repo root). The server cannot be started; `node` will fail to resolve the module. Fix requires adding `package.json` with `"type": "module"` and the `@modelcontextprotocol/sdk` dependency, then running `npm install`.
  - **plugin.json.bak committed in phoenix-knowledge:** `plugins/phoenix-knowledge/plugin.json.bak` is a stale backup file committed to the repo. Should be removed.
  - **Plugin divergence with Phoenix-ECHO:** `Phoenix-ECHO` repo's `plugins/` directory is 2 plugins behind this repo (missing phoenix-comms and file-steward) and 1 command behind (echo-persistence missing `/swarm`). This repo is the canonical source — sync needs to happen in the other direction.
  - **echo-persistence-updates branch unmerged:** Feature branch open with no PR. Status unknown.
  - **No CLAUDE.md or AGENTS.md at root:** No agent governance file present.

## Branding & UI
N/A — backend/tooling repo. No UI components.

## Action Log
| Date | Commit | Description |
|------|--------|-------------|
| 2026-03-21 | `8532b21` | Add CODEOWNERS for Phoenix Electric governance |
| 2026-03-21 | `9e0bee2` | Create Volt Marketing Strategy Playbook |
| 2026-03-21 | `2d0e7ac` | Add deployment runbook for Volt Marketing |
| 2026-03-21 | `a578975` | Create README for Volt Marketing plugin |
| 2026-03-21 | `9a7a300` | feat: add volt-marketing MCP server with 8 marketing intelligence tools |
| 2026-03-21 | `97defed` | feat: add volt-marketing SKILL.md — full marketing strategist skill definition |
| 2026-03-21 | `0b617fa` | feat: add volt-marketing command — /volt activation with full protocol |
| 2026-03-21 | `902cce7` | feat: add volt-marketing plugin — Elite Marketing Strategist for Phoenix Electric CO |
| 2026-03-19 | `b6ef025` | feat: initialize phoenix-plugins repo with all 7 custom plugins |

## Key Milestones
| Date | Milestone |
|------|-----------|
| 2026-03-19 | Repository initialized with 7 plugins (echo-persistence, servicefusion, electrical-guru, phoenix-knowledge, rexel, phoenix-comms, file-steward) |
| 2026-03-21 | volt-marketing plugin added — 8th plugin, first with live JavaScript MCP server code |
| 2026-03-21 | CODEOWNERS added — governance model established |
| 2026-03-27 | Product Bible and Build Doc added — Phase 3 governance docs |
