import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ServerSelector.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ServerSelector({ user, onSelectServer }) {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMutualGuilds();
  }, [user]);

  const loadMutualGuilds = async () => {
    if (!user || !user.guilds) {
      setLoading(false);
      return;
    }

    try {
      // Fetch bot's guilds
      const response = await axios.get(`${API_URL}/api/admin/bot-guilds`, {
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

  if (loading) {
    return (
      <div className="server-selector">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading servers...</p>
        </div>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="server-selector">
        <div className="empty-state">
          <h2>No Mutual Servers</h2>
          <p>You need to be in a Discord server where Naval Command bot is also present.</p>
          <p>Make sure you've invited the bot to your server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="server-selector">
      <div className="selector-header">
        <h2>Select a Server</h2>
        <p>Choose which server you want to view:</p>
      </div>
      <div className="guild-grid">
        {guilds.map(guild => (
          <div
            key={guild.id}
            className="guild-card"
            onClick={() => onSelectServer(guild)}
          >
            {guild.icon && (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="guild-icon"
              />
            )}
            {!guild.icon && (
              <div className="guild-icon-placeholder">
                {guild.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="guild-info">
              <h3>{guild.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServerSelector;
