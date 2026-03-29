#!/bin/bash
# Phoenix AI Gauntlet — Control Script
# Usage: gauntlet_control.sh <start|stop|restart|status|logs|install|uninstall>

set -euo pipefail

LABEL="com.phoenix.gauntlet"
PLIST_SRC="$(cd "$(dirname "$0")/../configs" && pwd)/com.phoenix.gauntlet.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Phoenix_Local/_RUNTIME/gauntlet"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

case "${1:-help}" in
  start)
    if launchctl list "$LABEL" &>/dev/null; then
      echo "Gauntlet is already running."
      launchctl list "$LABEL"
    else
      ensure_log_dir
      launchctl load "$PLIST_DST" 2>/dev/null || {
        echo "Plist not installed. Run: $0 install"
        exit 1
      }
      echo "Gauntlet started."
    fi
    ;;

  stop)
    if launchctl list "$LABEL" &>/dev/null; then
      launchctl unload "$PLIST_DST"
      echo "Gauntlet stopped."
    else
      echo "Gauntlet is not running."
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  status)
    if launchctl list "$LABEL" &>/dev/null; then
      echo "Gauntlet: RUNNING"
      launchctl list "$LABEL"
      echo ""
      echo "Port check:"
      lsof -iTCP:3000 -sTCP:LISTEN 2>/dev/null || echo "  (port 3000 not listening)"
    else
      echo "Gauntlet: STOPPED"
    fi
    ;;

  logs)
    echo "=== stdout ==="
    tail -20 "$LOG_DIR/gauntlet.out.log" 2>/dev/null || echo "(no stdout log)"
    echo ""
    echo "=== stderr ==="
    tail -20 "$LOG_DIR/gauntlet.err.log" 2>/dev/null || echo "(no stderr log)"
    ;;

  install)
    ensure_log_dir
    if [ ! -f "$PLIST_SRC" ]; then
      echo "Error: plist not found at $PLIST_SRC"
      exit 1
    fi
    cp "$PLIST_SRC" "$PLIST_DST"
    echo "Installed: $PLIST_DST"
    echo "Run '$0 start' to launch."
    ;;

  uninstall)
    "$0" stop 2>/dev/null || true
    rm -f "$PLIST_DST"
    echo "Uninstalled: $PLIST_DST"
    ;;

  help|*)
    echo "Phoenix AI Gauntlet Control"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start      Start the Gauntlet server"
    echo "  stop       Stop the Gauntlet server"
    echo "  restart    Restart the Gauntlet server"
    echo "  status     Show running status and port"
    echo "  logs       Show recent log output"
    echo "  install    Install LaunchAgent plist"
    echo "  uninstall  Remove LaunchAgent plist"
    ;;
esac
