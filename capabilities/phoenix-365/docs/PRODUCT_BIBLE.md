# Product Bible — phoenix-365
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Purpose

Phoenix 365 is the Microsoft 365 integration layer for the Phoenix Electric AI system. It is Echo's Microsoft arm — a unified MCP server, Claude Code plugin, and skill set that connects the Phoenix AI fleet to Microsoft Graph API, SharePoint, Outlook, OneDrive, and the full M365 ecosystem. Serves Phoenix Electric LLC internal operations: email automation, calendar management, SharePoint document management, and OneDrive file access, all mediated through Azure Entra app registrations with secrets resolved exclusively from Azure Key Vault.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | — |
| Language | TypeScript | ^5.4.0 |
| Framework | Model Context Protocol SDK | ^1.0.0 |
| Graph Client | Microsoft Graph Client | ^3.0.0 |
| Auth | Azure Identity (client credentials) | ^4.0.0 |
| Secrets | Azure Key Vault Secrets SDK | ^4.8.0 |
| Build | tsc (TypeScript compiler) | ^5.4.0 |
| Dev Runner | tsx | ^4.0.0 |
| Package Manager | npm workspaces | — |
| CI/CD | NEEDS SHANE INPUT |  |
| Deploy Target | Local stdio (MCP server over stdio transport) | — |

## Architecture

The repo is a monorepo with two npm workspaces plus a Claude Code plugin directory. The MCP server package exposes 20 Graph API tools across 5 domains over stdio transport. The shared package handles Key Vault credential resolution and M365 type definitions. The plugin directory provides Claude Code slash commands, subagents, and skills that wrap the MCP server tools.

All credential values are resolved at runtime from Azure Key Vault via `DefaultAzureCredential`. The vault URI is injected through an environment variable at process start. Auth to Graph API uses the OAuth 2.0 client credentials grant (app-only, no user context) — appropriate for service/daemon scenarios.

Four separate Entra app registrations are in use, each with its own Key Vault secret group:

| App | Role |
|-----|------|
| Phoenix Echo Gateway | Primary Graph API access |
| SharePoint Director | SharePoint site/list/document operations |
| Phoenix Mail Courier | Automated mail via Azure Automation |
| Phoenix Command App | CLI/API command interface |

```
phoenix-365/
├── packages/
│   ├── mcp-server/
│   │   └── src/
│   │       ├── index.ts          # MCP server entry point — tool registration + stdio transport
│   │       ├── auth.ts           # Token acquisition via client credentials grant
│   │       ├── graph-client.ts   # Graph client factory (Gateway + SharePoint clients)
│   │       └── tools/
│   │           ├── mail.ts       # 4 mail tools: list, get, send, list-folders
│   │           ├── calendar.ts   # 3 calendar tools: list-events, create-event, list-calendars
│   │           ├── sharepoint.ts # 5 SharePoint tools: list-sites, get-site, list-lists, get-items, create-item
│   │           ├── onedrive.ts   # 4 OneDrive tools: list-items, get-item, search, download
│   │           └── users.ts      # 4 user tools: list, get, get-me, (1 additional)
│   └── shared/
│       └── src/
│           ├── index.ts          # Package exports
│           ├── keyvault.ts       # Key Vault secret resolution (DefaultAzureCredential)
│           └── types.ts          # 6 M365 type interfaces
├── plugin/
│   ├── plugin.json               # Claude Code plugin manifest
│   ├── agents/
│   │   ├── m365-operations.md    # General M365 operations subagent
│   │   └── sharepoint-analyst.md # SharePoint-specific subagent
│   ├── commands/
│   │   ├── 365.md                # /365 slash command
│   │   ├── mail.md               # /mail slash command
│   │   ├── calendar.md           # /calendar slash command
│   │   └── sharepoint.md         # /sharepoint slash command
│   ├── hooks/
│   │   └── session-start.sh      # Session init hook
│   └── skills/
│       ├── email-composer.md     # Email composition skill
│       ├── graph-operations.md   # Graph API operations skill
│       └── sharepoint-data.md    # SharePoint data retrieval skill
├── docs/
│   └── CREDENTIAL_MAP.md         # Secret name inventory — SENSITIVE, review before sharing
├── references/
│   ├── README.md                 # References index
│   └── STEPHANIE_APP_SPEC.md     # Stephanie permissions app specification
├── package.json                  # Monorepo root — npm workspaces
└── tsconfig.json                 # Root TypeScript config
```

## Auth & Security

Authentication model: OAuth 2.0 client credentials grant (OIDC-compatible, app-only). No user sign-in required. Four separate Entra app registrations, each scoped to its own permissions set. Secrets are resolved exclusively from Azure Key Vault at runtime — no values are stored in the repository.

**Security notes:**
- `docs/CREDENTIAL_MAP.md` contains the secret name inventory for all four Entra apps. It exists in the repo and must be reviewed before any external sharing or public access. It does not contain secret values but does contain secret names. Shane should review and decide whether this file should be gitignored or moved to a private location.
- `references/STEPHANIE_APP_SPEC.md` contains the Stephanie permissions app specification — review for sensitivity before sharing externally.
- No `.env` files in the repo. Runtime config is injected via environment variables pointing to the vault.
- Build output (`dist/`) is not tracked in git. Repo must be built before use.

## Integrations

| Integration | Purpose |
|-------------|---------|
| Microsoft Graph API | Mail, calendar, SharePoint, OneDrive, users — all M365 operations |
| Azure Entra ID | App registration and OAuth 2.0 client credentials auth |
| Azure Key Vault | Runtime secret resolution for all four Entra app registrations |
| SharePoint Online | Site/list/document management for Phoenix Electric |
| Outlook / Exchange | Automated email operations via Phoenix Mail Courier |
| OneDrive | File access and management |
| Claude Code (MCP) | Slash commands and subagents consume MCP server tools over stdio |

## File Structure

| Path | Purpose |
|------|---------|
| `packages/mcp-server/src/index.ts` | MCP server entry point — registers all 20 tools, starts stdio transport |
| `packages/mcp-server/src/auth.ts` | Token acquisition — `getTokenForGraph()` via ClientSecretCredential |
| `packages/mcp-server/src/graph-client.ts` | Graph client factory — produces typed clients per app registration |
| `packages/mcp-server/src/tools/mail.ts` | 4 Outlook mail tools |
| `packages/mcp-server/src/tools/calendar.ts` | 3 calendar tools |
| `packages/mcp-server/src/tools/sharepoint.ts` | 5 SharePoint tools |
| `packages/mcp-server/src/tools/onedrive.ts` | 4 OneDrive tools |
| `packages/mcp-server/src/tools/users.ts` | 4 Azure AD user tools |
| `packages/shared/src/keyvault.ts` | Key Vault secret resolution — `getGatewaySecrets()`, etc. |
| `packages/shared/src/types.ts` | 6 shared M365 type interfaces |
| `plugin/plugin.json` | Claude Code plugin manifest |
| `plugin/commands/` | Slash commands: /365, /mail, /calendar, /sharepoint |
| `plugin/agents/` | Subagents: m365-operations, sharepoint-analyst |
| `plugin/skills/` | Skills: email-composer, graph-operations, sharepoint-data |
| `docs/CREDENTIAL_MAP.md` | Secret name inventory — SENSITIVE, do not share externally without Shane review |
| `references/STEPHANIE_APP_SPEC.md` | Stephanie permissions app spec |

## Current State

- **Status:** Active — early stage (Foundation phase)
- **Last Commit:** 2026-03-19 — `feat: phoenix-365 foundation + MCP server with 20 Graph API tools` (hash `ca8ab95`)
- **Open PRs:** NEEDS SHANE INPUT (not verifiable from local clone)
- **Open Branches:** 2 — `main` (default), `feature/stephanie-permissions` (remote only — not checked out locally, state unknown)
- **Known Issues:**
  - Only 1 commit — no iteration history. Local changes must be committed promptly to avoid loss.
  - `feature/stephanie-permissions` exists remotely but has not been reviewed or merged. Unknown what it contains.
  - `docs/CREDENTIAL_MAP.md` contains secret names — needs Shane review before any external sharing.
  - Build output (`dist/`) not tracked. Repo requires `npm run build` before the MCP server can run.
  - Founding commit author is `Search Agent <search@example.com>` — attribution anomaly, not Shane. Cosmetic but notable.
  - No CI pipeline configured. No status checks on PRs.

## Branding & UI

N/A — backend MCP server and plugin only. No UI layer.

## Action Log

| Commit | Date | Description |
|--------|------|-------------|
| `ca8ab95` | 2026-03-19 | feat: phoenix-365 foundation + MCP server with 20 Graph API tools |

## Key Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-19 | Foundation commit — monorepo structure, 20 Graph API tools, Claude Code plugin, Key Vault integration |
| NEEDS SHANE INPUT | Stephanie permissions feature complete (`feature/stephanie-permissions` merged) |
| NEEDS SHANE INPUT | First production deployment — MCP server live for Echo |
| NEEDS SHANE INPUT | CI/CD pipeline configured |
