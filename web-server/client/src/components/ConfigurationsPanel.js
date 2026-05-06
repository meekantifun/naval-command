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
  const [busy, setBusy] = useState(false);
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
    if (busy || role.id === currentRole?.id) { setDropdownOpen(false); setSearch(''); return; }
    setDropdownOpen(false);
    setSearch('');
    setBusy(true);
    try {
      await axios.post('/api/admin/config/setgm', { guildId, roleId: role.id }, { withCredentials: true });
      setCurrentRole(role);
      showFeedback('success', `GM role set to @${role.name}`);
    } catch (err) {
      console.error('setgm role failed:', err);
      showFeedback('error', 'Failed to set GM role.');
    }
    setBusy(false);
  };

  const handleRemoveRole = async () => {
    if (busy || !currentRole) return;
    setBusy(true);
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, roleId: currentRole.id }, withCredentials: true });
      setCurrentRole(null);
      showFeedback('success', 'GM role removed.');
    } catch (err) {
      console.error('setgm role remove failed:', err);
      showFeedback('error', 'Failed to remove GM role.');
    }
    setBusy(false);
  };

  const handleAddUser = async () => {
    const trimmed = newUserId.trim();
    if (!trimmed) return;
    if (!/^\d{17,20}$/.test(trimmed)) {
      showFeedback('error', 'Please enter a valid Discord user ID (17–20 digit number).');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await axios.post('/api/admin/config/setgm', { guildId, userId: trimmed }, { withCredentials: true });
      setUsers(prev => [...prev, { id: trimmed, displayName: trimmed }]);
      setNewUserId('');
      showFeedback('success', 'User added as GM.');
    } catch (err) {
      console.error('setgm add user failed:', err);
      showFeedback('error', 'Failed to add user.');
    }
    setBusy(false);
  };

  const handleRemoveUser = async (userId) => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, userId }, withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
      showFeedback('success', 'User removed.');
    } catch (err) {
      console.error('setgm remove user failed:', err);
      showFeedback('error', 'Failed to remove user.');
    }
    setBusy(false);
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
                Showing {filteredRoles.length} of {roles.length} roles — keep typing to narrow results
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

function LogChannelCard({ guildId, channels, apiPath, title, description, initial }) {
  const [channelId, setChannelId] = useState(initial?.channelId ?? '');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    setChannelId(initial?.channelId ?? '');
  }, [initial]);

  const showFeedback = (type, message) => {
    clearTimeout(timerRef.current);
    setStatus({ type, message });
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    if (!channelId) { showFeedback('error', 'Select a channel first.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      await axios.post(apiPath, { guildId, channelId }, { withCredentials: true });
      showFeedback('success', 'Saved!');
    } catch (err) {
      console.error(`${apiPath} save failed:`, err);
      showFeedback('error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (saving || !channelId) return;
    setSaving(true);
    try {
      await axios.post(apiPath, { guildId, channelId: null }, { withCredentials: true });
      setChannelId('');
      showFeedback('success', 'Cleared.');
    } catch (err) {
      console.error(`${apiPath} clear failed:`, err);
      showFeedback('error', 'Failed to clear.');
    } finally {
      setSaving(false);
    }
  };

  const savedChannel = channels.find(c => c.id === (initial?.channelId ?? ''));

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">{title}</div>
          <div className="config-card-desc">{description}</div>
        </div>
        <div className={`config-status-badge ${initial?.channelId ? 'active' : 'inactive'}`}>
          {initial?.channelId ? 'SET' : 'NOT SET'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">Channel</span>
          <select
            className="config-select"
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
          >
            <option value="">— Select a channel —</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>
        {savedChannel && (
          <div className="config-current-hint">Currently saved: #{savedChannel.name}</div>
        )}
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <div className="config-footer-actions">
          <button className="config-clear-btn" onClick={handleClear} disabled={saving || !channelId}>Clear</button>
          <button className="config-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
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
      <LogChannelCard
        key={`setlogchannel-${guildId}`}
        guildId={guildId}
        channels={metadata.channels}
        apiPath="/api/admin/config/setlogchannel"
        title="/setlogchannel"
        description="Set the channel for console/bot logging"
        initial={config.setlogchannel}
      />
      <LogChannelCard
        key={`setmsglogchannel-${guildId}`}
        guildId={guildId}
        channels={metadata.channels}
        apiPath="/api/admin/config/setmsglogchannel"
        title="/setmsglogchannel"
        description="Set the channel for message edit/delete logging"
        initial={config.setmsglogchannel}
      />
    </div>
  );
}

function WelcomeMessageCard({ guildId, initial, channels, roles }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [channelId, setChannelId] = useState(initial?.channelId ?? '');
  const [message, setMessage] = useState(initial?.message ?? 'Welcome to the server, @user!');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [channelDropOpen, setChannelDropOpen] = useState(false);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function showFeedback(type, msg) {
    clearTimeout(timerRef.current);
    setStatus({ type, message: msg });
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  }

  function insertAtCursor(text) {
    const el = textareaRef.current;
    if (!el) { setMessage(m => m + text); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setMessage(message.slice(0, start) + text + message.slice(end));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await axios.post('/api/admin/config/welcome', {
        guildId,
        enabled,
        channelId: channelId || null,
        message,
      });
      showFeedback('success', 'Saved!');
    } catch {
      showFeedback('error', 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">Welcome Message</div>
          <div className="config-card-desc">Send a greeting when a new member joins</div>
        </div>
        <span className={`config-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">Welcome Message</span>
          <Toggle value={enabled} onChange={setEnabled} />
          <span className="config-value-hint">{enabled ? 'On' : 'Off'}</span>
        </div>
        <div className="config-row">
          <span className="config-label">Channel</span>
          <select
            className="config-select"
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
          >
            <option value="">— select a channel —</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>
        <div className="config-section-label" style={{ marginTop: 8 }}>Welcome Message</div>
        <div className="welcome-insert-helpers">
          <button
            type="button"
            className="welcome-insert-btn user-btn"
            onMouseDown={e => { e.preventDefault(); insertAtCursor('@user'); }}
          >@user</button>
          <div className="welcome-insert-dropdown-wrapper">
            <button
              type="button"
              className="welcome-insert-btn channel-btn"
              onClick={() => { setChannelDropOpen(o => !o); setRoleDropOpen(false); }}
              onBlur={() => setTimeout(() => setChannelDropOpen(false), 150)}
            >
              Insert #channel <span className="insert-arrow">▾</span>
            </button>
            {channelDropOpen && (
              <div className="welcome-insert-dropdown">
                {channels.map(c => (
                  <div
                    key={c.id}
                    className="welcome-insert-option"
                    onMouseDown={() => { insertAtCursor(`<#${c.id}>`); setChannelDropOpen(false); }}
                  >#{c.name}</div>
                ))}
              </div>
            )}
          </div>
          <div className="welcome-insert-dropdown-wrapper">
            <button
              type="button"
              className="welcome-insert-btn role-btn"
              onClick={() => { setRoleDropOpen(o => !o); setChannelDropOpen(false); }}
              onBlur={() => setTimeout(() => setRoleDropOpen(false), 150)}
            >
              Insert @role <span className="insert-arrow">▾</span>
            </button>
            {roleDropOpen && (
              <div className="welcome-insert-dropdown">
                {roles.map(r => (
                  <div
                    key={r.id}
                    className="welcome-insert-option"
                    onMouseDown={() => { insertAtCursor(`<@&${r.id}>`); setRoleDropOpen(false); }}
                  >@{r.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="welcome-textarea"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
        />
        <div className="welcome-hint">@user is replaced with a mention of the new member</div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button
          className="config-save-btn"
          onClick={handleSave}
          disabled={saving}
        >{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

export default ConfigurationsPanel;
