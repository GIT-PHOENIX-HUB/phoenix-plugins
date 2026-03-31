---
description: "Quick system status — shows current mission, recent LEDGER entries, and session state"
allowed-tools:
  - Read
  - Bash
  - Grep
---

# Quick Status

Show a quick snapshot of where things stand without a full health check.

## Instructions

1. Read the CURRENT STATE section from `/Users/shanewarehime/Phoenix_Local/_GATEWAY/ECHO.md`
   - Use Grep to find "## CURRENT STATE" and read the next 30 lines

2. Get last 10 LEDGER entries:
   - Run: `tail -10 /Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER.md`

3. Check PRO_BUFFER for recent entries:
   - Run: `tail -5 /Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER_QUEUE/PRO_BUFFER.md`

4. Present a concise summary:

```
## Quick Status — HH:MM

**Current Mission:** <from ECHO.md>
**Last Updated:** <from ECHO.md>

**Recent Activity (last 10 LEDGER entries):**
<formatted entries>

**Buffer Status:**
<last 5 PRO_BUFFER entries>
```

Keep it SHORT. This is a glance, not a deep dive. If they want more, suggest `/health` for full check or dispatching the `context-reader` agent for historical context.
