import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ConfigurationsPanel.css';

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      className={`config-toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      type="button"
      disabled={disabled}
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
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const showFeedback = (type, message) => {
    clearTimeout(timerRef.current);
    setStatus({ type, message });
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const value = !enabled ? 'false' : String(chance);
    try {
      await axios.post('/api/admin/config/aicanspeak', { guildId, value }, { withCredentials: true });
      showFeedback('success', 'Saved!');
    } catch (err) {
      console.error('aicanspeak save failed:', err);
      showFeedback('error', 'Failed to save. Please try again.');
    }
    setSaving(false);
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
        <button className="config-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function RoleplayCard({ guildId, initial }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [timeout, setTimeout2] = useState(initial?.timeout ?? '5m');
  const [aipause, setAipause] = useState(initial?.aipause ?? false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const showFeedback = (type, message) => {
    clearTimeout(timerRef.current);
    setStatus({ type, message });
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await axios.post('/api/admin/config/roleplay', { guildId, enabled, timeout, aipause }, { withCredentials: true });
      showFeedback('success', 'Saved!');
    } catch (err) {
      console.error('roleplay save failed:', err);
      showFeedback('error', 'Failed to save. Please try again.');
    }
    setSaving(false);
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
          <Toggle value={aipause} onChange={setAipause} disabled={!enabled} />
          <span className="config-value-hint">Pause after AI turn for GM narration</span>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button className="config-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function SetGmCard({ guildId, initial, roles }) {
  const [currentRole, setCurrentRole] = useState(
    initial?.roleId ? { id: initial.roleId, name: initial.roleName } : null
  );
  const [users, setUsers] = useState(initial?.users ?? []);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const showFeedback = (type, message) => {
    clearTimeout(timerRef.current);
    setStatus({ type, message });
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  };

  const handleSelectRole = async (role) => {
    setDropdownOpen(false);
    setSearch('');
    try {
      await axios.post('/api/admin/config/setgm', { guildId, roleId: role.id }, { withCredentials: true });
      setCurrentRole(role);
      showFeedback('success', `GM role set to @${role.name}`);
    } catch (err) {
      console.error('setgm role failed:', err);
      showFeedback('error', 'Failed to set GM role.');
    }
  };

  const handleRemoveRole = async () => {
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, roleId: currentRole.id }, withCredentials: true });
      setCurrentRole(null);
      showFeedback('success', 'GM role removed.');
    } catch (err) {
      console.error('setgm role remove failed:', err);
      showFeedback('error', 'Failed to remove GM role.');
    }
  };

  const handleAddUser = async () => {
    if (!newUserId.trim()) return;
    try {
      await axios.post('/api/admin/config/setgm', { guildId, userId: newUserId.trim() }, { withCredentials: true });
      setUsers(prev => [...prev, { id: newUserId.trim(), displayName: newUserId.trim() }]);
      setNewUserId('');
      showFeedback('success', 'User added as GM.');
    } catch (err) {
      console.error('setgm add user failed:', err);
      showFeedback('error', 'Failed to add user.');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, userId }, withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
      showFeedback('success', 'User removed.');
    } catch (err) {
      console.error('setgm remove user failed:', err);
      showFeedback('error', 'Failed to remove user.');
    }
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/setgm</div>
          <div className="config-card-desc">Grant GM permissions to a role or individual users</div>
        </div>
        <div className={`config-status-badge ${currentRole || users.length ? 'active' : 'inactive'}`}>
          {currentRole || users.length ? 'CONFIGURED' : 'NOT SET'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-section-label">GM Role</div>
        {currentRole && (
          <div className="config-tag">
            <span>@ {currentRole.name}</span>
            <button className="config-tag-remove" onClick={handleRemoveRole}>✕</button>
          </div>
        )}
        <div className="config-role-search-wrapper">
          <input
            type="text"
            className="config-text-input full"
            placeholder="Search roles..."
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          />
          {dropdownOpen && filteredRoles.length > 0 && (
            <div className="config-role-dropdown">
              {filteredRoles.map(r => (
                <div key={r.id} className="config-role-option" onMouseDown={() => handleSelectRole(r)}>
                  <span className="role-at">@</span> {r.name}
                </div>
              ))}
              <div className="config-role-dropdown-footer">
                Showing {filteredRoles.length} of {roles.length} roles
              </div>
            </div>
          )}
        </div>

        <div className="config-section-label" style={{ marginTop: '16px' }}>Individual GM Users</div>
        {users.map(u => (
          <div key={u.id} className="config-user-row">
            <span>{u.displayName}</span>
            <button className="config-remove-link" onClick={() => handleRemoveUser(u.id)}>Remove</button>
          </div>
        ))}
        <div className="config-row" style={{ marginTop: '8px' }}>
          <input
            type="text"
            className="config-text-input"
            placeholder="Discord user ID..."
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUser()}
          />
          <button className="config-add-btn" onClick={handleAddUser}>Add</button>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
      </div>
    </div>
  );
}

function ConfigurationsPanel({ guildId }) {
  const [config, setConfig] = useState(null);
  // metadata (channels + roles) is consumed by SetGmCard and LogChannelCard added in later tasks
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!guildId) return;
    setConfig(null);
    setMetadata(null);
    setLoadError(null);
    Promise.all([
      axios.get(`/api/admin/config/${guildId}`, { withCredentials: true }),
      axios.get(`/api/admin/guild/${guildId}/metadata`, { withCredentials: true })
    ]).then(([configRes, metaRes]) => {
      setConfig(configRes.data);
      setMetadata(metaRes.data);
    }).catch(err => {
      console.error('ConfigurationsPanel load failed:', err);
      setLoadError('Failed to load configuration. Is the bot online?');
    });
  }, [guildId]);

  if (loadError) {
    return <div className="config-load-error">{loadError}</div>;
  }

  if (!config || !metadata) {
    return <div className="config-loading">Loading configurations...</div>;
  }

  return (
    <div className="configurations-panel">
      <AiCanSpeakCard key={`aicanspeak-${guildId}`} guildId={guildId} initial={config.aicanspeak} />
      <RoleplayCard key={`roleplay-${guildId}`} guildId={guildId} initial={config.roleplay} />
      <SetGmCard key={`setgm-${guildId}`} guildId={guildId} initial={config.setgm} roles={metadata.roles} />
      {/* LogChannelCards added in next task */}
    </div>
  );
}

export default ConfigurationsPanel;
