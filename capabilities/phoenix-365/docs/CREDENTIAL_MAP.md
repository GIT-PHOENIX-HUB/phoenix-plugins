# Phoenix 365 — Credential Map

**Vault:** `phoenixaaivault` (`https://phoenixaaivault.vault.azure.net/`)
**Verified against Azure:** 2026-03-19 by Phoenix Echo (az keyvault secret list)

> **WARNING:** This file contains SECRET NAMES only. Never commit values.
> Actual credentials live in Azure Key Vault. Local dev uses env vars.

---

## Authentication Stack

Shane's M365 auth is enterprise-grade — 3 tiers, strongest first:

1. **Managed Identity** — Azure-hosted services authenticate without ANY credentials
2. **Federated Credentials (OIDC)** — 5 GitHub Actions federated creds, no secrets stored
3. **Client Secret** — fallback for non-Azure hosts only (MacBook calling Graph directly)

---

## App Registrations — 6 Entra Apps (verified via `az ad app list`)

Each app is its own Entra registration with scoped permissions. NO cross-app fallbacks.

| App | AppId | Created | Purpose |
|-----|-------|---------|---------|
| Phoenix_Ai_Command | `248f9e52-...` | 2025-09-20 | CLI/API — the original |
| Phoenix_Chatgpt_SSO | `aaa6efa1-...` | 2025-10-21 | ChatGPT SSO integration |
| PHOENIX-ECHO-GATEWAY | `5cf388f1-...` | 2025-10-26 | Full Graph — admin/AI orchestration |
| Phoenix SharePoint Director | `5bd08dc5-...` | 2025-12-19 | SharePoint operations |
| Phoenix-AI-Test-2025-12-31 | `8bbcbf81-...` | 2026-01-01 | Test app |
| Phoenix-ECHO-BOT | `ad4c0365-...` | 2026-02-05 | Telegram bot |

### 1. Phoenix Echo Gateway (PRIMARY — NEW)
- **Tenant:** phoenixelectric.life
- **Purpose:** OAuth 2.0 auth, OIDC federation, Graph API, full M365 management
- **Permissions:** Teams, Exchange/Outlook, SharePoint/OneDrive, calendars, tasks, contacts, DevOps, and more
- **Registration details:** `~/Documents/CREDS AI STAY OUT/Note.md`

| Vault Secret Name | Purpose |
|-------------------|---------|
| `Phoenix-Echo-ClientID` | Gateway app client ID |
| `Phoenix-Echo-ClientSecret-` | Gateway app client secret |
| `AZURE-TENANT-ID` | Shared tenant ID |
| `AZURE-OIDC-CLIENT-ID` | OIDC client ID for GitHub Actions |
| `AZURE-SUBSCRIPTION-ID` | Azure subscription ID |

**Federated Credentials (GitHub OIDC):**

| Name | Repo | Scope |
|------|------|-------|
| `gh-oidc-phoenix-builder-repo-wildcard` | phoenix-builder-space-knowledge | All branches |
| `gh-oidc-phoenix-builder-staging` | phoenix-builder-space-knowledge | staging |
| `gh-oidc-phoenix-builder-dev` | Phoenix-Echo-Gateway | dev |
| `gh-oidc-phoenix-builder-main` | phoenix-builder-space-knowledge | main |

---

### 2. SharePoint Director
- **Purpose:** SharePoint site/list/document management

| Vault Secret Name | Purpose |
|-------------------|---------|
| `SharePoint-Director-ClientId` | SP Director client ID |
| `SharePoint-Director-ClientSecret` | SP Director client secret |
| `SharePoint-Director-TenantId` | SP Director tenant ID |
| `SharePoint-Director-SecretExpires` | Secret expiration date |
| `SharePoint-Director-SecurityGroup` | Security group reference |

**Note:** `GRAPH-TEST-*` secrets are DUPLICATES of SharePoint Director — legacy test copies.

| Duplicate Secret Name | Duplicate Of |
|----------------------|--------------|
| `GRAPH-TEST-CLIENT-ID` | `SharePoint-Director-ClientId` |
| `GRAPH-TEST-CLIENT-SECRET` | `SharePoint-Director-ClientSecret` |
| `GRAPH-TEST-TENANT-ID` | `SharePoint-Director-TenantId` |
| `Phoenix-Graph-Files-Secret` | Related to SP Director file access |

---

### 3. Phoenix Mail Courier
- **Purpose:** Automated email operations via Azure Automation

| Vault Secret Name | Purpose |
|-------------------|---------|
| `PhoenixMailCourierSecret` | Mail Courier app secret |

**Note:** App ID is stored as an Azure Automation variable (`CourierAppId`), not in Key Vault.

---

### 4. Phoenix Command App
- **Purpose:** CLI/API command interface

| Vault Secret Name | Purpose |
|-------------------|---------|
| `PhoenixAiCommandSecret` | Command app secret |

**Note:** Client ID not found in vault — may use env var or Azure Automation variable.

---

## Other Vault Secrets (Non-M365)

### Service Fusion
| Secret Name | Purpose |
|-------------|---------|
| `SERVICEFUSION-CLIENT-ID` | SF API Credentials (Client Credentials Grant) |
| `SERVICEFUSION-SECRET` | SF API secret |
| `SERVICEFUSION-CONNECTED-APP-CLIENT-ID` | SF Connected App (Auth Code Grant) |
| `SERVICEFUSION-CONNECTED-APP-SECRET` | SF Connected App secret |

### Phoenix Infrastructure
| Secret Name | Purpose |
|-------------|---------|
| `PHOENIX-GATEWAY-TOKEN` | Gateway auth token |
| `Phoenix-Echo-Gateway-API` | Gateway API key |
| `Phoenix-Echo-Bot-SECRET-VALUE` | Telegram bot secret |
| `TELEGRAM-BOT-API` | Telegram Bot API token |

### AI API Keys
| Secret Name | Purpose |
|-------------|---------|
| `anthropic-api-key` | Anthropic API key (DO NOT use on VPS — use OAuth) |
| `ANTHROPIC-OAUTH-KEY` | Anthropic OAuth token (USE THIS on VPS) |
| `OpenAi-Whisper` | OpenAI Whisper key |

### GitHub
| Secret Name | Purpose |
|-------------|---------|
| `Codex-Github` | Codex GitHub token |
| `Github-anthropic` | Anthropic GitHub token |
| `Github-Antigravity` | Antigravity GitHub token |
| `GITHUB-CLIENT-ID` | GitHub OAuth client ID |
| `GITHUB-SECRET-ID` | GitHub OAuth secret |

### Azure Cosmos DB
| Secret Name | Purpose |
|-------------|---------|
| `COSMOS-DB-DATABASE` | Database name |
| `COSMOS-DB-ENDPOINT` | Cosmos DB endpoint |
| `COSMOS-DB-PRIMARY-KEY` | Primary access key |

### VPS
| Secret Name | Purpose |
|-------------|---------|
| `VPS-IP` | VPS IP address |
| `VPS-HOST-KEY` | VPS host key |
| `VPS-SSH-KEY` | SSH private key |

### Other
| Secret Name | Purpose |
|-------------|---------|
| `Brave-API` | Brave Search API key |
| `google-api-key` | Google API key |
| `TERM2-API` | iTerm2 API key |
| `WP-ApiPassword` | WordPress API password |
| `WP-ApiUsername` | WordPress API username |
| `WP-AuthorId` | WordPress author ID |
| `WP-HostUrl` | WordPress host URL |

---

## Environment Variable Fallbacks

When `AZURE_KEY_VAULT_URI` is not set:

| Env Var | Vault Secret |
|---------|-------------|
| `PHOENIX_ECHO_CLIENT_ID` | `Phoenix-Echo-ClientID` |
| `PHOENIX_ECHO_CLIENT_SECRET` | `Phoenix-Echo-ClientSecret-` |
| `AZURE_TENANT_ID` | `AZURE-TENANT-ID` |
| `SHAREPOINT_DIRECTOR_CLIENT_ID` | `SharePoint-Director-ClientId` |
| `SHAREPOINT_DIRECTOR_CLIENT_SECRET` | `SharePoint-Director-ClientSecret` |

---

## Source of Truth

- **Azure Key Vault:** `az keyvault secret list --vault-name phoenixaaivault`
- **App registration:** `~/Documents/CREDS AI STAY OUT/Note.md`
- **Entra research:** `_GATEWAY/REPORTS/report__research__entra-agent-id-registration__20260317.md`
- **Legacy keyvault.ts:** `phoenix-ai-core-staging/packages/shared/src/keyvault.ts` (outdated — references phantom `Graph-ClientId`)
