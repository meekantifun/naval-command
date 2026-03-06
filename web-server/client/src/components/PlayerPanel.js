import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import ShopEditor from './ShopEditor';
import './PlayerPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const RARITY_COLORS = {
  common: '#9e9e9e',
  uncommon: '#4caf50',
  rare: '#2196f3',
  legendary: '#ff9800'
};

const CATEGORIES = [
  { id: 'all',         label: 'All',         emoji: '🗂️' },
  { id: 'equipment',   label: 'Equipment',   emoji: '⚙️' },
  { id: 'weapons',     label: 'Weapons',     emoji: '🔫' },
  { id: 'aircraft',    label: 'Aircraft',    emoji: '✈️' },
  { id: 'consumables', label: 'Consumables', emoji: '📦' },
  { id: 'flagship',    label: 'Flagship',    emoji: '🚩' }
];

// ── Characters Section ──────────────────────────────────────────────────────

function CharactersSection({ user, guild }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/admin/characters`, {
          params: { guildId: guild.id, userId: user.id },
          withCredentials: true
        });
        setCharacters(res.data.characters || []);
      } catch (e) {
        console.error('Failed to load characters', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id, guild.id]);

  if (loading) return <div className="pp-loading">Loading characters...</div>;
  if (characters.length === 0) return (
    <div className="pp-empty">
      <p>You have no characters in this server.</p>
      <p>Ask an admin to create one for you.</p>
    </div>
  );

  return (
    <div className="pp-characters">
      {characters.map((char, i) => <CharacterCard key={i} char={char} />)}
    </div>
  );
}

function CharacterCard({ char }) {
  const [expanded, setExpanded] = useState(true);

  const weapons = char.weapons ? Object.values(char.weapons) : [];
  const skills = char.skills || [];
  const inventory = char.inventory
    ? (Array.isArray(char.inventory)
        ? char.inventory
        : Object.entries(char.inventory).map(([k, v]) => ({ id: k, qty: v })))
    : [];

  const statVal = (v) => (v !== undefined && v !== null) ? v : '—';

  return (
    <div className="pp-char-card">
      <div className="pp-char-header" onClick={() => setExpanded(e => !e)}>
        <div className="pp-char-title">
          <span className="pp-char-name">{char.name}</span>
          <span className="pp-char-class">{char.shipClass}</span>
          {char.isActive && <span className="pp-badge active">Active</span>}
        </div>
        <div className="pp-char-meta">
          <span className="pp-char-level">Lvl {char.level || 1}</span>
          <span className="pp-expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="pp-char-body">

          {/* Stats grid */}
          <div className="pp-section-label">Combat Stats</div>
          <div className="pp-stats-grid">
            {[
              ['HP', char.stats?.health],
              ['Armor', char.stats?.armor],
              ['Speed', char.stats?.speed],
              ['Range', char.stats?.range],
              ['Accuracy', char.stats?.accuracy ? `${char.stats.accuracy}%` : undefined],
              ['Evasion', char.stats?.evasion ? `${char.stats.evasion}%` : undefined]
            ].map(([label, val]) => (
              <div className="pp-stat" key={label}>
                <span className="pp-stat-label">{label}</span>
                <span className="pp-stat-val">{statVal(val)}</span>
              </div>
            ))}
          </div>

          {/* Armor thickness */}
          {char.armorThickness && (
            <>
              <div className="pp-section-label">Armor Thickness</div>
              <div className="pp-stats-grid">
                {[
                  ['Belt', char.armorThickness.belt ? `${char.armorThickness.belt}mm` : undefined],
                  ['Deck', char.armorThickness.deck ? `${char.armorThickness.deck}mm` : undefined],
                  ['Turret', char.armorThickness.turret ? `${char.armorThickness.turret}mm` : undefined]
                ].map(([label, val]) => (
                  <div className="pp-stat" key={label}>
                    <span className="pp-stat-label">{label}</span>
                    <span className="pp-stat-val">{statVal(val)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Weapons */}
          {weapons.length > 0 && (
            <>
              <div className="pp-section-label">Weapons</div>
              <div className="pp-weapons-list">
                {weapons.map((w, i) => (
                  <div className="pp-weapon-row" key={i}>
                    <span className="pp-weapon-name">{w.name || w.type || 'Weapon'}</span>
                    <span className="pp-weapon-stats">
                      {w.damage != null && <span>DMG {w.damage}</span>}
                      {w.range != null && <span>RNG {w.range}</span>}
                      {w.ammo != null && <span>AMMO {w.ammo}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <>
              <div className="pp-section-label">Skills</div>
              <div className="pp-skills">
                {skills.map((s, i) => <span className="pp-skill-tag" key={i}>{s}</span>)}
              </div>
            </>
          )}

          {/* Battle record */}
          <div className="pp-section-label">Battle Record</div>
          <div className="pp-stats-grid">
            {[
              ['Battles', char.battles],
              ['Victories', char.victories],
              ['Distance', char.totalDistanceTravelled ?? char.distanceTravelled],
              ['MVPs', char.totalMVPAwards ?? char.mvpCount],
              ['Damage', char.totalDamageDealt ?? char.damageDealt],
              ['Kills', char.totalKills ?? char.kills]
            ].map(([label, val]) => (
              <div className="pp-stat" key={label}>
                <span className="pp-stat-label">{label}</span>
                <span className="pp-stat-val">{statVal(val)}</span>
              </div>
            ))}
          </div>

          {/* Currency */}
          <div className="pp-section-label">Economy</div>
          <div className="pp-currency">
            💰 <strong>{(char.currency ?? 0).toLocaleString()}</strong> Credits
          </div>

          {/* Inventory */}
          <div className="pp-section-label">Inventory</div>
          {inventory.length === 0
            ? <div className="pp-empty-small">No items in inventory</div>
            : (
              <div className="pp-inventory">
                {inventory.map((item, i) => (
                  <div className="pp-inv-item" key={i}>
                    <span>{item.id || item.name}</span>
                    {item.qty > 1 && <span className="pp-inv-qty">×{item.qty}</span>}
                  </div>
                ))}
              </div>
            )
          }

        </div>
      )}
    </div>
  );
}

// ── Shop Section ────────────────────────────────────────────────────────────

function ShopSection({ user, guild }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(null);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('price_asc');
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState(null);
  const [isGM, setIsGM] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [shopRes, charRes] = await Promise.all([
        axios.get(`${API_URL}/api/shop/items`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/characters`, {
          params: { guildId: guild.id, userId: user.id },
          withCredentials: true
        })
      ]);
      setItems(shopRes.data.items || []);
      const chars = charRes.data.characters || [];
      if (chars.length > 0) setCurrency(chars[0].currency ?? 0);
    } catch (e) {
      console.error('Failed to load shop', e);
    } finally {
      setLoading(false);
    }
  }, [user.id, guild.id]);

  useEffect(() => {
    load();
    // Check GM permission
    axios.get(`${API_URL}/api/admin/check-permission`, {
      params: { guildId: guild.id },
      withCredentials: true
    }).then(r => setIsGM(r.data.hasPermission)).catch(() => {});
  }, [load, guild.id]);

  const filtered = useMemo(() => {
    let list = category === 'all' ? items : items.filter(i => i.category === category);
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'rarity') {
      const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
      list = [...list].sort((a, b) => (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4));
    }
    return list;
  }, [items, category, sort]);

  const handleBuy = async (item) => {
    setBuying(item.id);
    setMessage(null);
    try {
      const res = await axios.post(`${API_URL}/api/shop/buy`,
        { itemId: item.id, guildId: guild.id },
        { withCredentials: true }
      );
      setCurrency(res.data.remainingCurrency);
      setMessage({ type: 'success', text: `✅ Purchased ${item.name}! Remaining: ${res.data.remainingCurrency} credits` });
    } catch (e) {
      setMessage({ type: 'error', text: `❌ ${e.response?.data?.error || 'Purchase failed'}` });
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="pp-loading">Loading shop...</div>;

  // GM editor overlay
  if (showEditor) {
    return (
      <ShopEditor
        guild={guild}
        initialEditing={{}}
        onDone={() => { setShowEditor(false); load(); }}
      />
    );
  }

  return (
    <div className="pp-shop">
      <div className="pp-shop-topbar">
        <div className="pp-shop-currency">
          💰 <strong>{currency !== null ? currency.toLocaleString() : '—'}</strong> Credits
        </div>
        <div className="pp-shop-controls">
          <select value={sort} onChange={e => setSort(e.target.value)} className="pp-select">
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name">Name A–Z</option>
            <option value="rarity">Rarity</option>
          </select>
        </div>
      </div>

      <div className="pp-shop-cats">
        {CATEGORIES.map(c => (
          <button key={c.id} className={`pp-cat-btn ${category === c.id ? 'active' : ''}`}
            onClick={() => setCategory(c.id)}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`pp-shop-msg ${message.type}`}>{message.text}</div>
      )}

      <div className="pp-items-grid">
        {isGM && (
          <div className="pp-item-card pp-add-item-card" onClick={() => setShowEditor(true)}>
            <div className="pp-add-item-plus">+</div>
            <div className="pp-add-item-label">Add Item</div>
          </div>
        )}

        {filtered.map(item => (
          <div className={`pp-item-card ${item.flagship ? 'pp-item-flagship' : ''}`} key={item.id}>
            <div className="pp-item-top">
              {item.iconUrl
                ? <img src={item.iconUrl} alt={item.name} className="pp-item-icon-img" />
                : <span className="pp-item-emoji">{item.emoji || '📦'}</span>
              }
              <div className="pp-item-badges">
                {item.flagship && <span className="pp-flagship-badge">🚩 Flagship</span>}
                <span className="pp-item-rarity" style={{ color: RARITY_COLORS[item.rarity] || '#9e9e9e' }}>
                  {item.rarity}
                </span>
              </div>
            </div>
            <div className="pp-item-name">{item.name}</div>
            <div className="pp-item-desc">{item.description}</div>

            {item.flagship && item.flagshipEffect && Object.keys(item.flagshipEffect).length > 0 && (
              <div className="pp-flagship-effect">
                🌐 Fleet Buff:{' '}
                {Object.entries(item.flagshipEffect)
                  .map(([k, v]) => `+${v} ${k.replace(/_/g, ' ')}`)
                  .join(', ')}
              </div>
            )}

            {!item.flagship && item.stats && Object.keys(item.stats).length > 0 && (
              <div className="pp-item-stats">
                {Object.entries(item.stats).map(([k, v]) => (
                  <span key={k} className="pp-item-stat">{k.replace(/_/g, ' ')}: +{v}</span>
                ))}
              </div>
            )}

            {item.requirements && Object.keys(item.requirements).length > 0 && (
              <div className="pp-item-req">
                Req: {Object.entries(item.requirements)
                  .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('/') : v}`)
                  .join(', ')}
              </div>
            )}

            <div className="pp-item-footer">
              <span className="pp-item-price">💰 {item.price.toLocaleString()}</span>
              <button
                className="pp-buy-btn"
                disabled={buying === item.id || (currency !== null && currency < item.price)}
                onClick={() => handleBuy(item)}
              >
                {buying === item.id ? 'Buying...' : 'Buy'}
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !isGM && (
          <div className="pp-empty">No items in this category.</div>
        )}
      </div>
    </div>
  );
}

// ── Settings Section ────────────────────────────────────────────────────────

function SettingsSection() {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('navalCommandVolume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });

  const handleVolume = (val) => {
    const v = parseFloat(val);
    setVolume(v);
    localStorage.setItem('navalCommandVolume', v);
  };

  return (
    <div className="pp-settings">
      <h3>Audio</h3>

      <div className="pp-setting-row">
        <label className="pp-setting-label">
          {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'} Alert Volume
        </label>
        <div className="pp-setting-control">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => handleVolume(e.target.value)}
            className="pp-volume-slider"
          />
          <span className="pp-volume-label">{volume === 0 ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
        </div>
        {volume > 0 && (
          <button className="pp-mute-btn" onClick={() => handleVolume(0)}>Mute</button>
        )}
        {volume === 0 && (
          <button className="pp-mute-btn" onClick={() => handleVolume(0.8)}>Unmute</button>
        )}
      </div>
      <p className="pp-setting-hint">Controls the volume of turn alert sounds during battles.</p>
    </div>
  );
}

// ── About Section ───────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div className="pp-about">
      <h3>⚓ Naval Command</h3>
      <p>Naval Command is a Discord-based naval warfare game. Command your ship, engage enemies, and fight alongside other players in real-time turn-based battles.</p>

      <h4>🎮 Getting Started</h4>
      <ol>
        <li>Have an admin create a character for you in the Admin Panel.</li>
        <li>Wait for an admin to start a battle using the web dashboard.</li>
        <li>Join the battle with <code>/join</code> in the Discord channel.</li>
        <li>Select your spawn position on the map when prompted.</li>
        <li>When it's your turn, use the action buttons to move, attack, or use skills.</li>
      </ol>

      <h4>⚔️ Key Commands</h4>
      <div className="pp-commands">
        {[
          ['/join', 'Join an active battle'],
          ['/move', 'Move your ship to a grid coordinate'],
          ['/attack', 'Attack a target at a coordinate'],
          ['/skills', 'Use a special ability'],
          ['/status', 'View your current ship status'],
          ['/end_turn', 'End your turn early'],
          ['/shop', 'Browse the equipment shop'],
          ['/equip', 'Equip purchased items'],
          ['/map', 'View the current battlefield map']
        ].map(([cmd, desc]) => (
          <div className="pp-command-row" key={cmd}>
            <code className="pp-cmd">{cmd}</code>
            <span className="pp-cmd-desc">{desc}</span>
          </div>
        ))}
      </div>

      <h4>💡 Tips</h4>
      <ul>
        <li>Different ship classes have different strengths — Destroyers are fast and evasive, Battleships hit hard but move slowly.</li>
        <li>Position matters. Stay in range to attack, but avoid being surrounded.</li>
        <li>Use Damage Control when on fire or flooding to save your ship.</li>
        <li>Coordinate with teammates — focus fire on wounded enemies to take them down faster.</li>
        <li>Watch for the enemy QRF — bosses can appear mid-battle.</li>
      </ul>
    </div>
  );
}

// ── Support Section ─────────────────────────────────────────────────────────

function SupportSection() {
  return (
    <div className="pp-support">
      <h3>❤️ Support the Developer</h3>
      <p>Naval Command is a passion project built and maintained by one developer. If you enjoy the game, consider showing your support!</p>

      <div className="pp-support-cards">
        <div className="pp-support-card">
          <div className="pp-support-icon">⭐</div>
          <h4>Leave a Review</h4>
          <p>Share your experience with others in the Discord server.</p>
        </div>
        <div className="pp-support-card">
          <div className="pp-support-icon">🐛</div>
          <h4>Report Bugs</h4>
          <p>Found an issue? Report it in the Discord server so it can be fixed quickly.</p>
        </div>
        <div className="pp-support-card">
          <div className="pp-support-icon">💡</div>
          <h4>Suggest Features</h4>
          <p>Have an idea that would make the game better? Share it in the Discord server.</p>
        </div>
        <div className="pp-support-card">
          <div className="pp-support-icon">📢</div>
          <h4>Spread the Word</h4>
          <p>Invite your friends to join the game and grow the community.</p>
        </div>
      </div>

      <div className="pp-support-note">
        <p>Thank you for playing Naval Command. Every battle, every suggestion, and every piece of feedback helps make the game better for everyone. — <strong>The Developer</strong></p>
      </div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'characters', label: 'Characters', emoji: '⚓' },
  { id: 'shop',       label: 'Shop',       emoji: '🛒' },
  { id: 'settings',   label: 'Settings',   emoji: '⚙️' },
  { id: 'about',      label: 'About',      emoji: '📖' },
  { id: 'support',    label: 'Support',    emoji: '❤️' }
];

const API_URL_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function PlayerPanel({ user, guild, onClose }) {
  const [activeSection, setActiveSection] = useState('characters');
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    window.location.href = `${API_URL_BASE}/auth/logout`;
  };

  return (
    <div className="pp-fullscreen">

      {/* Sidebar */}
      <nav className="pp-nav">
        <div className="pp-nav-top">
          <div className="pp-nav-user">
            {user.avatar
              ? <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="" className="pp-avatar" />
              : <div className="pp-avatar-placeholder">👤</div>
            }
            <div>
              <div className="pp-panel-username">{user.username}</div>
              <div className="pp-panel-guild">{guild.name}</div>
            </div>
          </div>

          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`pp-nav-btn ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="pp-nav-emoji">{s.emoji}</span>
              <span className="pp-nav-label">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="pp-nav-bottom">
          <button className="pp-nav-btn pp-close-nav-btn" onClick={onClose}>
            <span className="pp-nav-emoji">←</span>
            <span className="pp-nav-label">Back</span>
          </button>
          <button className="pp-nav-btn pp-logout-btn" onClick={() => setConfirmLogout(true)}>
            <span className="pp-nav-emoji">🚪</span>
            <span className="pp-nav-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pp-main">
        <div className="pp-main-header">
          <h2 className="pp-main-title">
            {SECTIONS.find(s => s.id === activeSection)?.emoji}{' '}
            {SECTIONS.find(s => s.id === activeSection)?.label}
          </h2>
        </div>
        <div className="pp-content">
          {activeSection === 'characters' && <CharactersSection user={user} guild={guild} />}
          {activeSection === 'shop'       && <ShopSection       user={user} guild={guild} />}
          {activeSection === 'settings'   && <SettingsSection />}
          {activeSection === 'about'      && <AboutSection />}
          {activeSection === 'support'    && <SupportSection />}
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <div className="pp-confirm-overlay">
          <div className="pp-confirm-dialog">
            <div className="pp-confirm-icon">🚪</div>
            <h3>Log Out?</h3>
            <p>You'll be returned to the login screen.</p>
            <div className="pp-confirm-buttons">
              <button className="pp-confirm-yes" onClick={handleLogout}>Yes, Log Out</button>
              <button className="pp-confirm-no" onClick={() => setConfirmLogout(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PlayerPanel;
