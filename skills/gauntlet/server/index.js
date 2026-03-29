/**
 * Phoenix AI Gauntlet — Server
 * Express + WebSocket server managing 4 AI agent terminals
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Supervisor = require('./supervisor');
const { createLedgerRegistry } = require('./ledgers');
const { buildSwarmState } = require('./swarm-state');
const { agents, ledgers } = require('./agents');
const { log } = require('./logger');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.GAUNTLET_TOKEN || 'phoenix-gauntlet-v1';

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// Auth middleware for API routes
function authMiddleware(req, res, next) {
  // Skip auth for static files and health check
  if (req.path === '/health') return next();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
app.use('/api', authMiddleware);

// --- Audit Log ---
const auditLog = [];

function audit(action) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...action
  };
  auditLog.push(entry);
  // Keep last 1000 entries in memory
  if (auditLog.length > 1000) auditLog.shift();
  broadcast('audit.event', entry);
}

// --- Supervisor ---
const supervisor = new Supervisor();

// Forward supervisor events to WebSocket clients
supervisor.on('terminal.output', ({ agentId, data }) => {
  broadcast('terminal.output', { agentId, data });
});

supervisor.on('agent.status', (statusEvent) => {
  broadcast('agent.status', statusEvent);
});

// Handle hybrid agent commands (Phoenix Echo via Gateway API)
supervisor.on('hybrid.command', async ({ agentId, data }) => {
  const config = agents[agentId];
  if (!config || config.type !== 'hybrid') return;

  try {
    const gatewayToken = process.env.PHOENIX_GATEWAY_TOKEN || '';
    const headers = { 'Content-Type': 'application/json' };
    if (gatewayToken) headers['Authorization'] = `Bearer ${gatewayToken}`;

    const response = await fetch(`${config.apiEndpoint}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: data })
    });
    if (response.ok) {
      const result = await response.json();
      broadcast('terminal.output', {
        agentId,
        data: `\x1b[33m[Sent to ${config.name}]\x1b[0m ${data}\n`
      });
      if (result.reply) {
        broadcast('terminal.output', {
          agentId,
          data: `\x1b[33m${config.name}:\x1b[0m ${result.reply}\n`
        });
      }
    }
  } catch (err) {
    broadcast('terminal.output', {
      agentId,
      data: `\x1b[31m[Error reaching ${config.name}]\x1b[0m ${err.message}\n`
    });
  }
});

// Phoenix Echo response polling via Gateway sessions API
let phoenixPollInterval = null;
let lastPhoenixMessageId = null;

function startPhoenixEchoPoll() {
  const config = agents['phoenix-echo'];
  if (!config || config.type !== 'hybrid') return;

  phoenixPollInterval = setInterval(async () => {
    try {
      const gatewayToken = process.env.PHOENIX_GATEWAY_TOKEN || '';
      const headers = {};
      if (gatewayToken) headers['Authorization'] = `Bearer ${gatewayToken}`;

      const res = await fetch(`${config.apiEndpoint}/api/recovery`, { headers });
      if (!res.ok) return;
      const recovery = await res.json();
      if (recovery.lastMessage && recovery.lastMessage.id !== lastPhoenixMessageId && recovery.lastMessage.role === 'assistant') {
        lastPhoenixMessageId = recovery.lastMessage.id;
        broadcast('terminal.output', {
          agentId: 'phoenix-echo',
          data: `\x1b[33m${config.name}:\x1b[0m ${recovery.lastMessage.content}\n`
        });
      }
    } catch (err) {
      log('warn', 'phoenix_echo.poll_error', { error: err.message });
    }
  }, 2000);
}

// --- Ledger Watchers + Swarm State ---
let ledgerWatcher = null;
const ledgerRegistry = createLedgerRegistry(ledgers);
let swarmState = buildSwarmState({});

function refreshSwarmState() {
  swarmState = buildSwarmState({
    opsContent: ledgerRegistry.getContentById('ops'),
    bridgeContent: ledgerRegistry.getContentById('bridge')
  });
  broadcast('swarm.state', swarmState);
}

function startLedgerWatcher() {
  const initialSnapshots = ledgerRegistry.refreshAll();
  refreshSwarmState();

  for (const snapshot of initialSnapshots) {
    const status = snapshot.exists ? 'watching' : 'missing';
    log('info', 'ledger.init', { ledger: snapshot.label, status, path: snapshot.path });
  }

  ledgerWatcher = ledgerRegistry.watch((update) => {
    if (update.lines.length || update.reset) {
      broadcast('ledger.update', update);
    }
    refreshSwarmState();
  });
}

// --- WebSocket ---
const clients = new Set();

function broadcast(event, data) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  }
}

wss.on('connection', (ws, req) => {
  // WebSocket auth — check token in query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  if (token !== AUTH_TOKEN) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  clients.add(ws);
  log('info', 'ws.connect', { clients: clients.size });

  // Send current agent status on connect
  ws.send(JSON.stringify({
    event: 'init',
    data: {
      agents: supervisor.getStatus(),
      agentConfigs: Object.entries(agents).map(([id, config]) => ({
        id,
        name: config.name,
        platform: config.platform,
        type: config.type,
        color: config.color
      })),
      ledgers: ledgerRegistry.getSnapshots(80),
      swarmState
    },
    ts: Date.now()
  }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.event === 'terminal.input' && msg.agentId) {
      audit({
        action: 'terminal.input',
        targetAgent: msg.agentId,
        actor: 'shane'
      });
      supervisor.writeToAgent(msg.agentId, msg.data);
    }

    if (msg.event === 'command' && msg.targetAgent && msg.text) {
      const mode = msg.mode || 'direct';
      audit({
        action: 'command',
        targetAgent: msg.targetAgent,
        mode,
        actor: 'shane'
      });

      if (mode === 'broadcast') {
        for (const agentId of Object.keys(agents)) {
          supervisor.writeToAgent(agentId, msg.text + '\n');
        }
      } else {
        supervisor.writeToAgent(msg.targetAgent, msg.text + '\n');
      }
    }

    if (msg.event === 'resize' && msg.agentId) {
      supervisor.resizeAgent(msg.agentId, msg.cols, msg.rows);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    log('info', 'ws.disconnect', { clients: clients.size });
  });
});

// --- REST API ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    agents: supervisor.getStatus(),
    clients: clients.size,
    swarmState
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    agents: supervisor.getStatus(),
    clients: clients.size,
    swarmState
  });
});

app.get('/api/agents', (req, res) => {
  res.json(supervisor.getStatus());
});

app.post('/api/agents/:id/restart', (req, res) => {
  const { id } = req.params;
  if (!agents[id]) return res.status(404).json({ error: 'Agent not found' });

  audit({ action: 'restart', targetAgent: id, actor: 'shane' });
  supervisor.restartAgent(id);
  res.json({ status: 'restarting', agentId: id });
});

app.post('/api/session/start', (req, res) => {
  audit({ action: 'session.start', actor: 'shane' });
  try {
    supervisor.startAll();
    res.json({ status: 'started', agents: Object.keys(agents) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start agents', message: err.message });
  }
});

app.post('/api/session/stop', (req, res) => {
  audit({ action: 'session.stop', actor: 'shane' });
  supervisor.stopAll();
  res.json({ status: 'stopped' });
});

app.post('/api/command', (req, res) => {
  const { targetAgent, text, mode } = req.body;
  if (!targetAgent || !text) {
    return res.status(400).json({ error: 'targetAgent and text required' });
  }

  audit({ action: 'command', targetAgent, mode: mode || 'direct', actor: 'shane' });

  if (mode === 'broadcast') {
    for (const agentId of Object.keys(agents)) {
      supervisor.writeToAgent(agentId, text + '\n');
    }
  } else {
    supervisor.writeToAgent(targetAgent, text + '\n');
  }

  res.json({ status: 'sent', targetAgent, mode: mode || 'direct' });
});

app.get('/api/ledgers', (req, res) => {
  const lines = parseInt(req.query.lines, 10) || 80;
  res.json({
    ledgers: ledgerRegistry.getSnapshots(lines)
  });
});

app.get('/api/ledgers/:id/tail', (req, res) => {
  const lines = parseInt(req.query.lines, 10) || 80;
  const ledger = ledgerRegistry.getTail(req.params.id, lines);
  if (!ledger) {
    return res.status(404).json({ error: 'Ledger not found' });
  }
  res.json(ledger);
});

app.get('/api/ledger/tail', (req, res) => {
  const lines = parseInt(req.query.lines, 10) || 50;
  const ledger = ledgerRegistry.getTail('gauntlet', lines) || { lines: [] };
  res.json({ lines: ledger.lines });
});

app.get('/api/swarm/state', (req, res) => {
  res.json(swarmState);
});

app.get('/api/audit', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(auditLog.slice(-limit));
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// --- Start ---
server.listen(PORT, () => {
  log('info', 'server.start', { port: PORT, agents: Object.keys(agents) });

  startLedgerWatcher();
  startPhoenixEchoPoll();

  // Auto-start all agents on server boot
  log('info', 'agents.autostart', { agents: Object.keys(agents) });
  for (const agentId of Object.keys(agents)) {
    try {
      supervisor.startAgent(agentId);
      log('info', 'agent.started', { agentId });
    } catch (err) {
      log('error', 'agent.start_failed', { agentId, error: err.message });
    }
  }
});

// Graceful shutdown — agents keep running, only server stops
// (Phoenix Echo poll and LEDGER watcher clean up)
process.on('SIGINT', () => {
  log('info', 'server.shutdown', { reason: 'SIGINT' });
  if (phoenixPollInterval) clearInterval(phoenixPollInterval);
  if (ledgerWatcher) ledgerWatcher.close();
  server.close(() => {
    process.exit(0);
  });
  // Force exit after 3s if connections don't drain
  setTimeout(() => process.exit(0), 3000).unref();
});
