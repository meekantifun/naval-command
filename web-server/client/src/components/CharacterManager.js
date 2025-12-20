import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CharacterCreationWizard from './CharacterCreationWizard';
import './CharacterManager.css';

function CharacterManager({ guildId, user }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    userId: '',
    characterName: '',
    shipClass: 'Destroyer',
    rank: 'Ensign',
    nationality: 'United States'
  });

  const shipClasses = ['Destroyer', 'Cruiser', 'Battleship', 'Carrier', 'Submarine', 'Auxiliary'];
  const ranks = ['Ensign', 'Lieutenant', 'Commander', 'Captain', 'Admiral'];

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userId || !formData.characterName) {
      alert('User ID and Character Name are required');
      return;
    }

    try {
      await axios.post('/api/admin/characters', {
        guildId,
        userId: formData.userId,
        characterName: formData.characterName,
        characterData: {
          shipClass: formData.shipClass,
          rank: formData.rank,
          nationality: formData.nationality
        }
      }, {
        withCredentials: true
      });

      alert('Character saved successfully!');
      setFormData({
        userId: '',
        characterName: '',
        shipClass: 'Destroyer',
        rank: 'Ensign',
        nationality: 'United States'
      });
      setEditing(null);
      loadCharacters();
    } catch (error) {
      console.error('Error saving character:', error);
      alert('Failed to save character');
    }
  };

  const handleEdit = (character) => {
    setFormData({
      userId: character.userId,
      characterName: character.name,
      shipClass: character.shipClass || 'Destroyer',
      rank: character.rank || 'Ensign',
      nationality: character.nationality || 'United States'
    });
    setEditing(character.name);
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
          onComplete={() => {
            setShowWizard(false);
            loadCharacters();
          }}
          onCancel={() => setShowWizard(false)}
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
        <h3>{editing ? 'Edit Character (Quick)' : 'Quick Edit Character'}</h3>
        <p className="section-desc">Use the form below for quick edits, or create new characters with the wizard above</p>
        <form onSubmit={handleSubmit} className="character-form">
          <div className="form-group">
            <label>User ID (Discord ID)</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({...formData, userId: e.target.value})}
              placeholder="123456789012345678"
              required
            />
            <small>Right-click user in Discord → Copy ID</small>
          </div>

          <div className="form-group">
            <label>Character Name</label>
            <input
              type="text"
              value={formData.characterName}
              onChange={(e) => setFormData({...formData, characterName: e.target.value})}
              placeholder="Captain Smith"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ship Class</label>
              <select
                value={formData.shipClass}
                onChange={(e) => setFormData({...formData, shipClass: e.target.value})}
              >
                {shipClasses.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Rank</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({...formData, rank: e.target.value})}
              >
                {ranks.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Nationality</label>
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => setFormData({...formData, nationality: e.target.value})}
              placeholder="United States"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editing ? 'Update Character' : 'Create Character'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormData({
                    userId: '',
                    characterName: '',
                    shipClass: 'Destroyer',
                    rank: 'Ensign',
                    nationality: 'United States'
                  });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterManager;
