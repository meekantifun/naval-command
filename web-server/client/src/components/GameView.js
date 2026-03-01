import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GameMap from './GameMap';
import './GameView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Matches the bot's generateExtendedCoordinate for x = 0..74
function colLabel(x) {
  if (x < 26) return String.fromCharCode(65 + x);
  const a = x - 26;
  return String.fromCharCode(65 + Math.floor(a / 26)) + String.fromCharCode(65 + (a % 26));
}

function coordLabel(x, y) {
  return `${colLabel(x)}${y + 1}`;
}

function GameView({ channelId, user, onBack, onLogout }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionMode, setActionMode] = useState('move');
  const [selectedCell, setSelectedCell] = useState(null);

  const audioRef = useRef(null);
  const prevGameStateRef = useRef(null);

  useEffect(() => {
    fetchGameState();
    setupWebSocket();
    return () => { if (socket) socket.disconnect(); };
  }, [channelId]);

  useEffect(() => {
    if (gameState && gameState.players) {
      const userPlayers = gameState.players.filter(p => p.userId === user.id);
      if (userPlayers.length === 1 && !selectedPlayer) {
        setSelectedPlayer(userPlayers[0]);
      }
    }
  }, [gameState, user.id]);

  // Initialize turn alert audio
  useEffect(() => {
    audioRef.current = new Audio('/turn-alert.mp3');
    audioRef.current.volume = 0.8;
  }, []);

  // Play alert when it becomes this user's turn
  useEffect(() => {
    if (!gameState || !user) return;

    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (!prev) return; // skip first load
    if (gameState.phase !== 'player_turn') return;

    const myPlayer = gameState.players.find(p => p.userId === user.id && !p.sunk);
    if (!myPlayer) return;

    const prevMyPlayer = prev.players.find(p => p.userId === user.id);
    if (!prevMyPlayer) return;

    // Fire when a new full round starts (currentTurn incremented) and our actions are fresh
    const newRound = gameState.currentTurn !== prev.currentTurn;
    // Fire when our actionsThisTurn resets mid-round (bot moved to our sub-turn)
    const actionsReset = prevMyPlayer.actionsThisTurn > 0 && myPlayer.actionsThisTurn === 0;

    if ((newRound || actionsReset) && myPlayer.actionsThisTurn === 0) {
      audioRef.current?.play().catch(() => {});
    }
  }, [gameState, user]);

  // Build a fast land-lookup Set from terrain data: "x,y" keys for island/reef cells
  const landSet = useMemo(() => {
    const s = new Set();
    if (gameState && gameState.terrain) {
      for (const cell of gameState.terrain) {
        if (cell.type === 'island') s.add(`${cell.x},${cell.y}`);
      }
    }
    return s;
  }, [gameState]);

  const setupWebSocket = () => {
    const newSocket = io(API_URL, { withCredentials: true });
    newSocket.on('connect', () => newSocket.emit('joinGame', channelId));
    newSocket.on('gameUpdate', () => fetchGameState());
    setSocket(newSocket);
  };

  const fetchGameState = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/game/${channelId}/state`, { withCredentials: true });
      setGameState(response.data);
    } catch (err) {
      setError('Failed to load game. Make sure the bot is running and you have access to this game.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (x, y) => {
    setSelectedCell({ x, y });
  };

  const handleMove = async (x, y) => {
    if (!selectedPlayer) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/move`,
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
      await axios.post(`${API_URL}/api/game/${channelId}/attack`,
        { targetId, weaponType: weapon.type, characterAlias: selectedPlayer.characterAlias },
        { withCredentials: true }
      );
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to attack');
    }
  };

  const getAttackRange = () => {
    if (!selectedPlayer || !selectedPlayer.weapons || selectedPlayer.weapons.length === 0) return 0;
    return selectedPlayer.weapons[0].range || 10;
  };

  const isInRange = (ex, ey) => {
    if (!selectedPlayer || selectedPlayer.x == null) return false;
    const dx = ex - selectedPlayer.x;
    const dy = ey - selectedPlayer.y;
    return Math.sqrt(dx * dx + dy * dy) <= getAttackRange();
  };

  const renderCellInfo = () => {
    if (!selectedCell || !gameState) return null;

    const { x, y } = selectedCell;
    const coord = coordLabel(x, y);
    const players = (gameState.players || []).filter(p => !p.sunk && p.x === x && p.y === y);
    const enemies = (gameState.enemies || []).filter(e => !e.sunk && e.x === x && e.y === y);
    const isLand = landSet.has(`${x},${y}`);
    const canMove = selectedPlayer && !selectedPlayer.sunk &&
      selectedPlayer.actionsThisTurn < selectedPlayer.maxActions && !isLand;
    const canAttackAny = selectedPlayer && !selectedPlayer.sunk &&
      selectedPlayer.actionsThisTurn < selectedPlayer.maxActions;

    // Determine terrain/infrastructure label
    const TERRAIN_LABELS = { island: '🏝️ Island', reef: '🪸 Reef', spawn: '⚓ Spawn Zone', city: '🏙️ City', town: '🏘️ Town', minefield: '💣 Minefield' };
    const INFRA_LABELS = {
      major_city: '🏙️ Major City', port_city: '🏙️ Port City', town: '🏘️ Town',
      military_base: '🪖 Military Base', military_outpost: '🪖 Military Outpost', outpost: '🪖 Outpost',
      airfield: '✈️ Airfield', airfield_base: '✈️ Airfield', small_airfield: '✈️ Small Airfield',
      port_facility: '⚓ Port Facility', industrial: '🏭 Industrial', lighthouse: '🗼 Lighthouse',
      port_gun: '💣 Coastal Gun', mine: '💣 Naval Mine',
    };
    let terrainLabel = '🌊 Ocean';
    if (gameState.terrain) {
      const tc = gameState.terrain.find(c => c.x === x && c.y === y);
      if (tc) terrainLabel = (tc.name ? `${TERRAIN_LABELS[tc.type] || tc.type}: ${tc.name}` : TERRAIN_LABELS[tc.type]) || tc.type;
    }
    // Override with infrastructure label if present on this cell
    if (gameState.infrastructure) {
      const ic = gameState.infrastructure.find(c => c.x === x && c.y === y);
      if (ic) terrainLabel = (terrainLabel !== '🌊 Ocean' ? terrainLabel + ' — ' : '') + (INFRA_LABELS[ic.type] || ic.type);
    }

    return (
      <div className="cell-info-panel">
        <div className="cell-info-header">
          <span className="cell-coord">Cell {coord}</span>
          <button className="cell-info-close" onClick={() => setSelectedCell(null)}>✕</button>
        </div>

        <div className="cell-info-terrain">{terrainLabel}</div>

        {players.length > 0 && (
          <div className="cell-info-section">
            <div className="cell-info-section-title">Friendly ({players.length})</div>
            {players.map((p, i) => {
              const isOwn = p.userId === user.id;
              const hpPct = Math.round((p.health / p.maxHealth) * 100);
              return (
                <div key={i} className={`cell-unit friendly${isOwn ? ' own' : ''}`}>
                  <div className="unit-name">{p.characterAlias || p.shipClass}{isOwn ? ' (You)' : ''}</div>
                  <div className="unit-class">{p.shipClass}</div>
                  <div className="unit-hp-bar"><div className="unit-hp-fill" style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#48bb78' : hpPct > 25 ? '#ed8936' : '#f56565' }} /></div>
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
            <div className="cell-info-section-title">Enemies ({enemies.length})</div>
            {enemies.map((e, i) => {
              const hpPct = Math.round((e.health / e.maxHealth) * 100);
              const inRange = isInRange(e.x, e.y);
              return (
                <div key={i} className="cell-unit enemy">
                  <div className="unit-name">{e.name}{e.isBoss ? ' 👑' : ''}</div>
                  <div className="unit-class">{e.shipClass}</div>
                  <div className="unit-hp-bar"><div className="unit-hp-fill" style={{ width: `${hpPct}%`, background: hpPct > 50 ? '#f56565' : hpPct > 25 ? '#ed8936' : '#c53030' }} /></div>
                  <div className="unit-hp-text">{e.health}/{e.maxHealth} HP</div>
                  <div className="unit-range-info">{inRange ? '✅ In range' : '❌ Out of range'}</div>
                  {canAttackAny && inRange && (
                    <button className="btn-attack-unit" onClick={() => handleAttack(e.id)}>⚔️ Attack</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {players.length === 0 && enemies.length === 0 && (
          <div className="cell-info-empty">No units here</div>
        )}

        <div className="cell-info-actions">
          {canMove && (
            <button className="btn-move-here" onClick={() => handleMove(x, y)}>🚢 Move Here</button>
          )}
          {!selectedPlayer && <div className="cell-info-hint">Select a ship to take actions</div>}
          {selectedPlayer && selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions && (
            <div className="cell-info-hint">No actions remaining</div>
          )}
          {isLand && selectedPlayer && <div className="cell-info-hint">Cannot move to land</div>}
        </div>
      </div>
    );
  };

  if (loading && !gameState) {
    return (
      <div className="game-view">
        <div className="loading"><div className="spinner"></div><p>Loading game...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-view">
        <div className="error-message">
          <h2>⚠️ Error</h2><p>{error}</p>
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

          {/* Your Ships */}
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
                      <div className="stat"><span>HP:</span><span className={player.health < player.maxHealth * 0.3 ? 'danger' : ''}>{player.health}/{player.maxHealth}</span></div>
                      <div className="stat"><span>Actions:</span><span>{player.actionsThisTurn}/{player.maxActions}</span></div>
                      <div className="stat"><span>Position:</span><span>{player.x != null ? coordLabel(player.x, player.y) : 'Not placed'}</span></div>
                    </div>
                    {player.onFire && <div className="status-badge fire">🔥 On Fire</div>}
                    {player.flooding && <div className="status-badge flooding">💧 Flooding</div>}
                    {player.sunk && <div className="status-badge sunk">💀 Sunk</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {selectedPlayer && (
            <div className="sidebar-section">
              <h3>Actions</h3>
              <div className="action-buttons">
                <button className={`btn ${actionMode === 'move' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActionMode('move')}
                  disabled={selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions}>
                  🚢 Move
                </button>
                <button className={`btn ${actionMode === 'attack' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setActionMode('attack')}
                  disabled={selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions}>
                  🎯 Attack
                </button>
              </div>
              <p className="action-help">Click any cell on the map to inspect it</p>
            </div>
          )}

          {/* Selected Cell Info */}
          {selectedCell ? renderCellInfo() : (
            <div className="sidebar-section cell-info-placeholder">
              <h3>Cell Info</h3>
              <p className="cell-info-hint">Click any square on the map to see what's there</p>
            </div>
          )}

          {/* Enemies */}
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
                      <div className="stat"><span>HP:</span><span className={enemy.health < enemy.maxHealth * 0.3 ? 'danger' : ''}>{enemy.health}/{enemy.maxHealth}</span></div>
                      <div className="stat"><span>Position:</span><span>{enemy.x != null ? coordLabel(enemy.x, enemy.y) : '?'}</span></div>
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
            onCellClick={handleMapClick}
            selectedCell={selectedCell}
          />
        </div>
      </div>
    </div>
  );
}

export default GameView;
