# Phoenix Comms

> Cross-agent heartbeat communication between Echo (Claude) and Codex (OpenAI).

## What It Does

Phoenix Comms manages the heartbeat protocol that keeps Echo and Codex aware of each other's operational state. Each agent writes a heartbeat file on a configurable interval. Each agent can check the other's heartbeat and see recent LEDGER actions (action names only, not full details). Hard anti-derail boundaries prevent cross-contamination of task focus.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 5 | start, stop, check, status, config |
| Skills | 0 | -- |
| Agents | 0 | -- |
| Hooks | 3 | SessionStart (1 echo-side), codex hooks (2 codex-side) |

## Commands

| Command | Description |
|---------|-------------|
| `/comms:start` | Launch background heartbeat, set COMMS_ACTIVE flag |
| `/comms:stop` | Kill heartbeat, remove COMMS_ACTIVE flag |
| `/comms:check` | Read Codex heartbeat and recent LEDGER actions (names only) |
| `/comms:status` | Quick glance -- who is alive, heartbeat ages, comms state |
| `/comms:config` | Set heartbeat interval (15s-15m). Formats: 30s, 5m, 900 |

## Installation

Symlink or copy this folder to `~/.claude/plugins/phoenix-comms/`

## Dependencies

- Gateway file system (`~/Phoenix_Local/_GATEWAY/`) for HEARTBEAT file read/write and COMMS_ACTIVE flag
- Codex agent with matching heartbeat hooks on the OpenAI side (drop-in scripts in `codex-hooks/`)

## Status

Active.
