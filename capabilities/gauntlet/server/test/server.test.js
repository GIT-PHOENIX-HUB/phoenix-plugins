const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

// Lightweight smoke test: starts the real server on a random port,
// hits /health and /api/agents, tests WebSocket auth + init, then tears down.
// Agent CLIs may not be present — startup failures are caught by the
// server and logged, so the HTTP layer still responds.

const SERVER_PATH = path.join(__dirname, '..', 'index.js');
const TEST_PORT = 19871 + Math.floor(Math.random() * 100);
const TEST_TOKEN = 'test-token-smoke';

function httpGet(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${TEST_PORT}${urlPath}`,
      { headers },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function wsConnect(token) {
  const url = token
    ? `ws://127.0.0.1:${TEST_PORT}?token=${token}`
    : `ws://127.0.0.1:${TEST_PORT}`;
  return new WebSocket(url);
}

describe('server smoke test', () => {
  let serverProc;

  before(async () => {
    serverProc = spawn(process.execPath, [SERVER_PATH], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        GAUNTLET_TOKEN: TEST_TOKEN,
        // Point Phoenix Echo at a dummy URL so fetch doesn't hang
        PHOENIX_ECHO_URL: 'http://127.0.0.1:1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for the server.start log line (structured JSON)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('server did not start within 8s')), 8000);
      let buf = '';
      serverProc.stdout.on('data', (chunk) => {
        buf += chunk.toString();
        if (buf.includes('"event":"server.start"')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProc.on('error', (err) => { clearTimeout(timeout); reject(err); });
      serverProc.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`server exited early with code ${code}`));
      });
    });
  });

  after(() => {
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGINT');
    }
  });

  // --- HTTP ---

  it('/health returns 200 with status ok', async () => {
    const res = await httpGet('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('/api/agents without auth returns 401', async () => {
    const res = await httpGet('/api/agents');
    assert.strictEqual(res.status, 401);
  });

  it('/api/agents with correct auth returns 200', async () => {
    const res = await httpGet('/api/agents', {
      Authorization: `Bearer ${TEST_TOKEN}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
  });

  it('/api/health with auth returns 200', async () => {
    const res = await httpGet('/api/health', {
      Authorization: `Bearer ${TEST_TOKEN}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // --- WebSocket ---

  it('WS without token closes with 4001', async () => {
    const ws = wsConnect(null);
    const code = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ws close timeout')), 5000);
      ws.on('close', (c) => { clearTimeout(timeout); resolve(c); });
      ws.on('error', () => {}); // suppress ECONNRESET
    });
    assert.strictEqual(code, 4001);
  });

  it('WS with wrong token closes with 4001', async () => {
    const ws = wsConnect('bad-token');
    const code = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ws close timeout')), 5000);
      ws.on('close', (c) => { clearTimeout(timeout); resolve(c); });
      ws.on('error', () => {});
    });
    assert.strictEqual(code, 4001);
  });

  it('WS with correct token receives init payload', async () => {
    const ws = wsConnect(TEST_TOKEN);
    const msg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ws message timeout')), 5000);
      ws.on('message', (raw) => {
        clearTimeout(timeout);
        resolve(JSON.parse(raw.toString()));
      });
      ws.on('error', reject);
    });
    ws.close();

    assert.strictEqual(msg.event, 'init');
    assert.ok(msg.data.agents !== undefined, 'init missing agents');
    assert.ok(Array.isArray(msg.data.agentConfigs), 'init missing agentConfigs');
    assert.ok(Array.isArray(msg.data.ledgers), 'init missing ledgers');
    assert.ok(msg.data.swarmState !== undefined, 'init missing swarmState');
    assert.ok(msg.ts, 'init missing ts');
  });

  it('WS init agentConfigs has expected fields', async () => {
    const ws = wsConnect(TEST_TOKEN);
    const msg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ws message timeout')), 5000);
      ws.on('message', (raw) => {
        clearTimeout(timeout);
        resolve(JSON.parse(raw.toString()));
      });
      ws.on('error', reject);
    });
    ws.close();

    for (const cfg of msg.data.agentConfigs) {
      assert.ok(cfg.id, 'agentConfig missing id');
      assert.ok(cfg.name, 'agentConfig missing name');
      assert.ok(cfg.platform, 'agentConfig missing platform');
      assert.ok(cfg.type, 'agentConfig missing type');
      assert.ok(cfg.color, 'agentConfig missing color');
    }
  });

  // --- WebSocket routing ---

  it('WS invalid JSON does not crash connection', async () => {
    const ws = wsConnect(TEST_TOKEN);
    // Skip init
    await new Promise((resolve) => { ws.on('message', resolve); });
    // Send garbage
    ws.send('not json at all');
    // Connection should stay open — verify by sending a valid ping
    const alive = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2000);
      ws.ping();
      ws.on('pong', () => { clearTimeout(timeout); resolve(true); });
    });
    ws.close();
    assert.ok(alive, 'connection should survive invalid JSON');
  });

  it('WS command creates audit entry', async () => {
    const ws = wsConnect(TEST_TOKEN);
    // Skip init
    await new Promise((resolve) => { ws.on('message', resolve); });

    ws.send(JSON.stringify({
      event: 'command',
      targetAgent: 'phoenix-echo',
      text: 'test audit',
      mode: 'direct'
    }));

    // Give server time to process
    await new Promise((resolve) => setTimeout(resolve, 200));

    const res = await httpGet('/api/audit', {
      Authorization: `Bearer ${TEST_TOKEN}`
    });
    ws.close();

    assert.strictEqual(res.status, 200);
    const entry = res.body.find(
      (e) => e.action === 'command' && e.targetAgent === 'phoenix-echo'
    );
    assert.ok(entry, 'audit entry for command not found');
    assert.strictEqual(entry.mode, 'direct');
  });

  it('WS terminal.input creates audit entry', async () => {
    const ws = wsConnect(TEST_TOKEN);
    await new Promise((resolve) => { ws.on('message', resolve); });

    ws.send(JSON.stringify({
      event: 'terminal.input',
      agentId: 'phoenix-echo',
      data: 'hello echo'
    }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    const res = await httpGet('/api/audit', {
      Authorization: `Bearer ${TEST_TOKEN}`
    });
    ws.close();

    const entry = res.body.find(
      (e) => e.action === 'terminal.input' && e.targetAgent === 'phoenix-echo'
    );
    assert.ok(entry, 'audit entry for terminal.input not found');
  });

  it('WS resize does not crash connection', async () => {
    const ws = wsConnect(TEST_TOKEN);
    await new Promise((resolve) => { ws.on('message', resolve); });

    ws.send(JSON.stringify({
      event: 'resize',
      agentId: 'phoenix-echo',
      cols: 120,
      rows: 40
    }));

    const alive = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2000);
      ws.ping();
      ws.on('pong', () => { clearTimeout(timeout); resolve(true); });
    });
    ws.close();
    assert.ok(alive, 'connection should survive resize');
  });

  // --- Phoenix Echo hybrid path ---

  it('command to phoenix-echo surfaces error via terminal.output', async () => {
    // PHOENIX_ECHO_URL points at 127.0.0.1:1 (unreachable).
    // The hybrid.command handler should catch the fetch error and
    // broadcast a terminal.output with the error message.
    const ws = wsConnect(TEST_TOKEN);
    // Skip init
    await new Promise((resolve) => { ws.on('message', resolve); });

    ws.send(JSON.stringify({
      event: 'command',
      targetAgent: 'phoenix-echo',
      text: 'hybrid path test'
    }));

    // Collect messages for up to 3 seconds
    const messages = [];
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        messages.push(msg);
        // Look for the error terminal.output
        if (msg.event === 'terminal.output' && msg.data?.agentId === 'phoenix-echo'
            && msg.data?.data?.includes('Error reaching')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    ws.close();

    const errorMsg = messages.find(
      (m) => m.event === 'terminal.output'
        && m.data?.agentId === 'phoenix-echo'
        && m.data?.data?.includes('Error reaching')
    );
    assert.ok(errorMsg, 'expected error terminal.output for unreachable Phoenix Echo');
  });
});
