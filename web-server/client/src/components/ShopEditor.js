import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ShopEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const STAT_OPTIONS = ['accuracy', 'damage', 'armor', 'hp', 'range', 'speed', 'evasion', 'critChance', 'fireResist', 'floodResist'];
const SHIP_CLASSES = ['destroyer', 'light_cruiser', 'heavy_cruiser', 'battleship', 'carrier', 'submarine'];
const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
const CATEGORIES = ['equipment', 'weapons', 'aircraft', 'consumables', 'flagship'];

// Normalize ship class strings from hardcoded items (Title Case/spaces) to snake_case
const SHIP_CLASS_MAP = {
  'destroyer': 'destroyer', 'Destroyer': 'destroyer',
  'light_cruiser': 'light_cruiser', 'Light Cruiser': 'light_cruiser', 'light cruiser': 'light_cruiser',
  'heavy_cruiser': 'heavy_cruiser', 'Heavy Cruiser': 'heavy_cruiser', 'heavy cruiser': 'heavy_cruiser',
  'battleship': 'battleship', 'Battleship': 'battleship',
  'carrier': 'carrier', 'aircraft_carrier': 'carrier', 'Aircraft Carrier': 'carrier',
  'submarine': 'submarine', 'Submarine': 'submarine',
};
const normalizeShipClasses = (arr) => (arr || []).map(c => SHIP_CLASS_MAP[c] || c);

const RARITY_COLORS = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', legendary: '#ff9800' };

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'equipment',
  rarity: 'common',
  price: 100,
  emoji: '⚙️',
  stackable: false,
  flagship: false,
  stats: [],
  requirements: { shipClass: [], level: 0, flagship: false }
};

function ShopEditor({ guild, onDone, onSaved, onFormBack, initialEditing = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(initialEditing); // null = list, {} = new, item = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const iconInputRef = useRef(null);

  useEffect(() => {
    loadItems();
  }, [guild?.id]);

  // When opened directly on an existing item (from shop Edit button), populate form
  useEffect(() => {
    if (initialEditing?.id) {
      const stats = Object.entries(initialEditing.stats || {}).map(([stat, value]) => ({ stat, value }));
      setForm({
        name: initialEditing.name || '',
        description: initialEditing.description || '',
        category: initialEditing.category || 'equipment',
        rarity: initialEditing.rarity || 'common',
        price: initialEditing.price ?? 100,
        emoji: initialEditing.emoji || '⚙️',
        stackable: initialEditing.stackable || false,
        flagship: initialEditing.flagship || false,
        stats,
        requirements: {
          shipClass: normalizeShipClasses(initialEditing.requirements?.shipClass),
          level: initialEditing.requirements?.level || 0,
          flagship: initialEditing.requirements?.flagship || false
        }
      });
      setIconPreview(initialEditing.iconUrl ? `${API_URL}${initialEditing.iconUrl}` : null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/shop/items/${guild.id}`, { withCredentials: true });
      setItems(res.data || []);
    } catch (e) {
      console.error('Failed to load custom shop items', e);
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setForm(EMPTY_FORM);
    setIconFile(null);
    setIconPreview(null);
    setError(null);
    setEditing({});
  };

  const startEdit = (item) => {
    const stats = Object.entries(item.stats || {}).map(([stat, value]) => ({ stat, value }));
    setForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'equipment',
      rarity: item.rarity || 'common',
      price: item.price ?? 100,
      emoji: item.emoji || '⚙️',
      stackable: item.stackable || false,
      flagship: item.flagship || false,
      stats,
      requirements: {
        shipClass: normalizeShipClasses(item.requirements?.shipClass),
        level: item.requirements?.level || 0,
        flagship: item.requirements?.flagship || false
      }
    });
    setIconFile(null);
    setIconPreview(item.iconUrl ? `${API_URL}${item.iconUrl}` : null);
    setError(null);
    setEditing(item);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/shop/items/${guild.id}/${item.id}`, { withCredentials: true });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      alert('Failed to delete item.');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (form.price < 0) { setError('Price must be non-negative.'); return; }
    setSaving(true);
    setError(null);
    try {
      // Convert stats array → object
      const statsObj = {};
      for (const row of form.stats) {
        if (row.stat) statsObj[row.stat] = Number(row.value);
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        rarity: form.rarity,
        price: Number(form.price),
        emoji: form.emoji,
        stackable: form.stackable,
        flagship: form.flagship,
        stats: statsObj,
        requirements: {
          ...(form.requirements.shipClass.length > 0 && { shipClass: form.requirements.shipClass }),
          ...(form.requirements.level > 0 && { level: form.requirements.level }),
          ...(form.requirements.flagship && { flagship: true })
        }
      };

      let savedItem;
      if (editing?.id) {
        // Update
        const res = await axios.put(
          `${API_URL}/api/admin/shop/items/${guild.id}/${editing.id}`,
          payload,
          { withCredentials: true }
        );
        savedItem = res.data;
      } else {
        // Create
        const res = await axios.post(
          `${API_URL}/api/admin/shop/items/${guild.id}`,
          payload,
          { withCredentials: true }
        );
        savedItem = res.data;
      }

      // Upload icon if selected
      if (iconFile) {
        const formData = new FormData();
        formData.append('icon', iconFile);
        formData.append('guildId', guild.id);
        const iconRes = await axios.post(
          `${API_URL}/api/admin/shop/icon/${savedItem.id}`,
          formData,
          { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
        );
        savedItem.iconUrl = iconRes.data.iconUrl;
      }

      if (onSaved) {
        onSaved();
      } else {
        await loadItems();
        setEditing(null);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormDelete = async () => {
    if (!window.confirm(`Remove "${form.name || editing?.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await axios.delete(`${API_URL}/api/admin/shop/items/${guild.id}/${editing.id}`, { withCredentials: true });
      if (onSaved) {
        onSaved();
      } else {
        await loadItems();
        setEditing(null);
      }
    } catch (e) {
      setError('Failed to remove item.');
    } finally {
      setSaving(false);
    }
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  // Stat rows
  const addStatRow = () => setForm(f => ({ ...f, stats: [...f.stats, { stat: STAT_OPTIONS[0], value: 0 }] }));
  const removeStatRow = (i) => setForm(f => ({ ...f, stats: f.stats.filter((_, idx) => idx !== i) }));
  const updateStatRow = (i, field, val) => setForm(f => {
    const stats = [...f.stats];
    stats[i] = { ...stats[i], [field]: val };
    return { ...f, stats };
  });

  // Ship class checkboxes
  const toggleShipClass = (cls) => {
    setForm(f => {
      const current = f.requirements.shipClass;
      const next = current.includes(cls) ? current.filter(c => c !== cls) : [...current, cls];
      return { ...f, requirements: { ...f.requirements, shipClass: next } };
    });
  };

  if (loading) return <div className="se-loading">Loading custom items...</div>;

  // ── List view ────────────────────────────────────────────────────────────
  if (editing === null) {
    return (
      <div className="se-container">
        <div className="se-list-header">
          {onDone && (
            <button className="se-btn-back" onClick={onDone}>← Back to Shop</button>
          )}
          <h3>Custom Shop Items</h3>
          <button className="se-btn-primary" onClick={startNew}>+ New Item</button>
        </div>

        {items.length === 0 && (
          <div className="se-empty">No custom items yet. Create one to get started.</div>
        )}

        <div className="se-item-list">
          {items.map(item => (
            <div key={item.id} className="se-item-row">
              <div className="se-item-icon-col">
                {item.iconUrl
                  ? <img src={`${API_URL}${item.iconUrl}`} alt="" className="se-item-thumb" />
                  : <span className="se-item-emoji-thumb">{item.emoji || '📦'}</span>
                }
              </div>
              <div className="se-item-info">
                <span className="se-item-name">{item.name}</span>
                <span className="se-item-meta" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</span>
                <span className="se-item-meta">{item.category}</span>
                <span className="se-item-meta">💰 {item.price}</span>
              </div>
              <div className="se-item-actions">
                <button className="se-btn-edit" onClick={() => startEdit(item)}>Edit</button>
                <button className="se-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────
  return (
    <div className="se-container">
      <div className="se-form-header">
        <button className="se-btn-back" onClick={() => onFormBack ? onFormBack() : setEditing(null)}>← Back</button>
        <h3>{editing?.id ? `Edit: ${editing.name || form.name}` : 'New Custom Item'}</h3>
      </div>

      {error && <div className="se-error">{error}</div>}

      <div className="se-form">
        {/* Basic Info */}
        <div className="se-field-row">
          <label className="se-label">Name *</label>
          <input className="se-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" />
        </div>

        <div className="se-field-row">
          <label className="se-label">Description</label>
          <textarea className="se-input se-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Item description" rows={3} />
        </div>

        <div className="se-field-grid">
          <div className="se-field-row">
            <label className="se-label">Category</label>
            <select className="se-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="se-field-row">
            <label className="se-label">Rarity</label>
            <select className="se-select" value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))} style={{ color: RARITY_COLORS[form.rarity] }}>
              {RARITIES.map(r => <option key={r} value={r} style={{ color: RARITY_COLORS[r] }}>{r}</option>)}
            </select>
          </div>
          <div className="se-field-row">
            <label className="se-label">Price (credits)</label>
            <input className="se-input" type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="se-field-row">
            <label className="se-label">Emoji</label>
            <input className="se-input se-emoji-input" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={4} />
          </div>
        </div>

        {/* Icon */}
        <div className="se-field-row">
          <label className="se-label">Custom Icon</label>
          <div className="se-icon-row">
            {iconPreview && <img src={iconPreview} alt="preview" className="se-icon-preview" />}
            <button className="se-btn-secondary" onClick={() => iconInputRef.current?.click()}>
              {iconPreview ? 'Change Icon' : 'Upload Icon'}
            </button>
            {iconPreview && (
              <button className="se-btn-secondary" onClick={() => { setIconFile(null); setIconPreview(null); }}>Remove</button>
            )}
            <input ref={iconInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
            <span className="se-hint">PNG/JPG, max 2MB</span>
          </div>
        </div>

        {/* Stats Builder */}
        <div className="se-section-label">Stat Buffs / Debuffs</div>
        <div className="se-stats-builder">
          {form.stats.map((row, i) => (
            <div key={i} className="se-stat-row">
              <select className="se-select se-stat-select" value={row.stat} onChange={e => updateStatRow(i, 'stat', e.target.value)}>
                {STAT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" className="se-input se-stat-val" value={row.value} onChange={e => updateStatRow(i, 'value', e.target.value)} />
              <button className="se-btn-remove" onClick={() => removeStatRow(i)}>×</button>
            </div>
          ))}
          <button className="se-btn-secondary" onClick={addStatRow}>+ Add Stat</button>
        </div>

        {/* Requirements */}
        <div className="se-section-label">Requirements</div>
        <div className="se-req-section">
          <div className="se-field-row">
            <label className="se-label">Min Level</label>
            <input className="se-input se-small-input" type="number" min="0" value={form.requirements.level}
              onChange={e => setForm(f => ({ ...f, requirements: { ...f.requirements, level: Number(e.target.value) } }))} />
          </div>

          <div className="se-field-row">
            <label className="se-label">Ship Classes</label>
            <div className="se-class-grid">
              {SHIP_CLASSES.map(cls => (
                <label key={cls} className="se-check-label">
                  <input type="checkbox" checked={form.requirements.shipClass.includes(cls)} onChange={() => toggleShipClass(cls)} />
                  {cls.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>

          <label className="se-check-label se-req-flagship">
            <input type="checkbox" checked={form.requirements.flagship}
              onChange={e => setForm(f => ({ ...f, requirements: { ...f.requirements, flagship: e.target.checked } }))} />
            Flagship only
          </label>
        </div>

        {/* Toggles */}
        <div className="se-toggles">
          <label className="se-check-label">
            <input type="checkbox" checked={form.stackable} onChange={e => setForm(f => ({ ...f, stackable: e.target.checked }))} />
            Stackable
          </label>
          <label className="se-check-label">
            <input type="checkbox" checked={form.flagship} onChange={e => setForm(f => ({ ...f, flagship: e.target.checked }))} />
            Flagship item (fleet-wide effect)
          </label>
        </div>

        {/* Actions */}
        <div className="se-form-actions">
          <button className="se-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editing?.id ? 'Save Changes' : 'Create Item')}
          </button>
          {editing?.id && (
            <button className="se-btn-delete" onClick={handleFormDelete} disabled={saving}>Remove Item</button>
          )}
          <button className="se-btn-secondary" onClick={() => onFormBack ? onFormBack() : setEditing(null)} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ShopEditor;
