> **ARCHIVED** — This document was written during Phase 1 (2026-03-27) when the repo was still called "phoenix-plugins" and contained 8 plugins. The repo has since been restructured as **Phoenix Toolbox** with 11 capabilities, 9 MCP servers, and a capability-first architecture. This file is preserved for historical reference. For current documentation, see `README.md`, `CAPABILITY_REGISTRY.md`, and `docs/`.
> >
> >> Archived: 2026-04-04 (Phase 5)
> >>
> >> ---
> >>
> >> # Build Doc — phoenix-plugins
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Objectives
1. Fix the broken volt-marketing MCP server so it can actually run — add `package.json`, install `@modelcontextprotocol/sdk`, verify the server starts and tools respond.
2. Sync the 2-plugin, 1-command gap between this repo and Phoenix-ECHO's `plugins/` directory (this repo is ahead — Phoenix-ECHO must be updated, not the reverse).
3. Add a `CLAUDE.md` / `AGENTS.md` at the repo root so agents loading this repo know the governance rules and operating context.
4. Resolve the two open feature branches (`feature/echo-persistence-updates`, `feature/phoenix-comms`) — PR, merge, or close.
5. Remove the committed `plugin.json.bak` stale backup file.

## End State
- All 8 plugins are fully operational — every MCP server starts cleanly, every command loads, every hook fires.
- volt-marketing MCP server runs standalone (`node volt-marketing-server.js`) with no missing-module errors.
- Phoenix-ECHO `plugins/` directory is in sync with this repo as the canonical source.
- Repo has a `CLAUDE.md` at root with agent operating instructions and governance summary.
- No stale branches, no backup files, no governance gaps.
- A STATUS.md tracks active work so any agent picking up this repo knows current state in one read.

## Stack Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin manifest format | `.claude-plugin/plugin.json` | Claude Code native format — required for plugin discovery |
| MCP transport | stdio | Standard for local Claude Code MCP servers — no network config required |
| JavaScript runtime | Node.js ESM | `@modelcontextprotocol/sdk` is ESM-only; `"type": "module"` required in package.json |
| Credential storage | External (Azure Key Vault / compiled packages) | This is a public repo — no secrets here, ever |
| Content format | Markdown + JSON | No build step, no compilation for non-MCP plugins — agents read them directly |
| Repo structure | Flat plugin directories | Simple, self-contained, easy for any agent to navigate without a map |

## Architecture Targets
- **volt-marketing MCP server fix:** Add `mcp-server/package.json` with `"type": "module"`, `"name": "volt-marketing-server"`, and `@modelcontextprotocol/sdk` as a dependency. Run `npm install`. Verify all 8 tools respond via MCP handshake. Update volt-marketing README with working start command.
- **CLAUDE.md at root:** Single file explaining repo purpose, the plugin structure, install instructions for agents, and the governance rule that this repo is the canonical source of truth for plugins (not Phoenix-ECHO).
- **Plugin sync workflow:** Define a lightweight process (or script in `scripts/`) for pushing plugin changes from this repo back to Phoenix-ECHO. Prevents future drift.
- **Branch cleanup:** Open PRs or close both unmerged feature branches. If `feature/echo-persistence-updates` has meaningful changes, get them merged before they fall further behind main.

## Success Criteria
- [ ] `node plugins/volt-marketing/mcp-server/volt-marketing-server.js` starts without error
- [ ] All 8 `volt_*` MCP tools listed and callable (confirm via `ListTools` response)
- [ ] `plugin.json.bak` removed from phoenix-knowledge
- [ ] `CLAUDE.md` exists at repo root with agent operating context
- [ ] `feature/echo-persistence-updates` and `feature/phoenix-comms` branches resolved (merged or closed)
- [ ] Phoenix-ECHO `plugins/` directory updated to match this repo (phoenix-comms, file-steward, echo-persistence `/swarm` command)
- [ ] No open stale branches in remote

## Dependencies & Blockers
| Dependency | Status | Owner |
|-----------|--------|-------|
| `@modelcontextprotocol/sdk` npm package | Available on npm — not installed | Phoenix Echo |
| Phoenix-ECHO plugin sync | Requires write access to Phoenix-ECHO repo | Phoenix Echo |
| Shane GO on branch cleanup | `feature/echo-persistence-updates` may have work-in-progress — verify before closing | Shane |
| STATUS.md creation | Not yet present — blocks knowing current active work | Phoenix Echo |

## Change Process
All changes to this repository follow the Phoenix Electric governance model:

1. **Branch:** Create feature branch from `main`
2. **Develop:** Make changes with clear, atomic commits
3. **PR:** Open pull request with description of changes
4. **Review:** Required approval from `@GIT-PHOENIX-HUB/humans-maintainers`
5. **CI:** All status checks must pass (when configured)
6. **Merge:** Squash merge to `main`
7. **No force push.** No direct commits to `main`. No deletion without `guardian-override-delete` label.

## NEEDS SHANE INPUT
- **`feature/echo-persistence-updates` branch:** Unknown what changes are on it. Should this be PRed, merged, or abandoned? Needs a quick read before deciding.
- **volt-marketing MCP server deployment:** The RUNBOOK.md references a deployment process — confirm whether the server is meant to run as a LaunchAgent, on-demand, or only when the `/volt` command fires. Determines how package.json install step integrates into setup flow.
- **Plugin sync direction:** Confirm that phoenix-plugins is the canonical source (not Phoenix-ECHO) before executing a sync that overwrites Phoenix-ECHO's plugin copies.
