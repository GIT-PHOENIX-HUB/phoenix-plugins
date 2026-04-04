# Phoenix Toolbox

**The capability hub for Phoenix Electric's AI system.**

Built by Shane Warehime, Phoenix Echo (CLI), and BBB (Browser) for the Phoenix AI platform — a persistent, multi-agent system powering electrical contracting operations in Denver Metro, Colorado.

---

## What This Repo Is

Phoenix Toolbox is the central repository for every custom-built capability, MCP server, skill, agent, and CLI tool in the Phoenix ecosystem. Each capability is self-contained, documented, and installable independently.

This repo follows a **capability-first architecture**: every functional unit lives under `capabilities/<name>/` with its own README, commands, skills, agents, hooks, and configuration. MCP servers that serve multiple capabilities live under `mcp-servers/`. Templates and development guides live under `templates/` and `docs/`.

---

## Capability Inventory

11 capabilities. 32 commands. 13 skills. 11 agents. 7 hook definitions.

| Capability | Path | Commands | Skills | Agents | Hooks | Status |
|---|---|---|---|---|---|---|
| **Echo Persistence** | `capabilities/echo-persistence/` | 7 | 1 | 5 | 3 | Active — Core System |
| **Service Fusion** | `capabilities/servicefusion/` | 6 | 1 | 1 | 0 | Active |
| **Phoenix Comms** | `capabilities/phoenix-comms/` | 5 | 0 | 0 | 3 | Active |
| **Rexel** | `capabilities/rexel/` | 4 | 1 | 1 | 0 | Active |
| **Phoenix 365** | `capabilities/phoenix-365/` | 4 | 3 | 2 | 1 | Active |
| **File Steward** | `capabilities/file-steward/` | 3 | 0 | 1 | 0 | Active |
| **Electrical Guru** | `capabilities/electrical-guru/` | 1 | 1 | 0 | 0 | Active |
| **Phoenix Knowledge** | `capabilities/phoenix-knowledge/` | 1 | 1 | 1 | 0 | Active |
| **Volt Marketing** | `capabilities/volt-marketing/` | 1 | 1 | 0 | 0 | Active |
| **Gauntlet** | `capabilities/gauntlet/` | — | — | — | — | Active — Standalone App |
| **Browser Persistence** | `capabilities/browser-persistence/` | — | 4 | — | — | Active — Doc-based |

See [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) for the full registry with detailed component counts and installation instructions.

---

## MCP Server Inventory

9 MCP server entries across 3 top-level groups plus 1 in-capability server.

| Server | Path | Tools | Transport | Status |
|---|---|---|---|---|
| **Builder MCP** | `mcp-servers/builder-mcp/` | 20+ | HTTP (Azure Functions) | Active |
| **M365 MCP** | `mcp-servers/m365-mcp/` | 18 | stdio (TypeScript) | Active |
| **Marketing Orchestrator** | `mcp-servers/marketing-mcp/marketing-orchestrator/` | 6 | — | Proposal |
| **CallRail MCP** | `mcp-servers/marketing-mcp/mcp-callrail/` | 5 | — | Spec Only |
| **GBP MCP** | `mcp-servers/marketing-mcp/mcp-gbp/` | 5+ | — | Spec Only |
| **Google Ads MCP** | `mcp-servers/marketing-mcp/mcp-google-ads/` | — | — | Placeholder |
| **Nextdoor Adapter** | `mcp-servers/marketing-mcp/nextdoor-adapter/` | — | — | Placeholder |
| **Weather Trigger** | `mcp-servers/marketing-mcp/weather-trigger/` | — | — | Spec Only |
| **Volt Marketing MCP** | `capabilities/volt-marketing/mcp-server/` | 8 | stdio | Active |

---

## Directory Structure

```
phoenix-toolbox/
├── capabilities/              # All capabilities (11 total)
│   ├── echo-persistence/      # Identity, logging, session survival
│   ├── electrical-guru/       # NEC 2023 code consultant
│   ├── file-steward/          # File management and triage
│   ├── phoenix-comms/         # Cross-agent heartbeat protocol
│   ├── phoenix-knowledge/     # Phoenix Electric knowledge base
│   ├── rexel/                 # Vendor pricing and purchase history
│   ├── servicefusion/         # CRM operational control
│   ├── volt-marketing/        # Marketing strategist + MCP server
│   ├── gauntlet/              # Multi-agent terminal dashboard (standalone)
│   ├── phoenix-365/           # Microsoft 365 integration
│   └── browser-persistence/   # Browser session persistence (doc-based)
├── mcp-servers/               # Shared MCP servers
│   ├── builder-mcp/           # Multi-module Azure Functions platform
│   ├── m365-mcp/              # Microsoft Graph API (TypeScript/stdio)
│   └── marketing-mcp/         # Marketing MCP server suite
├── cli/                       # CLI tools and scripts
├── docs/                      # Development guides and architecture docs
├── templates/                 # Scaffold templates for new capabilities
├── .build-log/                # Build session logs
├── CAPABILITY_REGISTRY.md     # Master index of all capabilities
├── BUILD_DOC.md               # Build roadmap (historical)
├── PRODUCT_BIBLE.md           # Product spec (historical)
├── CODEOWNERS                 # Ownership rules
└── README.md                  # This file
```

---

## For Agents

If you are Echo, Codex, BBB, or any future agent reading this:

**This repo is your toolbox.** Every custom capability Phoenix Electric has built lives here. Before using or modifying anything, read the README in that capability's folder.

**How to use a capability:**
1. Read `capabilities/<name>/README.md` for what it does and how it works
2. 2. Check `CAPABILITY_REGISTRY.md` for the full inventory and component counts
   3. 3. Install by symlinking: `ln -s /path/to/capabilities/<name> ~/.claude/plugins/<name>`
      4. 4. If the capability has an MCP server dependency, install that separately from `mcp-servers/`
        
         5. **How to build a new capability:**
         6. 1. Copy the scaffold from `templates/capability-template/`
            2. 2. Read `docs/PLUGIN_DEVELOPMENT_GUIDE.md` for the full development guide
               3. 3. Register it in `CAPABILITY_REGISTRY.md` when complete
                 
                  4. **Rules:**
                  5. - Do not delete files. Archive or overwrite. Golden Rule #1.
                     - - Quality = Taj Mahal. No shortcuts.
                       - - Update `CAPABILITY_REGISTRY.md` when you add or modify capabilities.
                         - - No hardcoded paths without configurable fallbacks.
                           - - No credentials in code — use Azure Key Vault.
                            
                             - ---

                             ## For Humans

                             **Shane Warehime** — Owner, Phoenix Electric LLC
                             **Stephanie** — Contributor access

                             This is a public repo. Nothing sensitive lives here — all credentials are managed through Azure Key Vault, never stored in code.

                             ---

                             ## Architecture Notes

                             **Capability-first structure:** Each capability under `capabilities/` is a self-contained unit with its own commands, skills, agents, hooks, and documentation. No shared state between capabilities except through MCP servers.

                             **MCP servers:** Shared services that capabilities depend on. `builder-mcp` runs as Azure Functions (HTTP transport). `m365-mcp` runs locally as a TypeScript stdio server. `marketing-mcp` contains both active and spec-only servers.

                             **Gateway integration:** The V3 Gateway (PHOENIX_UNIFIED_STAGING) uses vanilla JavaScript only — no React or frameworks in Gateway runtime per the Product Bible. Capabilities that integrate with the Gateway provide vanilla JS adapter modules.

                             **Security model:** All credentials stored in Azure Key Vault (PhoenixAiVault). MCP server configs use environment variable fallbacks. No API keys, tokens, or secrets in any file in this repo.

                             **Agent workflow:** Echo (CLI on Mac Pro) executes builds and operations. BBB (Browser on Mac Studio) architects, documents, and reviews. Codex reviews from outside the build flow. Shane orchestrates.

                             ---

                             ## Key References

                             | Document | Description |
                             |---|---|
                             | [CAPABILITY_REGISTRY.md](CAPABILITY_REGISTRY.md) | Master index of all capabilities and MCP servers |
                             | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system architecture |
                             | [docs/PLUGIN_DEVELOPMENT_GUIDE.md](docs/PLUGIN_DEVELOPMENT_GUIDE.md) | How to build a new capability |
                             | [docs/MCP_DEVELOPMENT_GUIDE.md](docs/MCP_DEVELOPMENT_GUIDE.md) | How to build an MCP server |
                             | [docs/SKILL_AUTHORING_GUIDE.md](docs/SKILL_AUTHORING_GUIDE.md) | How to author skills |

                             ---

                             *Phoenix Electric LLC — Denver Metro, Colorado*
                             *Built by Shane Warehime, Phoenix Echo, and BBB (Browser Blitz Builder)*
                             *Last updated: 2026-04-04 (Phase 5)*
