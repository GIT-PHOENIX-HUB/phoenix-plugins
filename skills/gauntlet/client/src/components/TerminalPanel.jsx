import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

function TerminalPanel({ agentId, name, platform, color, type, status, onInput, registerWrite, onResize, onRestart }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const onInputRef = useRef(onInput);
  const registerWriteRef = useRef(registerWrite);
  const onResizeRef = useRef(onResize);

  // Keep refs current without triggering effect re-runs
  onInputRef.current = onInput;
  registerWriteRef.current = registerWrite;
  onResizeRef.current = onResize;

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: color,
        selectionBackground: 'rgba(255,255,255,0.15)'
      },
      scrollback: 5000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch {}
    });

    // Handle user input
    if (type === 'pty') {
      term.onData((data) => onInputRef.current(data));
    }

    // Register write callback so parent can push output
    registerWriteRef.current((data) => term.write(data));

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          // Send new dimensions to server so PTY can resize
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          if (onResizeRef.current && cols && rows) {
            onResizeRef.current(agentId, cols, rows);
          }
        } catch {}
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Welcome message for hybrid agents
    if (type === 'hybrid') {
      term.writeln(`\x1b[33m${name}\x1b[0m — Message-based panel (Gateway API)`);
      term.writeln('Commands sent via command bar will appear here.\n');
    }

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, [agentId, name, color, type]);

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <div className={`status-dot ${status}`} style={{ boxShadow: `0 0 6px ${color}40` }} />
        <span className="agent-name" style={{ color }}>{name}</span>
        <span className="agent-platform">{platform}</span>
        {onRestart && (
          <button
            className="restart-btn"
            onClick={onRestart}
            title={`Restart ${name}`}
          >
            ↻
          </button>
        )}
      </div>
      <div className="agent-terminal" ref={terminalRef} />
    </div>
  );
}

export default TerminalPanel;
