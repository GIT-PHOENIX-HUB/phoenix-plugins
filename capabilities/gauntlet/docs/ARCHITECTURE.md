# Phoenix AI Gauntlet — V1 Architecture
*Synthesized by: Echo Pro | Sources: Codex (Security/API), Phoenix Echo (Infrastructure), Gemini (pending), Team Discussion*
*Date: 2026-02-15*

---

## What We're Building

A web-based command center where Shane sees all four AI agents working simultaneously. Four terminal panels, one command bar, shared task board, live LEDGER feed. Shane commands — agents hear. Agents work — Shane sees.

**V1 Goal:** Get four live terminals in a browser with a command bar. Ship simple. Harden later.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         BROWSER (Frontend)          │
│  React + xterm.js + WebSocket       │
│                                     │
│  ┌─────────┐ ┌─────────┐           │
│  │ Echo Pro │ │ Gemini  │           │
│  │ xterm.js │ │ xterm.js│           │
│  └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐           │
│  │  Codex  │ │Phx Echo │           │
│  │ xterm.js │ │ xterm.js│           │
│  └─────────┘ └─────────┘           │
│                                     │
│  [ Command Bar ] [ Tasks ] [ LEDGER]│
└──────────────┬──────────────────────┘
               │ WebSocket (wss://)
               │
┌──────────────▼──────────────────────┐
│         NODE.JS BACKEND             │
│         (Shane's Mac)               │
│                                     │
│  ┌──────────────────────────────┐   │
│  │     Process Supervisor       │   │
│  │                              │   │
│  │  node-pty → claude           │   │
│  │  node-pty → gemini           │   │
│  │  node-pty → codex            │   │
│  │  WebSocket → Phoenix Echo*   │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │     Express + WS Server      │   │
│  │  REST API (control plane)    │   │
│  │  WebSocket (terminal streams)│   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │     LEDGER Integration       │   │
│  │  File watcher on LEDGER.md   │   │
│  │  Streams changes to frontend │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

*Phoenix Echo connects via WebSocket from VPS
 (or SSH tunnel for V1)
```

---

## V1 Deployment

**Backend runs on MacBook. Phoenix Echo connects via VPS Gateway.**

### Runtime Topology (V1 Final)

```
MacBook (PTY Host)                    VPS (93.188.161.80)
┌──────────────────────┐              ┌──────────────────────┐
│ Gauntlet Server :3000│──── HTTPS ──▶│ Phoenix Echo Gateway │
│  ├─ node-pty: claude │              │ echo.phoenixelectric │
│  ├─ node-pty: gemini │              │ .life (SSL, nginx)   │
│  ├─ node-pty: codex  │              └──────────────────────┘
│  └─ hybrid: phx-echo │
│                      │              Mac Studio (Secondary)
│ LaunchAgent auto-start│             ┌──────────────────────┐
│ com.phoenix.gauntlet │              │ Browser → MacBook    │
└──────────────────────┘              │ via Tailscale :3000  │
       ▲                              └──────────────────────┘
       │
  MacBook Browser
  http://localhost:3000
```

Why this is right for V1:
- Claude Code, Codex, and Gemini are local CLIs — node-pty spawns them on the MacBook
- Phoenix Echo connects to VPS Gateway at `https://echo.phoenixelectric.life` (SSL, public)
- Shane accesses the dashboard at `http://localhost:3000` on MacBook
- Studio accesses via Tailscale at `http://<macbook-tailscale-ip>:3000`
- LaunchAgent (`com.phoenix.gauntlet`) auto-starts on boot, auto-restarts on crash

### Service Management

```bash
# Install, start, check status
scripts/gauntlet_control.sh install
scripts/gauntlet_control.sh start
scripts/gauntlet_control.sh status
scripts/gauntlet_control.sh logs
```

**V2 upgrade path:** `gauntlet.phoenixelectric.life` via Cloudflare Tunnel → MacBook:3000. VPS already has nginx + Let's Encrypt.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React | Shane's team already uses it (CAPP is React) |
| **Terminal Emulator** | xterm.js | Industry standard browser terminal. Used by VS Code, Theia, CoderPad |
| **WebSocket** | ws (npm) | Lightweight, battle-tested WebSocket server for Node.js |
| **PTY Management** | node-pty | Spawns real pseudo-terminal processes. Full interactive CLI support |
| **Backend** | Express + Node.js | Simple HTTP server + WebSocket upgrade |
| **File Watching** | chokidar | Watches LEDGER.md for changes, streams to frontend |
| **Styling** | Phoenix brand CSS | Red #FF1A1A, Gold #D4AF37, Black #0a0a0a — same as CAPP |

---

## API Contract (from Codex)

### REST Endpoints (Control Plane)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/session/start` | Start all or selected agents |
| POST | `/api/session/stop` | Stop all or selected agents |
| GET | `/api/agents` | Status snapshot of all agents |
| POST | `/api/agents/:id/restart` | Restart one agent |
| POST | `/api/command` | Send command to agent(s) |
| GET | `/api/ledger/tail?lines=50` | Current LEDGER view |

### WebSocket Events (Data Plane)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `terminal.output` | Server → Client | Agent terminal stream chunks |
| `terminal.input` | Client → Server | Keystrokes/commands to agent |
| `agent.status` | Server → Client | Lifecycle state changes |
| `ledger.update` | Server → Client | New LEDGER entries (via file watcher) |

### Command Envelope

```json
{
  "targetAgent": "echo-pro | gemini | codex | phoenix-echo",
  "text": "the command or message",
  "mode": "direct | broadcast",
  "sessionId": "uuid",
  "timestamp": "ISO-8601"
}
```

---

## Security Model (from Codex)

### V1 Minimum

- **Single operator:** Shane only. Simple token-based auth.
- **Per-agent command routing:** Command envelope must include `targetAgent`. Server validates before write.
- **No secrets in frontend.** All API keys, tokens server-side only.
- **Audit log:** Every command logged — actor, timestamp, target agent, command, result.
- **CORS:** Strict — localhost only for V1.
- **Broadcast explicit:** No accidental fan-out. Broadcast requires `mode: "broadcast"`.

### V1 Can Skip (Add in V2)

- Role-based access (observer vs operator)
- CSRF tokens (localhost-only means low risk)
- Redaction middleware (add when we go remote)

---

## Process Management (from Codex)

### Agent Spawn Commands

| Agent | Spawn Command | Notes |
|-------|--------------|-------|
| Echo Pro | `claude` | Uses existing settings.json permissions |
| Gemini | `gemini --approval-mode=auto_edit` | Auto-approves file edits |
| Codex | `codex --full-auto` | Workspace write, pauses on request |
| Phoenix Echo | Gateway API connection | Connects to Phoenix Echo Gateway (localhost:18790 or VPS) |

### Supervisor Behavior

- **Registry:** `agentId → {pty, status, lastHeartbeat, cwd, sessionId}`
- **Health:** Monitor PTY exit + idle timers
- **Restart:** Bounded exponential backoff (max 3 retries)
- **Crash isolation:** One agent crashes → only that panel degrades. Others stay live.
- **Status events:** `running`, `restarting`, `down`, `idle` pushed to frontend

---

## Infrastructure (from Phoenix Echo)

### What Already Exists

- **VPS:** 93.188.161.80 (phoenix-echo) — echo.phoenixelectric.life
- **Domain:** echo.phoenixelectric.life with Let's Encrypt SSL (auto-renewing)
- **nginx:** Running, WebSocket proxy capable
- **Phoenix Echo Gateway:** Port 18790, running on VPS + Mac Studio
- **Available port:** 18800 (for Gauntlet backend when we go remote)

### V1 Runs Locally

- Backend: `http://localhost:3000` on Shane's Mac
- No VPS needed for V1 (all agents are local except Phoenix Echo who connects in)
- V2: Add nginx location block at `gauntlet.phoenixelectric.life` → reverse proxy to Mac via Cloudflare Tunnel

---

## Frontend Layout

```
┌─────────────────────────────────────────────────────┐
│  PHOENIX AI GAUNTLET            ● Shane Warehime    │
│  ─────────────────────────────────────────────────── │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ ● ECHO PRO      │  │ ● GEMINI        │           │
│  │ Claude Code      │  │ Gemini CLI      │           │
│  │ ────────────     │  │ ────────────    │           │
│  │ > _              │  │ > _             │           │
│  │                  │  │                 │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ ● CODEX         │  │ ● PHOENIX ECHO  │           │
│  │ Codex CLI        │  │ VPS Runtime     │           │
│  │ ────────────     │  │ ────────────    │           │
│  │ > _              │  │ > _             │           │
│  │                  │  │                 │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ @echo @gemini @codex @phoenix  [broadcast]   │    │
│  │ > _                                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [TASKS]  [LEDGER LIVE]  [SESSION: Recording...]    │
└─────────────────────────────────────────────────────┘
```

### Panel Features

- **Status dot:** Green (running), Yellow (restarting), Red (down)
- **Agent name + platform** in header
- **Full xterm.js terminal** — scrollback, ANSI colors, interactive
- **Click to expand** — spotlight mode, full screen one agent
- **Context health bar** (V2) — shows remaining context per agent

### Command Bar

- `@echo` routes to Echo Pro only
- `@gemini` routes to Gemini only
- `@codex` routes to Codex only
- `@phoenix` routes to Phoenix Echo only
- `@all` or `[broadcast]` button routes to all agents
- Up arrow for command history

### Sidebar Tabs

- **TASKS** — shared to-do list (drag between agents)
- **LEDGER LIVE** — real-time LEDGER.md feed (file watcher)
- **SESSION** — recording controls, session name, duration

---

## V1 Scope (What We Ship First)

1. Node.js backend with Express + WebSocket
2. node-pty spawning 3 local CLIs (claude, gemini, codex)
3. WebSocket bridge for Phoenix Echo from VPS
4. React frontend with 4 xterm.js panels
5. Command bar with @agent routing + broadcast
6. LEDGER.md file watcher streaming to frontend
7. Single-operator auth (token-based, Shane only)
8. Agent status indicators (running/restarting/down)
9. Phoenix branding (red/gold/black)

## V1 Does NOT Include (V2+)

- Remote access via VPS reverse proxy
- Mobile responsive layout
- Session recording/replay
- Task board with drag-and-drop
- Voice-to-agent routing
- Context health dashboard
- Agent-to-agent direct channels (beyond LEDGER)

---

## Project Structure

```
phoenix-gauntlet/
├── package.json
├── server/
│   ├── index.js          # Express + WS server
│   ├── supervisor.js     # PTY process manager
│   ├── agents.js         # Agent spawn configs
│   ├── ledger-watcher.js # LEDGER.md file watcher
│   └── auth.js           # Simple token auth
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Terminal.jsx    # xterm.js wrapper
│   │   │   ├── CommandBar.jsx  # @agent routing
│   │   │   ├── AgentPanel.jsx  # Panel with status
│   │   │   ├── LedgerFeed.jsx  # Live LEDGER view
│   │   │   └── Layout.jsx      # 4-panel grid
│   │   └── styles/
│   │       └── gauntlet.css    # Phoenix branding
│   └── public/
│       └── index.html
└── README.md
```

---

## Team Responsibilities for Build Phase

| Agent | Responsibility | Deliverable |
|-------|---------------|-------------|
| **Echo Pro** | Architecture doc (this), project scaffolding, orchestration | This document + project setup |
| **Gemini** | Research xterm.js integration patterns, find reference implementations | Research report (pending) |
| **Codex** | Security review, API hardening, code quality gate | Review every PR, harden before ship |
| **Phoenix Echo** | Backend runtime, WebSocket bridge, VPS infrastructure | Server-side implementation support |

---

## Decision Log

| Decision | Chosen | Rationale | Source |
|----------|--------|-----------|--------|
| V1 deployment | Mac localhost | All 3 CLIs are local; simplest path | Phoenix Echo |
| Terminal emulator | xterm.js | Industry standard, VS Code uses it | Team consensus |
| Backend | Node.js + Express | React ecosystem, node-pty native | Team consensus |
| Auth model | Single-operator token | Only Shane uses V1 | Codex |
| Process management | node-pty per agent | Real PTY = full interactive support | Codex |
| LEDGER integration | File watcher → WebSocket | Keeps existing append-only model | Echo Pro |
| Command routing | @agent prefix | Simple, intuitive, extensible | Echo Pro briefing |

---

*This architecture was built collaboratively by the Phoenix AI team. No single agent wrote it alone.*
*PROPOSE → APPROVE → EXECUTE. Shane approves before we build.*
