/**
 * Agent spawn configurations for the Phoenix AI Gauntlet
 * Each agent has its own spawn command, env, and connection type
 */

const path = require('path');

const HOME = process.env.HOME || '';
const DEFAULT_PATH = process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
const GATEWAY_PATH = process.env.GATEWAY_PATH || path.join(HOME, 'Phoenix_Local', '_GATEWAY');
const UNIFIED_PROD_PATH = process.env.UNIFIED_PROD_PATH || path.join(HOME, 'GitHub', 'PHOENIX_UNIFIED_PROD_REPO');
const GAUNTLET_LEDGER = process.env.GAUNTLET_LEDGER || path.join(GATEWAY_PATH, 'GAUNTLET_SESSION_LEDGER.md');
const AGENT_BRIDGE_LEDGER = process.env.AGENT_BRIDGE_LEDGER || path.join(UNIFIED_PROD_PATH, 'AGENT_BRIDGE_LEDGER.md');
const SHARED_OPS_LEDGER = process.env.SHARED_OPS_LEDGER || path.join(UNIFIED_PROD_PATH, 'SHARED_OPS_LEDGER.md');
const DEFAULT_AGENT_CWD = process.env.GAUNTLET_WORKDIR || HOME;

const agents = {
  'echo-pro': {
    name: 'Echo Pro',
    platform: 'Claude Code',
    type: 'pty',
    command: process.env.CLAUDE_PATH || '/opt/homebrew/bin/claude',
    args: [],
    env: { PATH: DEFAULT_PATH },
    cwd: process.env.ECHO_PRO_CWD || DEFAULT_AGENT_CWD,
    color: '#FF1A1A'
  },
  'gemini': {
    name: 'Gemini',
    platform: 'Gemini CLI',
    type: 'pty',
    command: process.env.GEMINI_PATH || '/opt/homebrew/bin/gemini',
    args: ['--approval-mode=auto_edit'],
    env: { PATH: DEFAULT_PATH },
    cwd: process.env.GEMINI_CWD || DEFAULT_AGENT_CWD,
    color: '#4285F4'
  },
  'codex': {
    name: 'Codex',
    platform: 'Codex CLI',
    type: 'pty',
    command: process.env.CODEX_PATH || '/opt/homebrew/bin/codex',
    args: ['-s', 'workspace-write', '-a', 'untrusted'],
    env: { PATH: DEFAULT_PATH },
    cwd: process.env.CODEX_CWD || DEFAULT_AGENT_CWD,
    color: '#10A37F'
  },
  'phoenix-echo': {
    name: 'Phoenix Echo',
    platform: 'Phoenix Echo Gateway',
    type: 'hybrid',
    apiEndpoint: process.env.PHOENIX_ECHO_URL || 'http://localhost:18790',
    env: {},
    cwd: process.env.PHOENIX_ECHO_CWD || DEFAULT_AGENT_CWD,
    color: '#D4AF37'
  }
};

const ledgers = [
  {
    id: 'gauntlet',
    label: 'Gauntlet Session',
    path: GAUNTLET_LEDGER
  },
  {
    id: 'bridge',
    label: 'Agent Bridge',
    path: AGENT_BRIDGE_LEDGER
  },
  {
    id: 'ops',
    label: 'Shared Ops',
    path: SHARED_OPS_LEDGER
  }
];

module.exports = {
  agents,
  ledgers,
  GATEWAY_PATH,
  GAUNTLET_LEDGER,
  AGENT_BRIDGE_LEDGER,
  SHARED_OPS_LEDGER
};
