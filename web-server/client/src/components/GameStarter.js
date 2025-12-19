import React, { useState } from 'react';
import axios from 'axios';
import './GameStarter.css';

function GameStarter({ guildId }) {
  const [formData, setFormData] = useState({
    channelId: '',
    mapSize: 50,
    maxPlayers: 6,
    missionType: 'Naval Supremacy'
  });
  const [starting, setStarting] = useState(false);

  const missionTypes = [
    'Naval Supremacy',
    'Escort Mission',
    'Port Strike',
    'Search and Destroy',
    'Convoy Protection',
    'Island Assault'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.channelId) {
      alert('Channel ID is required');
      return;
    }

    setStarting(true);
    try {
      const response = await axios.post('/api/admin/start-game', {
        channelId: formData.channelId,
        guildId,
        mapSize: parseInt(formData.mapSize),
        maxPlayers: parseInt(formData.maxPlayers),
        missionType: formData.missionType
      }, {
        withCredentials: true
      });

      alert(`Game started successfully in channel ${formData.channelId}!\n\nPlayers can now join using /join`);

      // Reset form
      setFormData({
        channelId: '',
        mapSize: 50,
        maxPlayers: 6,
        missionType: 'Naval Supremacy'
      });
    } catch (error) {
      console.error('Error starting game:', error);
      const errorMsg = error.response?.data?.error || 'Failed to start game';
      alert(`Error: ${errorMsg}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="game-starter">
      <div className="starter-header">
        <h3>Start a New Game</h3>
        <p>Create a game session in a Discord channel</p>
      </div>

      <form onSubmit={handleSubmit} className="game-form">
        <div className="form-group">
          <label>Channel ID *</label>
          <input
            type="text"
            value={formData.channelId}
            onChange={(e) => setFormData({...formData, channelId: e.target.value})}
            placeholder="123456789012345678"
            required
          />
          <small>Right-click a Discord channel → Copy ID</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Map Size</label>
            <select
              value={formData.mapSize}
              onChange={(e) => setFormData({...formData, mapSize: e.target.value})}
            >
              <option value="30">Small (30x30)</option>
              <option value="50">Medium (50x50)</option>
              <option value="75">Large (75x75)</option>
              <option value="100">Huge (100x100)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Max Players</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({...formData, maxPlayers: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Mission Type</label>
          <select
            value={formData.missionType}
            onChange={(e) => setFormData({...formData, missionType: e.target.value})}
          >
            {missionTypes.map(mission => (
              <option key={mission} value={mission}>{mission}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-start" disabled={starting}>
          {starting ? 'Starting Game...' : '🚀 Start Game'}
        </button>
      </form>

      <div className="starter-info">
        <h4>📌 Important Notes</h4>
        <ul>
          <li>Make sure the bot has permission to send messages in the channel</li>
          <li>Only one game can be active per channel at a time</li>
          <li>Players join using <code>/join</code> in the game channel</li>
          <li>Game master starts the battle with <code>/start</code></li>
        </ul>

        <h4>🎮 Game Flow</h4>
        <ol>
          <li>Click "Start Game" to create the game session</li>
          <li>Players join using <code>/join</code> command</li>
          <li>Game master uses <code>/start</code> to begin the battle</li>
          <li>Players take turns moving and attacking</li>
          <li>Game master can end the game with <code>/end</code></li>
        </ol>
      </div>
    </div>
  );
}

export default GameStarter;
