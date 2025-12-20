import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CharacterManager from './CharacterManager';
import MapManager from './MapManager';
import GameStarter from './GameStarter';
import './AdminPanel.css';

function AdminPanel({ user, selectedGuild, onBack }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    // Check staff permission when component mounts
    if (selectedGuild) {
      checkPermission(selectedGuild.id);
    }
  }, []);

  const checkPermission = async (guildId) => {
    setChecking(true);
    try {
      const response = await axios.get('/api/admin/check-permission', {
        params: { guildId },
        withCredentials: true
      });
      setHasPermission(response.data.hasPermission);
    } catch (error) {
      console.error('Error checking permission:', error);
      setHasPermission(false);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="admin-panel">
        <div className="admin-message">
          <h2>Checking permissions...</h2>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="admin-panel">
        <div className="admin-message error">
          <h2>Access Denied</h2>
          <p>You don't have staff permissions in {selectedGuild?.name}.</p>
          <p>You need either:</p>
          <ul>
            <li>Administrator permission, or</li>
            <li>The configured staff role for this server</li>
          </ul>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary">Back to Dashboard</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="server-info">
          {selectedGuild?.icon && (
            <img
              src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
              alt={selectedGuild.name}
              className="server-icon"
            />
          )}
          <div>
            <h2>{selectedGuild?.name}</h2>
            <p>Admin Panel</p>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="change-server-btn">
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'characters' ? 'active' : ''}
          onClick={() => setActiveTab('characters')}
        >
          Characters
        </button>
        <button
          className={activeTab === 'maps' ? 'active' : ''}
          onClick={() => setActiveTab('maps')}
        >
          Maps
        </button>
        <button
          className={activeTab === 'game' ? 'active' : ''}
          onClick={() => setActiveTab('game')}
        >
          Start Game
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'characters' && (
          <CharacterManager guildId={selectedGuild?.id} user={user} />
        )}
        {activeTab === 'maps' && (
          <MapManager guildId={selectedGuild?.id} />
        )}
        {activeTab === 'game' && (
          <GameStarter guildId={selectedGuild?.id} />
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
