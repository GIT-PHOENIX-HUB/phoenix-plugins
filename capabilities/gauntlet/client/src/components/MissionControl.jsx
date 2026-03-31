import React from 'react';

function MissionControl({ agents, agentConfigs, swarmState }) {
  const lanes = swarmState?.lanes || [];
  const blockers = swarmState?.blockers || [];
  const bridgeLatest = swarmState?.bridgeLatest;

  return (
    <div className="mission-control">
      <div className="mission-section">
        <div className="mission-section-title">Agent Runtime</div>
        <div className="mission-runtime-grid">
          {agentConfigs.map((config) => {
            const agent = agents[config.id] || {};
            return (
              <div
                key={config.id}
                className="mission-agent"
                style={{ borderTopColor: config.color, borderTopWidth: 2 }}
              >
                <div className="mission-agent-name">
                  <div
                    className={`status-dot ${agent.status || 'stopped'}`}
                    style={{ width: 6, height: 6 }}
                  />
                  <span style={{ color: config.color }}>{config.name}</span>
                </div>
                <div className={`mission-task ${agent.status === 'running' || agent.status === 'connected' ? 'active' : ''}`}>
                  {agent.status || 'stopped'}
                </div>
                <div className="mission-subtext">{config.platform}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mission-section">
        <div className="mission-section-title">Swarm Lanes</div>
        <div className="mission-lanes-grid">
          {lanes.length > 0 ? lanes.map((lane, index) => (
            <div key={`${lane.source}-${lane.timestamp}-${index}`} className="mission-agent swarm-lane">
              <div className="mission-agent-name">
                <span>{lane.source}</span>
              </div>
              <div className="mission-task active">{lane.mission}</div>
              <div className={`mission-status-pill ${/BLOCK|WAITING|STALE/i.test(lane.status) ? 'warn' : 'ok'}`}>
                {lane.status}
              </div>
              <div className="mission-subtext">{lane.detail}</div>
              <div className="mission-timestamp">{lane.timestamp}</div>
            </div>
          )) : (
            <div className="mission-empty">No swarm lane data yet.</div>
          )}
        </div>
      </div>

      <div className="mission-section mission-section-bridge">
        <div className="mission-section-title">Bridge + Blocks</div>
        <div className="mission-agent bridge-card">
          <div className="mission-agent-name">
            <span>Latest Bridge Entry</span>
          </div>
          <div className="mission-task active">
            {bridgeLatest ? `${bridgeLatest.source} | ${bridgeLatest.type}` : 'No bridge traffic yet'}
          </div>
          <div className="mission-subtext">
            {bridgeLatest?.fields?.scope || bridgeLatest?.mission || 'Waiting for first detailed handoff'}
          </div>
          <div className="mission-subtext">
            Next owner: {swarmState?.nextOwner || 'Unassigned'}
          </div>
        </div>
        <div className="mission-block-list">
          {blockers.length > 0 ? blockers.map((blocker, index) => (
            <div key={`${blocker.source}-${blocker.timestamp}-${index}`} className="mission-block-item">
              <strong>{blocker.source}</strong> {blocker.status} {blocker.mission ? `| ${blocker.mission}` : ''}
              <div className="mission-subtext">{blocker.detail}</div>
            </div>
          )) : (
            <div className="mission-empty">No active blockers or waits detected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MissionControl;
