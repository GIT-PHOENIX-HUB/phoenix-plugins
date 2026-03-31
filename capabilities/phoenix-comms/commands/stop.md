---
name: stop
description: Stop the phoenix-comms heartbeat gracefully via PID file
allowed-tools:
  - Bash
  - Read
---

Stop the running phoenix-comms heartbeat for the current agent.

## Steps

1. Read the PID file at `~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_heartbeat_echo.pid`.

2. If the PID file does not exist, report "No heartbeat running" and stop.

3. If the PID file exists, send SIGTERM to the process:
```bash
kill "$(cat ~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_heartbeat_echo.pid)" 2>/dev/null
```

4. Remove the COMMS_ACTIVE flag file:
```bash
rm -f ~/Phoenix_Local/_GATEWAY/COMMS_ACTIVE
```

5. Verify the process stopped (give it 2 seconds):
```bash
sleep 1 && ! kill -0 "$(cat ~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_heartbeat_echo.pid 2>/dev/null)" 2>/dev/null && echo "stopped"
```

6. Report:
   - "Heartbeat stopped"
   - "COMMS_ACTIVE flag removed"
   - "HEARTBEAT.echo updated to OFFLINE"

Note: The heartbeat script's trap handler will overwrite HEARTBEAT.echo with an OFFLINE status on shutdown. Do NOT delete the heartbeat file — it gets overwritten, never deleted.
