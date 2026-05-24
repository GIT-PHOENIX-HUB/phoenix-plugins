# Product Bible — phoenix-gauntlet
**Owner:** GIT-PHOENIX-HUB | **Last Updated:** 2026-03-27

## Purpose
Phoenix AI Gauntlet is a web-based multi-agent command center for Phoenix Electric LLC. It gives Shane a single browser window showing four AI agent terminals simultaneously — Echo Pro (Claude Code), Gemini, Codex, and Phoenix Echo — with a shared command bar for directing any agent or all agents at once, a live LEDGER feed, and a Mission Control status panel. The backend runs on Node.js, spawns real pseudo-terminals for local CLI agents, and connects to the Phoenix Echo Gateway via HTTP for the hybrid agent. Built for a single operator (Shane); not a multi-user product.

## Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=18 (uses --env-file-if-exists flag) |
| Frontend Framework | React | ^18.3.0 |
| Terminal Emulator | xterm.js | ^5.3.0 |
| Backend HTTP | Express | ^4.18.0 |
| WebSocket | ws | ^8.16.0 |
| PTY | node-pty | ^1.0.0 |
| File Watcher | chokidar | ^3.6.0 |
| Build Toolchain | Create React App (react-scripts) | 5.0.1 |
| Test Runner | Node.js built-in test runner | — |
| Dev Tooling | concurrently | ^8.2.0 |
| CI/CD | None configured | — |
| Deploy Target | MacBook (local), LaunchAgent auto-start | — |

## Architecture
The system is split into two processes: a Node.js backend server and a React frontend client. The backend owns all agent state, PTY processes, ledger watching, and WebSocket broadcasting. The frontend is a pure display and input layer — it never talks directly to agents.

**Data flow:**
1. Shane types in the CommandBar (`@echo`, `@all`, etc.)
2. Client sends a `command` WebSocket event to the server
3. Server routes the text to the target PTY process (via node-pty) or to the Phoenix Echo Gateway (via HTTP POST)
4. Agent output streams back through WebSocket `terminal.output` events to TerminalPanel components
5. chokidar watches ledger files on disk; changes emit `ledger.update` events to the frontend
6. Swarm state is parsed from bridge + ops ledger content on every ledger change and broadcast as `swarm.state`

```
phoenix-gauntlet/
├── server/
│   ├── index.js            # Express + WebSocket server, REST API, ledger watcher, audit log
│   ├── agents.js           # Agent spawn configs (4 agents) + ledger path registry
│   ├── supervisor.js       # PTY process manager — spawn, restart, kill, stream
│   ├── ledgers.js          # Ledger registry — file watching, snapshots, tail reads
│   ├── swarm-state.js      # Parses bridge + ops ledger content into swarm state object
│   ├── logger.js           # Structured logger
│   └── test/               # 5 test files (Node built-in test runner)
├── client/
│   ├── src/
│   │   ├── App.jsx                         # Root component, WebSocket client, state
│   │   ├── components/
│   │   │   ├── TerminalPanel.jsx           # xterm.js terminal per agent
│   │   │   ├── CommandBar.jsx              # @agent routing + broadcast input
│   │   │   ├── LedgerPanel.jsx             # Live ledger sidebar feed
│   │   │   └── MissionControl.jsx          # Agent status grid panel
│   │   └── styles/gauntlet.css             # Phoenix brand CSS (red/gold/black)
│   └── public/index.html
├── configs/
│   └── com.phoenix.gauntlet.plist          # macOS LaunchAgent for auto-start
├── scripts/
│   └── gauntlet_control.sh                 # Shell control wrapper
├── docs/
│   ├── ARCHITECTURE.md                     # Full V1 architecture spec
│   └── repeatable-swarm-kit/               # Swarm templates, research, live bridge ledger
│       ├── 01_verified_pattern/
│       ├── 02_templates/
│       ├── 03_scripts/
│       ├── 04_research/
│       └── 05_live_bridge/AGENT_BRIDGE_LEDGER.md
├── .env.example
├── package.json
└── CODEOWNERS
```

## Auth & Security
- **API auth:** Bearer token via `Authorization` header. Token set in `GAUNTLET_TOKEN` env var. Health endpoint (`/health`) is unauthenticated.
- **WebSocket auth:** Token passed as query string parameter on upgrade (`?token=...`). Connections without a valid token are closed immediately (code 4001).
- **Secrets management:** All secrets loaded server-side only from `.env` (gitignored). `.env.example` is the sanitized template.
- **CORS:** Localhost only for V1 (client proxies to server via CRA proxy config).
- **Audit log:** Every command, terminal input, restart, and session start/stop is logged in-memory with actor, target, and timestamp. Accessible at `GET /api/audit`.
- **Known Issues:** A prior credential exposure was remediated in commit `9e4cc5f`. The `.env.example` also references a stale network address for the Gateway connection — see Known Issues below.

## Integrations
| Integration | Type | Purpose |
|------------|------|---------|
| Phoenix Echo Gateway | HTTP API (hybrid agent) | Sends commands to Phoenix Echo; polls `/api/recovery` for replies |
| Claude Code CLI (`claude`) | PTY (local process) | Echo Pro agent terminal |
| Gemini CLI (`gemini`) | PTY (local process) | Gemini agent terminal |
| Codex CLI (`codex`) | PTY (local process) | Codex agent terminal |
| GAUNTLET_SESSION_LEDGER.md | File watch (chokidar) | Session ledger streamed to frontend |
| AGENT_BRIDGE_LEDGER.md | File watch (chokidar) | Bridge ledger — swarm coordination |
| SHARED_OPS_LEDGER.md | File watch (chokidar) | Ops heartbeat ledger — swarm state parsing |

## File Structure
| Path | Purpose |
|------|---------|
| `server/index.js` | Main server entry — Express, WebSocket, REST API, audit log, lifecycle |
| `server/agents.js` | Agent definitions (4 agents) and ledger path config |
| `server/supervisor.js` | PTY process lifecycle — start, stop, restart, stream, resize |
| `server/ledgers.js` | Ledger registry — file watching, snapshots, tail reads |
| `server/swarm-state.js` | Parses ledger content into structured swarm state |
| `server/logger.js` | Structured JSON logger |
| `server/test/*.test.js` | Unit and integration tests (5 files) |
| `client/src/App.jsx` | React root — WebSocket client, global state |
| `client/src/components/TerminalPanel.jsx` | xterm.js terminal component per agent |
| `client/src/components/CommandBar.jsx` | Command input with @agent routing |
| `client/src/components/LedgerPanel.jsx` | Live ledger display |
| `client/src/components/MissionControl.jsx` | Agent status grid |
| `client/src/styles/gauntlet.css` | Phoenix brand design system |
| `configs/com.phoenix.gauntlet.plist` | macOS LaunchAgent (auto-start on login) |
| `scripts/gauntlet_control.sh` | Shell control script |
| `docs/ARCHITECTURE.md` | Architecture reference document |
| `docs/repeatable-swarm-kit/` | Reusable swarm templates, research, and live bridge ledger |
| `.env.example` | Environment variable template (sanitized) |
| `CODEOWNERS` | GitHub CODEOWNERS for governance |

## Current State
- **Status:** Dormant — last commit 2026-03-08, approximately 19 days ago
- **Last Commit:** `ca0583d` — Add CODEOWNERS for Phoenix Electric governance (2026-03-08)
- **Open PRs:** None on main. `origin/copilot/qa-code-review-checks` is an open Copilot PR.
- **Open Branches:** 3 remote branches beyond main — `codex/repeatable-swarm-template-2026-03-07`, `codex/runtime-integration-realism-2026-03-07` (merged), `copilot/qa-code-review-checks`
- **Known Issues:**
  - A prior credential exposure was remediated in commit `9e4cc5f` (token removed from `.env.example`). No action required; noted for audit history.
  - `.env.example` contains a stale Gateway IP address that no longer matches the current Studio Tailscale address. Anyone setting up from `.env.example` must verify and update the `PHOENIX_ECHO_URL` value before use.
  - `node-pty` is a native dependency — requires recompilation (`npm rebuild`) after Node.js version upgrades or OS major version changes.
  - No CLAUDE.md or AGENTS.md at repo root — no agent governance file present.
  - `client/package-lock.json` is committed (57KB+). Consider whether this is intentional for reproducibility or should be gitignored.
  - Copilot PR `copilot/qa-code-review-checks` is open and unreviewed.
  - `codex/repeatable-swarm-template-2026-03-07` branch is unmerged — unclear if still needed.

## Branding & UI
| Element | Value |
|---------|-------|
| Echo Pro color | `#FF1A1A` (Phoenix Red) |
| Gemini color | `#4285F4` (Gemini Blue) |
| Codex color | `#10A37F` (Codex Green) |
| Phoenix Echo color | `#D4AF37` (Phoenix Gold) |
| Background theme | Black with Phoenix brand palette |
| Style source | `client/src/styles/gauntlet.css` |

## Action Log
| Commit | Message |
|--------|---------|
| `ca0583d` | Add CODEOWNERS for Phoenix Electric governance |
| `9e4cc5f` | security: remove live GAUNTLET_TOKEN from .env.example |
| `93930ba` | fix(env): point PHOENIX_ECHO_URL to Studio Tailscale IP — remove VPS default, add connection docs |
| `60c1adb` | feat: add Gauntlet deployment control layer |
| `443c528` | fix: add WS reconnect backoff and commit live bridge ledger |
| `c46de3a` | Merge codex/runtime-integration-realism-2026-03-07: runtime hardening |
| `20e01d8` | fix: remove stale OpenClaw references |
| `06a8823` | fix: harden pty runtime behavior |
| `ce2337d` | test: add websocket and hybrid path integration coverage |
| `4bbc142` | fix: make swarm lane ordering deterministic |

## Key Milestones
| Date | Milestone |
|------|-----------|
| 2026-02-15 | Initial build — Multi-agent command center dashboard |
| 2026-03-07 | Repeatable swarm kit added; runtime hardening via Codex branch |
| 2026-03-08 | Deployment control layer added; GAUNTLET_TOKEN exposure remediated; CODEOWNERS added |
