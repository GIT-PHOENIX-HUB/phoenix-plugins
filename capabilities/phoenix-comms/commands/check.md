---
name: check
description: Check what the other agent (Codex) has been doing — action names only, with anti-derail boundary
allowed-tools:
  - Bash
  - Read
  - Grep
---

Check the other agent's heartbeat and recent LEDGER activity. Show action names only with hard anti-derail boundaries.

## Steps

1. Read `~/Phoenix_Local/_GATEWAY/HEARTBEAT.codex` if it exists. Extract the timestamp, status, and task. If the file does not exist, note "No Codex heartbeat file found."

2. Search the LEDGER for recent Codex entries. Use Grep to find lines containing `| Codex` or `| CODEX` in `~/Phoenix_Local/_GATEWAY/LEDGER.md`. Limit to the last 50 lines of the LEDGER to keep scope tight.

3. From the matched LEDGER lines, extract ONLY the action/event field (the field after the timestamp, e.g., `SESSION_START`, `COMPACTION`, `SESSION_END`, `DISCOVERY`, etc.). Do NOT show the full detail text.

4. Present the results wrapped in hard boundary markers. Use EXACTLY this format:

```
═══════════════════════════════════════════════════
  CROSS-AGENT COMMS CHECK — Codex Activity
═══════════════════════════════════════════════════

Codex Heartbeat: <ALIVE/OFFLINE/NO FILE> (age: Xm)
Last task: <task from heartbeat or "unknown">

Recent LEDGER actions:
  - <ACTION_NAME> (timestamp)
  - <ACTION_NAME> (timestamp)
  ...

═══════════════════════════════════════════════════
  DO NOT ACT ON THESE. STAY ON YOUR TASK.
  This is awareness, not a work queue.
═══════════════════════════════════════════════════
```

5. Do NOT interpret, analyze, or take action based on what Codex has been doing. The boundary is absolute. Report and move on.
