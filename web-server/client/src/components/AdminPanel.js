import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CharacterManager from './CharacterManager';
import MapManager from './MapManager';
import GameStarter from './GameStarter';
import './AdminPanel.css';

function AdminPanel({ user }) {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    // Load mutual guilds (where both user and bot are members)
    const loadMutualGuilds = async () => {
      if (!user || !user.guilds) {
        setLoading(false);
        return;
      }

      try {
        // Fetch bot's guilds
        const response = await axios.get('/api/admin/bot-guilds', {
          withCredentials: true
        });
        const botGuilds = response.data.guilds || [];

        // Create a Set of bot guild IDs for fast lookup
        const botGuildIds = new Set(botGuilds.map(g => g.id));

        // Filter user guilds to only show ones where bot is also present
        const mutualGuilds = user.guilds.filter(guild => botGuildIds.has(guild.id));

        setGuilds(mutualGuilds);
      } catch (error) {
        console.error('Error loading mutual guilds:', error);
        // Fallback to showing all user guilds if bot guilds fetch fails
        setGuilds(user.guilds);
      } finally {
        setLoading(false);
      }
    };

    loadMutualGuilds();
  }, [user]);

  useEffect(() => {
    // Check staff permission when guild is selected
    if (selectedGuild) {
      checkPermission(selectedGuild.id);
    }
  }, [selectedGuild]);

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

  if (!user) {
    return (
      <div className="admin-panel">
        <div className="admin-message">
          <h2>Please log in to access the Admin Panel</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-message">
          <h2>Loading servers...</h2>
        </div>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="admin-panel">
        <div className="admin-message">
          <h2>No mutual servers found</h2>
          <p>You need to be in a Discord server where Naval Command bot is also present.</p>
          <p>Make sure you've invited the bot to your server.</p>
        </div>
      </div>
    );
  }

  if (!selectedGuild) {
    return (
      <div className="admin-panel">
        <div className="guild-selector">
          <h2>Select a Server</h2>
          <p>Choose which server you want to manage:</p>
          <div className="guild-list">
            {guilds.map(guild => (
              <div
                key={guild.id}
                className="guild-card"
                onClick={() => setSelectedGuild(guild)}
              >
                {guild.icon && (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                    alt={guild.name}
                    className="guild-icon"
                  />
                )}
                <div className="guild-info">
                  <h3>{guild.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          <p>You don't have staff permissions in {selectedGuild.name}.</p>
          <p>You need either:</p>
          <ul>
            <li>Administrator permission, or</li>
            <li>The configured staff role for this server</li>
          </ul>
          <button onClick={() => setSelectedGuild(null)}>Back to Server Selection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="server-info">
          {selectedGuild.icon && (
            <img
              src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
              alt={selectedGuild.name}
              className="server-icon"
            />
          )}
          <div>
            <h2>{selectedGuild.name}</h2>
            <p>Admin Panel</p>
          </div>
        </div>
        <button onClick={() => setSelectedGuild(null)} className="change-server-btn">
          Change Server
        </button>
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
          <CharacterManager guildId={selectedGuild.id} />
        )}
        {activeTab === 'maps' && (
          <MapManager guildId={selectedGuild.id} />
        )}
        {activeTab === 'game' && (
          <GameStarter guildId={selectedGuild.id} />
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
