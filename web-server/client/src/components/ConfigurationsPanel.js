import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConfigurationsPanel.css';

function Toggle({ value, onChange }) {
  return (
    <button
      className={`config-toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

function CardFeedback({ status }) {
  if (!status) return null;
  return (
    <div className={`card-feedback ${status.type}`}>
      {status.message}
    </div>
  );
}

function AiCanSpeakCard({ guildId, initial }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [chance, setChance] = useState(initial?.chance ?? 100);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setStatus(null);
    const value = !enabled ? 'false' : String(chance);
    try {
      await axios.post('/api/admin/config/aicanspeak', { guildId, value }, { withCredentials: true });
      setStatus({ type: 'success', message: 'Saved!' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/aicanspeak</div>
          <div className="config-card-desc">Control whether AI responds to player messages in chat</div>
        </div>
        <div className={`config-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? 'ENABLED' : 'DISABLED'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">AI Responses</span>
          <Toggle value={enabled} onChange={setEnabled} />
          <span className="config-value-hint">{enabled ? 'On' : 'Off'}</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">Response Chance</span>
          <input
            type="number"
            className="config-number-input"
            min={1}
            max={100}
            value={chance}
            disabled={!enabled}
            onChange={e => setChance(Math.min(100, Math.max(1, Number(e.target.value))))}
          />
          <span className="config-value-hint">%</span>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button className="config-save-btn" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

function RoleplayCard({ guildId, initial }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [timeout, setTimeout2] = useState(initial?.timeout ?? '5m');
  const [aipause, setAipause] = useState(initial?.aipause ?? false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setStatus(null);
    try {
      await axios.post('/api/admin/config/roleplay', { guildId, enabled, timeout, aipause }, { withCredentials: true });
      setStatus({ type: 'success', message: 'Saved!' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/roleplay</div>
          <div className="config-card-desc">Toggle roleplay mode and set player response timeout</div>
        </div>
        <div className={`config-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? 'ENABLED' : 'DISABLED'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">Roleplay Mode</span>
          <Toggle value={enabled} onChange={setEnabled} />
          <span className="config-value-hint">{enabled ? 'On' : 'Off'}</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">Timeout</span>
          <input
            type="text"
            className="config-text-input"
            placeholder="5m"
            value={timeout}
            disabled={!enabled}
            onChange={e => setTimeout2(e.target.value)}
          />
          <span className="config-value-hint">e.g. 5m, 2h, 30s</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">AI Pause</span>
          <Toggle value={aipause} onChange={setAipause} />
          <span className="config-value-hint">Pause after AI turn for GM narration</span>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button className="config-save-btn" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

function ConfigurationsPanel({ guildId }) {
  const [config, setConfig] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      axios.get(`/api/admin/config/${guildId}`, { withCredentials: true }),
      axios.get(`/api/admin/guild/${guildId}/metadata`, { withCredentials: true })
    ]).then(([configRes, metaRes]) => {
      setConfig(configRes.data);
      setMetadata(metaRes.data);
    }).catch(() => setLoadError('Failed to load configuration. Is the bot online?'));
  }, [guildId]);

  if (loadError) {
    return <div className="config-load-error">{loadError}</div>;
  }

  if (!config || !metadata) {
    return <div className="config-loading">Loading configurations...</div>;
  }

  return (
    <div className="configurations-panel">
      <AiCanSpeakCard guildId={guildId} initial={config.aicanspeak} />
      <RoleplayCard guildId={guildId} initial={config.roleplay} />
    </div>
  );
}

export default ConfigurationsPanel;
