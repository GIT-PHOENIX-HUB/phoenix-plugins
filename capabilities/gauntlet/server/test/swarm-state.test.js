const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSwarmState } = require('../swarm-state');

describe('swarm-state.js', () => {
  it('returns empty state for empty input', () => {
    const state = buildSwarmState({});
    assert.strictEqual(state.laneCount, 0);
    assert.deepStrictEqual(state.blockers, []);
    assert.deepStrictEqual(state.lanes, []);
    assert.strictEqual(state.bridgeLatest, null);
    assert.strictEqual(state.nextOwner, null);
    assert.ok(state.updatedAt, 'missing updatedAt');
  });

  it('parses ops lines into lanes', () => {
    const opsContent = [
      '# Header line (skipped)',
      '2026-03-07T10:00:00Z | Echo Pro | Mission Alpha | ACTIVE | working on tests',
      '2026-03-07T10:05:00Z | Gemini | Mission Beta | ACTIVE | reviewing code'
    ].join('\n');

    const state = buildSwarmState({ opsContent });
    assert.strictEqual(state.laneCount, 2);
    assert.strictEqual(state.lanes[0].source, 'Gemini');
    assert.strictEqual(state.lanes[1].source, 'Echo Pro');
  });

  it('deduplicates ops lanes by source (keeps latest)', () => {
    const opsContent = [
      '2026-03-07T10:00:00Z | Echo Pro | Mission A | ACTIVE | first entry',
      '2026-03-07T10:05:00Z | Echo Pro | Mission B | ACTIVE | second entry'
    ].join('\n');

    const state = buildSwarmState({ opsContent });
    assert.strictEqual(state.laneCount, 1);
    assert.strictEqual(state.lanes[0].mission, 'Mission B');
  });

  it('detects blockers from ops BLOCK/WAITING/STALE status', () => {
    const opsContent = [
      '2026-03-07T10:00:00Z | Echo Pro | Mission A | BLOCKED | waiting on API key',
      '2026-03-07T10:01:00Z | Gemini | Mission B | ACTIVE | no issues'
    ].join('\n');

    const state = buildSwarmState({ opsContent });
    assert.strictEqual(state.blockers.length, 1);
    assert.strictEqual(state.blockers[0].source, 'Echo Pro');
    assert.match(state.blockers[0].status, /BLOCK/i);
  });

  it('parses bridge entries', () => {
    const bridgeContent = [
      '## 2026-03-07T10:00:00Z | Echo Pro | Mission Alpha | HANDOFF',
      '- `scope`: test parsing',
      '- `next_owner`: Gemini',
      '- `actions`: review + merge'
    ].join('\n');

    const state = buildSwarmState({ bridgeContent });
    assert.ok(state.bridgeLatest, 'bridgeLatest should exist');
    assert.strictEqual(state.bridgeLatest.source, 'Echo Pro');
    assert.strictEqual(state.bridgeLatest.type, 'HANDOFF');
    assert.strictEqual(state.bridgeLatest.fields.next_owner, 'Gemini');
    assert.strictEqual(state.nextOwner, 'Gemini');
  });

  it('detects bridge BLOCK entries as blockers', () => {
    const bridgeContent = [
      '## 2026-03-07T10:00:00Z | Codex | Build failure | BLOCK',
      '- `scope`: CI pipeline',
      '- `actions`: fix node-pty build'
    ].join('\n');

    const state = buildSwarmState({ bridgeContent });
    assert.strictEqual(state.blockers.length, 1);
    assert.strictEqual(state.blockers[0].source, 'Codex');
  });

  it('skips malformed ops lines (< 5 pipe segments)', () => {
    const opsContent = [
      'not enough | pipes',
      '2026-03-07T10:00:00Z | Echo Pro | Mission A | ACTIVE | valid line'
    ].join('\n');

    const state = buildSwarmState({ opsContent });
    assert.strictEqual(state.laneCount, 1);
  });

  it('orders lanes by recency, not Map insertion order', () => {
    // Echo Pro appears first in the ledger (T1), gets updated last (T3).
    // Gemini appears second (T2). With Map insertion order, Echo Pro
    // would appear before Gemini. With timestamp sort, Echo Pro is most
    // recent and should appear first after reverse.
    const opsContent = [
      '2026-03-07T10:00:00Z | Echo Pro | Mission A | ACTIVE | start',
      '2026-03-07T10:05:00Z | Gemini | Mission B | ACTIVE | middle',
      '2026-03-07T10:10:00Z | Echo Pro | Mission C | ACTIVE | latest'
    ].join('\n');

    const state = buildSwarmState({ opsContent });
    assert.strictEqual(state.laneCount, 2);
    // Echo Pro updated at T3 (most recent) should be first
    assert.strictEqual(state.lanes[0].source, 'Echo Pro');
    assert.strictEqual(state.lanes[0].mission, 'Mission C');
    // Gemini at T2 should be second
    assert.strictEqual(state.lanes[1].source, 'Gemini');
  });

  it('handles combined ops + bridge input', () => {
    const opsContent = '2026-03-07T10:00:00Z | Echo Pro | Mission A | ACTIVE | coding';
    const bridgeContent = [
      '## 2026-03-07T10:05:00Z | Gemini | Review pass | HANDOFF',
      '- `next_owner`: Echo Pro'
    ].join('\n');

    const state = buildSwarmState({ opsContent, bridgeContent });
    assert.strictEqual(state.laneCount, 1);
    assert.ok(state.bridgeLatest);
    assert.strictEqual(state.nextOwner, 'Echo Pro');
  });
});
