const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('agents.js', () => {
  describe('default config', () => {
    // Fresh require to get defaults
    const { agents, ledgers } = require('../agents');

    it('exports 4 agents', () => {
      assert.deepStrictEqual(
        Object.keys(agents).sort(),
        ['codex', 'echo-pro', 'gemini', 'phoenix-echo']
      );
    });

    it('each agent has required fields', () => {
      for (const [id, config] of Object.entries(agents)) {
        assert.ok(config.name, `${id} missing name`);
        assert.ok(config.platform, `${id} missing platform`);
        assert.ok(config.type, `${id} missing type`);
        assert.ok(config.color, `${id} missing color`);
        assert.match(config.color, /^#[0-9A-Fa-f]{6}$/, `${id} color not hex`);
      }
    });

    it('PTY agents have command field', () => {
      const ptyAgents = Object.entries(agents).filter(([, c]) => c.type === 'pty');
      assert.ok(ptyAgents.length >= 3, 'expected at least 3 PTY agents');
      for (const [id, config] of ptyAgents) {
        assert.ok(config.command, `${id} missing command`);
      }
    });

    it('hybrid agents have apiEndpoint', () => {
      const hybridAgents = Object.entries(agents).filter(([, c]) => c.type === 'hybrid');
      assert.ok(hybridAgents.length >= 1, 'expected at least 1 hybrid agent');
      for (const [id, config] of hybridAgents) {
        assert.ok(config.apiEndpoint, `${id} missing apiEndpoint`);
      }
    });

    it('default CLI paths point to /opt/homebrew/bin/', () => {
      assert.match(agents['echo-pro'].command, /\/opt\/homebrew\/bin\/claude/);
      assert.match(agents['gemini'].command, /\/opt\/homebrew\/bin\/gemini/);
      assert.match(agents['codex'].command, /\/opt\/homebrew\/bin\/codex/);
    });

    it('exports 3 ledger configs', () => {
      assert.strictEqual(ledgers.length, 3);
      const ids = ledgers.map(l => l.id).sort();
      assert.deepStrictEqual(ids, ['bridge', 'gauntlet', 'ops']);
    });

    it('each ledger has id, label, and path', () => {
      for (const ledger of ledgers) {
        assert.ok(ledger.id, 'missing id');
        assert.ok(ledger.label, 'missing label');
        assert.ok(ledger.path, 'missing path');
      }
    });
  });

  describe('env overrides', () => {
    it('CLAUDE_PATH overrides echo-pro command', () => {
      const original = process.env.CLAUDE_PATH;
      process.env.CLAUDE_PATH = '/test/path/claude';
      // Clear module cache to re-evaluate
      delete require.cache[require.resolve('../agents')];
      const { agents } = require('../agents');
      assert.strictEqual(agents['echo-pro'].command, '/test/path/claude');
      // Restore
      if (original !== undefined) {
        process.env.CLAUDE_PATH = original;
      } else {
        delete process.env.CLAUDE_PATH;
      }
      delete require.cache[require.resolve('../agents')];
    });

    it('PHOENIX_ECHO_URL overrides phoenix-echo endpoint', () => {
      const original = process.env.PHOENIX_ECHO_URL;
      process.env.PHOENIX_ECHO_URL = 'http://test:9999';
      delete require.cache[require.resolve('../agents')];
      const { agents } = require('../agents');
      assert.strictEqual(agents['phoenix-echo'].apiEndpoint, 'http://test:9999');
      if (original !== undefined) {
        process.env.PHOENIX_ECHO_URL = original;
      } else {
        delete process.env.PHOENIX_ECHO_URL;
      }
      delete require.cache[require.resolve('../agents')];
    });
  });
});
