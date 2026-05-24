# Gauntlet

> Multi-agent terminal management dashboard -- Phoenix AI Gauntlet.

## What It Does

A standalone web application that spawns and supervises 4 AI agent CLI sessions from a single UI. Built with React + xterm.js on the client and Node.js + Express + WebSocket on the server. Includes an auto-restart supervisor, ledger file watching, swarm state parsing, and a command bar supporting both broadcast and direct messaging modes. Ships with a macOS LaunchAgent plist and control script for persistent operation.

## Components

| Type | Count | Details |
|------|-------|---------|
| Client | 1 | React 18.3 + xterm 5.3 web UI |
| Server | 1 | Node.js + Express + WebSocket backend |
| Supervisor | 1 | Auto-restart agent supervisor |
| LaunchAgent | 1 | macOS plist + control script |
| Hooks | 0 | -- |

### Features

- 4 concurrent AI agent terminal sessions
- Auto-restart supervisor for agent recovery
- Ledger file watching for state changes
- Swarm state parsing and display
- Command bar with broadcast and direct modes

## Installation

This is a standalone web app, not a Claude plugin.

```bash
# Server
cd capabilities/gauntlet/server && npm install

# Client
cd capabilities/gauntlet/client && npm install

# Or use the control script
./capabilities/gauntlet/scripts/gauntlet_control.sh install
./capabilities/gauntlet/scripts/gauntlet_control.sh start
```

For persistent operation, install the macOS LaunchAgent from `configs/com.phoenix.gauntlet.plist`.

## Dependencies

- `express`
- `ws`
- `node-pty`
- `chokidar`
- `react` 18.3
- `xterm` 5.3

## Status

Active (standalone app)

## Roadmap

Phase 3 will expand this capability with `gateway-module/`, `plugin/`, `skill/`, and `mcp/` subdirectories.
