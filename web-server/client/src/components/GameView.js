import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GameMap from './GameMap';
import './GameView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function GameView({ channelId, user, onBack, onLogout }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionMode, setActionMode] = useState('move'); // 'move' or 'attack'

  useEffect(() => {
    fetchGameState();
    setupWebSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [channelId]);

  useEffect(() => {
    // Auto-select player if only one character
    if (gameState && gameState.players) {
      const userPlayers = gameState.players.filter(p => p.userId === user.id);
      if (userPlayers.length === 1 && !selectedPlayer) {
        setSelectedPlayer(userPlayers[0]);
      }
    }
  }, [gameState, user.id]);

  const setupWebSocket = () => {
    const newSocket = io(API_URL, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('joinGame', channelId);
    });

    newSocket.on('gameUpdate', (update) => {
      console.log('Game update received:', update);
      fetchGameState();
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);
  };

  const fetchGameState = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/game/${channelId}/state`, {
        withCredentials: true
      });
      setGameState(response.data);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError('Failed to load game. Make sure the bot is running and you have access to this game.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (x, y) => {
    if (!selectedPlayer) {
      alert('Please select a character first');
      return;
    }

    if (selectedPlayer.sunk) {
      alert('This ship is sunk and cannot take actions');
      return;
    }

    if (selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions) {
      alert('No actions remaining this turn');
      return;
    }

    if (actionMode === 'move') {
      await handleMove(x, y);
    }
  };

  const handleMove = async (x, y) => {
    try {
      await axios.post(
        `${API_URL}/api/game/${channelId}/move`,
        {
          x,
          y,
          characterAlias: selectedPlayer.characterAlias
        },
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Move error:', err);
      alert(err.response?.data?.error || 'Failed to move');
    }
  };

  const handleAttack = async (targetId) => {
    if (!selectedPlayer) {
      alert('Please select a character first');
      return;
    }

    if (selectedPlayer.sunk) {
      alert('This ship is sunk and cannot attack');
      return;
    }

    if (selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions) {
      alert('No actions remaining this turn');
      return;
    }

    // Get first available weapon
    const weapon = selectedPlayer.weapons && selectedPlayer.weapons[0];
    if (!weapon) {
      alert('No weapons available');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/game/${channelId}/attack`,
        {
          targetId,
          weaponType: weapon.type,
          characterAlias: selectedPlayer.characterAlias
        },
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Attack error:', err);
      alert(err.response?.data?.error || 'Failed to attack');
    }
  };

  if (loading && !gameState) {
    return (
      <div className="game-view">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-view">
        <div className="error-message">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={onBack} className="btn btn-primary">
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const userPlayers = gameState.players.filter(p => p.userId === user.id);

  return (
    <div className="game-view">
      <header className="game-header">
        <div className="game-header-left">
          <button onClick={onBack} className="btn btn-secondary">
            ← Back
          </button>
          <h2>Game #{channelId.slice(-6)}</h2>
          <span className="game-info">Turn {gameState.currentTurn} • {gameState.phase}</span>
        </div>
        <div className="game-header-right">
          <span className="user-name">{user.username}</span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="game-content">
        <div className="game-sidebar">
          <div className="sidebar-section">
            <h3>Your Ships</h3>
            {userPlayers.length === 0 ? (
              <p className="no-ships">No ships in this game</p>
            ) : (
              <div className="ship-list">
                {userPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className={`ship-card ${selectedPlayer === player ? 'selected' : ''} ${player.sunk ? 'sunk' : ''}`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="ship-name">{player.characterAlias || player.shipClass}</div>
                    <div className="ship-class">{player.shipClass}</div>
                    <div className="ship-stats">
                      <div className="stat">
                        <span>HP:</span>
                        <span className={player.health < player.maxHealth * 0.3 ? 'danger' : ''}>
                          {player.health}/{player.maxHealth}
                        </span>
                      </div>
                      <div className="stat">
                        <span>Actions:</span>
                        <span>{player.actionsThisTurn}/{player.maxActions}</span>
                      </div>
                      <div className="stat">
                        <span>Position:</span>
                        <span>{String.fromCharCode(65 + player.x)}{player.y + 1}</span>
                      </div>
                    </div>
                    {player.onFire && <div className="status-badge fire">🔥 On Fire</div>}
                    {player.flooding && <div className="status-badge flooding">💧 Flooding</div>}
                    {player.sunk && <div className="status-badge sunk">💀 Sunk</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPlayer && (
            <div className="sidebar-section">
              <h3>Actions</h3>
              <div className="action-buttons">
                <button
                  className={`btn ${actionMode === 'move' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActionMode('move')}
                  disabled={selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions}
                >
                  🚢 Move
                </button>
                <button
                  className={`btn ${actionMode === 'attack' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setActionMode('attack')}
                  disabled={selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions}
                >
                  🎯 Attack
                </button>
              </div>
              {actionMode === 'move' && (
                <p className="action-help">Click on the map to move your ship</p>
              )}
              {actionMode === 'attack' && (
                <p className="action-help">Click on an enemy ship to attack</p>
              )}
            </div>
          )}

          <div className="sidebar-section">
            <h3>Enemies</h3>
            <div className="enemy-list">
              {gameState.enemies.filter(e => !e.sunk).length === 0 ? (
                <p className="no-enemies">No enemies remaining</p>
              ) : (
                gameState.enemies.filter(e => !e.sunk).map((enemy) => (
                  <div
                    key={enemy.id}
                    className="enemy-card"
                    onClick={() => actionMode === 'attack' && handleAttack(enemy.id)}
                    style={{ cursor: actionMode === 'attack' ? 'pointer' : 'default' }}
                  >
                    <div className="enemy-name">{enemy.name}</div>
                    <div className="enemy-class">{enemy.shipClass}</div>
                    <div className="enemy-stats">
                      <div className="stat">
                        <span>HP:</span>
                        <span className={enemy.health < enemy.maxHealth * 0.3 ? 'danger' : ''}>
                          {enemy.health}/{enemy.maxHealth}
                        </span>
                      </div>
                      <div className="stat">
                        <span>Position:</span>
                        <span>{String.fromCharCode(65 + enemy.x)}{enemy.y + 1}</span>
                      </div>
                    </div>
                    {enemy.isBoss && <div className="status-badge boss">👑 Boss</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="game-main">
          <GameMap
            gameState={gameState}
            selectedPlayer={selectedPlayer}
            onCellClick={handleMapClick}
            actionMode={actionMode}
            userId={user.id}
          />
        </div>
      </div>
    </div>
  );
}

export default GameView;
