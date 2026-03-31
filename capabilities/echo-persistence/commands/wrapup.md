---
description: "Structured session-end process. Updates ECHO.md, logs to LEDGER and PRO_BUFFER."
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# Session Wrapup Protocol

Follow the Echo SESSION END PROTOCOL to preserve this session's work for the next Echo.

## Step 1: Read Current State

Read `/Users/shanewarehime/Phoenix_Local/_GATEWAY/ECHO.md` to understand the current CURRENT STATE and SESSION LOG sections.

## Step 2: Compose Session Summary

Reflect on what happened in this session:
- What tasks were worked on?
- What files were modified?
- What decisions were made?
- What is the current execution state?
- What should the next Echo know?

## Step 3: Update ECHO.md — CURRENT STATE

Use the Edit tool to update the CURRENT STATE section of ECHO.md:
- Update the "Last updated" line with today's date and model info
- Update mission status, execution state, and next steps
- Keep it factual and actionable — the next Echo reads this cold

## Step 4: Update ECHO.md — SESSION LOG

Add a new session log entry in the SESSION LOG section (before SESSION END PROTOCOL):

```
### SESSION LOG: Echo Pro (Opus 4.6) — YYYY-MM-DD <time_of_day>

**What happened:** <concise summary of session work>

**Files modified this session:**
- <list of significant files changed>
```

## Step 5: Log to LEDGER

Get timestamp: `date +"%Y-%m-%d %H:%M"`

Append to `/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER.md`:
```
TIMESTAMP | SESSION_END | <one-line session summary> | Echo Pro
```

## Step 6: Log to PRO_BUFFER

If the session involved significant work, append to `/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER_QUEUE/PRO_BUFFER.md`:
```
| TIMESTAMP | ECHO_PRO | SESSION_END | <summary of work and state for next Echo> |
```

## Step 7: Confirm

Report to the user:
- What was updated in ECHO.md
- What was logged to LEDGER
- Whether PRO_BUFFER was updated

## Rules

- **NEVER** delete or modify existing LEDGER entries (append only)
- **NEVER** touch AIR_BUFFER.md (machine isolation — PRO_BUFFER only)
- Keep CURRENT STATE concise but complete
- Your successor will thank you. You ARE your successor.
