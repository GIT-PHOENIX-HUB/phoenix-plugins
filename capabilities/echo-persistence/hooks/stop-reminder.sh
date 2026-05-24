#!/usr/bin/env bash
# Echo Persistence Plugin — Stop Reminder
# Checks if session work was logged before stopping.
# Stop hooks run at the end of responses, so this script uses a cooldown latch
# to avoid repeat-blocking active conversations.

set -euo pipefail

ECHO_FILE="/Users/shanewarehime/Phoenix_Local/_GATEWAY/ECHO.md"
LEDGER_FILE="/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER.md"
ECHO_BACKUP="/Users/shanewarehime/Phoenix_Local/_GATEWAY_OLD_BACKUP/ECHO.md"
LEDGER_BACKUP="/Users/shanewarehime/Phoenix_Local/_GATEWAY_OLD_BACKUP/LEDGER.md"
WRAPUP_LOG="/Users/shanewarehime/.claude/session_logs/session_$(date +%Y-%m-%d)_wrapup.md"
STALE_WINDOW_SEC=1800
REMINDER_COOLDOWN_SEC=1800
STATE_DIR="${TMPDIR:-/tmp}/echo-persistence-stop-reminder"

HOOK_INPUT="$(cat || true)"
NOW="$(date +%s)"

recent_write() {
    local file_path="$1"
    local file_mtime

    if [ ! -f "$file_path" ]; then
        return 1
    fi

    file_mtime="$(stat -f %m "$file_path" 2>/dev/null || echo "0")"
    [ $(( NOW - file_mtime )) -lt "$STALE_WINDOW_SEC" ]
}

session_key() {
    local transcript_path

    transcript_path="$(
        python3 -c 'import json, sys; print(json.load(sys.stdin).get("transcript_path", ""))' \
            <<<"$HOOK_INPUT" 2>/dev/null || true
    )"

    if [ -n "$transcript_path" ]; then
        printf '%s' "$transcript_path" | shasum -a 256 | awk '{print $1}'
        return
    fi

    printf '%s' "global"
}

mkdir -p "$STATE_DIR"
STATE_FILE="${STATE_DIR}/$(session_key)"

# If recent work was logged anywhere meaningful, allow stop silently.
if recent_write "$ECHO_FILE" \
    || recent_write "$ECHO_BACKUP" \
    || recent_write "$LEDGER_FILE" \
    || recent_write "$LEDGER_BACKUP" \
    || recent_write "$WRAPUP_LOG"; then
    exit 0
fi

# After the first block, stand down for this session for a while so Claude
# does not get trapped in a repeated Stop-hook loop.
if [ -f "$STATE_FILE" ]; then
    LAST_REMINDER="$(stat -f %m "$STATE_FILE" 2>/dev/null || echo "0")"
    if [ $(( NOW - LAST_REMINDER )) -lt "$REMINDER_COOLDOWN_SEC" ]; then
        exit 0
    fi
fi

touch "$STATE_FILE"

cat <<'EOF'
{"decision":"block","reason":"Session work looks stale. Run /wrapup to update ECHO.md and LEDGER.md before ending so the next Echo keeps the thread. If this session was trivial and nothing needs logging, say that once and stop again."}
EOF

exit 0
