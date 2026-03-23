import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GameMap from './GameMap';
import './GameView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Confetti canvas animation ─────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const COLORS = ['#FFD700', '#FFA500', '#FF6B6B', '#4facfe', '#48bb78', '#a78bfa', '#fff'];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const pieces = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vy: 1.8 + Math.random() * 2.8,
      vx: (Math.random() - 0.5) * 1.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.12,
    }));
    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y > canvas.height + 10) {
          p.y = -p.h - 10;
          p.x = Math.random() * canvas.width;
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

// ── MVP end-screen overlay ────────────────────────────────────────────────────
function MVPScreen({ mvp, onBack }) {
  const accuracy = mvp?.stats?.shots > 0
    ? ((mvp.stats.hits / mvp.stats.shots) * 100).toFixed(1)
    : '0.0';
  const duration = (() => {
    const totalSecs = mvp?.stats?.gameStartTime
      ? Math.round((Date.now() - mvp.stats.gameStartTime) / 1000)
      : 0;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  })();

  return (
    <div className="mvp-overlay">
      <Confetti />
      <div className="mvp-card">
        <div className="mvp-title">⚓ Battle Complete</div>
        {mvp ? (
          <>
            <div className="mvp-subtitle">Most Valuable Player</div>
            <div className="mvp-avatar-wrapper">
              <img
                src={mvp.avatarURL || '/icons/class/destroyer.png'}
                alt={mvp.username}
                className="mvp-avatar"
                onError={e => { e.target.src = '/icons/class/destroyer.png'; }}
              />
              <img src="/icons/crown.png" alt="Crown" className="mvp-crown" />
            </div>
            <div className="mvp-username">{mvp.username}</div>
            <div className="mvp-score">MVP Score: {mvp.score.toLocaleString()}</div>
            <div className="mvp-stats-grid">
              <div className="mvp-stat">
                <span className="mvp-stat-label">Damage Dealt</span>
                <span className="mvp-stat-value">{(mvp.stats?.damageDealt || 0).toLocaleString()}</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Kills</span>
                <span className="mvp-stat-value">{mvp.stats?.kills || 0}</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Accuracy</span>
                <span className="mvp-stat-value">{accuracy}%</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Critical Hits</span>
                <span className="mvp-stat-value">{mvp.stats?.criticalHits || 0}</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Battle Duration</span>
                <span className="mvp-stat-value">{duration}</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Damage Taken</span>
                <span className="mvp-stat-value">{(mvp.stats?.damageReceived || 0).toLocaleString()}</span>
              </div>
              <div className="mvp-stat">
                <span className="mvp-stat-label">Distance Travelled</span>
                <span className="mvp-stat-value">{(mvp.stats?.distanceTravelled || 0).toLocaleString()} km</span>
              </div>
            </div>
            <div className="mvp-reward">🌟 Double XP &amp; Currency Awarded</div>
          </>
        ) : (
          <div className="mvp-no-mvp">Battle ended</div>
        )}
        <button className="mvp-back-btn" onClick={onBack}>← Back to Games</button>
      </div>
    </div>
  );
}

// Matches the bot's generateExtendedCoordinate for x = 0..74
function colLabel(x) {
  if (x < 26) return String.fromCharCode(65 + x);
  const a = x - 26;
  return String.fromCharCode(65 + Math.floor(a / 26)) + String.fromCharCode(65 + (a % 26));
}

function coordLabel(x, y) {
  return `${colLabel(x)}${y + 1}`;
}

function getShipType(shipClass) {
  if (!shipClass) return 'auxiliary';
  const sc = shipClass.toLowerCase();
  if (sc.includes('submarine')) return 'submarine';
  if (sc.includes('carrier'))   return 'carrier';
  if (sc.includes('battleship')) return 'battleship';
  if (sc.includes('cruiser'))   return 'cruiser';
  if (sc.includes('destroyer')) return 'destroyer';
  return 'auxiliary';
}

function hpBarColor(pct) {
  if (pct <= 0)  return '#111111';
  if (pct <= 25) return '#ef4444';
  if (pct <= 50) return '#eab308';
  return '#22c55e';
}

function GameView({ channelId, user, onBack, onLogout }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionMode, setActionMode] = useState('move');
  const [selectedCell, setSelectedCell] = useState(null);

  // New state for feature parity
  const [attackState, setAttackState] = useState(null);
  // null | { targetId, targetName, step: 'weapon'|'shell'|'confirm', weaponType?, weaponName?, shellType? }
  const [confirmEndBattle, setConfirmEndBattle] = useState(false);
  const [startingBattle, setStartingBattle] = useState(false);
  const [endingTurn, setEndingTurn] = useState(false);
  const [gmWeather, setGmWeather] = useState('clear');
  const [gmEnemyType, setGmEnemyType] = useState('destroyer');
  const [gmBossKey, setGmBossKey] = useState('siren_boss_observer_alpha');
  const [gmSpawnMode, setGmSpawnMode] = useState(false);
  const [gmStatusTarget, setGmStatusTarget] = useState('');
  const [gmStatusAction, setGmStatusAction] = useState('fire');
  const [gmControlledAI, setGmControlledAI] = useState(null); // enemy object being controlled
  const [gmAIMoveCoord, setGmAIMoveCoord] = useState('');
  const [gmAIAttackTarget, setGmAIAttackTarget] = useState('');

  const audioRef = useRef(null);
  const prevGameStateRef = useRef(null);

  // Battle log
  const [localLog, setLocalLog] = useState([]);
  const logIdRef = useRef(0);
  const prevStateForLogRef = useRef(null);

  const addLogEntry = useCallback((text, type = 'info') => {
    const id = `log-${++logIdRef.current}`;
    setLocalLog(prev => [{ id, text, type, ts: new Date() }, ...prev].slice(0, 300));
  }, []);

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

  // Keep selectedPlayer in sync with fresh game state
  useEffect(() => {
    if (gameState && selectedPlayer) {
      const fresh = gameState.players.find(p => p.userId === selectedPlayer.userId);
      if (fresh) setSelectedPlayer(fresh);
    }
  }, [gameState]);

  // Initialize turn alert audio
  useEffect(() => {
    audioRef.current = new Audio('/turn-alert.mp3');
    const savedVolume = localStorage.getItem('navalCommandVolume');
    audioRef.current.volume = savedVolume !== null ? parseFloat(savedVolume) : 0.8;
  }, []);

  // Play alert when it becomes this user's turn
  useEffect(() => {
    if (!gameState || !user) return;

    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (!prev) return; // skip first load
    if (gameState.phase !== 'battle') return;

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

  // Battle log: diff game states to generate events
  useEffect(() => {
    if (!gameState) return;
    const prev = prevStateForLogRef.current;
    prevStateForLogRef.current = gameState;

    if (!prev) {
      addLogEntry(`📋 Battle log started — Turn ${gameState.currentTurn || 1}`, 'system');
      return;
    }

    const batch = [];
    const addE = (text, type) => batch.push({ text, type });

    // Turn change
    if (gameState.currentTurn && gameState.currentTurn !== prev.currentTurn) {
      addE(`━━ Turn ${gameState.currentTurn} ━━`, 'turn');
    }

    // Phase change
    if (gameState.phase !== prev.phase) {
      const PHASE_LABELS = {
        joining:     '⚓ Players are joining the battle',
        active:      '⚔️ Battle has begun!',
        player_turn: "🎯 Players' turn",
        enemy_turn:  '🤖 Enemies are acting',
        ended:       '🏁 Battle has ended',
      };
      addE(PHASE_LABELS[gameState.phase] || `Phase: ${gameState.phase}`, 'system');
    }

    // Weather change
    if (gameState.weather && gameState.weather !== prev.weather) {
      const WX = { clear: '☀️', rainy: '🌧️', foggy: '🌫️', thunderstorm: '⛈️', hurricane: '🌀' };
      addE(`${WX[gameState.weather] || '🌤️'} Weather: ${gameState.weather}`, 'system');
    }

    // Player events
    const prevPMap = new Map((prev.players || []).map(p => [p.userId, p]));
    for (const p of (gameState.players || [])) {
      const pp = prevPMap.get(p.userId);
      const name = p.characterAlias || p.username || 'Unknown';

      if (!pp) {
        if (p.x != null) addE(`⚓ ${name} spawned at ${coordLabel(p.x, p.y)}`, 'spawn');
        continue;
      }

      // Spawned (had no position before)
      if (pp.x == null && p.x != null) {
        addE(`⚓ ${name} spawned at ${coordLabel(p.x, p.y)}`, 'spawn');
      // Moved
      } else if (pp.x != null && p.x != null && (pp.x !== p.x || pp.y !== p.y)) {
        addE(`🚢 ${name} moved to ${coordLabel(p.x, p.y)}`, 'move');
      }

      // Took damage
      const ppHp = pp.health ?? pp.maxHealth ?? 0;
      const pHp  = p.health  ?? 0;
      if (!pp.sunk && ppHp > pHp) {
        addE(`💥 ${name} took ${ppHp - pHp} damage (${pHp}/${p.maxHealth} HP)`, 'damage');
      }

      // Sunk
      if (!pp.sunk && p.sunk) addE(`💀 ${name} has been sunk!`, 'death');

      // Status applied
      if (!pp.onFire   && p.onFire)   addE(`🔥 ${name} caught fire!`,         'status');
      if (!pp.flooding && p.flooding) addE(`💧 ${name} started flooding!`,     'status');
      if (!pp.bleeding && p.bleeding) addE(`🩸 ${name} is bleeding!`,           'status');

      // Status cleared
      if (pp.onFire   && !p.onFire   && !p.sunk) addE(`🔧 ${name}'s fire was extinguished`,    'status-clear');
      if (pp.flooding && !p.flooding && !p.sunk) addE(`🔧 ${name} stopped flooding`,            'status-clear');
    }

    // Enemy events
    const prevEMap = new Map((prev.enemies || []).map(e => [e.id, e]));
    for (const e of (gameState.enemies || [])) {
      const pe   = prevEMap.get(e.id);
      const name = e.name || 'Enemy';

      if (!pe) {
        if (e.x != null) addE(`⚠️ ${name} appeared!`, 'enemy-spawn');
        continue;
      }

      // Moved
      if (pe.x != null && e.x != null && (pe.x !== e.x || pe.y !== e.y)) {
        addE(`🚢 ${name} moved to ${coordLabel(e.x, e.y)}`, 'enemy-move');
      }

      // Took damage
      const peHp = pe.health ?? pe.maxHealth ?? 0;
      const eHp  = e.health  ?? 0;
      if (!pe.sunk && peHp > eHp) {
        addE(`💥 ${name} took ${peHp - eHp} damage (${eHp}/${e.maxHealth} HP)`, 'hit');
      }

      // Destroyed
      if (!pe.sunk && e.sunk) addE(`💥 ${name} has been destroyed!`, 'death');

      // Status
      if (!pe.onFire   && e.onFire)   addE(`🔥 ${name} caught fire!`,     'status');
      if (!pe.flooding && e.flooding) addE(`💧 ${name} started flooding!`, 'status');
    }

    if (batch.length > 0) {
      const withMeta = batch.map(e => ({ ...e, id: `log-${++logIdRef.current}`, ts: new Date() }));
      setLocalLog(prev => [...withMeta, ...prev].slice(0, 300));
    }
  }, [gameState, addLogEntry]);

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

  // Spawn zone set for highlighting
  const spawnSet = useMemo(() => {
    const s = new Set();
    (gameState?.spawnZoneCoords || []).forEach(c => s.add(`${c.x},${c.y}`));
    return s;
  }, [gameState]);

  // Movement range highlights (yellow) — circular Euclidean radius within player's speed
  const moveHighlights = useMemo(() => {
    if (gameState?.phase !== 'battle') return [];
    if (!selectedPlayer || selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions) return [];
    if (selectedPlayer.x == null || selectedPlayer.y == null) return [];
    const speed = selectedPlayer.stats?.speed || 3;
    const result = [];
    for (let dx = -speed; dx <= speed; dx++) {
      for (let dy = -speed; dy <= speed; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.sqrt(dx * dx + dy * dy) > speed) continue;
        const nx = selectedPlayer.x + dx;
        const ny = selectedPlayer.y + dy;
        if (nx < 0 || ny < 0) continue;
        if (landSet.has(`${nx},${ny}`)) continue;
        result.push({ x: nx, y: ny });
      }
    }
    return result;
  }, [gameState, selectedPlayer, landSet]);

  // Attack range highlights (red) — enemy cells within max weapon range
  const attackHighlights = useMemo(() => {
    if (!selectedPlayer || selectedPlayer.sunk || selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions) return [];
    if (selectedPlayer.x == null || selectedPlayer.y == null) return [];
    const weapons = Array.isArray(selectedPlayer.weapons)
      ? selectedPlayer.weapons
      : Object.values(selectedPlayer.weapons || {});
    if (weapons.length === 0) return [];
    const maxRange = Math.max(...weapons.map(w => w.range || 0));
    return (gameState?.enemies || []).filter(e => {
      if (e.sunk || e.x == null || e.y == null) return false;
      const dist = Math.sqrt((e.x - selectedPlayer.x) ** 2 + (e.y - selectedPlayer.y) ** 2);
      return dist <= maxRange;
    }).map(e => ({ x: e.x, y: e.y }));
  }, [selectedPlayer, gameState]);

  // Map every cell covered by an infrastructure footprint → the infrastructure item
  // Mirrors INFRA_SPAN from GameMap.js (centered on item.x, item.y)
  const infraCellMap = useMemo(() => {
    const SPAN = {
      major_city:     { w: 3, h: 3 },
      port_facility:  { w: 3, h: 3 },
      military_base:  { w: 2, h: 2 },
      industrial:     { w: 2, h: 2 },
      airfield:       { w: 3, h: 2 },
      airfield_base:  { w: 3, h: 2 },
      small_airfield: { w: 2, h: 1 },
      town:           { w: 2, h: 2 },
    };
    const map = new Map();
    for (const item of (gameState?.infrastructure || [])) {
      const span = SPAN[item.type] || { w: 1, h: 1 };
      const sx = item.x - Math.floor(span.w / 2);
      const sy = item.y - Math.floor(span.h / 2);
      for (let dx = 0; dx < span.w; dx++) {
        for (let dy = 0; dy < span.h; dy++) {
          const key = `${sx + dx},${sy + dy}`;
          if (!map.has(key)) map.set(key, item); // first writer wins (largest drawn first)
        }
      }
    }
    return map;
  }, [gameState]);

  // Current user's player object
  const myPlayer = useMemo(() =>
    gameState?.players?.find(p => p.userId === user.id), [gameState, user.id]);

  const isGM = gameState?.gmId === user.id && gameState?.gmActive !== false;
  const needsSpawn = myPlayer && myPlayer.x == null && gameState?.phase === 'joining';

  const setupWebSocket = () => {
    const newSocket = io(API_URL, { withCredentials: true });
    newSocket.on('connect', () => newSocket.emit('joinGame', channelId));
    newSocket.on('gameUpdate', () => fetchGameState());
    newSocket.on('battleLogEntry', (data) => {
      addLogEntry(data.message, data.logType || 'ai');
    });
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

  const handleMapClick = (x, y, clientX, clientY) => {
    if (gmSpawnMode) {
      handleSpawnEnemy(gmEnemyType, x, y, gmEnemyType === 'boss' ? gmBossKey : undefined);
      setGmSpawnMode(false);
      return;
    }
    setSelectedCell({ x, y, clientX, clientY });
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

  const handleSpawn = async (x, y) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/spawn`,
        { x, y },
        { withCredentials: true }
      );
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set spawn location');
    }
  };

  const handleDamageControl = async () => {
    if (!selectedPlayer) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/damage-control`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to perform damage control');
    }
  };

  const handleEndTurn = async () => {
    if (!selectedPlayer || endingTurn) return;
    setEndingTurn(true);
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/end-turn`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end turn');
    } finally {
      setEndingTurn(false);
    }
  };

  const handleAttackFull = async (targetId, weaponType, shellType) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/attack`,
        { targetId, weaponType, shellType, characterAlias: selectedPlayer?.characterAlias },
        { withCredentials: true }
      );
      const attacker = selectedPlayer?.characterAlias || selectedPlayer?.username || 'You';
      const weapon   = attackState?.weaponName || weaponType || 'weapon';
      const target   = attackState?.targetName || 'target';
      const shell    = shellType && shellType !== 'torpedo' ? ` (${shellType.toUpperCase()})` : '';
      addLogEntry(`⚔️ ${attacker} fires ${weapon}${shell} at ${target}`, 'attack');
      setAttackState(null);
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to attack');
    }
  };

  const handleWeather = async (condition) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/weather`,
        { condition },
        { withCredentials: true }
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set weather');
    }
  };

  const handleSpawnEnemy = async (shipType, x, y, bossKey) => {
    try {
      const payload = { shipType };
      if (typeof x === 'number') payload.x = x;
      if (typeof y === 'number') payload.y = y;
      if (bossKey) payload.bossKey = bossKey;
      await axios.post(`${API_URL}/api/game/${channelId}/spawn-enemy`, payload, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to spawn enemy');
    }
  };

  const handleGMToggle = async () => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm-toggle`, {}, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle GM status');
    }
  };

  const handleStartBattle = async () => {
    if (startingBattle) return;
    setStartingBattle(true);
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/start-battle`, {}, { withCredentials: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data || err.message || 'Failed to start battle';
      alert(`Error ${status || '(no response)'}: ${JSON.stringify(msg)}`);
      setStartingBattle(false);
    }
    // Leave button disabled after success — gameState will update to 'battle' phase
    // and the button disappears, so no need to reset
  };

  const handleEndBattle = async () => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/end`,
        {},
        { withCredentials: true }
      );
      setConfirmEndBattle(false);
      // stay on page — MVP screen will appear via broadcast/state update
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end battle');
    }
  };

  const handleApplyStatus = async (targetId, targetType, status) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/apply-status`,
        { targetId, targetType, status },
        { withCredentials: true }
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply status');
    }
  };

  const handleTakeControl = async (enemy) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm/take-control`,
        { aiId: enemy.id }, { withCredentials: true });
      setGmControlledAI(enemy);
      setGmAIMoveCoord('');
      setGmAIAttackTarget('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to take control');
    }
  };

  const handleReleaseControl = async () => {
    if (!gmControlledAI) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm/release-control`,
        { aiId: gmControlledAI.id }, { withCredentials: true });
      setGmControlledAI(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release control');
    }
  };

  const handleGMAIMove = async () => {
    if (!gmControlledAI || !gmAIMoveCoord.trim()) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm/ai-move`,
        { aiId: gmControlledAI.id, coordinate: gmAIMoveCoord.trim() }, { withCredentials: true });
      setGmAIMoveCoord('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move AI');
    }
  };

  const handleGMAIAttack = async () => {
    if (!gmControlledAI || !gmAIAttackTarget) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm/ai-attack`,
        { aiId: gmControlledAI.id, targetId: gmAIAttackTarget }, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to execute attack');
    }
  };

  const handleGMAIEndTurn = async () => {
    if (!gmControlledAI) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/gm/ai-end-turn`,
        { aiId: gmControlledAI.id }, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end AI turn');
    }
  };

  const getAttackRange = () => {
    if (!selectedPlayer) return 0;
    const weapons = Array.isArray(selectedPlayer.weapons)
      ? selectedPlayer.weapons
      : Object.values(selectedPlayer.weapons || {});
    if (weapons.length === 0) return 0;
    return Math.max(...weapons.map(w => w.range || 0));
  };

  const isInRange = (ex, ey) => {
    if (!selectedPlayer || selectedPlayer.x == null) return false;
    const dx = ex - selectedPlayer.x;
    const dy = ey - selectedPlayer.y;
    return Math.sqrt(dx * dx + dy * dy) <= getAttackRange();
  };

  const renderAttackFlow = (e) => {
    const weapons = Array.isArray(selectedPlayer.weapons)
      ? selectedPlayer.weapons
      : Object.values(selectedPlayer.weapons || {});

    if (attackState?.targetId !== e.id) {
      return (
        <button className="btn-attack-unit" onClick={() =>
          setAttackState({ targetId: e.id, targetName: e.name, step: 'weapon' })
        }>⚔️ Attack</button>
      );
    }

    if (attackState.step === 'weapon') {
      return (
        <div className="attack-flow">
          <div className="attack-flow-label">Choose weapon</div>
          <div className="attack-flow-buttons">
            {weapons.map(w => (
              <button key={w.type || w.name} onClick={() => {
                const isTorpedo = (w.type || '').toLowerCase().includes('torpedo');
                setAttackState({
                  ...attackState,
                  weaponType: w.type,
                  weaponName: w.name || w.type,
                  step: isTorpedo ? 'confirm' : 'shell',
                  shellType: isTorpedo ? 'torpedo' : null,
                });
              }}>
                {w.name || w.type}
              </button>
            ))}
            <button className="btn-cancel" onClick={() => setAttackState(null)}>✕ Cancel</button>
          </div>
        </div>
      );
    }

    if (attackState.step === 'shell') {
      return (
        <div className="attack-flow">
          <div className="attack-flow-label">Shell type</div>
          <div className="attack-flow-buttons">
            <button onClick={() => setAttackState({ ...attackState, shellType: 'ap', step: 'confirm' })}>AP</button>
            <button onClick={() => setAttackState({ ...attackState, shellType: 'he', step: 'confirm' })}>HE</button>
            <button className="btn-cancel" onClick={() => setAttackState({ ...attackState, step: 'weapon' })}>← Back</button>
          </div>
        </div>
      );
    }

    if (attackState.step === 'confirm') {
      return (
        <div className="attack-flow">
          <div className="attack-flow-confirm">
            Attack <strong>{attackState.targetName}</strong> with {attackState.weaponName}
            {attackState.shellType && attackState.shellType !== 'torpedo' ? ` (${attackState.shellType.toUpperCase()})` : ''}?
          </div>
          <div className="attack-flow-buttons">
            <button onClick={() => handleAttackFull(attackState.targetId, attackState.weaponType, attackState.shellType)}>
              ✅ Confirm
            </button>
            <button className="btn-cancel" onClick={() => setAttackState(null)}>✕ Cancel</button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCellInfo = () => {
    if (!selectedCell || !gameState) return null;

    const { x, y, clientX = window.innerWidth / 2, clientY = window.innerHeight / 2 } = selectedCell;

    // Anchor bottom of popup just above the click point using translateY(-100%)
    // so it sits directly above the cell regardless of actual popup height.
    // Fall back to below if the click is near the top of the viewport.
    const POPUP_W = 272;
    const MARGIN_PX = 12;
    const left = Math.max(MARGIN_PX, Math.min(
      clientX - POPUP_W / 2,
      window.innerWidth - POPUP_W - MARGIN_PX
    ));
    const showAbove = clientY > 150;
    const posStyle = showAbove
      ? { top: clientY - 28, transform: 'translateY(-100%)' }
      : { top: clientY + MARGIN_PX };
    const coord = coordLabel(x, y);
    const players = (gameState.players || []).filter(p => !p.sunk && p.x === x && p.y === y);
    const enemies = (gameState.enemies || []).filter(e => (e.visible || isGM) && e.x === x && e.y === y);
    const isLand = landSet.has(`${x},${y}`);
    const isSpawnCell = spawnSet.has(`${x},${y}`);
    const moveSpeed = selectedPlayer?.stats?.speed || 3;
    const inMoveRange = selectedPlayer && selectedPlayer.x != null && selectedPlayer.y != null
      ? Math.sqrt((x - selectedPlayer.x) ** 2 + (y - selectedPlayer.y) ** 2) <= moveSpeed
      : true;
    const canMove = gameState?.phase === 'battle' && selectedPlayer && !selectedPlayer.sunk &&
      selectedPlayer.actionsThisTurn < selectedPlayer.maxActions && !isLand && inMoveRange;
    const canAttackAny = selectedPlayer && !selectedPlayer.sunk &&
      selectedPlayer.actionsThisTurn < selectedPlayer.maxActions;

    // Determine terrain/infrastructure label
    const TERRAIN_LABELS = { island: '🏝️ Island', reef: '🪸 Reef', spawn: '⚓ Spawn Zone', city: '🏙️ City', town: '🏘️ Town', minefield: '💣 Minefield' };
    const INFRA_LABELS = {
      major_city: '🏙️ Major City', port_city: '🏙️ Port City', town: '🏘️ Town',
      military_base: '🪖 Military Base', military_outpost: '🪖 Military Outpost', outpost: '🪖 Outpost',
      airfield: '✈️ Airfield', airfield_base: '✈️ Airfield Base', small_airfield: '✈️ Small Airfield',
      port_facility: '⚓ Port Facility', industrial: '🏭 Industrial', lighthouse: '🗼 Lighthouse',
      port_gun: '💣 Coastal Gun', mine: '💣 Naval Mine',
    };
    let terrainLabel = '🌊 Ocean';
    if (gameState.terrain) {
      const tc = gameState.terrain.find(c => c.x === x && c.y === y);
      if (tc) terrainLabel = (tc.name ? `${TERRAIN_LABELS[tc.type] || tc.type}: ${tc.name}` : TERRAIN_LABELS[tc.type]) || tc.type;
    }
    const ic = infraCellMap.get(`${x},${y}`);
    // If infra covers this cell, keep terrain only if it adds useful info (not plain Ocean)
    if (ic && terrainLabel === '🌊 Ocean') terrainLabel = null;

    return (
      <div className="cell-popup" style={{ left, ...posStyle }}>
        <div className="cell-info-header">
          <span className="cell-coord">Cell {coord}</span>
          <button className="cell-info-close" onClick={() => { setSelectedCell(null); setAttackState(null); }}>✕</button>
        </div>

        {terrainLabel && <div className="cell-info-terrain">{terrainLabel}</div>}

        {ic && (() => {
          const stateTag = ic.state === 'destroyed' ? { label: 'Destroyed', cls: 'infra-state-destroyed', icon: '💥' }
                         : ic.state === 'abandoned'  ? { label: 'Abandoned',  cls: 'infra-state-abandoned',  icon: '🏚️' }
                         : ic.state === 'burning'    ? { label: 'On Fire',    cls: 'infra-state-burning',    icon: '🔥' }
                         : null;
          return (
            <div className="cell-info-infra">
              <div className="infra-type-label">{INFRA_LABELS[ic.type] || ic.type}</div>
              {ic.name && <div className="infra-name">{ic.name}{ic.state === 'burning' ? ' 🔥' : ''}</div>}
              {stateTag && (
                <div className={`infra-state-badge ${stateTag.cls}`}>
                  {stateTag.icon} {stateTag.label}
                </div>
              )}
            </div>
          );
        })()}

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
                  {p.bleeding && <span className="unit-status">🩸</span>}
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
                  {canAttackAny && inRange && renderAttackFlow(e)}
                </div>
              );
            })}
          </div>
        )}

        {players.length === 0 && enemies.length === 0 && (
          <div className="cell-info-empty">No units here</div>
        )}

        <div className="cell-info-actions">
          {needsSpawn && isSpawnCell && (
            <button className="btn-move-here" onClick={() => handleSpawn(x, y)}>⚓ Spawn Here</button>
          )}
          {needsSpawn && !isSpawnCell && (
            <div className="cell-info-hint">Not a valid spawn zone</div>
          )}
          {!needsSpawn && canMove && (
            <button className="btn-move-here" onClick={() => handleMove(x, y)}>🚢 Move Here</button>
          )}
          {!selectedPlayer && <div className="cell-info-hint">Select a ship to take actions</div>}
          {selectedPlayer && selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions && !needsSpawn && (
            <div className="cell-info-hint">No actions remaining</div>
          )}
          {isLand && selectedPlayer && !needsSpawn && <div className="cell-info-hint">Cannot move to land</div>}
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
      {gameState?.phase === 'ended' && (
        <MVPScreen mvp={gameState.mvp} onBack={onBack} />
      )}
      <header className="game-header">
        <div className="game-header-left">
          <button onClick={onBack} className="btn btn-secondary">← Back</button>
          <h2>Game #{channelId.slice(-6)}</h2>
          {gameState.phase === 'joining' ? (
            <span className="phase-badge phase-spawn">⚓ Spawn Phase</span>
          ) : gameState.phase === 'battle' && gameState.players.every(p => p.sunk) ? (
            <span className="phase-badge phase-qrf">🚁 QRF Phase</span>
          ) : gameState.phase === 'battle' ? (
            <span className="phase-badge phase-battle">⚔️ Battle • Turn {gameState.currentTurn}{gameState.weather ? ` • ${gameState.weather}` : ''}</span>
          ) : null}
        </div>
        <div className="game-header-right">
          <span className="user-name">{user.username}</span>
          <button onClick={onLogout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      {/* QRF banner */}
      {gameState.phase === 'battle' && gameState.players.length > 0 && gameState.players.every(p => p.sunk) && (
        <div className="qrf-banner">
          🚁 <strong>QRF Phase</strong> — All players have been eliminated. New reinforcements can join via Discord (<code>/join</code>).
        </div>
      )}

      <div className="game-content">
        <div className="game-sidebar">

          {/* ── SPAWN PHASE SIDEBAR ── */}
          {gameState.phase === 'joining' && (
            <>
              <div className="sidebar-section spawn-phase-section">
                <h3>⚓ Players Joined</h3>
                {gameState.players.length === 0 ? (
                  <p className="no-ships">No players yet — join via Discord with <code>/join</code></p>
                ) : (
                  <div className="spawn-roster">
                    {gameState.players.map(p => {
                      const hasSpawn = p.x != null;
                      return (
                        <div key={p.userId} className={`spawn-roster-row ${hasSpawn ? 'spawned' : 'waiting'}`}>
                          <span className="spawn-status-icon">{hasSpawn ? '✅' : '⏳'}</span>
                          <span className="spawn-player-name">{p.characterAlias || p.username || p.userId}</span>
                          <span className="spawn-ship-class">{p.shipClass}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {gameState?.gmId === user.id && (
                <div className="sidebar-section">
                  <button
                    className={`btn btn-gm-toggle ${gameState?.gmActive !== false ? 'gm-active' : 'gm-inactive'}`}
                    onClick={handleGMToggle}
                    title={gameState?.gmActive !== false ? 'Click to play as a regular player' : 'Click to re-enable GM powers'}
                  >
                    {gameState?.gmActive !== false ? '🎮 Playing as GM — Click to drop GM powers' : '🔓 Restore GM Powers'}
                  </button>
                </div>
              )}

              {isGM && (
                <div className="sidebar-section">
                  <h3>⚙️ GM Controls</h3>
                  {(() => {
                    const unspawned = gameState.players.filter(p => p.x == null);
                    const canStart = gameState.players.length > 0 && unspawned.length === 0;
                    return (
                      <>
                        {unspawned.length > 0 && (
                          <p className="spawn-warning">⚠️ {unspawned.length} player{unspawned.length > 1 ? 's' : ''} still need to pick a spawn point.</p>
                        )}
                        <button
                          className="btn btn-start-battle"
                          disabled={!canStart || startingBattle}
                          onClick={handleStartBattle}
                        >
                          {startingBattle ? '⏳ Starting...' : '🚀 Start Battle'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {!isGM && needsSpawn && (
                <div className="sidebar-section">
                  <p className="spawn-hint-text">⚓ Click a highlighted cell on the map to pick your spawn point.</p>
                </div>
              )}

              {!isGM && !needsSpawn && myPlayer && (
                <div className="sidebar-section">
                  <p className="spawn-ready-text">✅ Spawn selected — waiting for GM to start the battle.</p>
                </div>
              )}

            </>
          )}

          {/* ── NORMAL BATTLE SIDEBAR ── */}
          {gameState.phase !== 'joining' && <>

          {/* Allied Ships */}
          <div className="sidebar-section">
            <h3>Allied Ships</h3>
            {userPlayers.length === 0 ? (
              <p className="no-ships">No ships in this game</p>
            ) : (
              <div className="ship-list">
                {userPlayers.map((player, idx) => {
                  const hpPct = player.maxHealth > 0
                    ? Math.max(0, Math.min(100, Math.round((player.health / player.maxHealth) * 100)))
                    : 0;
                  return (
                    <div
                      key={idx}
                      className={`ship-card-simple ${selectedPlayer?.userId === player.userId ? 'selected' : ''} ${player.sunk ? 'sunk' : ''}`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="scs-header">
                        <img
                          className="scs-icon"
                          src={`/icons/${player.sunk ? 'sunk_player' : 'class'}/${getShipType(player.shipClass)}.png`}
                          alt=""
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <span className="scs-name">{player.characterAlias || player.shipClass}</span>
                        <span className="scs-status">
                          {player.onFire   && '🔥'}
                          {player.flooding && '💧'}
                          {player.bleeding && '🩸'}
                        </span>
                      </div>
                      <div className="scs-hp-bar">
                        <div className="scs-hp-fill" style={{ width: `${hpPct}%`, background: hpBarColor(hpPct) }} />
                        <span className="scs-hp-text" style={{ color: player.sunk ? '#fff' : '#000' }}>
                          {player.health ?? 0}/{player.maxHealth ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                {!selectedPlayer.sunk && (
                  <>
                    <button
                      className="btn btn-warning"
                      disabled={
                        (selectedPlayer.damageControlCooldown ?? 0) > 0 ||
                        (!selectedPlayer.onFire && !selectedPlayer.flooding && !selectedPlayer.bleeding) ||
                        selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions
                      }
                      onClick={handleDamageControl}
                    >
                      🔧 Damage Control
                      {(selectedPlayer.damageControlCooldown ?? 0) > 0 && ` (${selectedPlayer.damageControlCooldown}t)`}
                    </button>
                    <button className="btn btn-secondary" onClick={handleEndTurn} disabled={endingTurn}>
                      {endingTurn ? 'Ending...' : '✋ End Turn'}
                    </button>
                  </>
                )}
              </div>
              <p className="action-help">Click any cell on the map to inspect it</p>
            </div>
          )}


          {/* Enemies */}
          <div className="sidebar-section">
            <h3>Enemies ({gameState.enemies.filter(e => !e.sunk && (e.visible || isGM)).length})</h3>
            <div className="enemy-list">
              {gameState.enemies.filter(e => !e.sunk && (e.visible || isGM)).length === 0 ? (
                <p className="no-enemies">No enemies in sight</p>
              ) : (
                gameState.enemies.filter(e => !e.sunk && (e.visible || isGM)).map((enemy) => {
                  const hpPct = enemy.maxHealth > 0
                    ? Math.max(0, Math.min(100, Math.round((enemy.health / enemy.maxHealth) * 100)))
                    : 0;
                  const isControlled = gmControlledAI?.id === enemy.id;
                  return (
                    <div key={enemy.id} className={`ship-card-simple enemy${isControlled ? ' gm-controlled' : ''}`}>
                      <div className="scs-header">
                        <img
                          className="scs-icon"
                          src={`/icons/enemy/${getShipType(enemy.shipClass)}.png`}
                          alt=""
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <span className="scs-name">{enemy.name}{enemy.isBoss ? ' ⚠️' : ''}{enemy.gmControlled ? ' 🕹️' : ''}</span>
                        <span className="scs-status">
                          {enemy.onFire   && '🔥'}
                          {enemy.flooding && '💧'}
                        </span>
                      </div>
                      <div className="scs-hp-bar">
                        <div className="scs-hp-fill" style={{ width: `${hpPct}%`, background: hpBarColor(hpPct) }} />
                        <span className="scs-hp-text" style={{ color: '#000' }}>
                          {enemy.health ?? 0}/{enemy.maxHealth ?? 0}
                        </span>
                      </div>
                      {isGM && (
                        isControlled
                          ? <button className="gm-control-btn release" onClick={handleReleaseControl}>Release Control</button>
                          : <button className="gm-control-btn take" onClick={() => handleTakeControl(enemy)}>Take Control</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* GM Controls */}
          {isGM && (
            <div className="sidebar-section gm-controls">
              <h3>⚙️ GM Controls</h3>

              {/* Weather */}
              <div className="gm-row">
                <select value={gmWeather} onChange={e => setGmWeather(e.target.value)}>
                  <option value="clear">Clear</option>
                  <option value="rainy">Rainy</option>
                  <option value="foggy">Foggy</option>
                  <option value="thunderstorm">Thunderstorm</option>
                  <option value="hurricane">Hurricane</option>
                </select>
                <button onClick={() => handleWeather(gmWeather)}>Set Weather</button>
              </div>

              {/* Spawn Enemy */}
              <div className="gm-row">
                <select value={gmEnemyType} onChange={e => { setGmEnemyType(e.target.value); setGmSpawnMode(false); }}>
                  <optgroup label="Classes (Random Ship)">
                    <option value="destroyer">Destroyer</option>
                    <option value="light_cruiser">Light Cruiser</option>
                    <option value="heavy_cruiser">Heavy Cruiser</option>
                    <option value="battleship">Battleship</option>
                    <option value="carrier">Carrier</option>
                    <option value="submarine">Submarine</option>
                  </optgroup>
                  <optgroup label="Boss">
                    <option value="boss">👑 Boss</option>
                  </optgroup>
                </select>
                <button
                  className={gmSpawnMode ? 'gm-spawn-active' : gmEnemyType === 'boss' ? 'gm-boss-spawn' : ''}
                  onClick={() => setGmSpawnMode(m => !m)}
                >
                  {gmSpawnMode ? '✕ Cancel' : 'Place'}
                </button>
              </div>
              {gmEnemyType === 'boss' && (
                <div className="gm-row">
                  <select value={gmBossKey} onChange={e => setGmBossKey(e.target.value)} style={{flex: 1}}>
                    <optgroup label="Commanders">
                      <option value="siren_boss_observer_alpha">Observer α</option>
                      <option value="siren_boss_tester_beta">Tester β</option>
                      <option value="siren_boss_purifier">Purifier</option>
                      <option value="siren_boss_dreamweaver">Dreamweaver</option>
                      <option value="siren_boss_omitter">Omitter</option>
                      <option value="siren_boss_complier">Complier</option>
                    </optgroup>
                    <optgroup label="Arbiters">
                      <option value="siren_boss_arbiter_empress_iii">Arbiter: The Empress III</option>
                      <option value="siren_boss_arbiter_hierophant_v">Arbiter: The Hierophant V</option>
                      <option value="siren_boss_arbiter_lovers_vi">Arbiter: The Lovers VI</option>
                      <option value="siren_boss_arbiter_strength_viii">Arbiter: Strength VIII</option>
                      <option value="siren_boss_arbiter_hermit_ix">Arbiter: The Hermit IX</option>
                      <option value="siren_boss_arbiter_temperance_xiv">Arbiter: Temperance XIV</option>
                      <option value="siren_boss_arbiter_devil_xv">Arbiter: The Devil XV</option>
                      <option value="siren_boss_arbiter_tower_xvi">Arbiter: The Tower XVI</option>
                    </optgroup>
                  </select>
                </div>
              )}
              {gmSpawnMode && (
                <div className="gm-spawn-hint">
                  {gmEnemyType === 'boss'
                    ? `Click a cell on the map to place ${gmBossKey.replace('siren_boss_', '').replace(/_/g, ' ')}`
                    : `Click a cell on the map to place the ${gmEnemyType.replace(/_/g, ' ')}`
                  }
                </div>
              )}

              {/* Apply Status */}
              <div className="gm-row">
                <select value={gmStatusTarget} onChange={e => setGmStatusTarget(e.target.value)}>
                  <option value="">Select unit...</option>
                  {[...gameState.players, ...gameState.enemies].filter(u => !u.sunk).map(u => {
                    const id = u.userId || u.id;
                    const type = u.userId ? 'player' : 'enemy';
                    const label = u.characterAlias || u.name || u.username;
                    return (
                      <option key={id} value={`${id}:${type}`}>{label}</option>
                    );
                  })}
                </select>
              </div>
              <div className="gm-row">
                <select value={gmStatusAction} onChange={e => setGmStatusAction(e.target.value)}>
                  <option value="fire">🔥 Fire</option>
                  <option value="flood">💧 Flood</option>
                  <option value="kill">💀 Kill</option>
                </select>
                <button
                  disabled={!gmStatusTarget}
                  onClick={() => {
                    const [id, type] = gmStatusTarget.split(':');
                    handleApplyStatus(id, type, gmStatusAction);
                  }}
                >Apply</button>
              </div>

              {/* GM AI Control */}
              {gmControlledAI && (
                <div className="gm-ai-control">
                  <h4>🕹️ Controlling: {gmControlledAI.name}</h4>

                  <div className="gm-row">
                    <input
                      type="text"
                      placeholder="Coordinate (e.g. B12)"
                      value={gmAIMoveCoord}
                      onChange={e => setGmAIMoveCoord(e.target.value.toUpperCase())}
                      className="gm-coord-input"
                    />
                    <button onClick={handleGMAIMove} disabled={!gmAIMoveCoord.trim()}>Move</button>
                  </div>

                  <div className="gm-row">
                    <select value={gmAIAttackTarget} onChange={e => setGmAIAttackTarget(e.target.value)}>
                      <option value="">— Select Target —</option>
                      {(gameState.players || []).filter(p => !p.sunk).map(p => (
                        <option key={p.userId} value={p.userId}>{p.characterAlias || p.username}</option>
                      ))}
                    </select>
                    <button onClick={handleGMAIAttack} disabled={!gmAIAttackTarget}>Attack</button>
                  </div>

                  <div className="gm-row">
                    <button className="btn-gm-danger" onClick={handleGMAIEndTurn}>End AI Turn</button>
                    <button onClick={handleReleaseControl}>Release Control</button>
                  </div>
                </div>
              )}

              {/* End Battle */}
              {!confirmEndBattle
                ? <button className="btn-gm-danger" onClick={() => setConfirmEndBattle(true)}>🔴 End Battle</button>
                : (
                  <div className="gm-confirm">
                    <span>End the battle?</span>
                    <button onClick={handleEndBattle}>Yes</button>
                    <button onClick={() => setConfirmEndBattle(false)}>No</button>
                  </div>
                )
              }
            </div>
          )}

          </>} {/* end battle-only sidebar content */}

        </div>

        <div className="game-main">
          {needsSpawn && (
            <div className="spawn-banner">⚓ Select your spawn location — click a highlighted green cell</div>
          )}
          <div className="map-and-log">
            <GameMap
              gameState={gameState}
              onCellClick={handleMapClick}
              selectedCell={selectedCell}
              spawnZoneCoords={needsSpawn ? (gameState.spawnZoneCoords || []) : []}
              myUserId={user.id}
              isGM={isGM}
              moveHighlights={needsSpawn ? [] : moveHighlights}
              attackHighlights={needsSpawn ? [] : attackHighlights}
            />
            <div className="battle-log-panel">
              <div className="battle-log-header">
                📋 Battle Log
                <span className="battle-log-count">{localLog.length}</span>
              </div>
              <div className="battle-log-entries">
                {localLog.length === 0
                  ? <div className="log-empty">Waiting for events…</div>
                  : localLog.map(entry => (
                    <div key={entry.id} className={`log-entry log-${entry.type}`}>
                      <div className="log-time">
                        {entry.ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="log-text">{entry.text}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

    {/* Cell info popup — floats over the map at click position */}
    {renderCellInfo()}
    </div>
  );
}

export default GameView;
