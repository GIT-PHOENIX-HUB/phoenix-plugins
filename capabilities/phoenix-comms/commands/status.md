---
name: status
description: Show who's alive and comms state — quick glance at cross-agent presence
allowed-tools:
  - Bash
  - Read
---

Show the current state of the phoenix-comms system — who's alive, heartbeat ages, and comms on/off state.

## Steps

1. Check if `~/Phoenix_Local/_GATEWAY/COMMS_ACTIVE` exists. Report comms state as ON or OFF.

2. For each heartbeat file (`HEARTBEAT.echo` and `HEARTBEAT.codex` in `~/Phoenix_Local/_GATEWAY/`):
   - If the file exists, read its content (single line: `timestamp | agent | status | task`)
   - Calculate the age of the file using: `stat -f %m <file>` to get modification time, compare to `date +%s`
   - Classify: age < 2x interval = ALIVE, age > 2x interval = STALE, file missing = NO HEARTBEAT

3. Check if the Echo heartbeat PID is still running:
```bash
pid_file=~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_heartbeat_echo.pid
if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
  echo "process running"
fi
```

4. Read the configured interval from `~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_interval` (default 900s / 15m).

5. Present as a compact status block:

```
Phoenix Comms Status
────────────────────
Comms:    ON/OFF
Interval: Xs (Xm)

Echo:     ALIVE/STALE/OFFLINE (age Xm, PID XXXX)
          Task: <current task>
Codex:    ALIVE/STALE/OFFLINE/NO HEARTBEAT (age Xm)
          Task: <current task>
```
