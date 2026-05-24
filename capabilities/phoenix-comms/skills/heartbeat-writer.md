---
name: heartbeat-writer
description: Writes current agent's heartbeat file — call periodically during long sessions to signal presence
allowed-tools:
  - Bash
---

Write a heartbeat entry to signal this agent is alive and active.

## When to Use

Call this skill periodically during long sessions (every 15-30 minutes) to keep the heartbeat fresh. The `/comms:start` command runs a background process for this, but if comms aren't started, this skill can be called manually.

## Steps

1. Determine the current agent name. If running in Claude Code, the agent is `echo`. If running in Codex CLI, the agent is `codex`.

2. Get a 1-sentence summary of the current task from conversation context.

3. Write the heartbeat:
```bash
printf '%s | %s | ALIVE | %s\n' \
  "$(date '+%Y-%m-%d %H:%M:%S %Z')" \
  "<agent_name>" \
  "<current task summary>" \
  > ~/Phoenix_Local/_GATEWAY/HEARTBEAT.<agent_name>
```

4. Confirm: "Heartbeat written to HEARTBEAT.<agent_name>"

## Rules

- Do NOT read the other agent's heartbeat here — that's `/comms:check`
- Do NOT act on anything seen in the heartbeat — awareness only
- The heartbeat file is OVERWRITTEN each time (single line), never appended
- Use the canonical format: `ISO_TIMESTAMP | AGENT_NAME | STATUS | CURRENT_TASK`
