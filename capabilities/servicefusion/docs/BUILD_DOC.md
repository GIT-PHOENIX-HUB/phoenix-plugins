# Build Doc — service-fusion (Claude Code Plugin)
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Objectives

1. Fix `.mcp.json` to point at the correct, built MCP server path from the `current` repo — the plugin is currently non-functional for new installs because the path references the old `phoenix-ai-core-staging` location.
2. Implement at least one active hook (e.g., `SessionStart` to verify MCP server connectivity on load).
3. Document a repeatable install procedure so any Phoenix Electric team member can get the plugin running in under 10 minutes.
4. Establish a versioning discipline: bump `plugin.json` version on every meaningful change to commands, skills, or agent behavior.
5. Keep the plugin in sync with the `current` repo — when new tools are added to the MCP server, update the plugin commands and skill reference docs accordingly.

## End State

`service-fusion` is a fully functional, installable Claude Code plugin that:
- Points at the correct, stable MCP server binary from the `current` repo
- Installs cleanly on MacBook, Studio, and VPS with a documented one-command setup
- All 6 commands work end-to-end against live SF data with no manual path fixes
- The `SessionStart` hook validates MCP connectivity and reports a clear error if `az login` is expired
- Reference docs in `skills/servicefusion-operations/references/` are kept current with the active tool list
- Plugin version tracks in lockstep with `@phoenix/servicefusion-mcp` version

## Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin type | Local (not marketplace) | Internal Phoenix Electric use only; no public publishing needed |
| Transport | stdio | Claude Code standard; HTTP reserved for Gateway integration in current repo |
| No build step | Markdown + JSON only | Plugin components are declarative; all execution in MCP server |
| MCP server source | current repo (separate) | TypeScript MCP server lives in `current` to keep plugin repo lean |
| Hooks | hooks.json scaffold | Event-driven automation; currently minimal, expandable without code |
| Skill structure | Progressive disclosure | SKILL.md stays lean; details in references/ loaded on demand |

## Architecture Targets

- **Path fix (immediate):** Update `.mcp.json` to point at `current/packages/mcp-server/dist/index.js` with a stable absolute path or a path resolved via a documented convention (e.g., symlink at `~/.phoenix/servicefusion-mcp`).
- **SessionStart hook:** Add a `SessionStart` hook that runs a lightweight health check (`servicefusion_health` tool) and surfaces a human-readable error if the MCP server fails to start (typically: `az login` expired or dist not built).
- **Install runbook:** Add `INSTALL.md` documenting the exact steps to install this plugin on a new machine: build the `current` repo, update `.mcp.json` path, register in `installed_plugins.json`, run `az login`.
- **Sync protocol:** When the `current` repo adds new tools, this repo's skill `api-reference.md` and relevant command files should be updated in the same PR cycle (linked PRs or a single cross-repo task).
- **Version alignment:** `plugin.json` version should match the `@phoenix/servicefusion-mcp` version it is wired to.

## Success Criteria

- [ ] `.mcp.json` path updated — plugin loads without errors on a clean MacBook install
- [ ] All 6 slash commands return valid SF data in a live session (acceptance test against real SF tenant)
- [ ] `sf-operations-agent` completes a multi-step task (e.g., look up customer + list their jobs) without manual intervention
- [ ] `SessionStart` hook fires and surfaces a clear error message when MCP server is unavailable
- [ ] `INSTALL.md` written and validated by a second team member (Stephanie or Ash)
- [ ] `plugin.json` version matches wired MCP server version
- [ ] No absolute paths in the repo that reference a specific user's home directory (use documented convention instead)

## Dependencies & Blockers

| Dependency | Status | Owner |
|-----------|--------|-------|
| current repo MCP server built dist | Required for .mcp.json path fix | Echo (builds from current repo) |
| az login on host machine | Required for MCP server to fetch secrets | Shane / team member |
| SF tenant credentials in Azure Key Vault | Required for live tool calls | Shane (already configured) |
| Plugin install path convention | Needs decision — symlink vs absolute path vs env var | NEEDS SHANE INPUT |
| Studio + VPS plugin install | Plugin currently only confirmed on MacBook | NEEDS SHANE INPUT — scope of multi-machine install |

## Change Process

All changes to this repository follow the Phoenix Electric governance model:

1. **Branch:** Create feature branch from `main`
2. **Develop:** Make changes with clear, atomic commits
3. **PR:** Open pull request with description of changes
4. **Review:** Required approval from `@GIT-PHOENIX-HUB/humans-maintainers`
5. **CI:** All status checks must pass (when configured)
6. **Merge:** Squash merge to `main`
7. **No force push.** No direct commits to `main`. No deletion without `guardian-override-delete` label.

**Additional rules specific to this plugin:**
- Any change to `.mcp.json` must be smoke-tested with `claude --plugin-dir .` before merge
- Command file changes (`commands/*.md`) require a test session confirming the command produces expected output
- Skill trigger phrase changes require validation that Claude correctly matches the updated phrases
- Plugin version in `plugin.json` must be bumped on every PR that changes plugin behavior

## NEEDS SHANE INPUT

- **MCP server path convention:** Should `.mcp.json` use an absolute path (fragile, machine-specific), a symlink at a fixed location (e.g., `~/.phoenix/servicefusion-mcp`), or an env var pointing at the dist? This is the most important unresolved question for multi-machine install.
- **Plugin co-location:** Should the `plugin/` directory be merged into the `current` repo as a top-level directory, eliminating the split? The current two-repo split creates a sync burden — both repos must be updated when the tool list changes.
- **Multi-machine install scope:** Is the plugin intended for MacBook only, or does Shane want it running on Studio and VPS as well?
- **Hooks roadmap:** Are there specific automation hooks Shane wants (e.g., auto-briefing on session start, pre-tool approval for write operations)?
- **Public vs private:** This repo is currently private. If the Plugin Development Guide is valuable to the Claude Code community, consider making the guide (not the plugin itself) public.
