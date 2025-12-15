import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CharacterManager.css';

function CharacterManager({ guildId }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
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
        params: { guildId }
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
        }
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
      <div className="manager-section">
        <h3>{editing ? 'Edit Character' : 'Add New Character'}</h3>
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
              <div key={idx} className="character-card">
                <div className="character-info">
                  <h4>{char.name} {char.isActive && <span className="badge-active">Active</span>}</h4>
                  <p><strong>{char.rank}</strong> • {char.shipClass}</p>
                  <p className="char-meta">{char.nationality}</p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterManager;
