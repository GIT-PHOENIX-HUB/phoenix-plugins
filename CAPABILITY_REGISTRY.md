# Phoenix Toolbox — Capability Registry

Master index of all capabilities, MCP servers, and tools in this repository.
Single source of truth for what's available and where to find it.

**Last updated:** 2026-04-04 (Phase 5)
**Maintainer:** Phoenix Echo

---

## Capabilities

| Capability | Path | Commands | Skills | Agents | Hooks | Status |
|---|---|---|---|---|---|---|
| Echo Persistence | `capabilities/echo-persistence/` | 7 | 1 | 5 | 3 | Active — Core System |
| Electrical Guru | `capabilities/electrical-guru/` | 1 | 1 | 0 | 0 | Active |
| File Steward | `capabilities/file-steward/` | 3 | 0 | 1 | 0 | Active |
| Phoenix Comms | `capabilities/phoenix-comms/` | 5 | 0 | 0 | 3 | Active |
| Phoenix Knowledge | `capabilities/phoenix-knowledge/` | 1 | 1 | 1 | 0 | Active |
| Rexel | `capabilities/rexel/` | 4 | 1 | 1 | 0 | Active |
| Service Fusion | `capabilities/servicefusion/` | 6 | 1 | 1 | 0 | Active |
| Volt Marketing | `capabilities/volt-marketing/` | 1 | 1 | 0 | 0 | Active |
| Gauntlet | `capabilities/gauntlet/` | 0 | 0 | 0 | 0 | Active — Standalone App |
| Phoenix 365 | `capabilities/phoenix-365/` | 4 | 3 | 2 | 1 | Active |
| Browser Persistence | `capabilities/browser-persistence/` | 0 | 4 | 0 | 0 | Active — Doc-based Persistence |

**Totals:** 11 capabilities, 32 commands, 13 skills, 11 agents, 7 hook definitions

> **Hook counting standard:** Hooks = number of event handler definitions that fire at runtime.
> > Empty hooks.json config files (Rexel, ServiceFusion) count as 0.
> > > Phoenix Comms counts 1 echo-side SessionStart + 2 codex-side scripts = 3.
> > > > Standalone apps (Gauntlet) do not require `.claude-plugin/plugin.json`.
> > > > > Browser Persistence is doc-based (skills only, no commands or hooks).
> > > > >
> > > > > ---
> > > > >
> > > > > ## MCP Servers
> > > > >
> > > > > | Server | Path | Tools | Transport | Status |
> > > > > |---|---|---|---|---|
> > > > > | Builder MCP | `mcp-servers/builder-mcp/` | 20+ | HTTP (Azure Functions) | Active — Multi-module platform |
> > > > > | M365 MCP | `mcp-servers/m365-mcp/` | 18 | stdio | Active — TypeScript |
> > > > > | Marketing Orchestrator | `mcp-servers/marketing-mcp/marketing-orchestrator/` | 6 | — | Proposal (design doc only) |
> > > > > | CallRail MCP | `mcp-servers/marketing-mcp/mcp-callrail/` | 5 | — | Research Complete (spec only) |
> > > > > | GBP MCP | `mcp-servers/marketing-mcp/mcp-gbp/` | 5+ | — | Research Complete (spec only) |
> > > > > | Google Ads MCP | `mcp-servers/marketing-mcp/mcp-google-ads/` | — | — | Placeholder |
> > > > > | Nextdoor Adapter | `mcp-servers/marketing-mcp/nextdoor-adapter/` | — | — | Placeholder |
> > > > > | Weather Trigger | `mcp-servers/marketing-mcp/weather-trigger/` | — | — | Research Complete (spec extracted) |
> > > > > | Volt Marketing MCP | `capabilities/volt-marketing/mcp-server/` | 8 | stdio | Active — In capability dir |
> > > > >
> > > > > **Totals:** 9 MCP server entries (3 active, 3 spec'd, 1 proposal, 2 placeholders)
> > > > >
> > > > > ---
> > > > >
> > > > > ## Documentation
> > > > >
> > > > > | Document | Path | Description |
> > > > > |---|---|---|
> > > > > | Plugin Development Guide | `docs/PLUGIN_DEVELOPMENT_GUIDE.md` | Complete guide to creating capabilities |
> > > > > | MCP Development Guide | `docs/MCP_DEVELOPMENT_GUIDE.md` | Complete guide to building MCP servers |
> > > > > | Skill Authoring Guide | `docs/SKILL_AUTHORING_GUIDE.md` | Complete guide to writing skills |
> > > > > | Architecture | `docs/ARCHITECTURE.md` | System architecture and design |
> > > > >
> > > > > ---
> > > > >
> > > > > ## Templates
> > > > >
> > > > > | Template | Path | Contents |
> > > > > |---|---|---|
> > > > > | Capability Template | `templates/capability-template/` | README, plugin.json, commands, skills, agents, hooks |
> > > > > | Skill Template | `templates/skill-template/` | SKILL.md scaffold, authoring README |
> > > > > | MCP Template | `templates/mcp-template/` | README, .mcp.json, src/index.ts, src/tools.ts, package.json |
> > > > >
> > > > > ---
> > > > >
> > > > > ## Other Directories
> > > > >
> > > > > | Directory | Purpose |
> > > > > |---|---|
> > > > > | `cli/` | CLI tools and scripts (awaiting future phases) |
> > > > > | `.build-log/` | Build session logs |
> > > > >
> > > > > ---
> > > > >
> > > > > ## Quick Reference
> > > > >
> > > > > - Each capability is self-contained under `capabilities/<name>/`
> > > > > - - Each capability has its own `README.md` with installation and usage docs
> > > > >   - - MCP servers live under `mcp-servers/` as deployable units
> > > > >     - - Templates provide scaffolds for new capabilities, skills, and MCP servers
> > > > >       - - Documentation in `docs/` covers development guides and architecture
> > > > >         - - To install a plugin capability: symlink or copy its folder to `~/.claude/plugins/<name>/`
> > > > >           - - Standalone apps (e.g., Gauntlet) have their own install instructions in their README
> > > > >            
> > > > >             - ---
> > > > >
> > > > > ## Change Log
> > > > >
> > > > > | Date | Phase | Changes |
> > > > > |---|---|---|
> > > > > | 2026-03-31 | Phase 2 | Initial registry — 10 capabilities, 9 MCP servers |
> > > > > | 2026-04-04 | Phase 5 | Added browser-persistence, updated skill count (9→13), added docs and templates sections |
