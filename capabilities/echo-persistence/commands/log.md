---
description: "Quick LEDGER entry — formats and appends a timestamped log entry"
argument-hint: "<ACTION> <SUMMARY>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Quick Log Entry

Append a formatted entry to the LEDGER and PRO_BUFFER.

## Arguments

The user provided: $ARGUMENTS

## Instructions

1. Parse the arguments:
   - First word = ACTION (e.g., SESSION_START, MISSION_UPDATE, DISCOVERY, HANDOFF, LESSON_LEARNED, EDIT, DECISION)
   - Remaining words = SUMMARY

2. Get the current timestamp by running: `date +"%Y-%m-%d %H:%M"`

3. Append this exact line to `/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER.md`:
   ```
   TIMESTAMP | ACTION | SUMMARY | Echo Pro
   ```

4. Append this exact line to `/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER_QUEUE/PRO_BUFFER.md`:
   ```
   | TIMESTAMP | ECHO_PRO | ACTION | SUMMARY |
   ```

5. Confirm to the user what was logged.

## Rules

- **Append ONLY.** Never modify existing entries.
- **PRO_BUFFER only.** Never touch AIR_BUFFER.md or any other buffer.
- If $ARGUMENTS is empty, ask the user for an ACTION and SUMMARY.
- Keep summaries on one line. No multiline entries.
