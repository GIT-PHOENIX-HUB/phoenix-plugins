# Shared Ops Ledger

# Both active execution lanes and external review lanes write here.
# APPEND ONLY. Never overwrite.
# Format: TIMESTAMP | SOURCE | MISSION | STATUS | DETAIL

---

## Rules

- Use one line per update.
- Keep it short and operational.
- Post a heartbeat while active or waiting.
- If waiting on Shane, say `WAITING_ON_SHANE` and include the next check time.
- Use this file for visibility, not essays.

## Example Lines

```text
2026-03-07 11:00 | Codex | M1 | STARTED | Trigger packet posted, bridge ledger seeded, waiting for Echo acknowledgment.
2026-03-07 11:15 | Echo Pro | M1 | REVIEW_LAUNCHED | First artifact received. Adversarial verification in progress.
2026-03-07 11:30 | Codex | M1 | WAITING_ON_SHANE | Template ready for review. Next check 12:00 MST.
```
