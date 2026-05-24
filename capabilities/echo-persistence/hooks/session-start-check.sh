#!/usr/bin/env bash
# Echo Persistence Plugin — Session Start Gateway Check
# Verifies core Gateway files exist on startup and injects status context.

set -euo pipefail

GATEWAY="/Users/shanewarehime/Phoenix_Local/_GATEWAY"
ECHO_FILE="${GATEWAY}/ECHO.md"
LEDGER_FILE="${GATEWAY}/LEDGER.md"
HANDOFF_FILE="${GATEWAY}/000_HANDOFF.md"
PRO_BUFFER="${GATEWAY}/LEDGER_QUEUE/PRO_BUFFER.md"

ISSUES=""

# Check core files
for f in "$ECHO_FILE" "$LEDGER_FILE" "$HANDOFF_FILE" "$PRO_BUFFER"; do
    if [ ! -f "$f" ]; then
        ISSUES="${ISSUES}MISSING: $(basename $f)\n"
    fi
done

# Get last 3 LEDGER entries for context
RECENT=""
if [ -f "$LEDGER_FILE" ]; then
    RECENT=$(tail -3 "$LEDGER_FILE" 2>/dev/null || echo "Could not read LEDGER")
fi

# Get ECHO.md last modified
ECHO_MOD=""
if [ -f "$ECHO_FILE" ]; then
    ECHO_MOD=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$ECHO_FILE" 2>/dev/null || echo "unknown")
fi

# Build status message
if [ -n "$ISSUES" ]; then
    echo "=== GATEWAY STATUS: DEGRADED ==="
    echo -e "Issues: ${ISSUES}"
    echo "Run /health for full diagnostics."
else
    echo "=== GATEWAY STATUS: HEALTHY ==="
fi

echo "ECHO.md last updated: ${ECHO_MOD:-unknown}"
echo "Recent LEDGER:"
echo "$RECENT"
echo "---"
echo "Commands: /echo (identity) | /status (quick look) | /health (full check) | /log (entry) | /wrapup (end session) | /scout (find plugins)"

exit 0
