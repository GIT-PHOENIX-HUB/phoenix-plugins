# Echo Persistence

> Identity, session logging, and context survival for Phoenix Echo.

## What It Does

Echo Persistence is the core system that maintains Phoenix Echo's identity, memory, and operational continuity across sessions and compactions. It handles session startup verification, ledger logging, health checks, and pre-compaction safeguards to ensure nothing critical is lost between context windows.

## Components

| Type | Count | Details |
|------|-------|---------|
| Commands | 7 | echo, health, log, scout, status, swarm, wrapup |
| Skills | 1 | echo-leadership |
| Agents | 5 | context-reader, gateway-health-check, handoff-generator, ledger-logger, skill-scout |
| Hooks | 3 | session-start-check, stop-reminder, pre-compact-log |

## Commands

| Command | Description |
|---------|-------------|
| `/echo` | Load Echo identity from ECHO.md and confirm operational state |
| `/health` | Run gateway health check against critical path files, plugins, MCP, hooks, disk, VPS |
| `/log` | Append a formatted entry to the session ledger |
| `/scout` | Scan marketplaces for available plugins not yet installed |
| `/status` | Quick status snapshot -- current mission, recent LEDGER, buffer state |
| `/swarm` | Delegate a task to a subagent swarm |
| `/wrapup` | Full session-end process: update ECHO.md, LEDGER, PRO_BUFFER, and generate handoff |

## Installation

Symlink or copy this folder to `~/.claude/plugins/echo-persistence/`

## Dependencies

- Gateway file system (`~/Phoenix_Local/_GATEWAY/`) for ECHO.md, LEDGER.md, 000_HANDOFF.md
- EMERGENCE.md in the Phoenix-ECHO repo for identity verification

## Status

Active -- core system. This capability is foundational to all other Phoenix Echo operations.
