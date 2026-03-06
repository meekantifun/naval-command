import React, { useState } from 'react';
import axios from 'axios';
import './CharacterCreationWizard.css';

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
    configuration: 'single',
    customName: ''
  });

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
    { value: 'single', label: 'Single Mount' },
    { value: 'twin',   label: 'Twin Mount' },
    { value: 'triple', label: 'Triple Mount' },
    { value: 'quad',   label: 'Quad Mount' },
    { value: 'quin',   label: 'Quintuple Mount' },
    { value: 'sext',   label: 'Sextuple Mount' }
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

  const autoWeaponName = (w) => {
    if (w.type === 'torpedo') return `${w.caliber} Torpedo`;
    const configLabel = weaponConfigurations.find(c => c.value === w.configuration)?.label || w.configuration;
    return `${w.caliber} ${configLabel}`;
  };

  const addWeapon = () => {
    const weaponId = `${currentWeapon.type}_${Date.now()}`;
    const name = currentWeapon.customName.trim() || autoWeaponName(currentWeapon);
    setFormData({
      ...formData,
      weapons: {
        ...formData.weapons,
        [weaponId]: { ...currentWeapon, name, barrels: barrelCount(currentWeapon.configuration) }
      }
    });
    setCurrentWeapon({ type: 'main', caliber: '127mm', configuration: 'single', customName: '' });
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
                  <small>500 – 100,000 tons</small>
                </div>
                <div className="form-group">
                  <label>Speed (knots) *</label>
                  <input type="number" min="10" max="50" value={formData.speedKnots}
                    onChange={(e) => handleBasicInfoChange('speedKnots', parseInt(e.target.value) || 10)} />
                  <small>10 – 50 knots</small>
                </div>
              </div>

              <div className="armor-section">
                <h4>Armor Thickness (mm)</h4>
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

                  {currentWeapon.type !== 'torpedo' && (
                    <div className="form-group">
                      <label>Configuration</label>
                      <select value={currentWeapon.configuration}
                        onChange={(e) => setCurrentWeapon({ ...currentWeapon, configuration: e.target.value })}>
                        {weaponConfigurations.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Custom Name <span className="optional">(optional)</span></label>
                  <input type="text" value={currentWeapon.customName}
                    onChange={(e) => setCurrentWeapon({ ...currentWeapon, customName: e.target.value })}
                    placeholder={autoWeaponName(currentWeapon)} />
                  <small>Leave blank to use auto-generated name</small>
                </div>

                <button onClick={addWeapon} className="btn-add">+ Add Weapon</button>
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
                            {weapon.type} • {weapon.caliber}{weapon.configuration ? ` • ${weapon.configuration}` : ''}
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
