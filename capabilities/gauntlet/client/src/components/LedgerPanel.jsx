import React, { useEffect, useRef } from 'react';

function LedgerPanel({ open, ledgers, selectedLedgerId, onSelectLedger, onClose }) {
  const contentRef = useRef(null);
  const ledgerList = Object.values(ledgers || {});
  const selectedLedger = ledgers?.[selectedLedgerId] || ledgerList[0];

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [selectedLedgerId, selectedLedger?.lines]);

  return (
    <div className={`ledger-panel ${open ? 'open' : ''}`}>
      <div className="ledger-header">
        <span>SWARM LEDGERS</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          X
        </button>
      </div>
      <div className="ledger-tabs">
        {ledgerList.map((ledger) => (
          <button
            key={ledger.id}
            className={`ledger-tab ${selectedLedger?.id === ledger.id ? 'active' : ''}`}
            onClick={() => onSelectLedger(ledger.id)}
          >
            {ledger.label}
          </button>
        ))}
      </div>
      <div className="ledger-meta">
        {selectedLedger ? (
          <>
            <div>{selectedLedger.exists ? 'Watching' : 'Missing'}</div>
            <div>{selectedLedger.path}</div>
          </>
        ) : (
          <div>No ledgers available</div>
        )}
      </div>
      <div className="ledger-content" ref={contentRef}>
        {(selectedLedger?.lines || []).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export default LedgerPanel;
