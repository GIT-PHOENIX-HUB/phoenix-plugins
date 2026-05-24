# Agent Bridge Ledger

**THIS IS THE CANONICAL COPY.** All detailed cross-agent entries go here.

Purpose:

- Single detailed communication ledger between coordinating agents.
- Track decisions, handoffs, blockers, red-team findings, and required follow-up.

Rules:

- No secret values in this file.
- Timestamp every entry in `America/Denver`.
- Always include owner + next owner.
- Keep claims evidence-based.
- If an item is blocked, say what is blocked and why.

Entry format:

```md
## YYYY-MM-DD HH:MM MST | <Agent Name> | <UPDATE|HANDOFF|BLOCKER|RED-TEAM|DECISION|STATUS>
- `scope`: short scope line
- `repos/files`: explicit paths touched or reviewed
- `actions`: what was done
- `evidence`: test commands, outputs, logs, or references
- `risk`: none/low/medium/high + why
- `needs`: what is required from the other agent
- `next_owner`: `<Agent Name>`
```

Starter example:

```md
## 2026-03-07 11:00 MST | Codex | DECISION
- `scope`: establish mission bridge
- `repos/files`: `AGENT_BRIDGE_LEDGER.md`, `SHARED_OPS_LEDGER.md`
- `actions`: seeded canonical ledgers and posted mission control rules
- `evidence`: files created and readable in repo root
- `risk`: low (coordination only)
- `needs`: Echo Pro to acknowledge and begin heartbeat cadence
- `next_owner`: Echo Pro
```
