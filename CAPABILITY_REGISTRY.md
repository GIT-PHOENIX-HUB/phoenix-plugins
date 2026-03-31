# Phoenix Toolbox — Capability Registry

> Master index of all capabilities, MCP servers, and tools in this repository.
> Single source of truth for what's available and where to find it.

**Last updated:** 2026-03-31
**Maintainer:** Phoenix Echo

---

## Capabilities

| Capability | Path | Commands | Skills | Agents | Hooks | Status |
|-----------|------|----------|--------|--------|-------|--------|
| Echo Persistence | `capabilities/echo-persistence/` | 7 | 1 | 5 | 3 | Active — Core System |
| Electrical Guru | `capabilities/electrical-guru/` | 1 | 1 | 0 | 0 | Active |
| File Steward | `capabilities/file-steward/` | 3 | 0 | 1 | 0 | Active |
| Phoenix Comms | `capabilities/phoenix-comms/` | 5 | 0 | 0 | 3 | Active |
| Phoenix Knowledge | `capabilities/phoenix-knowledge/` | 1 | 1 | 1 | 0 | Active |
| Rexel | `capabilities/rexel/` | 4 | 1 | 1 | 0 | Active |
| Service Fusion | `capabilities/servicefusion/` | 6 | 1 | 1 | 0 | Active |
| Volt Marketing | `capabilities/volt-marketing/` | 1 | 1 | 0 | 0 | Active |
| Gauntlet | `capabilities/gauntlet/` | 0 | 0 | 0 | 0 | Active — Standalone App |

**Totals:** 9 capabilities, 28 commands, 6 skills, 9 agents, 6 hooks

---

## MCP Servers

| Server | Path | Tools | Transport | Status |
|--------|------|-------|-----------|--------|
| Builder MCP | `mcp-servers/builder-mcp/` | 20+ | HTTP (Azure Functions) | Active — Multi-module platform |
| M365 MCP | `mcp-servers/m365-mcp/` | 18 | stdio | Active — TypeScript |
| Marketing Orchestrator | `mcp-servers/marketing-mcp/marketing-orchestrator/` | 6 | — | Proposal (design doc only) |
| CallRail MCP | `mcp-servers/marketing-mcp/mcp-callrail/` | 5 | — | Research Complete (spec only) |
| GBP MCP | `mcp-servers/marketing-mcp/mcp-gbp/` | 5+ | — | Research Complete (spec only) |
| Google Ads MCP | `mcp-servers/marketing-mcp/mcp-google-ads/` | — | — | Placeholder |
| Nextdoor Adapter | `mcp-servers/marketing-mcp/nextdoor-adapter/` | — | — | Placeholder |
| Weather Trigger | `mcp-servers/marketing-mcp/weather-trigger/` | — | — | Placeholder |
| Volt Marketing MCP | `capabilities/volt-marketing/mcp-server/` | 8 | stdio | Active — In capability dir |

**Totals:** 9 MCP server entries (3 active, 2 spec'd, 1 proposal, 3 placeholders)

---

## Other Directories

| Directory | Purpose |
|-----------|---------|
| `cli/` | CLI tools and scripts (empty — awaiting Phase 5) |
| `templates/` | Scaffold templates for new capabilities (empty — awaiting Phase 5) |
| `docs/` | Cross-cutting documentation (empty — awaiting Phase 5) |
| `.build-log/` | Build session logs |

---

## Quick Reference

- Each capability is self-contained under `capabilities/<name>/`
- Each capability has its own `README.md` with installation and usage docs
- MCP servers live under `mcp-servers/` as deployable units
- To install a capability: symlink or copy its folder to `~/.claude/plugins/<name>/`
