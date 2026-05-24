# Phoenix 365

> Microsoft 365 integration for Phoenix Electric via Microsoft Graph API.

## What It Does

Provides full M365 operational control: email management, calendar operations, SharePoint data access, OneDrive file management, and user directory lookups. Built on the Microsoft Graph API with Azure Entra (AD) client credentials authentication and Azure Key Vault secret management. The MCP server exposes 18 tools; the plugin wraps them with slash commands, skills, and autonomous agents.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 4 | 365, mail, calendar, sharepoint |
| Skills | 3 | email-composer, graph-operations, sharepoint-data |
| Agents | 2 | m365-operations, sharepoint-analyst |
| Hooks | 1 | session-start (connection status check) |

## Commands

| Command | Description |
|---------|-------------|
| `/365` | Hub command -- connection check, sub-command index |
| `/mail` | List, read, send, and search email |
| `/calendar` | View today/week, create, delete, move events |
| `/sharepoint` | Browse sites, lists, items; create and update |

## Skills

| Skill | Triggers On |
|-------|-------------|
| email-composer | "send an email to..." patterns |
| graph-operations | "check my email", "what's on my calendar" |
| sharepoint-data | "look up in SharePoint" patterns |

## Architecture

- **MCP Server:** `mcp-servers/m365-mcp/` (TypeScript, stdio transport, 18 Graph API tools)
- **Shared Package:** `mcp-servers/m365-mcp/shared/` (Key Vault secrets, type interfaces)
- **Auth:** Azure Entra client credentials with dual Graph clients (Gateway + SharePoint Director)
- **Secrets:** Azure Key Vault via `@phoenix-365/shared` with env-var fallbacks

## Installation

Symlink or copy this folder to `~/.claude/plugins/phoenix-365/`

The MCP server must be built separately:
```bash
cd mcp-servers/m365-mcp && npm install && npm run build
```

## Dependencies

- M365 MCP Server (`mcp-servers/m365-mcp/`)
- Azure Key Vault (PhoenixAiVault) with Entra app credentials
- Microsoft Graph API permissions

## Docs

| File | Contents |
|------|----------|
| `docs/CREDENTIAL_MAP.md` | Full Azure Key Vault secret inventory for all 6 Entra apps |
| `docs/STEPHANIE_APP_SPEC.md` | Spec for read-only Entra app (not yet registered) |
| `docs/PRODUCT_BIBLE.md` | Product bible from archived phoenix-365 repo |
| `docs/BUILD_DOC.md` | Build roadmap with open decisions |

## Status

Active
