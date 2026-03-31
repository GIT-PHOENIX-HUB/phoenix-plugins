---
name: start
description: Start the phoenix-comms heartbeat — writes presence to HEARTBEAT.echo on a configurable interval
allowed-tools:
  - Bash
  - Read
  - Write
---

Launch the phoenix-comms heartbeat background process for the current agent.

## Steps

1. Check if a heartbeat is already running by reading the PID file at `~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_heartbeat_echo.pid`. If the PID file exists and the process is alive (`kill -0`), report "Heartbeat already running (PID: X)" and stop.

2. Determine the heartbeat interval. Read `~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_interval` if it exists — the file contains a number in seconds. Default to 900 (15 minutes) if the file does not exist.

3. Get a brief description of the current task (1 sentence max) to include in heartbeat writes. Use whatever context is available from the current conversation.

4. Launch the heartbeat script as a background process using Bash:
```bash
PHOENIX_COMMS_AGENT=echo \
PHOENIX_COMMS_INTERVAL=<interval> \
PHOENIX_COMMS_TASK="<current task summary>" \
nohup bash ~/Phoenix_Local/_GATEWAY/phoenix-comms/scripts/heartbeat.sh \
  > /dev/null 2>&1 &
```

5. Create the flag file to signal comms are active:
```bash
touch ~/Phoenix_Local/_GATEWAY/COMMS_ACTIVE
```

6. Verify the PID file was created and the process is running. Report:
   - "Heartbeat started (PID: X, interval: Ys)"
   - "COMMS_ACTIVE flag set"
   - "Writing to: _GATEWAY/HEARTBEAT.echo"
