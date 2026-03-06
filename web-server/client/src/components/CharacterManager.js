import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CharacterCreationWizard from './CharacterCreationWizard';
import './CharacterManager.css';

function AdjustRow({ label, value, guildId, userId, characterName, field }) {
  const [delta, setDelta] = useState(100);
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
        onChange={e => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
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
      setCharacters(response.data.characters || []);
    } catch (error) {
      console.error('Error loading characters:', error);
      alert('Failed to load characters');
    } finally {
      setLoading(false);
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
            {characters.map((char, idx) => (
              <div key={idx} className="character-card expanded">
                <div className="character-header">
                  <div className="character-title">
                    <h4>{char.name} {char.isActive && <span className="badge-active">Active</span>}</h4>
                    <p className="char-class">{char.shipClass} • {char.tonnage ? `${char.tonnage.toLocaleString()} tons` : 'N/A'}</p>
                    <p className="char-user">User ID: {char.userId}</p>
                  </div>
                  <div className="character-actions">
                    <button onClick={() => handleEdit(char)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(char)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </div>

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
                      {Object.entries(char.weapons).map(([weaponId, weapon]) => (
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
                            <span>Barrels: {weapon.barrels || weapon.barrelCount}</span>
                            {weapon.configuration && <span>Config: {weapon.configuration}</span>}
                          </div>
                        </div>
                      ))}
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
                      {char.aaSystems.map((aa, idx) => (
                        <div key={idx} className="aa-item">
                          <strong>{aa.caliber}</strong>
                          <span>Range: {aa.range}</span>
                          <span>Mounts: {aa.mounts || aa.count}</span>
                          {aa.damage && <span>Damage: {aa.damage}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterManager;
