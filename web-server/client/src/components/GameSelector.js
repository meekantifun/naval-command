import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GameSelector.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function GameSelector({ user, onSelectGame }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/games`, {
        withCredentials: true
      });
      setGames(response.data.games || []);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to load games. Make sure the Discord bot is running.');
    } finally {
      setLoading(false);
    }
  };

  const getMissionTypeDisplay = (missionType) => {
    const missions = {
      'destroy_all': '🎯 Destroy All Enemies',
      'resource': '💎 Resource Acquisition',
      'convoy': '🚢 Convoy Escort',
      'outpost': '🏴 Capture Outpost',
      'boss': '👑 Defeat Boss'
    };
    return missions[missionType] || missionType;
  };

  const getPhaseDisplay = (phase) => {
    const phases = {
      'setup': '⚙️ Setup',
      'player_turn': '👤 Player Turn',
      'enemy_turn': '💀 Enemy Turn',
      'completed': '✅ Completed'
    };
    return phases[phase] || phase;
  };

  if (loading) {
    return (
      <div className="game-selector">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-selector">
        <div className="error-message">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={fetchGames} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="game-selector">
        <div className="empty-state">
          <h2>🎮 No Active Games</h2>
          <p>You're not currently in any active games.</p>
          <p className="help-text">
            Start a game in Discord using the bot commands, then come back here to play!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-selector">
      <div className="games-container">
        <h2>Your Active Games</h2>
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.channelId} className="game-card">
              <div className="game-card-header">
                <h3>Game #{game.channelId.slice(-6)}</h3>
                <span className="game-turn">Turn {game.currentTurn}</span>
              </div>
              <div className="game-card-body">
                <div className="game-stat">
                  <span className="stat-label">Mission:</span>
                  <span className="stat-value">{getMissionTypeDisplay(game.missionType)}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Phase:</span>
                  <span className="stat-value">{getPhaseDisplay(game.phase)}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Map Size:</span>
                  <span className="stat-value">{game.mapSize}x{game.mapSize}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Players:</span>
                  <span className="stat-value">{game.playerCount}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Enemies:</span>
                  <span className="stat-value">{game.enemyCount}</span>
                </div>
              </div>
              <div className="game-card-footer">
                <button
                  onClick={() => onSelectGame(game.channelId)}
                  className="btn btn-primary"
                >
                  Enter Game
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GameSelector;
