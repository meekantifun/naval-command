import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GameStarter.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const MISSION_TYPES = [
  { id: 'destroy_all', name: 'Destroy All Enemies', description: 'Eliminate all enemy forces' },
  { id: 'resource_acquisition', name: 'Resource Acquisition', description: 'Secure strategic resources' },
  { id: 'escort_convoy', name: 'Escort Convoy', description: 'Protect allied convoy ships' },
  { id: 'capture_outpost', name: 'Capture Outpost', description: 'Seize enemy outpost' },
  { id: 'defeat_boss', name: 'Defeat Boss', description: 'Destroy the enemy flagship' }
];

function GameStarter({ guildId, user }) {
  const [formData, setFormData] = useState({
    channelId: '',
    maxPlayers: 8,
    enemyCount: 3,
    enemySetupType: 'random',
    customEnemies: {
      submarine: 0,
      destroyer: 0,
      light_cruiser: 0,
      heavy_cruiser: 0,
      battleship: 0,
      carrier: 0
    },
    mapType: 'random',
    customMapId: '',
    missionType: 'destroy_all'
  });
  const [customMaps, setCustomMaps] = useState([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadCustomMaps();
  }, []);

  const loadCustomMaps = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/maps`, {
        withCredentials: true
      });
      setCustomMaps(response.data.maps || []);
    } catch (error) {
      console.error('Error loading custom maps:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.channelId) {
      alert('Channel ID is required');
      return;
    }

    if (formData.mapType === 'custom' && !formData.customMapId) {
      alert('Please select a custom map');
      return;
    }

    setStarting(true);
    try {
      const payload = {
        channelId: formData.channelId,
        guildId,
        maxPlayers: parseInt(formData.maxPlayers),
        mapType: formData.mapType,
        missionType: formData.missionType,
        userId: user.id
      };

      // Handle enemy configuration
      if (formData.enemySetupType === 'none') {
        payload.enemyCount = 0;
      } else if (formData.enemySetupType === 'custom') {
        payload.customEnemies = formData.customEnemies;
        payload.enemyCount = 0; // Will be calculated from custom enemies
      } else {
        payload.enemyCount = parseInt(formData.enemyCount);
      }

      if (formData.mapType === 'custom') {
        payload.customMapId = formData.customMapId;
      }

      const response = await axios.post(`${API_URL}/api/admin/start-game`, payload, {
        withCredentials: true
      });

      alert(`Game setup complete!\n\n${response.data.message}\n\nThe map has been posted to Discord. Players can now join using /join`);

      // Reset form
      setFormData({
        channelId: '',
        maxPlayers: 8,
        enemyCount: 3,
        enemySetupType: 'random',
        customEnemies: {
          submarine: 0,
          destroyer: 0,
          light_cruiser: 0,
          heavy_cruiser: 0,
          battleship: 0,
          carrier: 0
        },
        mapType: 'random',
        customMapId: '',
        missionType: 'destroy_all'
      });
    } catch (error) {
      console.error('Error setting up game:', error);
      const errorMsg = error.response?.data?.error || 'Failed to setup game';
      alert(`Error: ${errorMsg}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="game-starter">
      <div className="starter-header">
        <h3>⚓ Start a New Naval Battle</h3>
        <p>Complete game setup with map generation - players can join immediately after</p>
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
            <label>Max Players</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({...formData, maxPlayers: e.target.value})}
            />
            <small>Maximum players (default: 8)</small>
          </div>

          <div className="form-group">
            <label>AI Enemy Setup</label>
            <select
              value={formData.enemySetupType}
              onChange={(e) => setFormData({...formData, enemySetupType: e.target.value})}
            >
              <option value="none">No Enemies (PvP Only)</option>
              <option value="random">Random Enemies</option>
              <option value="custom">Custom Setup</option>
            </select>
            <small>Choose enemy configuration type</small>
          </div>
        </div>

        {formData.enemySetupType === 'random' && (
          <div className="form-group">
            <label>Number of Random Enemies</label>
            <select
              value={formData.enemyCount}
              onChange={(e) => setFormData({...formData, enemyCount: e.target.value})}
            >
              <option value="3">3 Random Enemies</option>
              <option value="5">5 Random Enemies</option>
              <option value="8">8 Random Enemies</option>
            </select>
            <small>AI will spawn random ship types</small>
          </div>
        )}

        {formData.enemySetupType === 'custom' && (
          <div className="form-group">
            <label>Custom Enemy Fleet</label>
            <div className="custom-enemies-grid">
              <div className="enemy-input">
                <label>Submarines</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.submarine}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, submarine: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div className="enemy-input">
                <label>Destroyers</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.destroyer}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, destroyer: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div className="enemy-input">
                <label>Light Cruisers</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.light_cruiser}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, light_cruiser: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div className="enemy-input">
                <label>Heavy Cruisers</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.heavy_cruiser}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, heavy_cruiser: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div className="enemy-input">
                <label>Battleships</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.battleship}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, battleship: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div className="enemy-input">
                <label>Aircraft Carriers</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.customEnemies.carrier}
                  onChange={(e) => setFormData({
                    ...formData,
                    customEnemies: {...formData.customEnemies, carrier: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
            </div>
            <small>Specify exact number of each ship type</small>
          </div>
        )}

        <div className="form-group">
          <label>Map Type</label>
          <select
            value={formData.mapType}
            onChange={(e) => setFormData({...formData, mapType: e.target.value})}
          >
            <option value="random">Random Generated Map</option>
            <option value="custom">Custom Map</option>
          </select>
          <small>Procedural generation or custom battlefield</small>
        </div>

        {formData.mapType === 'custom' && (
          <div className="form-group">
            <label>Select Custom Map *</label>
            <select
              value={formData.customMapId}
              onChange={(e) => setFormData({...formData, customMapId: e.target.value})}
              required
            >
              <option value="">Choose a map...</option>
              {customMaps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
            <small>{customMaps.length === 0 ? 'No custom maps available' : `${customMaps.length} custom map(s) available`}</small>
          </div>
        )}

        <div className="form-group">
          <label>Mission Objective</label>
          <select
            value={formData.missionType}
            onChange={(e) => setFormData({...formData, missionType: e.target.value})}
          >
            {MISSION_TYPES.map(mission => (
              <option key={mission.id} value={mission.id}>
                {mission.name} - {mission.description}
              </option>
            ))}
          </select>
          <small>Primary mission goal for this battle</small>
        </div>

        <button type="submit" className="btn-start" disabled={starting}>
          {starting ? 'Setting Up Battle...' : '🚀 Start Battle'}
        </button>
      </form>

      <div className="starter-info">
        <h4>📌 Important Notes</h4>
        <ul>
          <li>Make sure the bot has permission to send messages and attach files in the channel</li>
          <li>Only one game can be active per channel at a time</li>
          <li>The map will be generated and posted to Discord immediately</li>
          <li>This replaces the <code>/prepare</code> + setup wizard workflow</li>
        </ul>

        <h4>🎮 New Game Flow</h4>
        <ol>
          <li>Click "Start Battle" - game is created with full setup and map generation</li>
          <li>Map image is posted to Discord channel and pinned</li>
          <li>Players join using <code>/join</code> and select their spawn positions on the map</li>
          <li>Game master uses <code>/start</code> to begin the battle (spawns enemies and starts turns)</li>
          <li>Players take turns moving and attacking</li>
          <li>Game master can end the game with <code>/end</code></li>
        </ol>
      </div>
    </div>
  );
}

export default GameStarter;
