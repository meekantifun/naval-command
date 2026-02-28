import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GameMap from './GameMap';
import './GameView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CellInfoPanel({ cell, gameState, selectedPlayer, actionMode, userId, onMove, onAttack, onClose, style }) {
  const coord = `${String.fromCharCode(65 + cell.x)}${cell.y + 1}`;
  const players = (gameState.players || []).filter(p => !p.sunk && p.x === cell.x && p.y === cell.y);
  const enemies = (gameState.enemies || []).filter(e => !e.sunk && e.x === cell.x && e.y === cell.y);
  const isLand = gameState.islands && gameState.islands.some(island =>
    island.cells && island.cells.some(c => c.x === cell.x && c.y === cell.y)
  );

  const canMove = selectedPlayer && !selectedPlayer.sunk &&
    selectedPlayer.actionsThisTurn < selectedPlayer.maxActions && !isLand;

  const getAttackRange = () => {
    if (!selectedPlayer || !selectedPlayer.weapons || selectedPlayer.weapons.length === 0) return 0;
    return selectedPlayer.weapons[0].range || 10;
  };

  const isInRange = (ex, ey) => {
    if (!selectedPlayer) return false;
    const dx = ex - selectedPlayer.x;
    const dy = ey - selectedPlayer.y;
    return Math.sqrt(dx * dx + dy * dy) <= getAttackRange();
  };

  const canAttack = selectedPlayer && !selectedPlayer.sunk &&
    selectedPlayer.actionsThisTurn < selectedPlayer.maxActions;

  return (
    <div className="cell-info-panel" style={style}>
      <div className="cell-info-header">
        <span className="cell-coord">Cell {coord}</span>
        <button className="cell-info-close" onClick={onClose}>✕</button>
      </div>

      <div className="cell-info-terrain">
        {isLand ? '🏝️ Land — cannot move here' : '🌊 Ocean'}
      </div>

      {players.length > 0 && (
        <div className="cell-info-section">
          <div className="cell-info-section-title">Friendly Ships ({players.length})</div>
          {players.map((p, i) => {
            const isOwn = p.userId === userId;
            const hpPct = Math.round((p.health / p.maxHealth) * 100);
            return (
              <div key={i} className={`cell-unit friendly ${isOwn ? 'own' : ''}`}>
                <div className="unit-name">{p.characterAlias || p.shipClass} {isOwn ? '(You)' : ''}</div>
                <div className="unit-class">{p.shipClass}</div>
                <div className="unit-hp-bar">
                  <div className="unit-hp-fill" style={{
                    width: `${hpPct}%`,
                    background: hpPct > 50 ? '#48bb78' : hpPct > 25 ? '#ed8936' : '#f56565'
                  }} />
                </div>
                <div className="unit-hp-text">{p.health}/{p.maxHealth} HP</div>
                {p.onFire && <span className="unit-status">🔥</span>}
                {p.flooding && <span className="unit-status">💧</span>}
              </div>
            );
          })}
        </div>
      )}

      {enemies.length > 0 && (
        <div className="cell-info-section">
          <div className="cell-info-section-title">Enemy Ships ({enemies.length})</div>
          {enemies.map((e, i) => {
            const hpPct = Math.round((e.health / e.maxHealth) * 100);
            const inRange = isInRange(e.x, e.y);
            return (
              <div key={i} className="cell-unit enemy">
                <div className="unit-name">{e.name} {e.isBoss ? '👑' : ''}</div>
                <div className="unit-class">{e.shipClass}</div>
                <div className="unit-hp-bar">
                  <div className="unit-hp-fill" style={{
                    width: `${hpPct}%`,
                    background: hpPct > 50 ? '#f56565' : hpPct > 25 ? '#ed8936' : '#c53030'
                  }} />
                </div>
                <div className="unit-hp-text">{e.health}/{e.maxHealth} HP</div>
                <div className="unit-range-info">{inRange ? '✅ In range' : '❌ Out of range'}</div>
                {canAttack && inRange && (
                  <button
                    className="btn-attack-unit"
                    onClick={() => onAttack(e.id)}
                  >
                    ⚔️ Attack
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {players.length === 0 && enemies.length === 0 && (
        <div className="cell-info-empty">No units at this position</div>
      )}

      <div className="cell-info-actions">
        {canMove && (
          <button className="btn-move-here" onClick={() => onMove(cell.x, cell.y)}>
            🚢 Move Here
          </button>
        )}
        {!selectedPlayer && (
          <div className="cell-info-hint">Select one of your ships to take actions</div>
        )}
        {selectedPlayer && selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions && (
          <div className="cell-info-hint">No actions remaining this turn</div>
        )}
      </div>
    </div>
  );
}

function GameView({ channelId, user, onBack, onLogout }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionMode, setActionMode] = useState('move');
  const [selectedCell, setSelectedCell] = useState(null);
  const popupRef = useRef(null);

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
    if (gameState && gameState.players) {
      const userPlayers = gameState.players.filter(p => p.userId === user.id);
      if (userPlayers.length === 1 && !selectedPlayer) {
        setSelectedPlayer(userPlayers[0]);
      }
    }
  }, [gameState, user.id]);

  // Close popup on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setSelectedCell(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const setupWebSocket = () => {
    const newSocket = io(API_URL, { withCredentials: true });

    newSocket.on('connect', () => {
      newSocket.emit('joinGame', channelId);
    });

    newSocket.on('gameUpdate', () => {
      fetchGameState();
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

  const handleMapClick = (x, y, clientX, clientY) => {
    // Calculate popup position, keep it on screen
    const popupWidth = 260;
    const popupHeight = 300;
    const margin = 10;
    let left = clientX + margin;
    let top = clientY - 60;

    if (left + popupWidth > window.innerWidth) left = clientX - popupWidth - margin;
    if (top + popupHeight > window.innerHeight) top = window.innerHeight - popupHeight - margin;
    if (top < margin) top = margin;

    setSelectedCell({ x, y, left, top });
  };

  const handleMove = async (x, y) => {
    if (!selectedPlayer) return;
    try {
      await axios.post(
        `${API_URL}/api/game/${channelId}/move`,
        { x, y, characterAlias: selectedPlayer.characterAlias },
        { withCredentials: true }
      );
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move');
    }
  };

  const handleAttack = async (targetId) => {
    if (!selectedPlayer) return;
    const weapon = selectedPlayer.weapons && selectedPlayer.weapons[0];
    if (!weapon) { alert('No weapons available'); return; }

    try {
      await axios.post(
        `${API_URL}/api/game/${channelId}/attack`,
        { targetId, weaponType: weapon.type, characterAlias: selectedPlayer.characterAlias },
        { withCredentials: true }
      );
      setSelectedCell(null);
    } catch (err) {
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
          <button onClick={onBack} className="btn btn-primary">Back to Games</button>
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
          <button onClick={onBack} className="btn btn-secondary">← Back</button>
          <h2>Game #{channelId.slice(-6)}</h2>
          <span className="game-info">Turn {gameState.currentTurn} • {gameState.phase}</span>
        </div>
        <div className="game-header-right">
          <span className="user-name">{user.username}</span>
          <button onClick={onLogout} className="btn btn-secondary">Logout</button>
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
                        <span>{player.x != null ? `${String.fromCharCode(65 + player.x)}${player.y + 1}` : 'Not placed'}</span>
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
              <p className="action-help">
                {actionMode === 'move' ? 'Click a cell to see info and move options' : 'Click a cell with enemies to attack'}
              </p>
            </div>
          )}

          <div className="sidebar-section">
            <h3>Enemies ({gameState.enemies.filter(e => !e.sunk).length})</h3>
            <div className="enemy-list">
              {gameState.enemies.filter(e => !e.sunk).length === 0 ? (
                <p className="no-enemies">No enemies remaining</p>
              ) : (
                gameState.enemies.filter(e => !e.sunk).map((enemy) => (
                  <div key={enemy.id} className="enemy-card">
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
                        <span>{enemy.x != null ? `${String.fromCharCode(65 + enemy.x)}${enemy.y + 1}` : '?'}</span>
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
            mapImageUrl={gameState.hasMapImage ? `${API_URL}/api/game/${channelId}/map-image` : null}
            selectedCell={selectedCell}
          />
        </div>
      </div>

      {selectedCell && (
        <div ref={popupRef} style={{ position: 'fixed', left: selectedCell.left, top: selectedCell.top, zIndex: 1000 }}>
          <CellInfoPanel
            cell={selectedCell}
            gameState={gameState}
            selectedPlayer={selectedPlayer}
            actionMode={actionMode}
            userId={user.id}
            onMove={handleMove}
            onAttack={handleAttack}
            onClose={() => setSelectedCell(null)}
          />
        </div>
      )}
    </div>
  );
}

export default GameView;
