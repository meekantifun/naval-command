import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import ShopEditor from './ShopEditor';
import './PlayerPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const DEFAULT_CURRENCY = { name: 'Credits', icon: '💰', iconUrl: null };

function CurrencyIcon({ config, className }) {
  const c = config || DEFAULT_CURRENCY;
  if (c.iconUrl) return <img src={c.iconUrl} alt="" className={className || 'pp-currency-icon-img-inline'} />;
  return <span>{c.icon || '💰'}</span>;
}

const EQUIPMENT_META = {
  advanced_radar:             { name: 'Advanced Radar System',              emoji: '📡', description: '+10% accuracy, +2 detection range' },
  reinforced_armor:           { name: 'Reinforced Armor Plating',           emoji: '🛡️', description: '+20 armor points' },
  improved_engines:           { name: 'Improved Engine System',             emoji: '⚡', description: '+1 speed, +5% evasion' },
  fire_control_system:        { name: 'Advanced Fire Control',              emoji: '🎯', description: '-reload time, +15% accuracy' },
  navigation_computer:        { name: 'Navigation Computer',                emoji: '🧭', description: '+1 movement range per turn' },
  rangefinder:                { name: 'Optical Rangefinder',                emoji: '🔭', description: '+8% accuracy, +1 attack range' },
  damage_control_team:        { name: 'Damage Control Team',                emoji: '🧯', description: '-30% fire/flood damage, halved status duration' },
  sonar_array:                { name: 'Surface Search Sonar',               emoji: '📻', description: 'Detects submarines within 4 cells' },
  medical_bay:                { name: 'Onboard Medical Bay',                emoji: '⚕️', description: '+8 HP regen at start of each turn' },
  camouflage_paint:           { name: 'Dazzle Camouflage Scheme',           emoji: '🎨', description: '+8% evasion vs long-range attacks' },
  crew_training:              { name: 'Elite Crew Training',                emoji: '👥', description: '+5% accuracy, +5% evasion, +3 armor' },
  high_speed_turbines:        { name: 'High-Speed Steam Turbines',          emoji: '💨', description: '+2 speed (Destroyer)' },
  torpedo_director:           { name: 'Torpedo Fire Director',              emoji: '🎯', description: '+20% torpedo accuracy, +15% flooding (Destroyer)' },
  depth_charge_racks:         { name: 'Depth Charge Racks',                 emoji: '💣', description: '60 dmg to submerged subs in adjacent cells (Destroyer)' },
  enhanced_smoke_gen:         { name: 'Enhanced Smoke Generator',           emoji: '🌫️', description: '+65% evasion for 4 turns (Destroyer)' },
  aa_director:                { name: 'AA Fire Director Mk. III',           emoji: '🛡️', description: '+30% AA damage, +2 AA range (Light Cruiser)' },
  high_pressure_boiler:       { name: 'High-Pressure Boiler System',        emoji: '⚙️', description: '+1 speed, +1 movement (Light Cruiser)' },
  scout_floatplane:           { name: 'OS2U Kingfisher Floatplane',         emoji: '🛩️', description: '+5 detection range, +12% long-range accuracy (Light/Heavy Cruiser)' },
  spotter_aircraft:           { name: 'Spotter Aircraft',                   emoji: '✈️', description: '+3 range for 2 turns per battle (Heavy Cruiser)' },
  improved_fire_control:      { name: 'Improved Fire Control Mk. II',       emoji: '🎯', description: '+20% accuracy, -1 reload (Heavy Cruiser)' },
  reinforced_turrets:         { name: 'Reinforced Turret Barbettes',        emoji: '🏰', description: '+15% damage, +10 turret armor (Battleship)' },
  long_range_radar:           { name: 'Long-Range Radar Array',             emoji: '📡', description: '+4 detection range, +10% long-range accuracy (Battleship)' },
  improved_rangefinder:       { name: 'Improved Optical Rangefinder',       emoji: '🔭', description: '+15% accuracy, +2 attack range (Battleship)' },
  damage_control_center:      { name: 'Central Damage Control',             emoji: '🧯', description: '-50% fire/flood damage, +20 HP regen (Battleship)' },
  flight_deck_expansion:      { name: 'Flight Deck Expansion',              emoji: '🛬', description: '+2 max squadrons (Carrier)' },
  improved_hangar:            { name: 'Improved Hangar Facilities',         emoji: '🏭', description: '+25% aircraft HP, faster rearm (Carrier)' },
  advanced_avionics:          { name: 'Advanced Avionics Package',          emoji: '📡', description: '+3 aircraft range, +10% bomb accuracy (Carrier)' },
  combat_air_patrol:          { name: 'Combat Air Patrol System',           emoji: '✈️', description: 'Auto-intercept incoming aircraft (Carrier)' },
  improved_periscope:         { name: 'High-Power Attack Periscope',        emoji: '🔭', description: 'Target from 6 cells while submerged (Submarine)' },
  silent_running:             { name: 'Silent Running System',              emoji: '🤫', description: '-40% sonar detection chance (Submarine)' },
  oxygen_recycler:            { name: 'Oxygen Recycling System',            emoji: '💨', description: '+4 turns before forced surface (Submarine)' },
  magnetic_detonator:         { name: 'Magnetic Torpedo Detonator',         emoji: '🧲', description: '+25% torpedo damage (Submarine)' },
  escape_hatch:               { name: 'Emergency Escape System',            emoji: '🆘', description: 'Survive one fatal hit at 1 HP (Submarine)' },
  fighter_rockets:            { name: 'Fighter Rockets',                    emoji: '🚀', description: 'Equips fighters with rockets for increased damage (Carrier)' },
  ap_bombs:                   { name: 'AP Bombs',                           emoji: '💣', description: 'Equips dive bombers with armor-piercing bombs (Carrier)' },
  all_weather_aircraft:       { name: 'All-Weather Aircraft',               emoji: '🌧️', description: 'Enables aircraft operations in all weather conditions (Carrier)' },
};

const ITEM_META = {
  repair_kit:            { name: 'Repair Kit',            emoji: '🔧' },
  fire_suppression:      { name: 'Fire Suppression',      emoji: '🔥' },
  emergency_patch:       { name: 'Emergency Patch',       emoji: '🩹' },
  smoke_screen:          { name: 'Smoke Screen',          emoji: '💨' },
  lucky_charm:           { name: 'Lucky Charm',           emoji: '🍀' },
  emergency_speed_boost: { name: 'Emergency Speed Boost', emoji: '⚡' },
  radar_jamming:         { name: 'Radar Jamming',         emoji: '📡' },
  decoy_buoy:            { name: 'Decoy Buoy',            emoji: '🪝' },
  combat_stimulants:     { name: 'Combat Stimulants',     emoji: '💉' },
  repair_ship_contract:  { name: 'Repair Ship Contract',  emoji: '🛠️' },
  fuel_barrels:          { name: 'Fuel Barrels',          emoji: '⛽' },
  air_support_marker:    { name: 'Air Support Marker',    emoji: '✈️' },
};

function isEquipmentItem(id, shopItems) {
  if (shopItems[id]) {
    const t = shopItems[id].type;
    return t === 'equipment' || t === 'aircraft';
  }
  return id in EQUIPMENT_META;
}

function itemDisplayName(id, shopItems) {
  return shopItems[id]?.name
    || EQUIPMENT_META[id]?.name
    || ITEM_META[id]?.name
    || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function itemDisplayDesc(id, shopItems) {
  return shopItems[id]?.description
    || EQUIPMENT_META[id]?.description
    || null;
}

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

function CharactersSection({ user, guild, currencyConfig }) {
  const [characters, setCharacters] = useState([]);
  const [shopItems, setShopItems] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [charsRes, shopRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/characters`, {
            params: { guildId: guild.id, userId: user.id },
            withCredentials: true
          }),
          axios.get(`${API_URL}/api/shop/items`, { withCredentials: true })
        ]);
        setCharacters(charsRes.data.characters || []);
        const itemMap = {};
        for (const item of (shopRes.data.items || [])) itemMap[item.id] = item;
        setShopItems(itemMap);
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
      {characters.map((char, i) => <CharacterCard key={i} char={char} currencyConfig={currencyConfig} guild={guild} shopItems={shopItems} />)}
    </div>
  );
}

function ShopItemIcon({ item, className }) {
  if (!item) return <span className={className}>📦</span>;
  if (item.iconUrl) {
    const src = item.iconUrl.startsWith('http') ? item.iconUrl : `${API_URL}${item.iconUrl}`;
    return <img src={src} alt={item.name} className={className} style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain' }} />;
  }
  return <span className={className}>{item.emoji || '📦'}</span>;
}

function CharacterCard({ char, currencyConfig, guild, shopItems = {} }) {
  const [expanded, setExpanded] = useState(true);
  const [inBattle, setInBattle] = useState(false);
  const [pendingUpgrades, setPendingUpgrades] = useState(new Set());
  const [localActiveUpgrades, setLocalActiveUpgrades] = useState(char.activeUpgrades || []);

  useEffect(() => {
    if (!guild?.id || !char.userId) return;
    axios.get(`${API_URL}/api/player/battle-status`, {
      params: { guildId: guild.id, userId: char.userId },
      withCredentials: true
    }).then(r => setInBattle(r.data.inBattle || false)).catch(() => {});
  }, [guild?.id, char.userId]);

  const handleToggleUpgrade = async (itemId, newActive) => {
    const key = `${char.userId}:${char.name}:${itemId}`;
    if (pendingUpgrades.has(key) || inBattle) return;
    setPendingUpgrades(prev => new Set([...prev, key]));
    try {
      const r = await axios.patch(`${API_URL}/api/player/active-upgrades`, {
        guildId: guild.id,
        characterName: char.name,
        itemId,
        active: newActive
      }, { withCredentials: true });
      setLocalActiveUpgrades(r.data.activeUpgrades);
    } catch (e) {
      console.error('Failed to toggle upgrade', e);
    } finally {
      setPendingUpgrades(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const weapons = char.weapons ? Object.values(char.weapons) : [];
  const skills = char.skills || [];
  const inv = char.inventory || {};
  const consumables = Object.entries(inv).filter(([id, qty]) => qty > 0 && !isEquipmentItem(id, shopItems));
  const ownedUpgrades = Object.entries(inv).filter(([id, qty]) => isEquipmentItem(id, shopItems) && qty > 0);

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
            <CurrencyIcon config={currencyConfig} />{' '}
            <strong>{(char.currency ?? 0).toLocaleString()}</strong>{' '}
            {(currencyConfig || DEFAULT_CURRENCY).name}
          </div>

          {/* Inventory (consumables) */}
          <div className="pp-section-label">Inventory</div>
          {consumables.length === 0 && ownedUpgrades.length === 0
            ? <div className="pp-empty-small">No items in inventory</div>
            : consumables.length > 0 && (
              <div className="pp-inventory">
                {consumables.map(([id, qty]) => {
                  const shopItem = shopItems[id];
                  const name = itemDisplayName(id, shopItems);
                  return (
                    <div className="pp-inv-item" key={id}>
                      <ShopItemIcon item={shopItem} />
                      <span>{name}</span>
                      {qty > 1 && <span className="pp-inv-qty">×{qty}</span>}
                    </div>
                  );
                })}
              </div>
            )
          }

          {/* Upgrades */}
          {ownedUpgrades.length > 0 && (
            <>
              <div className="pp-section-label" style={{ marginTop: 12 }}>Upgrades</div>
              {inBattle && <div className="pp-battle-note">🔒 Locked during battle</div>}
              <div className="pp-upgrades-list">
                {ownedUpgrades.map(([itemId]) => {
                  const name = itemDisplayName(itemId, shopItems);
                  const desc = itemDisplayDesc(itemId, shopItems);
                  const isActive = localActiveUpgrades.includes(itemId);
                  const key = `${char.userId}:${char.name}:${itemId}`;
                  const isPending = pendingUpgrades.has(key);
                  const isDisabled = inBattle || isPending;
                  return (
                    <div key={itemId} className="pp-upgrade-row">
                      <ShopItemIcon item={shopItems[itemId]} className="pp-upgrade-emoji" />
                      <div className="pp-upgrade-info">
                        <div className="pp-upgrade-name">{name}</div>
                        {desc && <div className="pp-upgrade-desc">{desc}</div>}
                      </div>
                      <label className="pp-toggle-switch">
                        <input
                          type="checkbox"
                          aria-label={name}
                          checked={isActive}
                          disabled={isDisabled}
                          onChange={() => handleToggleUpgrade(itemId, !isActive)}
                        />
                        <span className="pp-toggle-slider" />
                      </label>
                      <span className={`pp-toggle-label${isActive ? ' active' : ''}`}>
                        {isPending ? '…' : isActive ? 'On' : 'Off'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

// ── Shop Section ────────────────────────────────────────────────────────────

function ShopSection({ user, guild, currencyConfig }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(null);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('price_asc');
  const [buying, setBuying] = useState(null);
  const [message, setMessage] = useState(null);
  const [isGM, setIsGM] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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
      const cName = (currencyConfig || DEFAULT_CURRENCY).name.toLowerCase();
      setMessage({ type: 'success', text: `✅ Purchased ${item.name}! Remaining: ${res.data.remainingCurrency} ${cName}` });
    } catch (e) {
      setMessage({ type: 'error', text: `❌ ${e.response?.data?.error || 'Purchase failed'}` });
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="pp-loading">Loading shop...</div>;

  // GM editor overlay (new item)
  if (showEditor) {
    return (
      <ShopEditor
        guild={guild}
        initialEditing={{}}
        onDone={() => { setShowEditor(false); load(); }}
      />
    );
  }

  // GM editor overlay (edit existing item)
  if (editingItem) {
    return (
      <ShopEditor
        guild={guild}
        initialEditing={editingItem}
        onSaved={() => { setEditingItem(null); load(); }}
        onFormBack={() => setEditingItem(null)}
      />
    );
  }

  return (
    <div className="pp-shop">
      <div className="pp-shop-topbar">
        <div className="pp-shop-currency">
          <CurrencyIcon config={currencyConfig} />{' '}
          <strong>{currency !== null ? currency.toLocaleString() : '—'}</strong>{' '}
          {(currencyConfig || DEFAULT_CURRENCY).name}
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
                ? <img src={item.iconUrl.startsWith('http') ? item.iconUrl : `${API_URL}${item.iconUrl}`} alt={item.name} className="pp-item-icon-img" />
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
              <span className="pp-item-price"><CurrencyIcon config={currencyConfig} /> {item.price.toLocaleString()}</span>
              <div className="pp-item-footer-btns">
                {isGM && (
                  <button className="pp-edit-btn" onClick={() => setEditingItem(item)}>Edit</button>
                )}
                <button
                  className="pp-buy-btn"
                  disabled={buying === item.id || (currency !== null && currency < item.price)}
                  onClick={() => handleBuy(item)}
                >
                  {buying === item.id ? 'Buying...' : 'Buy'}
                </button>
              </div>
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

function SettingsSection({ guild, isGM, currencyConfig, onConfigChange }) {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('navalCommandVolume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [bgVolume, setBgVolume] = useState(() => {
    const saved = parseFloat(localStorage.getItem('bgMusicVolume'));
    return (saved > 0) ? saved : 0.3;
  });
  const [bgMuted, setBgMuted] = useState(() => localStorage.getItem('bgMusicMuted') === 'true');

  // Currency editor state (GM only)
  const [currencyName, setCurrencyName] = useState((currencyConfig || DEFAULT_CURRENCY).name);
  const [currencyIcon, setCurrencyIcon] = useState((currencyConfig || DEFAULT_CURRENCY).icon);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState((currencyConfig || DEFAULT_CURRENCY).iconUrl);
  const [clearIcon, setClearIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const iconRef = useRef(null);

  // Sync local state when currencyConfig prop changes
  useEffect(() => {
    if (currencyConfig) {
      setCurrencyName(currencyConfig.name || 'Credits');
      setCurrencyIcon(currencyConfig.icon || '💰');
      setIconPreview(currencyConfig.iconUrl || null);
    }
  }, [currencyConfig]);

  const handleVolume = (val) => {
    const v = parseFloat(val);
    setVolume(v);
    localStorage.setItem('navalCommandVolume', v);
  };

  const handleBgVolume = (val) => {
    const v = parseFloat(val);
    setBgVolume(v);
    localStorage.setItem('bgMusicVolume', v);
    if (!bgMuted) window.dispatchEvent(new CustomEvent('bgMusicVolumeChange', { detail: v }));
  };

  const handleBgMute = () => {
    const nowMuted = !bgMuted;
    setBgMuted(nowMuted);
    localStorage.setItem('bgMusicMuted', String(nowMuted));
    window.dispatchEvent(new CustomEvent('bgMusicMuteChange', { detail: nowMuted }));
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setClearIcon(false);
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setClearIcon(true);
    if (iconRef.current) iconRef.current.value = '';
  };

  const handleSaveCurrency = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      let updatedIconUrl = clearIcon ? null : (currencyConfig?.iconUrl || null);

      // Upload new icon if selected
      if (iconFile) {
        const formData = new FormData();
        formData.append('icon', iconFile);
        const iconRes = await axios.post(
          `${API_URL}/api/admin/guild-config/${guild.id}/currency-icon`,
          formData,
          { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
        );
        updatedIconUrl = iconRes.data.iconUrl;
      }

      // Save name + emoji + iconUrl
      const payload = { currencyName, currencyIcon, currencyIconUrl: updatedIconUrl };
      const res = await axios.post(`${API_URL}/api/admin/guild-config/${guild.id}`, payload, { withCredentials: true });
      onConfigChange({ name: res.data.currencyName || 'Credits', icon: res.data.currencyIcon || '💰', iconUrl: res.data.currencyIconUrl || null });
      setSaveMsg({ type: 'success', text: 'Currency settings saved!' });
    } catch (e) {
      setSaveMsg({ type: 'error', text: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-settings">
      <h3>Audio</h3>

      <div className="pp-setting-row">
        <label className="pp-setting-label">
          {bgMuted ? '🔇' : '🎵'} Background Music
        </label>
        <div className="pp-setting-control">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bgVolume}
            onChange={e => handleBgVolume(e.target.value)}
            className="pp-volume-slider"
          />
          <span className="pp-volume-label">{bgMuted ? 'Muted' : `${Math.round(bgVolume * 100)}%`}</span>
        </div>
        <button className="pp-mute-btn" onClick={handleBgMute}>
          {bgMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>

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

      {isGM && (
        <>
          <h3 style={{ marginTop: '24px' }}>Currency</h3>

          <div className="pp-setting-row">
            <label className="pp-setting-label">Currency Name</label>
            <input
              className="pp-currency-name-input"
              value={currencyName}
              onChange={e => setCurrencyName(e.target.value)}
              placeholder="Credits"
              maxLength={32}
            />
          </div>

          <div className="pp-setting-row">
            <label className="pp-setting-label">Emoji (used when no icon)</label>
            <input
              className="pp-currency-emoji-input"
              value={currencyIcon}
              onChange={e => setCurrencyIcon(e.target.value)}
              placeholder="💰"
              maxLength={4}
            />
          </div>

          <div className="pp-setting-row">
            <label className="pp-setting-label">Custom Icon</label>
            <div className="pp-currency-icon-row">
              {iconPreview
                ? <img src={iconPreview} alt="preview" className="pp-currency-icon-preview" />
                : <span className="pp-currency-icon-placeholder">{currencyIcon || '💰'}</span>
              }
              <button className="pp-mute-btn" onClick={() => iconRef.current?.click()}>
                {iconPreview ? 'Change' : 'Upload'}
              </button>
              {iconPreview && (
                <button className="pp-mute-btn" onClick={handleRemoveIcon}>Remove</button>
              )}
              <input ref={iconRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
            </div>
            <p className="pp-setting-hint">PNG/JPG up to 1MB. Overrides emoji when set.</p>
          </div>

          <div className="pp-currency-preview">
            Preview: <CurrencyIcon config={{ name: currencyName, icon: currencyIcon, iconUrl: iconPreview }} />{' '}
            <strong>1,000</strong> {currencyName || 'Credits'}
          </div>

          {saveMsg && (
            <div className={`pp-shop-msg ${saveMsg.type}`} style={{ marginTop: '8px' }}>{saveMsg.text}</div>
          )}

          <button className="pp-save-currency-btn" onClick={handleSaveCurrency} disabled={saving}>
            {saving ? 'Saving...' : 'Save Currency Settings'}
          </button>
        </>
      )}
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

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="pp-stars-input">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          className={`pp-star-btn ${n <= (hovered || value) ? 'filled' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}>★</button>
      ))}
      {value > 0 && <span className="pp-star-label">{['','Terrible','Poor','Okay','Good','Excellent'][value]}</span>}
    </div>
  );
}

function ReviewCard({ review, onDelete }) {
  return (
    <div className="pp-review-card">
      <div className="pp-review-header">
        <div className="pp-review-stars">{'★'.repeat(review.stars)}<span className="pp-review-stars-empty">{'★'.repeat(5 - review.stars)}</span></div>
        <div className="pp-review-meta">
          <span className="pp-review-name">{review.name}</span>
          <span className="pp-review-server">{review.server}</span>
        </div>
        {onDelete && (
          <button className="pp-review-delete-btn" onClick={() => onDelete(review.id)} title="Remove review">✕</button>
        )}
      </div>
      <p className="pp-review-text">{review.review}</p>
    </div>
  );
}

function SupportSection({ user, guild }) {
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugForm, setBugForm] = useState({ contactName: '', contactInfo: '', description: '', steps: '' });
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // 'success' | 'error'
  const fileInputRef = useRef(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ stars: 0, name: user?.username || '', review: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadReviews = () => {
    axios.get(`${API_URL}/api/reviews`, { withCredentials: true })
      .then(r => { setReviews(r.data.reviews || []); setIsAdmin(!!r.data.isAdmin); })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => { loadReviews(); }, []);

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Remove this review?')) return;
    try {
      await axios.delete(`${API_URL}/api/reviews/${id}`, { withCredentials: true });
      loadReviews();
    } catch {
      alert('Failed to remove review.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.stars || !reviewForm.review.trim()) return;
    setReviewSubmitting(true);
    setReviewResult(null);
    try {
      await axios.post(`${API_URL}/api/reviews`, {
        stars: reviewForm.stars,
        name: reviewForm.name || user?.username,
        review: reviewForm.review,
        server: guild?.name || 'Unknown Server'
      }, { withCredentials: true });
      setReviewResult('success');
      setReviewForm({ stars: 0, name: user?.username || '', review: '' });
      loadReviews();
    } catch {
      setReviewResult('error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugForm.description.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const data = new FormData();
      data.append('contactName', bugForm.contactName);
      data.append('contactInfo', bugForm.contactInfo);
      data.append('description', bugForm.description);
      data.append('steps', bugForm.steps);
      attachments.forEach(f => data.append('attachments', f));
      await axios.post(`${API_URL}/api/support/bug-report`, data, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitResult('success');
      setBugForm({ contactName: '', contactInfo: '', description: '', steps: '' });
      setAttachments([]);
    } catch {
      setSubmitResult('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  return (
    <div className="pp-support">
      <h3>❤️ Support the Developer</h3>
      <p>Naval Command is a passion project built and maintained by one person. If you enjoy the game, consider showing your support!</p>

      <div className="pp-support-cards">
        <div className="pp-support-card pp-support-card-clickable" onClick={() => { setShowReviewForm(f => !f); setReviewResult(null); }}>
          <div className="pp-support-icon">⭐</div>
          <h4>Leave a Review</h4>
          <p>Rate the bot and share your experience with the community.</p>
        </div>
        <div className="pp-support-card pp-support-card-clickable" onClick={() => { setShowBugForm(f => !f); setSubmitResult(null); }}>
          <div className="pp-support-icon">🐛</div>
          <h4>Report a Bug</h4>
          <p>Found an issue? Submit a bug report directly to the developer.</p>
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

      {showBugForm && (
        <div className="pp-bug-form-wrap">
          <h4>🐛 Report a Bug</h4>
          {submitResult === 'success' ? (
            <div className="pp-bug-success">
              <p>✅ Bug report sent! Thank you — I'll look into it.</p>
              <button className="pp-bug-btn-secondary" onClick={() => { setShowBugForm(false); setSubmitResult(null); }}>Close</button>
            </div>
          ) : (
            <form className="pp-bug-form" onSubmit={handleBugSubmit}>
              <div className="pp-bug-row">
                <div className="pp-bug-field">
                  <label>Your Name</label>
                  <input type="text" placeholder="How should I address you?" value={bugForm.contactName}
                    onChange={e => setBugForm(f => ({ ...f, contactName: e.target.value }))} />
                </div>
                <div className="pp-bug-field">
                  <label>Contact (email or Discord username)</label>
                  <input type="text" placeholder="Optional — for follow-up questions" value={bugForm.contactInfo}
                    onChange={e => setBugForm(f => ({ ...f, contactInfo: e.target.value }))} />
                </div>
              </div>

              <div className="pp-bug-field">
                <label>Bug Description *</label>
                <textarea rows={4} placeholder="Describe what went wrong..." required value={bugForm.description}
                  onChange={e => setBugForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="pp-bug-field">
                <label>Steps to Replicate</label>
                <textarea rows={4} placeholder="1. Go to...\n2. Click...\n3. The bug occurs when..." value={bugForm.steps}
                  onChange={e => setBugForm(f => ({ ...f, steps: e.target.value }))} />
              </div>

              <div className="pp-bug-field">
                <label>Attachments <span className="pp-bug-hint">(screenshots, logs — up to 5 files, 10MB each)</span></label>
                <div className="pp-bug-attach-row">
                  <button type="button" className="pp-bug-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    + Add Files
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.log,.txt" style={{ display: 'none' }} onChange={handleFiles} />
                  {attachments.length > 0 && (
                    <div className="pp-bug-file-list">
                      {attachments.map((f, i) => (
                        <span key={i} className="pp-bug-file-tag">
                          {f.name}
                          <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {submitResult === 'error' && (
                <div className="pp-bug-error">Failed to send report. Please try again.</div>
              )}

              <div className="pp-bug-actions">
                <button type="submit" className="pp-bug-btn-primary" disabled={submitting || !bugForm.description.trim()}>
                  {submitting ? 'Sending...' : 'Send Bug Report'}
                </button>
                <button type="button" className="pp-bug-btn-secondary" onClick={() => setShowBugForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {showReviewForm && (
        <div className="pp-bug-form-wrap">
          <h4>⭐ Leave a Review</h4>
          {reviewResult === 'success' ? (
            <div className="pp-bug-success">
              <p>✅ Thanks for your review!</p>
              <button className="pp-bug-btn-secondary" onClick={() => { setShowReviewForm(false); setReviewResult(null); }}>Close</button>
            </div>
          ) : (
            <form className="pp-bug-form" onSubmit={handleReviewSubmit}>
              <div className="pp-bug-field">
                <label>Rating *</label>
                <StarRating value={reviewForm.stars} onChange={s => setReviewForm(f => ({ ...f, stars: s }))} />
              </div>

              <div className="pp-bug-row">
                <div className="pp-bug-field">
                  <label>Your Name</label>
                  <input type="text" value={reviewForm.name}
                    onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={user?.username || 'Display name'} />
                </div>
                <div className="pp-bug-field">
                  <label>Server</label>
                  <input type="text" value={guild?.name || ''} readOnly className="input-readonly" />
                </div>
              </div>

              <div className="pp-bug-field">
                <label>Your Review *</label>
                <textarea rows={4} required value={reviewForm.review}
                  onChange={e => setReviewForm(f => ({ ...f, review: e.target.value }))}
                  placeholder="Share your experience with Naval Command..." />
              </div>

              {reviewResult === 'error' && <div className="pp-bug-error">Failed to submit. Please try again.</div>}

              <div className="pp-bug-actions">
                <button type="submit" className="pp-bug-btn-primary"
                  disabled={reviewSubmitting || !reviewForm.stars || !reviewForm.review.trim()}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
                <button type="button" className="pp-bug-btn-secondary" onClick={() => setShowReviewForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="pp-support-note">
        <p>Thank you for playing Naval Command. Every battle, every suggestion, and every piece of feedback helps make the game better for everyone. — <strong>MeekANTIFUN (Developer)</strong></p>
      </div>

      <div className="pp-reviews-section">
        <h4>Recent Reviews</h4>
        {reviewsLoading ? (
          <p className="pp-reviews-empty">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="pp-reviews-empty">No reviews yet. Be the first!</p>
        ) : (
          <div className="pp-reviews-list">
            {reviews.map(r => <ReviewCard key={r.id} review={r} onDelete={isAdmin ? handleDeleteReview : null} />)}
          </div>
        )}
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
  const [currencyConfig, setCurrencyConfig] = useState(DEFAULT_CURRENCY);
  const [isGM, setIsGM] = useState(false);

  useEffect(() => {
    if (!guild?.id) return;
    axios.get(`${API_URL}/api/admin/guild-config/${guild.id}`, { withCredentials: true })
      .then(r => {
        if (r.data.currencyName || r.data.currencyIcon || r.data.currencyIconUrl) {
          setCurrencyConfig({
            name: r.data.currencyName || 'Credits',
            icon: r.data.currencyIcon || '💰',
            iconUrl: r.data.currencyIconUrl || null
          });
        }
      }).catch(() => {});
    axios.get(`${API_URL}/api/admin/check-permission`, {
      params: { guildId: guild.id }, withCredentials: true
    }).then(r => setIsGM(r.data.hasPermission)).catch(() => {});
  }, [guild?.id]);

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
          {activeSection === 'characters' && <CharactersSection user={user} guild={guild} currencyConfig={currencyConfig} />}
          {activeSection === 'shop'       && <ShopSection       user={user} guild={guild} currencyConfig={currencyConfig} />}
          {activeSection === 'settings'   && <SettingsSection guild={guild} isGM={isGM} currencyConfig={currencyConfig} onConfigChange={setCurrencyConfig} />}
          {activeSection === 'about'      && <AboutSection />}
          {activeSection === 'support'    && <SupportSection user={user} guild={guild} />}
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
