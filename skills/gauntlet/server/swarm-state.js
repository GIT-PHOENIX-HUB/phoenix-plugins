function parseOpsLine(line) {
  const parts = line.split('|').map((part) => part.trim());
  if (parts.length < 5) return null;

  return {
    timestamp: parts[0],
    source: parts[1],
    mission: parts[2],
    status: parts[3],
    detail: parts.slice(4).join(' | ')
  };
}

function parseBridgeEntries(content) {
  if (!content.trim()) return [];

  const entries = [];
  const sections = content.split(/^##\s+/m).slice(1);

  for (const section of sections) {
    const [headerLine, ...bodyLines] = section.split(/\r?\n/);
    const headerParts = headerLine.split('|').map((part) => part.trim());
    if (headerParts.length < 3) continue;

    const timestamp = headerParts[0];
    const source = headerParts[1];
    const type = headerParts[headerParts.length - 1];
    const mission = headerParts.length > 3 ? headerParts.slice(2, -1).join(' | ') : '';
    const fields = {};

    for (const line of bodyLines) {
      const match = line.match(/^- `([^`]+)`: ?(.*)$/);
      if (match) {
        fields[match[1]] = match[2];
      }
    }

    entries.push({
      timestamp,
      source,
      mission,
      type,
      fields
    });
  }

  return entries;
}

function buildSwarmState({ opsContent = '', bridgeContent = '' }) {
  const opsEntries = opsContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('|'))
    .map(parseOpsLine)
    .filter(Boolean);

  const bridgeEntries = parseBridgeEntries(bridgeContent);

  const latestLaneBySource = new Map();
  for (const entry of opsEntries) {
    latestLaneBySource.set(entry.source, entry);
  }

  const lanes = Array.from(latestLaneBySource.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-8)
    .reverse();
  const bridgeLatest = bridgeEntries[bridgeEntries.length - 1] || null;

  const blockers = [
    ...lanes
      .filter((entry) => /BLOCK|WAITING|STALE/i.test(entry.status))
      .map((entry) => ({
        source: entry.source,
        mission: entry.mission,
        status: entry.status,
        detail: entry.detail,
        timestamp: entry.timestamp
      })),
    ...bridgeEntries
      .filter((entry) => /BLOCK/i.test(entry.type))
      .slice(-5)
      .map((entry) => ({
        source: entry.source,
        mission: entry.mission || entry.fields.scope || entry.type,
        status: entry.type,
        detail: entry.fields.actions || entry.fields.scope || '',
        timestamp: entry.timestamp
      }))
  ].slice(-8).reverse();

  return {
    updatedAt: new Date().toISOString(),
    laneCount: lanes.length,
    blockers,
    lanes,
    bridgeLatest,
    nextOwner: bridgeLatest?.fields?.next_owner || null
  };
}

module.exports = { buildSwarmState };
