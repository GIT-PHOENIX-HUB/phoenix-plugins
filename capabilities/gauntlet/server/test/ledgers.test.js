const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We only test the pure logic (registry without chokidar watcher).
// Importing the module pulls in chokidar, but watch() is never called here.
const { createLedgerRegistry } = require('../ledgers');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-test-'));

describe('ledgers.js', () => {
  const ledgerPath = path.join(tmpDir, 'TEST_LEDGER.md');
  const configs = [
    { id: 'test', label: 'Test Ledger', path: ledgerPath }
  ];

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('missing file', () => {
    it('getSnapshots returns exists:false when file missing', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll();
      const snaps = reg.getSnapshots();
      assert.strictEqual(snaps.length, 1);
      assert.strictEqual(snaps[0].exists, false);
      assert.deepStrictEqual(snaps[0].lines, []);
    });

    it('getTail returns exists:false for missing file', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll();
      const tail = reg.getTail('test');
      assert.strictEqual(tail.exists, false);
    });

    it('getTail returns null for unknown id', () => {
      const reg = createLedgerRegistry(configs);
      const tail = reg.getTail('nonexistent');
      assert.strictEqual(tail, null);
    });
  });

  describe('with file', () => {
    before(() => {
      fs.writeFileSync(ledgerPath, 'line1\nline2\nline3\n');
    });

    it('refreshAll reads file content', () => {
      const reg = createLedgerRegistry(configs);
      const snaps = reg.refreshAll();
      assert.strictEqual(snaps.length, 1);
      assert.strictEqual(snaps[0].exists, true);
      assert.ok(snaps[0].lines.length >= 3);
    });

    it('getSnapshots respects line limit', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll();
      const snaps = reg.getSnapshots(2);
      assert.strictEqual(snaps[0].lines.length, 2);
      assert.strictEqual(snaps[0].lines[0], 'line2');
      assert.strictEqual(snaps[0].lines[1], 'line3');
    });

    it('getTail respects limit', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll();
      const tail = reg.getTail('test', 1);
      assert.strictEqual(tail.lines.length, 1);
      assert.strictEqual(tail.lines[0], 'line3');
    });

    it('getContentById returns joined content', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll();
      const content = reg.getContentById('test');
      assert.ok(content.includes('line1'));
      assert.ok(content.includes('line3'));
    });

    it('getContentById returns empty string for unknown id', () => {
      const reg = createLedgerRegistry(configs);
      assert.strictEqual(reg.getContentById('bogus'), '');
    });

    it('refreshAll detects appended lines', () => {
      const reg = createLedgerRegistry(configs);
      reg.refreshAll(); // initial read

      fs.writeFileSync(ledgerPath, 'line1\nline2\nline3\nline4\n');
      const snaps = reg.refreshAll();
      assert.strictEqual(snaps[0].appendedLines.length, 1);
      assert.strictEqual(snaps[0].appendedLines[0], 'line4');
      assert.strictEqual(snaps[0].reset, false);
    });

    it('refreshAll detects reset when file shrinks', () => {
      const reg = createLedgerRegistry(configs);

      fs.writeFileSync(ledgerPath, 'a\nb\nc\n');
      reg.refreshAll();

      fs.writeFileSync(ledgerPath, 'x\n');
      const snaps = reg.refreshAll();
      assert.strictEqual(snaps[0].reset, true);
    });
  });
});
