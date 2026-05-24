#!/usr/bin/env bash
# Echo Persistence Plugin — PreCompact Logger
# Appends a compaction marker to LEDGER and PRO_BUFFER before context is compacted.
# This breadcrumb helps the post-compaction Echo find its bearings.

set -euo pipefail

LEDGER="/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER.md"
PRO_BUFFER="/Users/shanewarehime/Phoenix_Local/_GATEWAY/LEDGER_QUEUE/PRO_BUFFER.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

# Append to LEDGER
echo "${TIMESTAMP} | COMPACTION | Context compaction — read ECHO.md to restore identity, check LEDGER last 30 lines for recent work | Echo Pro" >> "$LEDGER"

# Append to PRO_BUFFER
echo "| ${TIMESTAMP} | ECHO_PRO | COMPACTION | Context compaction. Run /echo to reload identity. Check LEDGER last 30 lines for recent context. |" >> "$PRO_BUFFER"

exit 0
