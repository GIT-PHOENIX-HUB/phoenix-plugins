import React, { useState, useEffect, useRef, useCallback } from 'react';
import TerminalPanel from './components/TerminalPanel';
import CommandBar from './components/CommandBar';
import MissionControl from './components/MissionControl';
import LedgerPanel from './components/LedgerPanel';
import './styles/gauntlet.css';

const AUTH_TOKEN = 'phoenix-gauntlet-v1';
const WS_URL = `ws://${window.location.host}?token=${AUTH_TOKEN}`;

function App() {
  const [agents, setAgents] = useState({});
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [ledgers, setLedgers] = useState({});
  const [swarmState, setSwarmState] = useState(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState('bridge');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const terminalRefs = useRef({});
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);

  // WebSocket connection with exponential backoff
  const connectWs = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 1000;
    };
    ws.onclose = () => {
      setConnected(false);
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30000);
      reconnectTimer.current = setTimeout(connectWs, delay);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.event) {
        case 'init':
          setAgents(msg.data.agents);
          setAgentConfigs(msg.data.agentConfigs);
          setLedgers(
            Object.fromEntries(
              (msg.data.ledgers || []).map((ledger) => [ledger.id, ledger])
            )
          );
          setSwarmState(msg.data.swarmState || null);
          break;

        case 'terminal.output':
          if (terminalRefs.current[msg.data.agentId]) {
            terminalRefs.current[msg.data.agentId](msg.data.data);
          }
          break;

        case 'agent.status':
          setAgents(prev => ({
            ...prev,
            [msg.data.agentId]: {
              ...prev[msg.data.agentId],
              status: msg.data.status
            }
          }));
          break;

        case 'ledger.update':
          setLedgers(prev => {
            const existing = prev[msg.data.id] || { lines: [] };
            const nextLines = msg.data.reset
              ? msg.data.lines
              : [...(existing.lines || []), ...(msg.data.lines || [])].slice(-200);

            return {
              ...prev,
              [msg.data.id]: {
                ...existing,
                id: msg.data.id,
                label: msg.data.label,
                path: msg.data.path,
                exists: msg.data.exists,
                updatedAt: msg.data.updatedAt,
                lines: nextLines
              }
            };
          });
          break;

        case 'swarm.state':
          setSwarmState(msg.data);
          break;

        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    connectWs();
    fetch('/api/ledgers?lines=80', {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setLedgers(
          Object.fromEntries(
            (data.ledgers || []).map((ledger) => [ledger.id, ledger])
          )
        );
      })
      .catch(() => {});

    fetch('/api/swarm/state', {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => setSwarmState(data))
      .catch(() => {});

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  // Send terminal input to specific agent
  const sendInput = (agentId, data) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        event: 'terminal.input',
        agentId,
        data
      }));
    }
  };

  // Send command from command bar
  const sendCommand = (targetAgent, text, mode) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        event: 'command',
        targetAgent,
        text,
        mode
      }));
    }
  };

  // Send terminal resize to server
  const sendResize = (agentId, cols, rows) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        event: 'resize',
        agentId,
        cols,
        rows
      }));
    }
  };

  // Register terminal write callback
  const registerTerminal = (agentId, writeCallback) => {
    terminalRefs.current[agentId] = writeCallback;
  };

  // Session management handlers
  const handleStartAll = async () => {
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to start agents:', err);
    }
  };

  const handleStopAll = async () => {
    try {
      const res = await fetch('/api/session/stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Failed to stop agents:', err);
    }
  };

  const handleRestartAgent = async (agentId) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/restart`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(`Failed to restart agent ${agentId}:`, err);
    }
  };

  return (
    <div className="gauntlet-app">
      <header className="gauntlet-header">
        <div className="gauntlet-title">
          <span>Phoenix</span> AI Gauntlet
        </div>
        <div className="session-controls">
          <button className="session-btn start-btn" onClick={handleStartAll}>
            Start All
          </button>
          <button className="session-btn stop-btn" onClick={handleStopAll}>
            Stop All
          </button>
        </div>
        <div className="gauntlet-user">
          {connected ? '● Connected' : '○ Reconnecting...'}{' '}&mdash; Shane Warehime
        </div>
      </header>

      <div className="terminal-grid">
        {agentConfigs.map(config => (
          <TerminalPanel
            key={config.id}
            agentId={config.id}
            name={config.name}
            platform={config.platform}
            color={config.color}
            type={config.type}
            status={agents[config.id]?.status || 'stopped'}
            onInput={(data) => sendInput(config.id, data)}
            onResize={sendResize}
            registerWrite={(cb) => registerTerminal(config.id, cb)}
            onRestart={() => handleRestartAgent(config.id)}
          />
        ))}
      </div>

      <MissionControl
        agents={agents}
        agentConfigs={agentConfigs}
        swarmState={swarmState}
      />

      <CommandBar
        agentConfigs={agentConfigs}
        onSend={sendCommand}
      />

      <button
        className="ledger-toggle"
        onClick={() => setLedgerOpen(!ledgerOpen)}
      >
        {ledgerOpen ? 'Close' : 'LEDGER'}
      </button>

      <LedgerPanel
        open={ledgerOpen}
        ledgers={ledgers}
        selectedLedgerId={selectedLedgerId}
        onSelectLedger={setSelectedLedgerId}
        onClose={() => setLedgerOpen(false)}
      />
    </div>
  );
}

export default App;
