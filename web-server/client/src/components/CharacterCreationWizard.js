import React, { useState } from 'react';
import axios from 'axios';
import './CharacterCreationWizard.css';

function CharacterCreationWizard({ guildId, userId, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic ship info
    characterName: '',
    shipClass: 'Destroyer',
    tonnage: 2500,
    speedKnots: 35,
    armorThickness: {
      belt: 25,
      deck: 15,
      turret: 10
    },

    // Calculated stats (will be auto-calculated)
    calculatedHP: 0,
    calculatedArmor: 0,
    calculatedSpeed: 0,
    calculatedEvasion: {},

    // Step 2: Weapons
    weapons: {},

    // Step 3: Aircraft (carriers only)
    availableAircraft: {},

    // Step 4: AA Systems
    aaSystems: []
  });

  const [currentWeapon, setCurrentWeapon] = useState({
    type: 'main',
    caliber: '127mm',
    configuration: 'single'
  });

  const [currentAA, setCurrentAA] = useState({
    caliber: '40mm',
    mounts: 4
  });

  const shipClasses = ['Destroyer', 'Cruiser', 'Battleship', 'Carrier', 'Submarine'];

  // Weapon calibers by type
  const mainGunCalibers = ['76mm', '100mm', '127mm', '152mm', '203mm', '280mm', '305mm', '356mm', '406mm', '460mm', '480mm'];
  const secondaryCalibers = ['76mm', '100mm', '127mm', '152mm'];
  const torpedoCalibers = ['450mm', '533mm', '610mm', '850mm'];
  const weaponConfigurations = ['single', 'twin', 'triple', 'quad'];

  // AA calibers
  const aaCalibers = ['20mm', '25mm', '40mm', '76mm', '127mm'];

  // Calculate stats when ship parameters change
  const calculateStats = (tonnage, speedKnots, armorThickness) => {
    // HP calculation (based on tonnage)
    const baseHP = 50;
    const tonnageHP = Math.floor(tonnage / 100);
    const calculatedHP = Math.max(10, baseHP + tonnageHP);

    // Armor calculation (based on belt armor)
    const baseArmor = 10;
    const armorRating = Math.floor(armorThickness.belt / 5);
    const calculatedArmor = Math.max(0, baseArmor + armorRating);

    // Speed calculation (based on knots)
    const calculatedSpeed = Math.max(1, Math.min(10, Math.floor(speedKnots / 5)));

    // Evasion calculation (based on speed and size)
    const baseEvasion = 0.1;
    const referenceSpeed = 25;
    const referenceSize = 8000;
    const speedFactor = parseFloat((speedKnots / referenceSpeed).toFixed(2));
    const sizeFactor = parseFloat((referenceSize / tonnage).toFixed(2));
    const rawEvasion = baseEvasion * speedFactor * sizeFactor;
    const evasionPercentage = parseFloat((rawEvasion * 100).toFixed(1));

    const calculatedEvasion = {
      evasionPercentage,
      speedFactor,
      sizeFactor,
      calculation: {
        baseEvasion,
        referenceSpeed,
        referenceSize,
        rawEvasion
      }
    };

    return {
      calculatedHP,
      calculatedArmor,
      calculatedSpeed,
      calculatedEvasion
    };
  };

  const handleBasicInfoChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    // Recalculate stats when relevant fields change
    if (field === 'tonnage' || field === 'speedKnots' || field === 'armorThickness') {
      const stats = calculateStats(
        newFormData.tonnage,
        newFormData.speedKnots,
        newFormData.armorThickness
      );
      Object.assign(newFormData, stats);
    }

    setFormData(newFormData);
  };

  const handleArmorChange = (armorType, value) => {
    const newArmor = {
      ...formData.armorThickness,
      [armorType]: parseInt(value) || 0
    };
    handleBasicInfoChange('armorThickness', newArmor);
  };

  const addWeapon = () => {
    const weaponId = `${currentWeapon.type}_${Date.now()}`;
    const newWeapons = {
      ...formData.weapons,
      [weaponId]: {
        ...currentWeapon,
        name: `${currentWeapon.caliber} Gun`,
        barrels: currentWeapon.configuration === 'single' ? 1 :
                 currentWeapon.configuration === 'twin' ? 2 :
                 currentWeapon.configuration === 'triple' ? 3 : 4
      }
    };
    setFormData({ ...formData, weapons: newWeapons });

    // Reset current weapon
    setCurrentWeapon({
      type: 'main',
      caliber: '127mm',
      configuration: 'single'
    });
  };

  const removeWeapon = (weaponId) => {
    const newWeapons = { ...formData.weapons };
    delete newWeapons[weaponId];
    setFormData({ ...formData, weapons: newWeapons });
  };

  const addAASystem = () => {
    const newAASystems = [
      ...formData.aaSystems,
      { ...currentAA }
    ];
    setFormData({ ...formData, aaSystems: newAASystems });

    // Reset current AA
    setCurrentAA({
      caliber: '40mm',
      mounts: 4
    });
  };

  const removeAASystem = (index) => {
    const newAASystems = formData.aaSystems.filter((_, i) => i !== index);
    setFormData({ ...formData, aaSystems: newAASystems });
  };

  const handleSubmit = async () => {
    try {
      // Build final character data
      const characterData = {
        id: userId,
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
        activeSquadrons: {},
        aaSystems: formData.aaSystems,
        stats: {
          health: formData.calculatedHP,
          armor: formData.calculatedArmor,
          speed: formData.calculatedSpeed,
          evasion: formData.calculatedEvasion.evasionPercentage,
          range: 8, // Default, will be updated based on weapons
          baseAccuracy: 85,
          accuracy: 85
        },
        battles: 0,
        victories: 0,
        level: 1,
        experience: 0,
        currency: 0
      };

      await axios.post('/api/admin/characters', {
        guildId,
        userId,
        characterName: formData.characterName,
        characterData
      }, {
        withCredentials: true
      });

      alert('Character created successfully!');
      onComplete();
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Failed to create character: ' + (error.response?.data?.error || error.message));
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.characterName) {
      alert('Please enter a character name');
      return;
    }

    // Skip aircraft step if not a carrier
    if (step === 2 && formData.shipClass !== 'Carrier') {
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    // Skip aircraft step if not a carrier
    if (step === 4 && formData.shipClass !== 'Carrier') {
      setStep(2);
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>Create New Character</h2>
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
          {/* Step 1: Basic Ship Info */}
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
                />
              </div>

              <div className="form-group">
                <label>Ship Class *</label>
                <select
                  value={formData.shipClass}
                  onChange={(e) => handleBasicInfoChange('shipClass', e.target.value)}
                >
                  {shipClasses.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tonnage *</label>
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    value={formData.tonnage}
                    onChange={(e) => handleBasicInfoChange('tonnage', parseInt(e.target.value))}
                  />
                  <small>500 - 100,000 tons</small>
                </div>

                <div className="form-group">
                  <label>Speed (knots) *</label>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={formData.speedKnots}
                    onChange={(e) => handleBasicInfoChange('speedKnots', parseInt(e.target.value))}
                  />
                  <small>10 - 50 knots</small>
                </div>
              </div>

              <div className="armor-section">
                <h4>Armor Thickness (mm)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Belt Armor</label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={formData.armorThickness.belt}
                      onChange={(e) => handleArmorChange('belt', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Deck Armor</label>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={formData.armorThickness.deck}
                      onChange={(e) => handleArmorChange('deck', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Turret Armor</label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={formData.armorThickness.turret}
                      onChange={(e) => handleArmorChange('turret', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="calculated-stats">
                <h4>Calculated Stats</h4>
                <div className="stats-preview">
                  <div className="stat-preview">
                    <label>HP:</label>
                    <span>{formData.calculatedHP}</span>
                  </div>
                  <div className="stat-preview">
                    <label>Armor:</label>
                    <span>{formData.calculatedArmor}</span>
                  </div>
                  <div className="stat-preview">
                    <label>Speed:</label>
                    <span>{formData.calculatedSpeed}</span>
                  </div>
                  <div className="stat-preview">
                    <label>Evasion:</label>
                    <span>{formData.calculatedEvasion.evasionPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Weapons */}
          {step === 2 && (
            <div className="wizard-step">
              <h3>Weapons Configuration</h3>

              <div className="weapon-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>Weapon Type</label>
                    <select
                      value={currentWeapon.type}
                      onChange={(e) => setCurrentWeapon({ ...currentWeapon, type: e.target.value })}
                    >
                      <option value="main">Main Gun</option>
                      <option value="secondary">Secondary Gun</option>
                      <option value="torpedo">Torpedo</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Caliber</label>
                    <select
                      value={currentWeapon.caliber}
                      onChange={(e) => setCurrentWeapon({ ...currentWeapon, caliber: e.target.value })}
                    >
                      {currentWeapon.type === 'torpedo' ? (
                        torpedoCalibers.map(c => <option key={c} value={c}>{c}</option>)
                      ) : currentWeapon.type === 'secondary' ? (
                        secondaryCalibers.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        mainGunCalibers.map(c => <option key={c} value={c}>{c}</option>)
                      )}
                    </select>
                  </div>

                  {currentWeapon.type !== 'torpedo' && (
                    <div className="form-group">
                      <label>Configuration</label>
                      <select
                        value={currentWeapon.configuration}
                        onChange={(e) => setCurrentWeapon({ ...currentWeapon, configuration: e.target.value })}
                      >
                        {weaponConfigurations.map(c => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button onClick={addWeapon} className="btn-add">+ Add Weapon</button>
              </div>

              <div className="weapons-list-preview">
                <h4>Configured Weapons ({Object.keys(formData.weapons).length})</h4>
                {Object.keys(formData.weapons).length === 0 ? (
                  <p className="empty-message">No weapons added yet. Add at least one weapon.</p>
                ) : (
                  <div className="weapon-cards">
                    {Object.entries(formData.weapons).map(([id, weapon]) => (
                      <div key={id} className="weapon-card-preview">
                        <div>
                          <strong>{weapon.caliber}</strong>
                          <span className="weapon-meta">{weapon.type} • {weapon.configuration || 'N/A'}</span>
                        </div>
                        <button onClick={() => removeWeapon(id)} className="btn-remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Aircraft (Carriers only) */}
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

          {/* Step 4: AA Systems */}
          {step === 4 && (
            <div className="wizard-step">
              <h3>Anti-Aircraft Systems</h3>

              <div className="aa-builder">
                <div className="form-row">
                  <div className="form-group">
                    <label>AA Caliber</label>
                    <select
                      value={currentAA.caliber}
                      onChange={(e) => setCurrentAA({ ...currentAA, caliber: e.target.value })}
                    >
                      {aaCalibers.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Number of Mounts</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={currentAA.mounts}
                      onChange={(e) => setCurrentAA({ ...currentAA, mounts: parseInt(e.target.value) })}
                    />
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
                          <span className="aa-meta">{aa.mounts} mounts</span>
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
            {step > 1 && (
              <button onClick={prevStep} className="btn-prev">← Previous</button>
            )}
            {step < 4 ? (
              <button onClick={nextStep} className="btn-next">Next →</button>
            ) : (
              <button onClick={handleSubmit} className="btn-submit">Create Character</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterCreationWizard;
