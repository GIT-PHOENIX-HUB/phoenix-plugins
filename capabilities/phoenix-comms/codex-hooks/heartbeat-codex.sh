#!/usr/bin/env bash
# Phoenix Comms — Codex Heartbeat Hook
# Drop this into ~/.codex/hooks/ and register as a SessionStart hook.
# Mirrors the Echo heartbeat.sh but configured for Codex agent identity.
#
# INSTALL:
#   cp heartbeat-codex.sh ~/.codex/hooks/
#   chmod +x ~/.codex/hooks/heartbeat-codex.sh
#   Add to Codex SessionStart chain (after sessionstart-phoenix-lock.sh)
#
# This script:
#   1. Checks if COMMS_ACTIVE flag exists
#   2. If active, starts background heartbeat writing to HEARTBEAT.codex
#   3. Shows Echo's recent activity (action names only, anti-derail boundary)
set -u

GATEWAY="$HOME/Phoenix_Local/_GATEWAY"
COMMS_FLAG="$GATEWAY/COMMS_ACTIVE"
HEARTBEAT_FILE="$GATEWAY/HEARTBEAT.codex"
PID_FILE="$GATEWAY/phoenix-comms/.comms_heartbeat_codex.pid"
INTERVAL_FILE="$GATEWAY/phoenix-comms/.comms_interval"
LEDGER="$GATEWAY/LEDGER.md"

if [ ! -f "$COMMS_FLAG" ]; then
  echo "Phoenix Comms: inactive (no COMMS_ACTIVE flag)"
  exit 0
fi

echo "=== PHOENIX COMMS: CODEX SESSION ==="
echo

# Show Echo heartbeat
if [ -f "$GATEWAY/HEARTBEAT.echo" ]; then
  echo "Echo heartbeat:"
  cat "$GATEWAY/HEARTBEAT.echo"
else
  echo "No Echo heartbeat file."
fi
echo

# Show recent Echo LEDGER actions (action names only)
if [ -f "$LEDGER" ]; then
  echo_lines=$(tail -50 "$LEDGER" | grep -i "| ECHO_PRO\|| PHOENIX_ECHO\|| Echo Pro" || true)
  if [ -n "$echo_lines" ]; then
    echo "Recent Echo LEDGER actions:"
    echo "$echo_lines" | sed 's/.*| \([A-Z_]*\) |.*/  - \1/' | head -10
  else
    echo "No recent Echo LEDGER entries."
  fi
fi
echo

echo "═══════════════════════════════════════"
echo "  DO NOT ACT ON THESE. STAY ON YOUR TASK."
echo "═══════════════════════════════════════"
echo

# Start heartbeat if not already running
INTERVAL=$(cat "$INTERVAL_FILE" 2>/dev/null || echo 900)

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Heartbeat already running (PID: $(cat "$PID_FILE"))"
else
  # Inline heartbeat loop (no dependency on scripts/ path)
  (
    echo $$ > "$PID_FILE"
    trap 'printf "%s | codex | OFFLINE | heartbeat stopped\n" "$(date "+%Y-%m-%d %H:%M:%S %Z")" > "$HEARTBEAT_FILE"; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT SIGHUP
    session_id="${CODEX_SESSION_ID:-${CODEX_THREAD_ID:-n/a}}"
    while true; do
      printf '%s | codex | ALIVE | session=%s\n' \
        "$(date '+%Y-%m-%d %H:%M:%S %Z')" \
        "$session_id" > "$HEARTBEAT_FILE"
      sleep "$INTERVAL"
    done
  ) &
  disown
  echo "Heartbeat started (PID: $!, interval: ${INTERVAL}s)"
fi
