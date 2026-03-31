---
name: config
description: Configure the heartbeat interval (15s to 15m)
allowed-tools:
  - Bash
  - Read
  - Write
argument-hint: "<interval> — e.g., '30s', '5m', '15m', '60s', '900' (seconds)"
---

Configure the phoenix-comms heartbeat interval.

## Steps

1. Parse the argument. Accept formats:
   - Seconds with 's' suffix: `30s` → 30
   - Minutes with 'm' suffix: `5m` → 300
   - Raw seconds: `900` → 900
   - No argument: show current setting and exit

2. Validate the interval is between 15 seconds and 900 seconds (15 minutes). If out of range, report the error and do NOT change anything.

3. Write the interval (in seconds) to `~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_interval`:
```bash
echo "<seconds>" > ~/Phoenix_Local/_GATEWAY/phoenix-comms/.comms_interval
```

4. If a heartbeat is currently running (PID file exists and process alive), warn: "Heartbeat is running at the old interval. Run /comms:stop then /comms:start to apply the new interval."

5. Report: "Interval set to Xs (Xm Ys). Will take effect on next /comms:start."
