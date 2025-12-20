import React, { useState } from 'react';
import axios from 'axios';
import './GameStarter.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function GameStarter({ guildId, user }) {
  const [formData, setFormData] = useState({
    channelId: '',
    maxPlayers: 8
  });
  const [starting, setStarting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.channelId) {
      alert('Channel ID is required');
      return;
    }

    setStarting(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/start-game`, {
        channelId: formData.channelId,
        guildId,
        maxPlayers: parseInt(formData.maxPlayers),
        userId: user.id
      }, {
        withCredentials: true
      });

      alert(`Game prepared successfully!\n\n${response.data.message}`);

      // Reset form
      setFormData({
        channelId: '',
        maxPlayers: 8
      });
    } catch (error) {
      console.error('Error preparing game:', error);
      const errorMsg = error.response?.data?.error || 'Failed to prepare game';
      alert(`Error: ${errorMsg}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="game-starter">
      <div className="starter-header">
        <h3>Prepare a New Game</h3>
        <p>Create a game session in a Discord channel (matches /prepare command)</p>
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

        <div className="form-group">
          <label>Max Players</label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.maxPlayers}
            onChange={(e) => setFormData({...formData, maxPlayers: e.target.value})}
          />
          <small>Maximum number of players allowed in this game (default: 8)</small>
        </div>

        <button type="submit" className="btn-start" disabled={starting}>
          {starting ? 'Preparing Game...' : '⚓ Prepare Game'}
        </button>
      </form>

      <div className="starter-info">
        <h4>📌 Important Notes</h4>
        <ul>
          <li>Make sure the bot has permission to send messages in the channel</li>
          <li>Only one game can be active per channel at a time</li>
          <li>This matches the <code>/prepare</code> command behavior</li>
          <li>Map size and mission type will be set when the game starts with <code>/start</code></li>
        </ul>

        <h4>🎮 Game Flow</h4>
        <ol>
          <li>Click "Prepare Game" to create the game session (setup phase)</li>
          <li>Players join using <code>/join</code> command in Discord</li>
          <li>Game master uses <code>/start</code> to configure map and begin the battle</li>
          <li>Players take turns moving and attacking</li>
          <li>Game master can end the game with <code>/end</code></li>
        </ol>
      </div>
    </div>
  );
}

export default GameStarter;
