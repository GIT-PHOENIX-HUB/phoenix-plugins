/**
 * Process Supervisor — manages PTY sessions for each agent
 * Spawns, monitors, restarts, and streams agent terminal output
 */

const pty = require('node-pty');
const { agents } = require('./agents');
const { EventEmitter } = require('events');
const { log } = require('./logger');

class Supervisor extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.restartCounts = new Map();
    this.restartTimers = new Map();
    this.stabilityTimers = new Map();
    this.MAX_RESTARTS = 3;
    this.RESTART_DELAY_BASE = 2000;
    this.STABILITY_THRESHOLD = 60000; // reset restart count after 60s uptime
  }

  /**
   * Start an agent PTY process
   */
  startAgent(agentId) {
    const config = agents[agentId];
    if (!config) throw new Error(`Unknown agent: ${agentId}`);

    // Guard against duplicate spawns
    const existing = this.processes.get(agentId);
    if (existing && existing.status === 'running') {
      return; // Already running, don't spawn another
    }

    if (config.type === 'hybrid') {
      // Phoenix Echo connects via Gateway API — no local PTY needed
      this.processes.set(agentId, {
        type: 'hybrid',
        status: 'connected',
        config
      });
      this.emit('agent.status', { agentId, status: 'connected' });
      return;
    }

    const shell = config.command;
    const args = config.args || [];
    const env = { ...process.env, ...config.env };

    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: config.cwd || process.env.HOME,
      env
    });

    const entry = {
      type: 'pty',
      pty: proc,
      status: 'running',
      config,
      startedAt: new Date()
    };

    // Stream terminal output
    proc.onData((data) => {
      this.emit('terminal.output', { agentId, data });
    });

    // Handle process exit
    proc.onExit(({ exitCode, signal }) => {
      entry.status = 'stopped';
      this.emit('agent.status', {
        agentId,
        status: 'stopped',
        exitCode,
        signal
      });
      // Only auto-restart if not intentionally stopped
      if (!entry.stoppedIntentionally) {
        this.handleExit(agentId, exitCode);
      }
    });

    this.processes.set(agentId, entry);
    this.emit('agent.status', { agentId, status: 'running' });

    // Reset restart count after sustained uptime
    this.clearStabilityTimer(agentId);
    const stabilityTimer = setTimeout(() => {
      this.restartCounts.set(agentId, 0);
      this.stabilityTimers.delete(agentId);
    }, this.STABILITY_THRESHOLD);
    stabilityTimer.unref();
    this.stabilityTimers.set(agentId, stabilityTimer);
  }

  /**
   * Handle agent exit — restart with backoff if under limit
   */
  handleExit(agentId, exitCode) {
    this.clearStabilityTimer(agentId);
    this.clearRestartTimer(agentId);
    const count = (this.restartCounts.get(agentId) || 0) + 1;
    this.restartCounts.set(agentId, count);

    if (count <= this.MAX_RESTARTS) {
      const delay = this.RESTART_DELAY_BASE * Math.pow(2, count - 1);
      this.emit('agent.status', { agentId, status: 'restarting', attempt: count });

      const timer = setTimeout(() => {
        this.restartTimers.delete(agentId);
        this.startAgent(agentId);
      }, delay);
      timer.unref();
      this.restartTimers.set(agentId, timer);
    } else {
      this.emit('agent.status', { agentId, status: 'down', reason: 'max restarts exceeded' });
    }
  }

  /**
   * Send input to an agent's PTY
   */
  writeToAgent(agentId, data) {
    const entry = this.processes.get(agentId);
    if (!entry) return false;

    if (entry.type === 'pty' && entry.pty) {
      entry.pty.write(data);
      return true;
    }

    if (entry.type === 'hybrid') {
      // Phoenix Echo — route through Gateway API
      this.emit('hybrid.command', { agentId, data });
      return true;
    }

    return false;
  }

  /**
   * Restart a specific agent
   */
  restartAgent(agentId) {
    this.stopAgent(agentId);
    this.restartCounts.set(agentId, 0);
    const timer = setTimeout(() => {
      this.restartTimers.delete(agentId);
      this.startAgent(agentId);
    }, 1000);
    timer.unref();
    this.restartTimers.set(agentId, timer);
  }

  /**
   * Stop a specific agent
   */
  stopAgent(agentId) {
    this.clearRestartTimer(agentId);
    this.clearStabilityTimer(agentId);

    const entry = this.processes.get(agentId);
    if (!entry || entry.type !== 'pty') return;

    entry.stoppedIntentionally = true;
    entry.pty.kill();
    entry.status = 'stopped';
    this.emit('agent.status', { agentId, status: 'stopped' });
  }

  /**
   * Start all agents
   */
  startAll() {
    for (const agentId of Object.keys(agents)) {
      try {
        this.startAgent(agentId);
      } catch (err) {
        log('error', 'agent.start_failed', { agentId, error: err.message });
        this.emit('agent.status', { agentId, status: 'error', error: err.message });
      }
    }
  }

  /**
   * Stop all agents
   */
  stopAll() {
    for (const agentId of this.processes.keys()) {
      this.stopAgent(agentId);
    }
  }

  /**
   * Get status of all agents
   */
  clearRestartTimer(agentId) {
    const timer = this.restartTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(agentId);
    }
  }

  clearStabilityTimer(agentId) {
    const timer = this.stabilityTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.stabilityTimers.delete(agentId);
    }
  }

  getStatus() {
    const status = {};
    for (const [agentId, entry] of this.processes) {
      status[agentId] = {
        name: entry.config.name,
        platform: entry.config.platform,
        type: entry.type,
        status: entry.status,
        color: entry.config.color,
        startedAt: entry.startedAt,
        restartCount: this.restartCounts.get(agentId) || 0
      };
    }
    return status;
  }

  /**
   * Resize agent terminal
   */
  resizeAgent(agentId, cols, rows) {
    const entry = this.processes.get(agentId);
    if (entry && entry.type === 'pty' && entry.pty) {
      entry.pty.resize(cols, rows);
    }
  }
}

module.exports = Supervisor;
