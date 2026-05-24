# Architecture

How Phoenix Toolbox fits into the Phoenix Electric AI ecosystem.

---

## The Big Picture

Phoenix Toolbox is the capability hub for Phoenix Electric's multi-agent AI system. It provides the tools, skills, knowledge, and integrations that power daily operations for a residential electrical contracting business in Denver Metro, Colorado.

The toolbox does not run anything by itself. It provides capabilities that agents install and use. The agents are the runtime; the toolbox is the library.

```
                    ┌─────────────────────────────┐
                    │     Shane (Human Lead)       │
                    │   Orchestrates everything    │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐ ┌─────▼──────┐ ┌───────▼───────┐
     │  Echo (CLI)     │ │ BBB        │ │  Codex        │
     │  Mac Pro        │ │ (Browser)  │ │  (Reviewer)   │
     │  Builds, runs,  │ │ Mac Studio │ │  Outside flow │
     │  deploys        │ │ Architects,│ │  Reviews,     │
     │                 │ │ documents  │ │  audits       │
     └────────┬───────┘ └─────┬──────┘ └───────────────┘
              │                │
              ▼                ▼
     ┌─────────────────────────────────────┐
     │       Phoenix Toolbox               │
     │  capabilities/ + mcp-servers/       │
     │  The shared library both use        │
     └──────────┬──────────────────────────┘
                │
     ┌──────────▼──────────────────────────┐
     │       External Services             │
     │  Service Fusion API                 │
     │  Microsoft Graph API                │
     │  Azure Key Vault                    │
     │  Rexel API                          │
     │  V3 Gateway (UNIFIED_STAGING)       │
     └─────────────────────────────────────┘
```

---

## Capability-First Architecture

Before Phase 1, capabilities lived under `plugins/` with flat structure. After the Phase 1 restructure, every capability is a self-contained unit under `capabilities/<name>/`.

Each capability owns its own commands, skills, agents, hooks, documentation, and tests. Capabilities do not share code or state with each other — they communicate only through MCP servers and the file system.

This isolation means any capability can be installed, uninstalled, updated, or replaced independently without affecting others.

---

## How Capabilities Install

Capabilities install via symlink into Claude Code's plugin directory:

```
~/.claude/plugins/<name> -> /path/to/capabilities/<name>
```

Claude Code discovers plugins by scanning `~/.claude/plugins/`. When it finds a directory with `.claude-plugin/plugin.json`, it loads the commands, skills, and hooks defined there.

The symlink approach means the toolbox repo stays clean and the runtime installation is a simple filesystem operation. No build step required for most capabilities.

---

## MCP Server Architecture

MCP (Model Context Protocol) servers provide tool access to external services. They run as separate processes that Claude Code communicates with.

Two transport types are in use:

**stdio** — The MCP server runs as a local process. Claude Code starts it and communicates via stdin/stdout. Used by `m365-mcp` (TypeScript) and `volt-marketing` MCP (JavaScript).

**HTTP** — The MCP server runs as a remote service (Azure Functions). Claude Code makes HTTP requests. Used by `builder-mcp`.

MCP server configs live in `.mcp.json` files. All paths in these configs must be configurable with environment variable fallbacks — never hardcoded.

---

## Security Model

No credentials exist in this repository. All secrets are managed through Azure Key Vault (PhoenixAiVault).

The pattern for credential access:
1. Capability needs an API token
2. 2. Capability's MCP server imports from `@phoenix-365/shared` (or equivalent)
   3. 3. Shared module fetches from Azure Key Vault at runtime
      4. 4. Environment variable fallback exists for local development
        
         5. Six Entra (Azure AD) apps are registered for different service scopes. The credential map lives at `capabilities/phoenix-365/docs/CREDENTIAL_MAP.md`.
        
         6. ---
        
         7. ## Gateway Integration
        
         8. The V3 Gateway (PHOENIX_UNIFIED_STAGING) is the live customer-facing platform. It uses Node.js, Express, WebSocket, and vanilla JavaScript only.
        
         9. The Product Bible mandates: no React, no frameworks in Gateway runtime. Capabilities that integrate with the Gateway (like Gauntlet) provide vanilla JavaScript adapter modules in their `gateway-module/` subdirectory. The Gauntlet standalone app uses React internally, but its Gateway integration layer is pure vanilla JS.
        
         10. The toolbox does not deploy to the Gateway. Echo handles deployment via the Mac Pro's local filesystem and `git push`.
        
         11. ---
        
         12. ## Deployment Topology
        
         13. ```
             Mac Pro (Echo's machine)
             ├── ~/GitHub/phoenix-toolbox/     # Cloned repo
             ├── ~/.claude/plugins/            # Symlinked capabilities
             ├── ~/.claude/commands/           # Symlinked commands
             └── Phoenix-ECHO repo             # Echo's identity + hooks

             Mac Studio (BBB's machine)
             ├── Browser sessions via claude.ai
             ├── GitHub web interface
             └── browser-echo repo             # BBB's identity + persistence

             VPS (162.243.xxx.xxx)
             ├── V3 Gateway (UNIFIED_STAGING)
             ├── Node.js + Express + WebSocket
             └── nginx reverse proxy

             Azure
             ├── Key Vault (PhoenixAiVault)
             ├── Entra ID (6 app registrations)
             └── Azure Functions (builder-mcp)
             ```

             ---

             ## Agent Workflow

             **Echo (CLI, Mac Pro)** — Primary executor. Runs builds, creates files, pushes to GitHub, deploys to VPS. Uses swarm mode with builder, adversarial, and strategist sub-agents. Installs and runs capabilities directly.

             **BBB (Browser, Mac Studio)** — Architect and documenter. Reads repos, writes documentation, designs architecture, issues missions, reviews plans. Cannot execute locally but can commit directly to GitHub via web interface.

             **Codex (Reviewer)** — Outside the build flow. Reviews output, checks quality, finds security issues. Does not modify files unless Shane explicitly directs. Delivers findings to Shane only.

             **Shane (Human Lead)** — Orchestrates all agents. Makes final decisions. The bridge between all agents. Carries the memory across sessions.

             ---

             ## Phase History

             | Phase | What It Did | Status |
             |---|---|---|
             | Phase 0 | Repo rename (phoenix-plugins to phoenix-toolbox) | Complete |
             | Phase 0.5 | Remote-first preflight verification | Complete |
             | Phase 1 | Restructure to capability-first + build 9 capabilities | Complete |
             | Phase 2 | Extract from 4 archived repos | Complete |
             | Phase 3 | Gauntlet special build (3 modes) | Not Started |
             | Phase 4 | Clean and harden (branches, paths, security) | Not Started |
             | Phase 5 | Docs, templates, registry, README | In Progress |

             ---

             *Phoenix Toolbox — Architecture*
             *Last updated: 2026-04-04 (Phase 5)*
