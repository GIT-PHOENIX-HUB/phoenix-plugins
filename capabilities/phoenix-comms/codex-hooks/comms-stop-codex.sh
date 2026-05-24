#!/usr/bin/env bash
# Phoenix Comms — Codex Heartbeat Stop Hook
# Drop this into ~/.codex/hooks/ and register as a SessionStop hook.
# Kills the Codex heartbeat on session end.
#
# INSTALL:
#   cp comms-stop-codex.sh ~/.codex/hooks/
#   chmod +x ~/.codex/hooks/comms-stop-codex.sh
#   Add to Codex SessionStop chain (before sessionstop-dual-log.sh)
set -u

GATEWAY="$HOME/Phoenix_Local/_GATEWAY"
PID_FILE="$GATEWAY/phoenix-comms/.comms_heartbeat_codex.pid"
HEARTBEAT_FILE="$GATEWAY/HEARTBEAT.codex"

if [ -f "$PID_FILE" ]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    sleep 1
    echo "Codex heartbeat stopped (was PID: $pid)"
  else
    echo "Codex heartbeat PID file existed but process was dead"
  fi
  rm -f "$PID_FILE"
fi

# Write offline status (overwrite, never delete)
printf '%s | codex | OFFLINE | session ended\n' \
  "$(date '+%Y-%m-%d %H:%M:%S %Z')" > "$HEARTBEAT_FILE"
