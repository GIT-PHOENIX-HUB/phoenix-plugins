# Build Doc — phoenix-gauntlet
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Objectives
1. Bring Gauntlet to a deployable, maintainable state — address the stale `.env.example` IP, open Copilot PR, and stale unmerged branches.
2. Add CLAUDE.md at repo root to establish agent governance and operational context for any AI agent entering this codebase.
3. Evaluate and resolve the Phoenix Echo Gateway connection — the hybrid agent relies on a live Gateway endpoint that has moved; ensure the config path, URL, and auth header approach is documented and current.
4. Resolve or close the `copilot/qa-code-review-checks` PR and the unmerged `codex/repeatable-swarm-template-2026-03-07` branch.
5. Add CI — at minimum a GitHub Actions workflow that runs `node --test 'server/test/*.test.js'` on every PR to prevent regressions.

## End State
Gauntlet is "ready to run" from a clean clone: `.env.example` is accurate, all dependencies install cleanly, `npm run dev` boots without errors, the four agent terminals launch, the live LEDGER feed streams, and the command bar routes correctly. The repo has a CLAUDE.md, passing CI, and no unresolved governance gaps. The `node-pty` native dependency rebuild path is documented. The repeatable swarm kit in `docs/` is either promoted to its own repo or explicitly owned here.

## Stack Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Terminal emulator | xterm.js (^5.3.0) | Industry standard browser terminal; supports fit and web-links addons |
| PTY layer | node-pty (^1.0.0) | Only Node library that spawns real pseudo-terminals for interactive CLIs |
| WebSocket library | ws (^8.16.0) | Lightweight, no magic — aligns with server-side simplicity |
| Frontend build | Create React App (react-scripts 5.0.1) | Chosen at build time; locked in unless ejected or migrated to Vite |
| Test runner | Node built-in | Zero dependency; adequate for server-side unit tests |
| File watcher | chokidar | Battle-tested cross-platform watcher; handles LEDGER streaming reliably |
| Auth model | Single bearer token (GAUNTLET_TOKEN) | Single-operator product — full RBAC would be overengineering for V1 |

## Architecture Targets
- **CLAUDE.md at root:** Add a repo-level CLAUDE.md so any agent entering the codebase understands the product, the agent configs, the ledger paths, and the security constraints.
- **CI pipeline:** Add `.github/workflows/test.yml` — run server tests on every PR push. Gate merges on passing tests.
- **`.env.example` accuracy:** Update `PHOENIX_ECHO_URL` comment and default to reflect the current Gateway location. Remove the stale IP address.
- **node-pty rebuild docs:** Add a note in README (or CLAUDE.md) about `npm rebuild node-pty` after Node/OS upgrades — this is a recurring ops pain point.
- **Phoenix Echo hybrid polling:** The current polling interval for Gateway responses is 2 seconds (`setInterval(..., 2000)`). If the Gateway moves to a push/SSE model, this should be replaced with a streaming handler. Track as a future enhancement.
- **Repeatable swarm kit:** Evaluate whether `docs/repeatable-swarm-kit/` should remain here or be extracted to its own repo. If it stays, ensure `docs/repeatable-swarm-kit/05_live_bridge/AGENT_BRIDGE_LEDGER.md` is not a live-updated file being committed to git — use gitignore or a symlink instead.
- **Client build artifact handling:** Decide whether `client/package-lock.json` is intentional. If reproducible installs are required across machines, keep it; otherwise gitignore it.

## Success Criteria
- [ ] `.env.example` references accurate, current Gateway connection details with no stale IPs
- [ ] CLAUDE.md exists at repo root with agent context, security notes, and ledger path guide
- [ ] GitHub Actions CI runs server tests on every PR; all 5 test files pass
- [ ] `copilot/qa-code-review-checks` PR is reviewed and either merged or closed
- [ ] `codex/repeatable-swarm-template-2026-03-07` branch is merged or deleted
- [ ] `npm run dev` starts cleanly from a fresh clone with a valid `.env` — no manual workarounds required
- [ ] `node-pty` rebuild procedure is documented in at least one committed file
- [ ] No open governance gaps: CLAUDE.md present, CODEOWNERS present, CI green

## Dependencies & Blockers
| Dependency | Status | Owner |
|-----------|--------|-------|
| Phoenix Echo Gateway running and reachable | Required for hybrid agent panel | Shane / Echo |
| Current Studio Tailscale address known and stable | Required to fix `.env.example` | Shane |
| Copilot PR `copilot/qa-code-review-checks` review | Pending | Shane / Echo |
| Decision on repeatable swarm kit ownership | Pending | Shane |
| Node.js >=18 on target machine | Prerequisite for `--env-file-if-exists` flag | Shane |

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
- **Gateway URL:** What is the current, stable URL and port for the Phoenix Echo Gateway? The `.env.example` fix requires this before it can be committed.
- **Repeatable swarm kit:** Does `docs/repeatable-swarm-kit/` stay in this repo, or does it get its own repo? The live bridge ledger file in `05_live_bridge/` is a concern if it is being updated and committed.
- **Copilot PR:** Review or close `origin/copilot/qa-code-review-checks`. It has been open since the initial build period.
- **CI priority:** Is a GitHub Actions test workflow a GO for this repo now, or does it wait until Gauntlet is reactivated?
- **Gauntlet reactivation timeline:** This repo is currently dormant. When is the next planned active use of the dashboard? That determines urgency of the above fixes.
