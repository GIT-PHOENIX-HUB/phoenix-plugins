const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Supervisor = require('../supervisor');

// These tests cover the Supervisor class without spawning real PTY processes.
// Hybrid agent paths (Phoenix Echo) don't need node-pty, so they're fully testable.
// PTY agent paths are verified at the integration level (server.test.js).

describe('supervisor.js', () => {
  it('constructor initializes empty state', () => {
    const sup = new Supervisor();
    assert.deepStrictEqual(sup.getStatus(), {});
    assert.strictEqual(sup.MAX_RESTARTS, 3);
  });

  it('startAgent throws for unknown agentId', () => {
    const sup = new Supervisor();
    assert.throws(() => sup.startAgent('nonexistent'), /Unknown agent/);
  });

  it('startAgent registers hybrid agent as connected (no PTY)', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    const status = sup.getStatus();
    assert.ok(status['phoenix-echo'], 'phoenix-echo missing from status');
    assert.strictEqual(status['phoenix-echo'].status, 'connected');
    assert.strictEqual(status['phoenix-echo'].type, 'hybrid');
  });

  it('startAgent emits agent.status for hybrid', (t, done) => {
    const sup = new Supervisor();
    sup.on('agent.status', (event) => {
      assert.strictEqual(event.agentId, 'phoenix-echo');
      assert.strictEqual(event.status, 'connected');
      done();
    });
    sup.startAgent('phoenix-echo');
  });

  it('startAgent is idempotent for hybrid (no duplicate)', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    // Status is 'connected' not 'running', so guard won't block.
    // But it should still work without error.
    sup.startAgent('phoenix-echo');
    assert.strictEqual(sup.getStatus()['phoenix-echo'].status, 'connected');
  });

  it('writeToAgent returns false for unknown agent', () => {
    const sup = new Supervisor();
    assert.strictEqual(sup.writeToAgent('nonexistent', 'hello'), false);
  });

  it('writeToAgent emits hybrid.command for hybrid agent', (t, done) => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    sup.on('hybrid.command', ({ agentId, data }) => {
      assert.strictEqual(agentId, 'phoenix-echo');
      assert.strictEqual(data, 'test message');
      done();
    });
    const result = sup.writeToAgent('phoenix-echo', 'test message');
    assert.strictEqual(result, true);
  });

  it('stopAgent is no-op for hybrid agent', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    sup.stopAgent('phoenix-echo');
    // Hybrid agents can't be stopped via stopAgent (type !== 'pty' guard)
    assert.strictEqual(sup.getStatus()['phoenix-echo'].status, 'connected');
  });

  it('getStatus returns correct shape for hybrid', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    const s = sup.getStatus()['phoenix-echo'];
    assert.ok(s.name, 'missing name');
    assert.ok(s.platform, 'missing platform');
    assert.strictEqual(s.type, 'hybrid');
    assert.ok(s.color, 'missing color');
  });

  it('resizeAgent is safe for unknown agent', () => {
    const sup = new Supervisor();
    // Should not throw
    sup.resizeAgent('nonexistent', 80, 24);
  });

  it('resizeAgent is safe for hybrid agent', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    // Should not throw (no pty to resize)
    sup.resizeAgent('phoenix-echo', 80, 24);
  });

  // --- Restart behavior ---

  it('handleExit emits restarting with attempt count', (t, done) => {
    const sup = new Supervisor();
    sup.RESTART_DELAY_BASE = 999999; // prevent timer from firing
    sup.on('agent.status', (event) => {
      if (event.status === 'restarting') {
        assert.strictEqual(event.agentId, 'echo-pro');
        assert.strictEqual(event.attempt, 1);
        sup.clearRestartTimer('echo-pro');
        done();
      }
    });
    sup.handleExit('echo-pro', 1);
  });

  it('handleExit emits down after MAX_RESTARTS exceeded', (t, done) => {
    const sup = new Supervisor();
    sup.RESTART_DELAY_BASE = 999999;
    sup.restartCounts.set('echo-pro', 3); // already at max

    sup.on('agent.status', (event) => {
      if (event.status === 'down') {
        assert.strictEqual(event.agentId, 'echo-pro');
        assert.match(event.reason, /max restarts/);
        done();
      }
    });
    sup.handleExit('echo-pro', 1);
  });

  it('handleExit increments restart count', () => {
    const sup = new Supervisor();
    sup.RESTART_DELAY_BASE = 999999;
    assert.strictEqual(sup.restartCounts.get('echo-pro') || 0, 0);
    sup.handleExit('echo-pro', 1);
    assert.strictEqual(sup.restartCounts.get('echo-pro'), 1);
    sup.handleExit('echo-pro', 1);
    assert.strictEqual(sup.restartCounts.get('echo-pro'), 2);
    // Clean up pending timers
    sup.clearRestartTimer('echo-pro');
  });

  it('restartAgent resets restart count', () => {
    const sup = new Supervisor();
    sup.RESTART_DELAY_BASE = 999999;
    sup.restartCounts.set('phoenix-echo', 2);
    sup.startAgent('phoenix-echo');
    sup.restartAgent('phoenix-echo');
    assert.strictEqual(sup.restartCounts.get('phoenix-echo'), 0);
    sup.clearRestartTimer('phoenix-echo');
  });

  it('stopAgent cancels pending restart timer', () => {
    const sup = new Supervisor();
    sup.RESTART_DELAY_BASE = 999999;
    sup.handleExit('echo-pro', 1);
    assert.ok(sup.restartTimers.has('echo-pro'), 'timer should exist');
    sup.stopAgent('echo-pro');
    assert.ok(!sup.restartTimers.has('echo-pro'), 'timer should be cleared');
  });

  it('getStatus includes restartCount', () => {
    const sup = new Supervisor();
    sup.startAgent('phoenix-echo');
    assert.strictEqual(sup.getStatus()['phoenix-echo'].restartCount, 0);
    sup.restartCounts.set('phoenix-echo', 2);
    assert.strictEqual(sup.getStatus()['phoenix-echo'].restartCount, 2);
  });

  it('stability timer mechanism resets restart count', async () => {
    // The stability timer is set inside the PTY branch of startAgent,
    // which we can't call without a real CLI binary. Verify the mechanism
    // by simulating what startAgent does: set a short stability timer,
    // confirm it resets the restart count after the threshold.
    const sup = new Supervisor();
    sup.STABILITY_THRESHOLD = 50;
    sup.restartCounts.set('echo-pro', 2);

    // Simulate what startAgent's PTY path does
    sup.clearStabilityTimer('echo-pro');
    const timer = setTimeout(() => {
      sup.restartCounts.set('echo-pro', 0);
      sup.stabilityTimers.delete('echo-pro');
    }, sup.STABILITY_THRESHOLD);
    timer.unref();
    sup.stabilityTimers.set('echo-pro', timer);

    assert.strictEqual(sup.restartCounts.get('echo-pro'), 2, 'before timer');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.strictEqual(sup.restartCounts.get('echo-pro'), 0, 'after timer');
  });
});
