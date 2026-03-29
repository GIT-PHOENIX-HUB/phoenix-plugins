import React, { useState, useRef, useEffect } from 'react';

function CommandBar({ agentConfigs, onSend }) {
  const [target, setTarget] = useState('echo-pro');
  const [input, setInput] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    onSend(
      isBroadcast ? 'all' : target,
      input,
      isBroadcast ? 'broadcast' : 'direct'
    );
    setInput('');

    // Visual feedback
    setSending(true);
    setTimeout(() => setSending(false), 200);
  };

  // Keyboard shortcuts: / or Ctrl+K to focus, Escape to blur
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus on / or Ctrl+K
      if ((e.key === '/' && !e.ctrlKey && !e.metaKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        // Don't focus if already typing in input
        if (document.activeElement === inputRef.current) return;
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Blur on Escape
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form className="command-bar" onSubmit={handleSubmit}>
      <div className="command-targets">
        {agentConfigs.map(config => (
          <button
            key={config.id}
            type="button"
            className={`command-target ${!isBroadcast && target === config.id ? 'active' : ''}`}
            style={!isBroadcast && target === config.id ? { borderColor: config.color, color: config.color } : {}}
            onClick={() => { setTarget(config.id); setIsBroadcast(false); }}
          >
            @{config.id.split('-')[0]}
          </button>
        ))}
        <button
          type="button"
          className={`command-target broadcast ${isBroadcast ? 'active' : ''}`}
          onClick={() => setIsBroadcast(true)}
        >
          @all
        </button>
      </div>
      <input
        ref={inputRef}
        className={`command-input ${sending ? 'sending' : ''}`}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={isBroadcast ? 'Broadcast to all agents...' : `Send to ${target}...`}
        autoFocus
      />
    </form>
  );
}

export default CommandBar;
