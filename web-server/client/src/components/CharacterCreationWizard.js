import React, { useState } from 'react';
import axios from 'axios';
import './CharacterCreationWizard.css';

// Shell weights (kg) per caliber for guns and torpedoes
const GUN_SHELL_WEIGHTS = {
  20: 0.1, 25: 0.25, 30: 0.35, 37: 0.7, 40: 0.9, 50: 1.5,
  65: 2.5, 75: 3, 76: 6, 77: 6.1, 80: 7, 88: 9.5, 90: 10, 94: 11,
  100: 14, 102: 15, 105: 15.5, 113: 20, 114: 25, 120: 22, 122: 23,
  127: 25, 128: 28, 130: 35, 133: 37, 138.6: 40, 140: 38,
  150: 45, 152: 55, 155: 60, 164.7: 80,
  180: 90, 190: 105, 200: 110, 203: 125, 210: 150, 229: 175,
  234: 200, 240: 220, 254: 250,
  280: 330, 283: 340, 305: 450, 320: 520, 330: 575, 340: 600,
  343: 620, 356: 680, 380: 800, 381: 800, 406: 870, 410: 1000,
  457: 1250, 460: 1460, 480: 1600
};
const TORPEDO_WEIGHTS = {
  324: 280, 356: 320, 450: 350, 483: 380, 533: 400,
  550: 430, 610: 500, 650: 550, 750: 650, 850: 750
};
const GUN_RANGES = {
  20: 2, 25: 2, 30: 2, 37: 3, 40: 3, 50: 4, 76: 5, 88: 6, 100: 6,
  114: 7, 127: 8, 130: 8, 140: 9, 150: 9, 152: 9, 155: 10, 180: 10,
  203: 12, 234: 13, 280: 16, 305: 18, 330: 19, 356: 20, 380: 21,
  381: 21, 406: 22, 410: 22, 420: 23, 460: 24, 480: 25
};
const TORPEDO_RANGES = {
  324: 8, 356: 9, 450: 10, 483: 11, 533: 12, 550: 13,
  610: 14, 650: 15, 750: 16, 850: 17
};

function closestKey(table, val) {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  return keys.reduce((best, k) => Math.abs(k - val) < Math.abs(best - val) ? k : best, keys[0]);
}

function computeWeaponStats(type, caliberStr, totalBarrels) {
  const mm = parseFloat(caliberStr) || 127;
  const isTorpedo = type === 'torpedo';

  const weightTable = isTorpedo ? TORPEDO_WEIGHTS : GUN_SHELL_WEIGHTS;
  const rangeTable  = isTorpedo ? TORPEDO_RANGES  : GUN_RANGES;

  const shellWeight = weightTable[closestKey(weightTable, mm)];
  const range       = rangeTable[closestKey(rangeTable, mm)];

  // Damage — same formula as factionConfig.calculateWeaponDamage (Standard quality)
  const base       = (shellWeight * 0.2) + (totalBarrels * 4);
  const efficiency = Math.max(0.8, 1.0 - ((totalBarrels - 1) * 0.05));
  const damage     = Math.round(base * efficiency);

  let reload, penetration, ammo;
  if (isTorpedo) {
    reload      = mm >= 550 ? 6 : 5;
    penetration = Math.max(280, Math.round(300 + (mm - 533) * 0.4));
    ammo        = totalBarrels <= 4 ? 12 : totalBarrels <= 8 ? 16 : 20;
  } else {
    if (mm >= 457)      reload = 4;
    else if (mm >= 200) reload = 3;
    else if (mm >= 100) reload = 2;
    else                reload = 1;

    if (mm >= 460)      penetration = Math.round(mm * 1.55);
    else if (mm >= 380) penetration = Math.round(mm * 1.35);
    else if (mm >= 280) penetration = Math.round(mm * 1.2);
    else if (mm >= 165) penetration = Math.round(mm * 1.0);
    else if (mm >= 100) penetration = Math.round(mm * 0.95);
    else                penetration = Math.round(mm * 0.85);

    ammo = mm >= 280 ? 80 : mm >= 165 ? 100 : mm >= 100 ? 120 : 200;
  }

  return { damage, range, reload, penetration, ammo };
}

// Defined outside component so it can be used in lazy state initializer
function calculateStats(tonnage, speedKnots, armorThickness) {
  const calculatedHP = Math.max(10, 50 + Math.floor(tonnage / 100));
  const calculatedArmor = Math.max(0, 10 + Math.floor(armorThickness.belt / 5));
  const calculatedSpeed = Math.max(1, Math.min(10, Math.floor(speedKnots / 5)));
  const speedFactor = parseFloat((speedKnots / 25).toFixed(2));
  const sizeFactor = parseFloat((8000 / tonnage).toFixed(2));
  const rawEvasion = 0.1 * speedFactor * sizeFactor;
  const calculatedEvasion = {
    evasionPercentage: parseFloat((rawEvasion * 100).toFixed(1)),
    speedFactor,
    sizeFactor,
    calculation: { baseEvasion: 0.1, referenceSpeed: 25, referenceSize: 8000, rawEvasion }
  };
  return { calculatedHP, calculatedArmor, calculatedSpeed, calculatedEvasion };
}

function buildInitialFormData(initialData) {
  if (!initialData) {
    return {
      targetUserId: '',
      characterName: '',
      shipClass: 'Destroyer',
      tonnage: 2500,
      speedKnots: 35,
      armorThickness: { belt: 25, deck: 15, turret: 10 },
      ...calculateStats(2500, 35, { belt: 25, deck: 15, turret: 10 }),
      weapons: {},
      availableAircraft: {},
      aaSystems: []
    };
  }
  const tonnage = initialData.tonnage || 2500;
  const speedKnots = initialData.speedKnots || 35;
  const armor = initialData.armorThickness || { belt: 25, deck: 15, turret: 10 };
  return {
    targetUserId: initialData.userId || '',
    characterName: initialData.name || '',
    shipClass: initialData.shipClass || 'Destroyer',
    tonnage,
    speedKnots,
    armorThickness: armor,
    ...calculateStats(tonnage, speedKnots, armor),
    weapons: initialData.weapons || {},
    availableAircraft: initialData.availableAircraft || {},
    aaSystems: initialData.aaSystems || []
  };
}

function CharacterCreationWizard({ guildId, userId, onComplete, onCancel, initialData }) {
  const editMode = !!initialData;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => buildInitialFormData(initialData));

  const [currentWeapon, setCurrentWeapon] = useState({
    type: 'main',
    caliber: '127mm',
    mountGroups: [],
    customName: ''
  });
  const [mountGroupInput, setMountGroupInput] = useState({ count: 1, config: 'single' });

  const [currentAA, setCurrentAA] = useState({
    caliber: '40mm',
    mountType: 'single',
    mounts: 4
  });

  const shipClasses = ['Destroyer', 'Light Cruiser', 'Heavy Cruiser', 'Battleship', 'Carrier', 'Submarine'];

  const gunCaliberGroups = [
    {
      label: 'Secondary / Dual-Purpose (65–94mm)',
      calibers: ['65mm','75mm','76mm','76.2mm','76.5mm','77mm','80mm','88mm','90mm','94mm']
    },
    {
      label: 'Destroyer / Light DP (100–133mm)',
      calibers: ['100mm','102mm','105mm','113mm','114mm','120mm','122mm','127mm','128mm','130mm','133mm']
    },
    {
      label: 'Light Cruiser (138–165mm)',
      calibers: ['138.6mm','140mm','150mm','152mm','155mm','164.7mm']
    },
    {
      label: 'Heavy Cruiser (180–254mm)',
      calibers: ['180mm','190mm','200mm','203mm','210mm','229mm','234mm','240mm','254mm']
    },
    {
      label: 'Battleship / Capital Ship (280–480mm)',
      calibers: ['280mm','283mm','305mm','320mm','330mm','340mm','343mm','356mm','380mm','381mm','406mm','410mm','457mm','460mm','480mm']
    }
  ];

  const torpedoCalibers = ['324mm','356mm','450mm','483mm','533mm','550mm','610mm','650mm','750mm','850mm'];

  const weaponConfigurations = [
    { value: 'single', label: 'Single',    guns: 1 },
    { value: 'twin',   label: 'Twin',      guns: 2 },
    { value: 'triple', label: 'Triple',    guns: 3 },
    { value: 'quad',   label: 'Quad',      guns: 4 },
    { value: 'quin',   label: 'Quintuple', guns: 5 },
    { value: 'sext',   label: 'Sextuple',  guns: 6 }
  ];

  const aaCaliberGroups = [
    {
      label: 'Short Range (≤25mm)',
      calibers: ['7.62mm','12.7mm','13.2mm','14.5mm','20mm','23mm','25mm']
    },
    {
      label: 'Medium Range (28–57mm)',
      calibers: ['28mm','30mm','35mm','37mm','40mm','45mm','50mm','57mm']
    },
    {
      label: 'Long Range (75–152mm)',
      calibers: ['75mm','76.2mm','76.5mm','77mm','80mm','83.5mm','85mm','88mm','90mm','94mm',
                 '100mm','102mm','105mm','113mm','120mm','127mm','128mm','130mm','133mm','150mm','152mm']
    }
  ];

  const aaMountTypes = [
    { value: 'single',   label: 'Single' },
    { value: 'twin',     label: 'Twin' },
    { value: 'triple',   label: 'Triple' },
    { value: 'quad',     label: 'Quad' },
    { value: 'sextuple', label: 'Sextuple' },
    { value: 'octuple',  label: 'Octuple' }
  ];

  const handleBasicInfoChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'tonnage' || field === 'speedKnots' || field === 'armorThickness') {
      Object.assign(newFormData, calculateStats(newFormData.tonnage, newFormData.speedKnots, newFormData.armorThickness));
    }
    setFormData(newFormData);
  };

  const handleArmorChange = (armorType, value) => {
    handleBasicInfoChange('armorThickness', { ...formData.armorThickness, [armorType]: parseInt(value) || 0 });
  };

  const barrelCount = (config) => ({ single: 1, twin: 2, triple: 3, quad: 4, quin: 5, sext: 6 }[config] || 1);

  const totalGuns = (mountGroups) =>
    (mountGroups || []).reduce((sum, g) => sum + g.count * barrelCount(g.config), 0);

  const mountGroupSummary = (mountGroups) =>
    (mountGroups || []).map(g => {
      const label = weaponConfigurations.find(c => c.value === g.config)?.label || g.config;
      return `${g.count}× ${label}`;
    }).join(', ');

  const autoWeaponName = (w) => {
    const isTorpedo = w.type === 'torpedo';
    const groups = w.mountGroups || [];
    if (groups.length === 0) return isTorpedo ? `${w.caliber} Torpedo` : `${w.caliber} Gun`;
    const summary = mountGroupSummary(groups);
    return isTorpedo ? `${w.caliber} Torpedo (${summary})` : `${w.caliber} (${summary})`;
  };

  const addMountGroup = () => {
    setCurrentWeapon({
      ...currentWeapon,
      mountGroups: [...(currentWeapon.mountGroups || []), { count: mountGroupInput.count, config: mountGroupInput.config }]
    });
  };

  const removeMountGroup = (i) => {
    const updated = [...(currentWeapon.mountGroups || [])];
    updated.splice(i, 1);
    setCurrentWeapon({ ...currentWeapon, mountGroups: updated });
  };

  const addWeapon = () => {
    if (!currentWeapon.mountGroups || currentWeapon.mountGroups.length === 0) return;
    const weaponId = `${currentWeapon.type}_${Date.now()}`;
    const name = currentWeapon.customName.trim() || autoWeaponName(currentWeapon);
    const total = totalGuns(currentWeapon.mountGroups);
    const stats = computeWeaponStats(currentWeapon.type, currentWeapon.caliber, total);
    setFormData({
      ...formData,
      weapons: {
        ...formData.weapons,
        [weaponId]: { ...currentWeapon, name, barrels: total, ...stats }
      }
    });
    setCurrentWeapon({ type: currentWeapon.type, caliber: currentWeapon.caliber, mountGroups: [], customName: '' });
  };

  const removeWeapon = (weaponId) => {
    const newWeapons = { ...formData.weapons };
    delete newWeapons[weaponId];
    setFormData({ ...formData, weapons: newWeapons });
  };

  const addAASystem = () => {
    setFormData({ ...formData, aaSystems: [...formData.aaSystems, { ...currentAA }] });
    setCurrentAA({ caliber: '40mm', mountType: 'single', mounts: 4 });
  };

  const removeAASystem = (index) => {
    setFormData({ ...formData, aaSystems: formData.aaSystems.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    const assignUserId = formData.targetUserId.trim() || userId;
    try {
      const characterData = {
        id: assignUserId,
        shipClass: formData.shipClass,
        tonnage: formData.tonnage,
        speedKnots: formData.speedKnots,
        armorThickness: formData.armorThickness,
        calculatedHP: formData.calculatedHP,
        calculatedArmor: formData.calculatedArmor,
        calculatedSpeed: formData.calculatedSpeed,
        calculatedEvasion: formData.calculatedEvasion,
        hangar: formData.shipClass === 'Carrier' ? Math.floor(formData.tonnage / 500) : 0,
        weapons: formData.weapons,
        availableAircraft: formData.availableAircraft,
        activeSquadrons: initialData?.activeSquadrons || {},
        aaSystems: formData.aaSystems,
        stats: {
          health: formData.calculatedHP,
          armor: formData.calculatedArmor,
          speed: formData.calculatedSpeed,
          evasion: formData.calculatedEvasion.evasionPercentage,
          range: initialData?.stats?.range ?? 8,
          baseAccuracy: initialData?.stats?.baseAccuracy ?? 85,
          accuracy: initialData?.stats?.accuracy ?? 85
        },
        battles: initialData?.battles ?? 0,
        victories: initialData?.victories ?? 0,
        level: initialData?.level ?? 1,
        experience: initialData?.experience ?? 0,
        currency: initialData?.currency ?? 0
      };

      await axios.post('/api/admin/characters', {
        guildId,
        userId: assignUserId,
        characterName: formData.characterName,
        characterData
      }, { withCredentials: true });

      alert(editMode ? 'Character updated successfully!' : 'Character created successfully!');
      onComplete();
    } catch (error) {
      console.error('Error saving character:', error);
      alert('Failed to save character: ' + (error.response?.data?.error || error.message));
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.characterName.trim()) { alert('Please enter a character name'); return; }
    if (step === 2 && formData.shipClass !== 'Carrier') { setStep(4); return; }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 4 && formData.shipClass !== 'Carrier') { setStep(2); return; }
    setStep(step - 1);
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>{editMode ? `Edit: ${initialData.name}` : 'Create New Character'}</h2>
          <div className="wizard-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Ship Info</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Weapons</div>
            {formData.shipClass === 'Carrier' && (
              <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Aircraft</div>
            )}
            <div className={`step ${step >= 4 ? 'active' : ''}`}>{formData.shipClass === 'Carrier' ? '4' : '3'}. AA Systems</div>
          </div>
        </div>

        <div className="wizard-content">

          {/* ── Step 1: Basic Ship Info ── */}
          {step === 1 && (
            <div className="wizard-step">
              <h3>Ship Specifications</h3>

              <div className="form-group">
                <label>Character Name *</label>
                <input
                  type="text"
                  value={formData.characterName}
                  onChange={(e) => setFormData({ ...formData, characterName: e.target.value })}
                  placeholder="USS Iowa"
                  readOnly={editMode}
                  className={editMode ? 'input-readonly' : ''}
                />
                {editMode && <small>Character name cannot be changed during edit.</small>}
              </div>

              <div className="form-group">
                <label>Assign to Discord User ID</label>
                <input
                  type="text"
                  value={formData.targetUserId}
                  onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                  placeholder="Leave blank to assign to yourself"
                />
                <small>Right-click a user in Discord → Copy ID. Blank = assigned to you.</small>
              </div>

              <div className="form-group">
                <label>Ship Class *</label>
                <select value={formData.shipClass} onChange={(e) => handleBasicInfoChange('shipClass', e.target.value)}>
                  {shipClasses.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tonnage *</label>
                  <input type="number" min="500" max="100000" value={formData.tonnage}
                    onChange={(e) => handleBasicInfoChange('tonnage', parseInt(e.target.value) || 500)} />
                  <small>500 – 100,000 tons. Use full load displacement. Do not use long tons.</small>
                </div>
                <div className="form-group">
                  <label>Speed (knots) *</label>
                  <input type="number" min="10" max="50" value={formData.speedKnots}
                    onChange={(e) => handleBasicInfoChange('speedKnots', parseInt(e.target.value) || 10)} />
                  <small>10 – 50 knots</small>
                </div>
              </div>

              <div className="armor-section">
                <h4>Armor Thickness (mm) <span className="optional">— use the thickest value for each zone</span></h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Belt Armor</label>
                    <input type="number" min="0" max="500" value={formData.armorThickness.belt}
                      onChange={(e) => handleArmorChange('belt', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Deck Armor</label>
                    <input type="number" min="0" max="300" value={formData.armorThickness.deck}
                      onChange={(e) => handleArmorChange('deck', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Turret Armor</label>
                    <input type="number" min="0" max="500" value={formData.armorThickness.turret}
                      onChange={(e) => handleArmorChange('turret', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="calculated-stats">
                <h4>Calculated Stats</h4>
                <div className="stats-preview">
                  <div className="stat-preview"><label>HP:</label><span>{formData.calculatedHP}</span></div>
                  <div className="stat-preview"><label>Armor:</label><span>{formData.calculatedArmor}</span></div>
                  <div className="stat-preview"><label>Speed:</label><span>{formData.calculatedSpeed}</span></div>
                  <div className="stat-preview"><label>Evasion:</label><span>{formData.calculatedEvasion.evasionPercentage}%</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Weapons ── */}
          {step === 2 && (
            <div className="wizard-step">
              <h3>Weapons Configuration</h3>

              <div className="weapon-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={currentWeapon.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setCurrentWeapon({ ...currentWeapon, type, caliber: type === 'torpedo' ? '533mm' : '127mm' });
                      }}>
                      <option value="main">Main Gun</option>
                      <option value="secondary">Secondary Gun</option>
                      <option value="torpedo">Torpedo</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Caliber</label>
                    <select value={currentWeapon.caliber}
                      onChange={(e) => setCurrentWeapon({ ...currentWeapon, caliber: e.target.value })}>
                      {currentWeapon.type === 'torpedo' ? (
                        torpedoCalibers.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        gunCaliberGroups.map(group => (
                          <optgroup key={group.label} label={group.label}>
                            {group.calibers.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{currentWeapon.type === 'torpedo' ? 'Launcher' : 'Mount'} Configuration</label>
                    <div className="mount-group-input-row">
                      <input
                        type="number" min="1" max="20"
                        value={mountGroupInput.count}
                        onChange={e => setMountGroupInput({ ...mountGroupInput, count: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="mount-count-input"
                      />
                      <span className="mount-x">×</span>
                      <select
                        value={mountGroupInput.config}
                        onChange={e => setMountGroupInput({ ...mountGroupInput, config: e.target.value })}
                        className="mount-config-select"
                      >
                        {weaponConfigurations.map(c => (
                          <option key={c.value} value={c.value}>{c.label} ({c.guns} {currentWeapon.type === 'torpedo' ? 'tubes' : 'guns'})</option>
                        ))}
                      </select>
                      <button type="button" onClick={addMountGroup} className="btn-add-mount">+ Add</button>
                    </div>
                    {(currentWeapon.mountGroups || []).length > 0 && (
                      <div className="mount-groups-list">
                        {currentWeapon.mountGroups.map((g, i) => {
                          const label = weaponConfigurations.find(c => c.value === g.config)?.label || g.config;
                          const guns = barrelCount(g.config);
                          return (
                            <div key={i} className="mount-group-tag">
                              <span>{g.count}× {label} ({g.count * guns} {currentWeapon.type === 'torpedo' ? 'tubes' : 'guns'})</span>
                              <button type="button" onClick={() => removeMountGroup(i)}>×</button>
                            </div>
                          );
                        })}
                        <div className="mount-groups-total">
                          Total: <strong>{totalGuns(currentWeapon.mountGroups)} {currentWeapon.type === 'torpedo' ? 'tubes' : 'guns'}</strong>
                        </div>
                      </div>
                    )}
                    {(currentWeapon.mountGroups || []).length === 0 && (
                      <small>Add one or more mount groups. e.g. 2× Quad + 1× Twin = 10 guns.</small>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Custom Name <span className="optional">(optional)</span></label>
                  <input type="text" value={currentWeapon.customName}
                    onChange={(e) => setCurrentWeapon({ ...currentWeapon, customName: e.target.value })}
                    placeholder={autoWeaponName(currentWeapon)} />
                  <small>Leave blank to use auto-generated name</small>
                </div>

                {(currentWeapon.mountGroups || []).length > 0 && (() => {
                  const total = totalGuns(currentWeapon.mountGroups);
                  const s = computeWeaponStats(currentWeapon.type, currentWeapon.caliber, total);
                  return (
                    <div className="weapon-stats-preview">
                      <span>DMG {s.damage}</span>
                      <span>RNG {s.range}</span>
                      <span>Reload {s.reload}s</span>
                      <span>Pen {s.penetration}mm</span>
                      <span>Ammo {s.ammo}</span>
                    </div>
                  );
                })()}
                <button onClick={addWeapon} className="btn-add" disabled={!currentWeapon.mountGroups?.length}>+ Add Weapon</button>
              </div>

              <div className="weapons-list-preview">
                <h4>Configured Weapons ({Object.keys(formData.weapons).length})</h4>
                {Object.keys(formData.weapons).length === 0 ? (
                  <p className="empty-message">No weapons added yet.</p>
                ) : (
                  <div className="weapon-cards">
                    {Object.entries(formData.weapons).map(([id, weapon]) => (
                      <div key={id} className="weapon-card-preview">
                        <div>
                          <strong>{weapon.name}</strong>
                          <span className="weapon-meta">
                            {weapon.type} • {weapon.caliber}
                            {weapon.mountGroups && weapon.mountGroups.length > 0
                              ? ` • ${mountGroupSummary(weapon.mountGroups)} = ${weapon.barrels} ${weapon.type === 'torpedo' ? 'tubes' : 'guns'}`
                              : weapon.configuration ? ` • ${weapon.configuration}` : ''
                            }
                          </span>
                          <span className="weapon-stats-line">
                            DMG {weapon.damage ?? '?'} · RNG {weapon.range ?? '?'} · Reload {weapon.reload ?? '?'}s · Pen {weapon.penetration ?? '?'}mm · Ammo {weapon.ammo ?? '?'}
                          </span>
                        </div>
                        <button onClick={() => removeWeapon(id)} className="btn-remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Aircraft (Carriers only) ── */}
          {step === 3 && formData.shipClass === 'Carrier' && (
            <div className="wizard-step">
              <h3>Aircraft Configuration</h3>
              <div className="info-box">
                <p>Aircraft are assigned by the Game Master during battles.</p>
                <p>Your carrier has a hangar capacity of <strong>{Math.floor(formData.tonnage / 500)}</strong> aircraft.</p>
              </div>
              <p className="note">Click "Next" to continue to AA systems configuration.</p>
            </div>
          )}

          {/* ── Step 4: AA Systems ── */}
          {step === 4 && (
            <div className="wizard-step">
              <h3>Anti-Aircraft Systems</h3>

              <div className="aa-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>Caliber</label>
                    <select value={currentAA.caliber}
                      onChange={(e) => setCurrentAA({ ...currentAA, caliber: e.target.value })}>
                      {aaCaliberGroups.map(group => (
                        <optgroup key={group.label} label={group.label}>
                          {group.calibers.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Mount Type</label>
                    <select value={currentAA.mountType}
                      onChange={(e) => setCurrentAA({ ...currentAA, mountType: e.target.value })}>
                      {aaMountTypes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <small>Use the mount with the most guns per mount.</small>
                  </div>

                  <div className="form-group">
                    <label>Number of Mounts</label>
                    <input type="number" min="1" max="100" value={currentAA.mounts}
                      onChange={(e) => setCurrentAA({ ...currentAA, mounts: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>

                <button onClick={addAASystem} className="btn-add">+ Add AA System</button>
              </div>

              <div className="aa-list-preview">
                <h4>Configured AA Systems ({formData.aaSystems.length})</h4>
                {formData.aaSystems.length === 0 ? (
                  <p className="empty-message">No AA systems added. (Optional)</p>
                ) : (
                  <div className="aa-cards">
                    {formData.aaSystems.map((aa, idx) => (
                      <div key={idx} className="aa-card-preview">
                        <div>
                          <strong>{aa.caliber}</strong>
                          <span className="aa-meta">{aa.mounts}× {aa.mountType || 'mount'}</span>
                        </div>
                        <button onClick={() => removeAASystem(idx)} className="btn-remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button onClick={onCancel} className="btn-cancel">Cancel</button>
          <div className="wizard-nav">
            {step > 1 && <button onClick={prevStep} className="btn-prev">← Previous</button>}
            {step < 4 ? (
              <button onClick={nextStep} className="btn-next">Next →</button>
            ) : (
              <button onClick={handleSubmit} className="btn-submit">
                {editMode ? 'Save Changes' : 'Create Character'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterCreationWizard;
