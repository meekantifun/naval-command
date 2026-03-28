import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CharacterCreationWizard from './CharacterCreationWizard';
import './CharacterManager.css';

// Weapon stat computation (mirrors CharacterCreationWizard formulas)
const GUN_SHELL_WEIGHTS = {
  20:0.1,25:0.25,30:0.35,37:0.7,40:0.9,50:1.5,65:2.5,75:3,76:6,77:6.1,
  80:7,88:9.5,90:10,94:11,100:14,102:15,105:15.5,113:20,114:25,120:22,
  122:23,127:25,128:28,130:35,133:37,138.6:40,140:38,150:45,152:55,
  155:60,164.7:80,180:90,190:105,200:110,203:125,210:150,229:175,
  234:200,240:220,254:250,280:330,283:340,305:450,320:520,330:575,
  340:600,343:620,356:680,380:800,381:800,406:870,410:1000,
  457:1250,460:1460,480:1600
};
const TORPEDO_WEIGHTS = {324:280,356:320,450:350,483:380,533:400,550:430,610:500,650:550,750:650,850:750};
const GUN_RANGES = {
  20:2,25:2,30:2,37:3,40:3,50:4,76:5,88:6,100:6,114:7,127:8,130:8,
  140:9,150:9,152:9,155:10,180:10,203:12,234:13,280:16,305:18,330:19,
  356:20,380:21,381:21,406:22,410:22,420:23,460:24,480:25
};
const TORPEDO_RANGES = {324:8,356:9,450:10,483:11,533:12,550:13,610:14,650:15,750:16,850:17};

function closestKey(table, val) {
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  return keys.reduce((best,k)=>Math.abs(k-val)<Math.abs(best-val)?k:best, keys[0]);
}

function computeWeaponStats(type, caliberStr, totalBarrels) {
  const mm = parseFloat(caliberStr) || 127;
  const isTorpedo = type === 'torpedo';
  const weightTable = isTorpedo ? TORPEDO_WEIGHTS : GUN_SHELL_WEIGHTS;
  const rangeTable  = isTorpedo ? TORPEDO_RANGES  : GUN_RANGES;
  const shellWeight = weightTable[closestKey(weightTable, mm)];
  const range       = rangeTable[closestKey(rangeTable, mm)];
  const base        = (shellWeight * 0.2) + (totalBarrels * 4);
  const efficiency  = Math.max(0.8, 1.0 - ((totalBarrels - 1) * 0.05));
  const damage      = Math.round(base * efficiency);
  let reload, penetration, ammo;
  if (isTorpedo) {
    reload      = mm >= 550 ? 6 : 5;
    penetration = Math.max(280, Math.round(300 + (mm - 533) * 0.4));
    ammo        = totalBarrels <= 4 ? 12 : totalBarrels <= 8 ? 16 : 20;
  } else {
    reload      = mm >= 457 ? 4 : mm >= 200 ? 3 : mm >= 100 ? 2 : 1;
    penetration = mm >= 460 ? Math.round(mm*1.55) : mm >= 380 ? Math.round(mm*1.35)
                : mm >= 280 ? Math.round(mm*1.2)  : mm >= 165 ? Math.round(mm*1.0)
                : mm >= 100 ? Math.round(mm*0.95) : Math.round(mm*0.85);
    ammo        = mm >= 280 ? 80 : mm >= 165 ? 100 : mm >= 100 ? 120 : 200;
  }
  return { damage, range, reload, penetration, ammo };
}

function resolveWeaponStats(weapon) {
  if (weapon.damage != null && weapon.range != null) return weapon;
  const barrels = weapon.barrels || weapon.barrelCount || 1;
  return { ...weapon, ...computeWeaponStats(weapon.type, weapon.caliber, barrels) };
}

// AA caliber data (mirrors utils/gameConfig.js AA_CALIBERS)
const AA_CALIBERS = {
  '7.62mm':{damage:4,range:1,accuracy:0.45,rateOfFire:15},
  '12.7mm':{damage:8,range:2,accuracy:0.60,rateOfFire:12},
  '13.2mm':{damage:9,range:2,accuracy:0.58,rateOfFire:11},
  '14.5mm':{damage:10,range:2,accuracy:0.60,rateOfFire:10},
  '20mm':{damage:12,range:3,accuracy:0.65,rateOfFire:10},
  '23mm':{damage:13,range:3,accuracy:0.66,rateOfFire:9},
  '25mm':{damage:14,range:3,accuracy:0.62,rateOfFire:9},
  '28mm':{damage:15,range:4,accuracy:0.64,rateOfFire:7},
  '30mm':{damage:16,range:4,accuracy:0.60,rateOfFire:8},
  '35mm':{damage:18,range:4,accuracy:0.63,rateOfFire:7},
  '37mm':{damage:20,range:5,accuracy:0.68,rateOfFire:7},
  '40mm':{damage:22,range:5,accuracy:0.70,rateOfFire:6},
  '45mm':{damage:24,range:5,accuracy:0.66,rateOfFire:5},
  '50mm':{damage:26,range:6,accuracy:0.68,rateOfFire:4},
  '57mm':{damage:30,range:7,accuracy:0.70,rateOfFire:4},
  '75mm':{damage:36,range:8,accuracy:0.72,rateOfFire:3},
  '76.2mm':{damage:38,range:8,accuracy:0.74,rateOfFire:3},
  '76.5mm':{damage:39,range:8,accuracy:0.74,rateOfFire:3},
  '77mm':{damage:40,range:8,accuracy:0.74,rateOfFire:3},
  '80mm':{damage:41,range:9,accuracy:0.75,rateOfFire:2},
  '83.5mm':{damage:42,range:9,accuracy:0.75,rateOfFire:2},
  '85mm':{damage:44,range:9,accuracy:0.76,rateOfFire:2},
  '88mm':{damage:46,range:10,accuracy:0.78,rateOfFire:2},
  '90mm':{damage:48,range:10,accuracy:0.77,rateOfFire:2},
  '94mm':{damage:50,range:10,accuracy:0.78,rateOfFire:2},
  '100mm':{damage:52,range:11,accuracy:0.80,rateOfFire:2},
  '102mm':{damage:53,range:11,accuracy:0.79,rateOfFire:2},
  '105mm':{damage:55,range:11,accuracy:0.79,rateOfFire:2},
  '113mm':{damage:58,range:12,accuracy:0.80,rateOfFire:2},
  '120mm':{damage:64,range:12,accuracy:0.82,rateOfFire:2},
  '127mm':{damage:68,range:13,accuracy:0.83,rateOfFire:2},
  '128mm':{damage:70,range:13,accuracy:0.84,rateOfFire:2},
  '130mm':{damage:72,range:13,accuracy:0.84,rateOfFire:2},
  '133mm':{damage:74,range:14,accuracy:0.85,rateOfFire:2},
  '150mm':{damage:80,range:15,accuracy:0.86,rateOfFire:1},
  '152mm':{damage:82,range:15,accuracy:0.87,rateOfFire:1},
};
const AA_MOUNT_MULTIPLIERS = {single:1.0,twin:1.8,triple:2.5,quad:3.2,sextuple:4.5,octuple:5.5};

const EQUIPMENT_META = {
  // All classes
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
  // Destroyer
  high_speed_turbines:        { name: 'High-Speed Steam Turbines',          emoji: '💨', description: '+2 speed (Destroyer)' },
  torpedo_director:           { name: 'Torpedo Fire Director',              emoji: '🎯', description: '+20% torpedo accuracy, +15% flooding (Destroyer)' },
  depth_charge_racks:         { name: 'Depth Charge Racks',                 emoji: '💣', description: '60 dmg to submerged subs in adjacent cells (Destroyer)' },
  enhanced_smoke_gen:         { name: 'Enhanced Smoke Generator',           emoji: '🌫️', description: '+65% evasion for 4 turns (Destroyer)' },
  // Light Cruiser
  aa_director:                { name: 'AA Fire Director Mk. III',           emoji: '🛡️', description: '+30% AA damage, +2 AA range (Light Cruiser)' },
  high_pressure_boiler:       { name: 'High-Pressure Boiler System',        emoji: '⚙️', description: '+1 speed, +1 movement (Light Cruiser)' },
  // Light Cruiser + Heavy Cruiser
  scout_floatplane:           { name: 'OS2U Kingfisher Floatplane',         emoji: '🛩️', description: '+5 detection range, +12% long-range accuracy (Light/Heavy Cruiser)' },
  // Heavy Cruiser
  heavy_armor_belt:           { name: 'Heavy Side Armor Belt',              emoji: '🪨', description: '+40 armor (Heavy Cruiser)' },
  dual_purpose_mount:         { name: 'Dual-Purpose Gun Mount',             emoji: '🔫', description: '+20 AA damage, +10 secondary damage (Heavy Cruiser)' },
  type94_fire_director:       { name: 'Type 94 Fire Director',              emoji: '💻', description: '+20% accuracy, -shell spread at range (Heavy Cruiser)' },
  // Battleship
  turtleback_armor:           { name: 'Turtleback Armor Scheme',            emoji: '🛡️', description: '+60 armor, -below-waterline penetration (Battleship)' },
  secondary_battery_director: { name: 'Secondary Battery Director',         emoji: '🎯', description: '+35% secondary gun damage, +2 secondary range (Battleship)' },
  ford_rangekeeping:          { name: 'Ford Rangekeeping Computer',         emoji: '📐', description: '+25% accuracy beyond 5 cells (Battleship)' },
  conning_tower_armor:        { name: 'Conning Tower Reinforcement',        emoji: '🏰', description: '-40% chance of crew casualty crits (Battleship)' },
  // Aircraft Carrier
  armored_flight_deck:        { name: 'Armored Flight Deck',                emoji: '🛬', description: '-35% bomb/strafing damage to carrier (Carrier)' },
  expanded_hangar:            { name: 'Expanded Hangar Deck',               emoji: '🏗️', description: '+2 aircraft squadron capacity (Carrier)' },
  advanced_cic:               { name: 'Advanced Combat Information Center', emoji: '🖥️', description: '+15% aircraft damage, -1 rearm turn (Carrier)' },
  catapult_upgrade:           { name: 'H-4 Catapult Upgrade',               emoji: '🚀', description: '-1 launch delay turn (Carrier)' },
  // Submarine
  improved_periscope:         { name: 'High-Power Attack Periscope',        emoji: '🔭', description: 'Target from 6 cells while submerged (Submarine)' },
  silent_running:             { name: 'Silent Running System',              emoji: '🤫', description: '-40% sonar detection chance (Submarine)' },
  oxygen_recycler:            { name: 'Oxygen Recycling System',            emoji: '💨', description: '+4 turns before forced surface (Submarine)' },
  magnetic_detonator:         { name: 'Magnetic Torpedo Detonator',         emoji: '🧲', description: '+25% torpedo damage (Submarine)' },
  escape_hatch:               { name: 'Emergency Escape System',            emoji: '🆘', description: 'Survive one fatal hit at 1 HP (Submarine)' },
};

function resolveAAStats(aa) {
  // Normalize accuracy: Discord stores as percentage (e.g. 47.4), web stores as decimal (e.g. 0.79)
  const normalizeAccuracy = (v) => (v != null && v > 1 ? v / 100 : v);
  if (aa.range != null && aa.damage != null) return { ...aa, accuracy: normalizeAccuracy(aa.accuracy) };
  const data = AA_CALIBERS[aa.caliber];
  if (!data) return { ...aa, accuracy: normalizeAccuracy(aa.accuracy) };
  const mult = AA_MOUNT_MULTIPLIERS[aa.mountType] || 1.0;
  return {
    ...aa,
    range: data.range,
    damage: Math.round(data.damage * mult),
    accuracy: data.accuracy,
    rateOfFire: Math.round(data.rateOfFire * mult),
  };
}

function AdjustRow({ label, value, guildId, userId, characterName, field }) {
  const isLevel = field === 'level';
  const defaultDelta = isLevel ? 1 : 100;
  const maxDelta = isLevel ? 10 : 10000;

  const [delta, setDelta] = useState(defaultDelta);
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const adjust = async (sign) => {
    setBusy(true);
    setFlash(null);
    try {
      const payload = { guildId, userId, characterName };
      if (field === 'currency') payload.currencyDelta = delta * sign;
      else payload.levelDelta = delta * sign;
      const res = await axios.patch('/api/admin/player-stats', payload, { withCredentials: true });
      const newVal = field === 'currency' ? res.data.currency : res.data.level;
      setCurrent(newVal);
      setFlash('ok');
    } catch {
      setFlash('err');
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  return (
    <div className="adjust-row">
      <span className="adjust-label">{label}</span>
      <span className="adjust-current">{typeof current === 'number' ? current.toLocaleString() : current}</span>
      <input
        type="number"
        className="adjust-input"
        value={delta}
        min="1"
        max={maxDelta}
        onChange={e => setDelta(Math.min(maxDelta, Math.max(1, parseInt(e.target.value) || 1)))}
      />
      <button className="btn-adjust-add" onClick={() => adjust(1)} disabled={busy}>+</button>
      <button className="btn-adjust-remove" onClick={() => adjust(-1)} disabled={busy}>−</button>
      {flash === 'ok' && <span className="adjust-flash ok">✓ {current.toLocaleString()}</span>}
      {flash === 'err' && <span className="adjust-flash err">✗</span>}
    </div>
  );
}

function CharacterManager({ guildId, user }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [battleStatuses, setBattleStatuses] = useState({});
  const [pendingUpgrades, setPendingUpgrades] = useState(new Set());

  const toggleCard = (idx) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  useEffect(() => {
    loadCharacters();
  }, [guildId]);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/characters', {
        params: { guildId },
        withCredentials: true
      });
      const chars = response.data.characters || [];
      setCharacters(chars);

      // Fetch battle status for each unique userId
      const uniqueUserIds = [...new Set(chars.map(c => c.userId).filter(Boolean))];
      const statusEntries = await Promise.all(
        uniqueUserIds.map(uid =>
          axios.get('/api/player/battle-status', { params: { guildId, userId: uid }, withCredentials: true })
            .then(r => [uid, r.data])
            .catch(() => [uid, { inBattle: false }])
        )
      );
      setBattleStatuses(Object.fromEntries(statusEntries));
    } catch (error) {
      console.error('Error loading characters:', error);
      alert('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpgrade = async (char, itemId, newActive) => {
    const key = `${char.userId}:${char.name}:${itemId}`;
    if (pendingUpgrades.has(key)) return;
    setPendingUpgrades(prev => new Set(prev).add(key));
    try {
      const res = await axios.patch('/api/player/active-upgrades', {
        guildId,
        userId: char.userId,
        characterName: char.name,
        itemId,
        active: newActive,
      }, { withCredentials: true });
      setCharacters(prev => prev.map(c =>
        c.userId === char.userId && c.name === char.name
          ? { ...c, activeUpgrades: res.data.activeUpgrades }
          : c
      ));
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to update upgrade');
    } finally {
      setPendingUpgrades(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowWizard(true);
  };

  const handleDelete = async (character) => {
    if (!window.confirm(`Are you sure you want to delete ${character.name}?`)) {
      return;
    }

    try {
      await axios.delete('/api/admin/characters', {
        params: {
          guildId,
          userId: character.userId,
          characterName: character.name
        },
        withCredentials: true
      });

      alert('Character deleted successfully!');
      loadCharacters();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Failed to delete character');
    }
  };

  if (loading) {
    return <div className="loading">Loading characters...</div>;
  }

  return (
    <div className="character-manager">
      {showWizard && (
        <CharacterCreationWizard
          guildId={guildId}
          userId={user?.id}
          initialData={editingCharacter}
          onComplete={() => {
            setShowWizard(false);
            setEditingCharacter(null);
            loadCharacters();
          }}
          onCancel={() => {
            setShowWizard(false);
            setEditingCharacter(null);
          }}
        />
      )}

      <div className="manager-section">
        <div className="section-header">
          <div>
            <h3>Character Management</h3>
            <p className="section-desc">Create and manage characters for your server</p>
          </div>
          <button onClick={() => setShowWizard(true)} className="btn-create-wizard">
            + Create New Character
          </button>
        </div>
      </div>

      <div className="manager-section">
        <h3>All Characters ({characters.length})</h3>
        {characters.length === 0 ? (
          <p className="no-data">No characters found. Create one above!</p>
        ) : (
          <div className="character-list">
            {characters.map((char, idx) => {
              const isExpanded = expandedCards.has(idx);
              return (
              <div key={idx} className={`character-card${isExpanded ? ' expanded' : ' collapsed'}`}>
                <div className="character-header" onClick={() => toggleCard(idx)} style={{cursor:'pointer'}}>
                  <div className="character-title">
                    <h4>
                      {char.name}
                      {char.isActive && <span className="badge-active">Active</span>}
                      <span className={`card-toggle-arrow${isExpanded ? ' open' : ''}`}>▶</span>
                    </h4>
                    <p className="char-class">{char.shipClass} • {char.tonnage ? `${char.tonnage.toLocaleString()} tons` : 'N/A'}</p>
                    <p className="char-user">User ID: {char.userId}</p>
                  </div>
                  <div className="character-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(char)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(char)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (<div className="char-section-wrapper">

                {/* Ship Specifications */}
                {char.tonnage && (
                  <div className="char-section">
                    <h5>⚓ Ship Specifications</h5>
                    <div className="spec-grid">
                      <div className="spec-item">
                        <label>Tonnage:</label>
                        <span>{char.tonnage.toLocaleString()} tons</span>
                      </div>
                      <div className="spec-item">
                        <label>Speed:</label>
                        <span>{char.speedKnots || 'N/A'} knots</span>
                      </div>
                      {char.armorThickness && (
                        <>
                          <div className="spec-item">
                            <label>Belt Armor:</label>
                            <span>{char.armorThickness.belt}mm</span>
                          </div>
                          <div className="spec-item">
                            <label>Deck Armor:</label>
                            <span>{char.armorThickness.deck}mm</span>
                          </div>
                          <div className="spec-item">
                            <label>Turret Armor:</label>
                            <span>{char.armorThickness.turret}mm</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Combat Stats */}
                {char.stats && (
                  <div className="char-section">
                    <h5>⚔️ Combat Stats</h5>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <label>Health:</label>
                        <div className="stat-bar">
                          <div className="stat-fill health" style={{width: `${Math.min(100, (char.stats.health / 200) * 100)}%`}}></div>
                          <span className="stat-value">{char.stats.health}</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <label>Armor:</label>
                        <div className="stat-bar">
                          <div className="stat-fill armor" style={{width: `${Math.min(100, (char.stats.armor / 100) * 100)}%`}}></div>
                          <span className="stat-value">{char.stats.armor}</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <label>Speed:</label>
                        <div className="stat-bar">
                          <div className="stat-fill speed" style={{width: `${Math.min(100, (char.stats.speed / 10) * 100)}%`}}></div>
                          <span className="stat-value">{char.stats.speed}</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <label>Evasion:</label>
                        <div className="stat-bar">
                          <div className="stat-fill evasion" style={{width: `${Math.min(100, char.stats.evasion)}%`}}></div>
                          <span className="stat-value">{char.stats.evasion?.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <label>Range:</label>
                        <span className="stat-value">{char.stats.range}</span>
                      </div>
                      <div className="stat-item">
                        <label>Accuracy:</label>
                        <span className="stat-value">{char.stats.accuracy || char.stats.baseAccuracy}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weapons */}
                {char.weapons && Object.keys(char.weapons).length > 0 && (
                  <div className="char-section">
                    <h5>🔫 Weapons ({Object.keys(char.weapons).length})</h5>
                    <div className="weapons-list">
                      {Object.entries(char.weapons).map(([weaponId, rawWeapon]) => {
                        const weapon = resolveWeaponStats(rawWeapon);
                        return (
                          <div key={weaponId} className="weapon-item">
                            <div className="weapon-header">
                              <strong>{weapon.name}</strong>
                              <span className="weapon-type">{weapon.type}</span>
                            </div>
                            <div className="weapon-stats">
                              <span>Caliber: {weapon.caliber}</span>
                              <span>Damage: {weapon.damage}</span>
                              <span>Range: {weapon.range}</span>
                              <span>Reload: {weapon.reload}s</span>
                              <span>Penetration: {weapon.penetration}mm</span>
                              {weapon.mountGroups && weapon.mountGroups.length > 0 ? (
                                <span>Mounts: {weapon.mountGroups.map(g => `${g.count}× ${g.config}`).join(', ')} ({weapon.barrels} guns)</span>
                              ) : (
                                <>
                                  {(weapon.barrels || weapon.barrelCount) && <span>Barrels: {weapon.barrels || weapon.barrelCount}</span>}
                                  {weapon.configuration && <span>Config: {weapon.configuration}</span>}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Aircraft (for carriers) */}
                {char.shipClass === 'Carrier' && (char.availableAircraft || char.activeSquadrons) && (
                  <div className="char-section">
                    <h5>✈️ Aircraft</h5>
                    {char.hangar && <p className="hangar-info">Hangar Capacity: {char.hangar}</p>}

                    {char.availableAircraft && Object.keys(char.availableAircraft).length > 0 && (
                      <div className="aircraft-available">
                        <h6>Available Aircraft:</h6>
                        <div className="aircraft-list">
                          {Object.entries(char.availableAircraft).map(([type, aircraft]) => (
                            <div key={type} className="aircraft-item">
                              <strong>{aircraft.name || type}</strong>
                              <span>Type: {aircraft.type}</span>
                              <span>HP: {aircraft.hp}</span>
                              <span>Range: {aircraft.range}</span>
                              {aircraft.damage && <span>Damage: {aircraft.damage}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {char.activeSquadrons && Object.keys(char.activeSquadrons).length > 0 && (
                      <div className="squadrons-active">
                        <h6>Active Squadrons:</h6>
                        <div className="squadron-list">
                          {Object.entries(char.activeSquadrons).map(([id, squadron]) => (
                            <div key={id} className="squadron-item">
                              <strong>{squadron.name}</strong>
                              <span>Planes: {squadron.count || squadron.planes}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AA Systems */}
                {char.aaSystems && char.aaSystems.length > 0 && (
                  <div className="char-section">
                    <h5>🎯 Anti-Aircraft Systems ({char.aaSystems.length})</h5>
                    <div className="aa-list">
                      {char.aaSystems.map((rawAA, idx) => {
                        const aa = resolveAAStats(rawAA);
                        return (
                          <div key={idx} className="aa-item">
                            <strong>{aa.caliber}</strong>
                            <span>Range: {aa.range}</span>
                            <span>Mounts: {aa.mounts || aa.count}</span>
                            <span>Damage: {aa.damage}</span>
                            {aa.accuracy != null && <span>Accuracy: {(aa.accuracy * 100).toFixed(0)}%</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reconnaissance Aircraft */}
                {char.reconAircraft && (
                  <div className="char-section">
                    <h5>🛩️ Reconnaissance Aircraft</h5>
                    <div className="aa-list">
                      <div className="aa-item">
                        <strong>{char.reconAircraft.name}</strong>
                        <span>Type: {char.reconAircraft.type}</span>
                        <span>Effect: +5 range when launched</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrades */}
                {(() => {
                  const inv = char.inventory || {};
                  const ownedEquipment = Object.entries(inv).filter(([id]) => id in EQUIPMENT_META && inv[id] > 0);
                  if (ownedEquipment.length === 0) return null;
                  const activeUpgrades = char.activeUpgrades || [];
                  const inBattle = battleStatuses[char.userId]?.inBattle ?? false;
                  const hasActiveLocked = inBattle && activeUpgrades.some(id => id in EQUIPMENT_META);
                  return (
                    <div className="char-section">
                      <h5>⚙️ Upgrades ({ownedEquipment.length})</h5>
                      <div className="upgrades-list">
                        {ownedEquipment.map(([itemId]) => {
                          const meta = EQUIPMENT_META[itemId];
                          const isActive = activeUpgrades.includes(itemId);
                          const key = `${char.userId}:${char.name}:${itemId}`;
                          const isPending = pendingUpgrades.has(key);
                          const isDisabled = inBattle || isPending;
                          return (
                            <div key={itemId} className="upgrade-row">
                              <span className="upgrade-emoji">{meta.emoji}</span>
                              <div className="upgrade-info">
                                <div className="upgrade-name">{meta.name}</div>
                                <div className="upgrade-desc">{meta.description}</div>
                              </div>
                              <div className="toggle-wrap">
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    aria-label={meta.name}
                                    checked={isActive}
                                    disabled={isDisabled}
                                    onChange={() => handleToggleUpgrade(char, itemId, !isActive)}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                                <span className={`toggle-label${isActive ? ' active' : ''}`}>
                                  {isPending ? '…' : isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              {inBattle && <span className="lock-badge">🔒 In battle</span>}
                            </div>
                          );
                        })}
                      </div>
                      {hasActiveLocked && (
                        <p className="upgrades-battle-note">
                          Active upgrades are locked for the duration of the battle.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Experience & Progress */}
                {(char.level || char.battles || char.victories) && (
                  <div className="char-section">
                    <h5>📊 Experience & Record</h5>
                    <div className="progress-grid">
                      {char.level && (
                        <div className="progress-item">
                          <label>Level:</label>
                          <span>{char.level}</span>
                        </div>
                      )}
                      {char.experience !== undefined && (
                        <div className="progress-item">
                          <label>Experience:</label>
                          <span>{char.experience}</span>
                        </div>
                      )}
                      {char.battles !== undefined && (
                        <div className="progress-item">
                          <label>Battles:</label>
                          <span>{char.battles}</span>
                        </div>
                      )}
                      {char.victories !== undefined && (
                        <div className="progress-item">
                          <label>Victories:</label>
                          <span>{char.victories}</span>
                        </div>
                      )}
                      {char.currency !== undefined && (
                        <div className="progress-item">
                          <label>Currency:</label>
                          <span>{char.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* GM Adjust */}
                <div className="char-section gm-adjust-section">
                  <h5>⚙️ GM Controls</h5>
                  <AdjustRow
                    label="Credits"
                    value={char.currency ?? 0}
                    guildId={guildId}
                    userId={char.userId}
                    characterName={char.name}
                    field="currency"
                  />
                  <AdjustRow
                    label="Level"
                    value={char.level ?? 1}
                    guildId={guildId}
                    userId={char.userId}
                    characterName={char.name}
                    field="level"
                  />
                </div>
                </div>)}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterManager;
