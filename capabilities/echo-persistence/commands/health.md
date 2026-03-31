---
description: "Run a full Gateway health check — verifies all core files, plugins, MCP servers, hooks, and disk space"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Gateway Health Check

Run a comprehensive health check of the Phoenix Echo Gateway system.

## Instructions

1. Dispatch the `gateway-health-check` agent to perform the full check
2. The agent will verify:
   - Core Gateway files (ECHO.md, LEDGER.md, HANDOFF, PRO_BUFFER)
   - Plugin installation status
   - MCP server configuration
   - Hook configuration
   - Disk space
   - VPS connectivity
   - Git repo status
3. Present the results in a clean table format
4. Flag any CRITICAL or WARNING items prominently

If the agent is unavailable, perform these checks directly:
- Check each file exists: `test -f <path> && echo "OK" || echo "MISSING"`
- Get file info: `stat -f "%z bytes, modified %Sm" <path>`
- Check disk: `df -h / | tail -1`
