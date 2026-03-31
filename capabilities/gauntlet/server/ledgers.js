const fs = require('fs');
const chokidar = require('chokidar');

function splitLines(content) {
  return content.split(/\r?\n/).filter(Boolean);
}

function tailLines(lines, limit) {
  if (!Array.isArray(lines)) return [];
  return lines.slice(Math.max(0, lines.length - limit));
}

function createLedgerRegistry(ledgerConfigs) {
  const state = new Map();

  for (const ledger of ledgerConfigs) {
    state.set(ledger.id, {
      ...ledger,
      exists: false,
      lines: [],
      updatedAt: null,
      error: null
    });
  }

  function readLedger(id) {
    const current = state.get(id);
    if (!current) return null;

    if (!fs.existsSync(current.path)) {
      current.exists = false;
      current.lines = [];
      current.updatedAt = null;
      current.error = null;
      return { ...current, appendedLines: [], reset: true };
    }

    const content = fs.readFileSync(current.path, 'utf8');
    const nextLines = splitLines(content);
    const previousLines = current.lines || [];
    const reset = nextLines.length < previousLines.length;
    const appendedLines = reset
      ? tailLines(nextLines, Math.min(50, nextLines.length))
      : nextLines.slice(previousLines.length);

    current.exists = true;
    current.lines = nextLines;
    current.updatedAt = new Date().toISOString();
    current.error = null;

    return { ...current, appendedLines, reset };
  }

  function refreshAll() {
    const snapshots = [];
    for (const id of state.keys()) {
      const snapshot = readLedger(id);
      if (snapshot) snapshots.push(snapshot);
    }
    return snapshots;
  }

  function getSnapshots(limit = 80) {
    return Array.from(state.values()).map((ledger) => ({
      id: ledger.id,
      label: ledger.label,
      path: ledger.path,
      exists: ledger.exists,
      updatedAt: ledger.updatedAt,
      lines: tailLines(ledger.lines, limit)
    }));
  }

  function getTail(id, limit = 80) {
    const ledger = state.get(id);
    if (!ledger) return null;
    return {
      id: ledger.id,
      label: ledger.label,
      path: ledger.path,
      exists: ledger.exists,
      updatedAt: ledger.updatedAt,
      lines: tailLines(ledger.lines, limit)
    };
  }

  function getContentById(id) {
    const ledger = state.get(id);
    return ledger ? ledger.lines.join('\n') : '';
  }

  function watch(onUpdate) {
    const watcher = chokidar.watch(
      ledgerConfigs.map((ledger) => ledger.path),
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 300 }
      }
    );

    const handleChange = (filePath) => {
      const ledger = ledgerConfigs.find((entry) => entry.path === filePath);
      if (!ledger) return;
      const snapshot = readLedger(ledger.id);
      if (!snapshot) return;
      onUpdate({
        id: snapshot.id,
        label: snapshot.label,
        path: snapshot.path,
        exists: snapshot.exists,
        updatedAt: snapshot.updatedAt,
        lines: snapshot.appendedLines,
        reset: snapshot.reset
      });
    };

    const handleRemove = (filePath) => {
      const ledger = ledgerConfigs.find((entry) => entry.path === filePath);
      if (!ledger) return;
      const current = state.get(ledger.id);
      if (!current) return;
      current.exists = false;
      current.lines = [];
      current.updatedAt = new Date().toISOString();
      current.error = null;
      onUpdate({
        id: current.id,
        label: current.label,
        path: current.path,
        exists: false,
        updatedAt: current.updatedAt,
        lines: [],
        reset: true
      });
    };

    watcher.on('add', handleChange);
    watcher.on('change', handleChange);
    watcher.on('unlink', handleRemove);

    return watcher;
  }

  return {
    refreshAll,
    getSnapshots,
    getTail,
    getContentById,
    watch
  };
}

module.exports = { createLedgerRegistry };
