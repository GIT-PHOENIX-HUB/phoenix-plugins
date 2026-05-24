---
name: team-awareness
description: On session start, reads both heartbeats + recent LEDGER entries from each agent, presents team context
allowed-tools:
  - Bash
  - Read
  - Grep
---

Build a snapshot of the full team state — who's alive, what they've been doing, and what you need to know. Use on session start or when you need to understand the team landscape.

## Steps

1. **Read both heartbeat files:**
   - `~/Phoenix_Local/_GATEWAY/HEARTBEAT.echo`
   - `~/Phoenix_Local/_GATEWAY/HEARTBEAT.codex`

   For each: extract timestamp, agent name, status, and current task. Calculate age using file modification time vs current time.

2. **Get recent LEDGER entries for each agent.** Read the last 50 lines of `~/Phoenix_Local/_GATEWAY/LEDGER.md`. Filter:
   - Echo entries: lines containing `| Echo Pro` or `| Phoenix Echo` or `| Echo`
   - Codex entries: lines containing `| Codex`

   Show the last 5 entries for each agent — action names and timestamps only.

3. **Check comms state.** Is `~/Phoenix_Local/_GATEWAY/COMMS_ACTIVE` present?

4. **Present the team snapshot** using this exact format:

```
══════════════════════════════════════════════════════
  PHOENIX TEAM AWARENESS — Session Start Snapshot
══════════════════════════════════════════════════════

Comms: ON/OFF

─── Echo (Claude Opus 4.6) ──────────────────────────
Heartbeat: ALIVE/STALE/OFFLINE (age: Xm)
Task: <from heartbeat>
Recent LEDGER:
  1. ACTION_NAME (HH:MM)
  2. ACTION_NAME (HH:MM)
  3. ACTION_NAME (HH:MM)
  4. ACTION_NAME (HH:MM)
  5. ACTION_NAME (HH:MM)

─── Codex (GPT-5.4 xhigh) ──────────────────────────
Heartbeat: ALIVE/STALE/OFFLINE (age: Xm)
Task: <from heartbeat>
Recent LEDGER:
  1. ACTION_NAME (HH:MM)
  2. ACTION_NAME (HH:MM)
  3. ACTION_NAME (HH:MM)
  4. ACTION_NAME (HH:MM)
  5. ACTION_NAME (HH:MM)

══════════════════════════════════════════════════════
  AWARENESS ONLY. DO NOT ACT ON THIS.
  Stay on YOUR task. This is context, not a work queue.
══════════════════════════════════════════════════════
```

5. **Classify heartbeat freshness:**
   - Age < 30 minutes = ALIVE
   - Age 30-60 minutes = STALE
   - Age > 60 minutes or file missing = OFFLINE

## Rules

- This is READ-ONLY awareness. Do NOT take action based on what the other agent is doing.
- The anti-derail boundary at the bottom is absolute. Report and move on.
- If no heartbeat file exists for an agent, show "NO HEARTBEAT FILE" — do not error out.
- Show action names from LEDGER only (the field between the first and second `|` after the timestamp). Do NOT show full details — that's derail bait.
