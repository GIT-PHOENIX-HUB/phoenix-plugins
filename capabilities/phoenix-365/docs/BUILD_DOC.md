# Build Doc — phoenix-365
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Objectives

1. Review and merge `feature/stephanie-permissions` — understand what it adds, validate it against the Stephanie app spec, merge or close with decision logged.
2. Establish a build and run process — `npm run build` must produce a working `dist/` before the MCP server can be used by Echo. Document the exact startup sequence.
3. Configure the MCP server as a registered tool in Echo's Claude Code environment (`.claude.json`).
4. Add CI status checks — at minimum a build-passes check on PRs so broken TypeScript is caught before merge.
5. Audit `docs/CREDENTIAL_MAP.md` — Shane reviews, determines whether it should be gitignored, moved to a private doc, or retained with its current access controls.

## End State

A fully operational Microsoft 365 MCP server that Echo can invoke on any session to read/write Outlook mail, manage calendar events, interact with SharePoint sites and lists, access OneDrive files, and query Azure AD users. The server resolves all credentials from Key Vault at runtime, requires no secrets in the repository, and is registered in Echo's active MCP configuration. Feature branches are reviewed and merged promptly. A CI pipeline validates builds on every PR.

## Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type safety for Graph API response shapes; consistent with Phoenix AI fleet |
| MCP transport | stdio | Standard for Claude Code plugin MCP servers; lowest friction for local use |
| Auth model | OAuth 2.0 client credentials (OIDC) | App-only access; no user sign-in required for automation |
| Secret management | Azure Key Vault via DefaultAzureCredential | All secrets out of the repo; managed identity compatible |
| Package structure | npm workspaces (monorepo) | mcp-server and shared packages stay co-located, easy to extend |
| CI/CD | NEEDS SHANE INPUT | GitHub Actions is the natural choice given the org; needs Shane to decide on runner (hosted vs. self-hosted) |

## Architecture Targets

- **Stephanie permissions layer:** The `feature/stephanie-permissions` branch likely adds per-user or role-scoped access controls to Graph API operations. Once reviewed and merged, this becomes part of the core auth flow.
- **Multi-app client routing:** Currently two Graph clients exist (Gateway + SharePoint Director). As Mail Courier and Command App tools are added, the graph-client factory should route tool calls to the correct Entra registration automatically.
- **Shared package expansion:** `packages/shared` currently holds Key Vault resolution and types. As more packages are added (e.g., a testing harness or a CLI), shared utilities should grow here — not be duplicated.
- **Build artifact tracking:** `dist/` is gitignored. A CI job or a local build step must be run before first use. Document this in README and consider a `postinstall` script.
- **Plugin registration:** `plugin/plugin.json` is the Claude Code plugin manifest. It must be referenced in the active MCP config file (`~/.claude.json`) for Echo to use the slash commands and subagents.

## Success Criteria

- [ ] `npm run build` succeeds from repo root with zero TypeScript errors
- [ ] MCP server starts and responds to tool list requests over stdio
- [ ] At least one round-trip call to Graph API (e.g., `users_get_me`) returns a real result in Echo's session
- [ ] `feature/stephanie-permissions` reviewed — merged or closed with decision logged
- [ ] `docs/CREDENTIAL_MAP.md` reviewed by Shane — disposition decision recorded
- [ ] CI check configured — PRs must pass build before merge
- [ ] Plugin registered in Echo's active Claude Code MCP config

## Dependencies & Blockers

| Dependency | Status | Owner |
|-----------|--------|-------|
| Azure Key Vault — vault URI set in runtime environment | Assumed configured (vault exists per audit) | Shane |
| Entra app registrations — all 4 apps registered with correct Graph permissions | Assumed done (secret names documented in CREDENTIAL_MAP.md) | Shane |
| `feature/stephanie-permissions` branch review | Pending — branch is remote-only, not reviewed | Shane / Echo |
| CI/CD runner decision | Not started | Shane |
| `docs/CREDENTIAL_MAP.md` disposition | Pending Shane review | Shane |
| npm build output (`dist/`) | Not tracked — must be generated locally | Echo |

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

- **CI/CD:** What runner should the GitHub Actions pipeline use — GitHub-hosted (ubuntu-latest) or a self-hosted runner on the Studio or VPS? What checks are required (build only, or also lint and type-check)?
- **`feature/stephanie-permissions`:** Should Echo pull this branch and review it, or will Shane review it directly? Does it need a gate before merge?
- **`docs/CREDENTIAL_MAP.md`:** Should this file be gitignored and removed from version control, kept as-is, or moved to a private document store? It does not contain secret values but does enumerate secret names.
- **MCP server deployment:** Will this run only on the MacBook, or also on the Studio and VPS? If VPS/Studio, how is Key Vault access granted (managed identity, workload identity, or environment variable injection)?
- **Scope expansion:** Are there additional Graph API domains to add beyond the current 5 (mail, calendar, SharePoint, OneDrive, users)? Teams? Planner? NEEDS SHANE INPUT.
