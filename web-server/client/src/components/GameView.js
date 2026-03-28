import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GameMap from './GameMap';
import './GameView.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#f87171', background: '#1e293b', minHeight: '100vh' }}>
          <h2>Render error — check console</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{String(this.state.error)}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: '#94a3b8' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ITEM_META = {
  repair_kit:            { name: 'Repair Kit',            emoji: '🔧', desc: 'Heals 50 HP, clears status effects',   action: true  },
  fire_suppression:      { name: 'Fire Suppression',      emoji: '🔥', desc: 'Extinguishes fires instantly',         action: false },
  emergency_patch:       { name: 'Emergency Patch',       emoji: '🩹', desc: 'Stops flooding instantly',             action: false },
  smoke_screen:          { name: 'Smoke Screen',          emoji: '💨', desc: '+50% evasion for 3 turns',             action: true  },
  lucky_charm:           { name: 'Lucky Charm',           emoji: '🍀', desc: '+25% crit chance for this battle',     action: true  },
  emergency_speed_boost: { name: 'Emergency Speed Boost', emoji: '⚡', desc: '+3 speed for 2 turns (costs 10 HP)',   action: true  },
  radar_jamming:         { name: 'Radar Jamming',         emoji: '📡', desc: '-20% enemy accuracy for 3 turns',      action: true  },
  decoy_buoy:            { name: 'Decoy Buoy',            emoji: '🪝', desc: 'Redirects torpedoes for 2 turns',      action: true  },
  combat_stimulants:     { name: 'Combat Stimulants',     emoji: '💉', desc: '+1 action point this turn',            action: true  },
  repair_ship_contract:  { name: 'Repair Ship Contract',  emoji: '🛠️', desc: '+40 HP/turn for 3 turns',             action: true  },
  fuel_barrels:          { name: 'Fuel Barrels',          emoji: '⛽', desc: '+5 fuel to all deployed aircraft',     action: true  },
  air_support_marker:    { name: 'Air Support Marker',    emoji: '✈️', desc: 'Call in bombers on a target',          action: true  },
};

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
                src={mvp.avatarURL || '/icons/ally/destroyer.png'}
                alt={mvp.username}
                className="mvp-avatar"
                onError={e => { e.target.src = '/icons/ally/destroyer.png'; }}
              />
              <img src="/icons/crown.png" alt="Crown" className="mvp-crown" />
            </div>
            <div className="mvp-username">{mvp.characterAlias || mvp.username}</div>
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
  const [launchingRecon, setLaunchingRecon] = useState(false);
  const [launchingAircraft, setLaunchingAircraft] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  // New state for feature parity
  const [attackState, setAttackState] = useState(null);
  // null | { targetId, targetName, step: 'weapon'|'shell'|'confirm', weaponType?, weaponName?, shellType? }
  const [airSupportTargeting, setAirSupportTargeting] = useState(false);
  const [confirmEndBattle, setConfirmEndBattle] = useState(false);
  const [startingBattle, setStartingBattle] = useState(false);
  const [endingTurn, setEndingTurn] = useState(false);
  const [gmWeather, setGmWeather] = useState('clear');
  const [gmWeatherDelay, setGmWeatherDelay] = useState(0);
  const [gmEnemyType, setGmEnemyType] = useState('destroyer');
  const [gmBossKey, setGmBossKey] = useState('siren_boss_observer_alpha');
  const [gmSpawnMode, setGmSpawnMode] = useState(false);
  const [gmStatusTarget, setGmStatusTarget] = useState('');
  const [gmStatusAction, setGmStatusAction] = useState('fire');
  const [gmControlledAI, setGmControlledAI] = useState(null); // enemy object being controlled
  const [gmAIMoveCoord, setGmAIMoveCoord] = useState('');
  const [gmAIAttackTarget, setGmAIAttackTarget] = useState('');
  const [showInventory, setShowInventory] = useState(false);

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

  // Keep selectedAircraft in sync with fresh game state
  useEffect(() => {
    if (gameState && selectedAircraft) {
      const fresh = (gameState.aircraft || []).find(a => a.id === selectedAircraft.id);
      if (fresh) setSelectedAircraft(fresh);
      else setSelectedAircraft(null);
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

  const AIRCRAFT_MOVE_RANGES = { fighter: 10, dive_bomber: 8, torpedo_bomber: 5 };

  const aircraftMoveHighlights = useMemo(() => {
    if (!selectedAircraft || (selectedAircraft.actionPoints ?? 0) <= 0) return [];
    const range = AIRCRAFT_MOVE_RANGES[selectedAircraft.type] || 8;
    const result = [];
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.sqrt(dx * dx + dy * dy) > range) continue;
        const nx = selectedAircraft.x + dx;
        const ny = selectedAircraft.y + dy;
        if (nx < 0 || ny < 0 || nx >= 75 || ny >= 75) continue;
        result.push({ x: nx, y: ny });
      }
    }
    return result;
  }, [selectedAircraft]);

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

  const isGM = gameState?.gmIds?.includes(user.id) ?? false;
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
      const response = await axios.get(`${API_URL}/api/game/${channelId}/state?userId=${user.id}`, { withCredentials: true });
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

  const handleUseItem = async (itemId) => {
    if (itemId === 'air_support_marker') {
      setShowInventory(false);
      setAirSupportTargeting(true);
      return;
    }
    try {
      const r = await fetch(`${API_URL}/api/game/${channelId}/use-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId }),
      });
      const data = await r.json();
      if (!data.success) alert(data.error || 'Failed to use item');
    } catch (err) {
      console.error('use-item error', err);
    }
  };

  const handleLaunchRecon = async () => {
    if (!selectedPlayer || launchingRecon) return;
    setLaunchingRecon(true);
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/launch-recon`, {}, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to launch aircraft');
    } finally {
      setLaunchingRecon(false);
    }
  };

  const handleLaunchAircraft = async (aircraftType) => {
    if (!selectedPlayer || launchingAircraft) return;
    setLaunchingAircraft(true);
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/launch-aircraft`, { aircraftType }, { withCredentials: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to launch aircraft');
    } finally {
      setLaunchingAircraft(false);
    }
  };

  const handleMoveAircraft = async (aircraftId, x, y) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/move-aircraft`,
        { aircraftId, x, y }, { withCredentials: true });
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move aircraft');
    }
  };

  const handleAircraftAttack = async (aircraft, targetId) => {
    try {
      const response = await axios.post(`${API_URL}/api/game/${channelId}/attack-aircraft`,
        { aircraftId: aircraft.id, targetId }, { withCredentials: true });
      const hit = response.data?.hit;
      const damage = response.data?.damage;
      addLogEntry(
        hit
          ? `✈️ ${aircraft.name} hits for ${damage} damage!`
          : `✈️ ${aircraft.name} misses!`,
        'attack'
      );
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to attack with aircraft');
    }
  };

  const handleRecallAircraft = async (aircraftId) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/recall-aircraft`,
        { aircraftId }, { withCredentials: true });
      setSelectedAircraft(null);
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to recall aircraft');
    }
  };

  const handleLandAircraft = async (aircraftId) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/land-aircraft`,
        { aircraftId }, { withCredentials: true });
      setSelectedAircraft(null);
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to land aircraft');
    }
  };

  const handleUseAirSupport = async (targetId, targetName) => {
    try {
      const response = await axios.post(`${API_URL}/api/game/${channelId}/use-air-support`,
        { targetId }, { withCredentials: true });
      const turnsUntil = response.data?.turnsUntil;
      addLogEntry(`✈️ Air support called in on ${targetName}! Bombers arriving in ${turnsUntil} turn${turnsUntil !== 1 ? 's' : ''}`, 'attack');
      setAirSupportTargeting(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to call air support');
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
      const response = await axios.post(`${API_URL}/api/game/${channelId}/attack`,
        { targetId, weaponType, shellType, characterAlias: selectedPlayer?.characterAlias },
        { withCredentials: true }
      );
      const attacker = selectedPlayer?.characterAlias || selectedPlayer?.username || 'You';
      const weapon   = attackState?.weaponName || weaponType || 'weapon';
      const target   = attackState?.targetName || 'target';
      const shell    = shellType && shellType !== 'torpedo' ? ` (${shellType.toUpperCase()})` : '';
      const hit = response.data?.result?.hit;
      const entry = hit === true
        ? `⚔️ ${attacker} hits ${target} with ${weapon}${shell}`
        : hit === false
          ? `⚔️ ${attacker} misses ${target} with ${weapon}${shell}`
          : `⚔️ ${attacker} fires ${weapon}${shell} at ${target}`;
      addLogEntry(entry, 'attack');
      setAttackState(null);
      setSelectedCell(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to attack');
    }
  };

  const handleWeather = async (condition, delay = 0) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/weather`,
        { condition, turnsDelay: delay },
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

  const isWeaponInRange = (weapon, ex, ey) => {
    if (!selectedPlayer || selectedPlayer.x == null) return false;
    const dx = ex - selectedPlayer.x;
    const dy = ey - selectedPlayer.y;
    return Math.sqrt(dx * dx + dy * dy) <= (weapon.range || 0);
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
            {weapons.map(w => {
              const inRange = isWeaponInRange(w, e.x, e.y);
              return (
                <button
                  key={w.type || w.name}
                  title={inRange ? undefined : 'Out of Range'}
                  style={inRange
                    ? { background: '#276749', color: '#9ae6b4', borderColor: '#48bb78' }
                    : { background: 'var(--surface-2)', color: 'var(--text-muted)', opacity: 0.5, cursor: 'not-allowed' }
                  }
                  onClick={() => {
                    if (!inRange) return;
                    const isTorpedo = (w.type || '').toLowerCase().includes('torpedo');
                    setAttackState({
                      ...attackState,
                      weaponType: w.type,
                      weaponName: w.name || w.type,
                      step: isTorpedo ? 'confirm' : 'shell',
                      shellType: isTorpedo ? 'torpedo' : null,
                    });
                  }}
                >
                  {w.name || w.type}
                </button>
              );
            })}
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

    // Aircraft at this cell
    const allAircraftHere = (gameState.aircraft || []).filter(ac => ac.x === x && ac.y === y);
    const myAircraftHere = allAircraftHere.filter(ac => ac.carrierID === user.id);
    const otherAircraftHere = allAircraftHere.filter(ac => ac.carrierID !== user.id);
    const inAircraftRange = selectedAircraft &&
      (x !== selectedAircraft.x || y !== selectedAircraft.y) &&
      Math.sqrt((x - selectedAircraft.x) ** 2 + (y - selectedAircraft.y) ** 2) <= (AIRCRAFT_MOVE_RANGES[selectedAircraft.type] || 8);

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

        {myAircraftHere.length > 0 && (
          <div className="cell-info-section">
            <div className="cell-info-section-title">Your Aircraft</div>
            {myAircraftHere.map((ac, i) => {
              const hpPct = ac.maxHealth > 0 ? Math.round((ac.health / ac.maxHealth) * 100) : 0;
              const isSelected = selectedAircraft?.id === ac.id;
              const distToCarrier = selectedPlayer
                ? Math.max(Math.abs(ac.x - selectedPlayer.x), Math.abs(ac.y - selectedPlayer.y))
                : Infinity;
              return (
                <div key={i} className={`cell-unit friendly${isSelected ? ' own' : ''}`}>
                  <div className="unit-name">{ac.name}{isSelected ? ' ✈️ Active' : ''}</div>
                  <div className="unit-class">{ac.type.replace(/_/g, ' ')} · {ac.squadronSize} planes</div>
                  <div className="unit-hp-bar"><div className="unit-hp-fill" style={{ width: `${hpPct}%`, background: '#48bb78' }} /></div>
                  <div className="unit-hp-text">{ac.health}/{ac.maxHealth} HP · {ac.ammo} ammo · {ac.fuel} fuel</div>
                  {ac.mission === 'returning' ? (
                    <div className="cell-info-hint" style={{ marginTop: 4 }}>↩️ Returning to carrier...</div>
                  ) : (
                    <>
                      <button
                        className="btn-move-here"
                        style={{ marginTop: 4 }}
                        onClick={() => isSelected ? setSelectedAircraft(null) : setSelectedAircraft(ac)}
                      >
                        {isSelected ? '✕ Deselect Squadron' : '🎮 Control Squadron'}
                      </button>
                      {distToCarrier <= 3 && (
                        <button
                          className="btn-secondary-small"
                          style={{ marginTop: 4 }}
                          disabled={selectedPlayer?.actionsThisTurn >= selectedPlayer?.maxActions}
                          onClick={() => handleLandAircraft(ac.id)}
                        >
                          🛬 Land
                        </button>
                      )}
                      {(ac.ammo ?? 0) === 0 && (
                        <button
                          className="btn-secondary-small"
                          style={{ marginTop: 4 }}
                          disabled={selectedPlayer?.actionsThisTurn >= selectedPlayer?.maxActions}
                          onClick={() => handleRecallAircraft(ac.id)}
                        >
                          ↩️ Recall Squadron
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
                  {canAttackAny && inRange && renderAttackFlow(e)}
                  {selectedAircraft && inAircraftRange && (selectedAircraft.ammo ?? 0) > 0 && (selectedAircraft.actionPoints ?? 0) > 0 && (
                    <button className="btn-attack-unit" onClick={() => handleAircraftAttack(selectedAircraft, e.id)}>
                      ✈️ Strike with aircraft
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {otherAircraftHere.length > 0 && (
          <div className="cell-info-section">
            <div className="cell-info-section-title">Aircraft ({otherAircraftHere.length})</div>
            {otherAircraftHere.map((ac, i) => {
              const hpPct = ac.maxHealth > 0 ? Math.round((ac.health / ac.maxHealth) * 100) : 0;
              const isHostile = ac.owner === 'enemy';
              return (
                <div key={i} className={`cell-unit ${isHostile ? 'enemy' : 'friendly'}`}>
                  <div className="unit-name">{ac.name}</div>
                  <div className="unit-class">{ac.type.replace(/_/g, ' ')} · {ac.squadronSize} planes</div>
                  <div className="unit-hp-bar"><div className="unit-hp-fill" style={{ width: `${hpPct}%`, background: isHostile ? '#f56565' : '#48bb78' }} /></div>
                  <div className="unit-hp-text">{ac.health}/{ac.maxHealth} HP</div>
                  {selectedAircraft && isHostile && inAircraftRange && (selectedAircraft.ammo ?? 0) > 0 && (selectedAircraft.actionPoints ?? 0) > 0 && (
                    <button className="btn-attack-unit" onClick={() => handleAircraftAttack(selectedAircraft, ac.id)}>
                      ✈️ Strike
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {players.length === 0 && enemies.length === 0 && myAircraftHere.length === 0 && otherAircraftHere.length === 0 && (
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
          {selectedAircraft && inAircraftRange && myAircraftHere.length === 0 && (selectedAircraft.actionPoints ?? 0) > 0 && (
            <button className="btn-move-here" style={{ background: 'var(--primary)' }} onClick={() => handleMoveAircraft(selectedAircraft.id, x, y)}>✈️ Fly Here</button>
          )}
          {selectedAircraft && (
            <button className="btn-secondary-small" onClick={() => setSelectedAircraft(null)} style={{ marginTop: 4, fontSize: '0.75rem', opacity: 0.7 }}>
              Cancel aircraft control
            </button>
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

  const userPlayers = gameState.players; // Show all allied ships, not just current user

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

              {(isGM || gameState?.gmId === user.id) && (
                <div className="sidebar-section">
                  <h3>⚙️ GM Controls</h3>
                  <button
                    className={`btn btn-gm-toggle ${isGM ? 'gm-active' : 'gm-inactive'}`}
                    onClick={handleGMToggle}
                    title={isGM ? 'Click to drop your GM permissions' : 'Click to restore your GM permissions'}
                  >
                    {isGM ? '🎮 Drop GM Powers' : '🔓 Restore GM Powers'}
                  </button>
                  {isGM && (() => {
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
                {!selectedPlayer.sunk && (
                  <>
                    {selectedPlayer.reconAircraft && !selectedPlayer.shipClass?.includes('Carrier') && (
                      <button
                        className="btn btn-primary"
                        disabled={
                          selectedPlayer.reconActive ||
                          (selectedPlayer.reconCooldown ?? 0) > 0 ||
                          selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                          launchingRecon
                        }
                        onClick={handleLaunchRecon}
                        title={selectedPlayer.reconAircraft.name}
                      >
                        🛩️ {selectedPlayer.reconActive
                          ? `In Air (${selectedPlayer.reconTurnsRemaining}t)`
                          : (selectedPlayer.reconCooldown ?? 0) > 0
                            ? `Cooldown (${selectedPlayer.reconCooldown}t)`
                            : launchingRecon ? 'Launching...' : 'Launch Aircraft'}
                      </button>
                    )}
                    {selectedPlayer.shipClass?.includes('Carrier') && (
                      <>
                        {[
                          { type: 'fighter',       label: '🛩️ Launch Fighters' },
                          { type: 'dive_bomber',   label: '💣 Launch Dive Bombers' },
                          { type: 'torpedo_bomber',label: '🐟 Launch Torpedo Bombers' },
                        ].map(({ type, label }) => (
                          <button
                            key={type}
                            className="btn btn-primary"
                            disabled={
                              launchingAircraft ||
                              selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                              (selectedPlayer.hangar ?? 0) === 0 ||
                              (gameState?.weather === 'hurricane' && !selectedPlayer.hasAllWeatherAircraft)
                            }
                            onClick={() => handleLaunchAircraft(type)}
                            title={
                              gameState?.weather === 'hurricane' && !selectedPlayer.hasAllWeatherAircraft
                                ? 'Cannot launch during a hurricane'
                                : `Hangar: ${selectedPlayer.hangar ?? 0} aircraft`
                            }
                          >
                            {launchingAircraft ? 'Launching...' : label}
                          </button>
                        ))}
                      </>
                    )}
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
                    <button
                      className="btn btn-info"
                      onClick={() => setShowInventory(v => !v)}
                    >
                      🎒 Inventory
                      {selectedPlayer.inventory && Object.keys(selectedPlayer.inventory).length > 0 &&
                        ` (${Object.values(selectedPlayer.inventory).reduce((a, b) => a + b, 0)})`}
                    </button>
                    {selectedPlayer.hasAirSupportMarker && (
                      <button
                        className="btn btn-success"
                        disabled={selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions}
                        onClick={() => setAirSupportTargeting(true)}
                      >
                        ✈️ Air Support
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleEndTurn} disabled={endingTurn}>
                      {endingTurn ? 'Ending...' : '✋ End Turn'}
                    </button>
                  </>
                )}
              </div>

              {/* Inventory Overlay */}
              {showInventory && selectedPlayer && (
                <div className="inventory-overlay">
                  <div className="inventory-header">
                    <span>🎒 Inventory</span>
                    <button className="inventory-close" onClick={() => setShowInventory(false)}>✕</button>
                  </div>

                  <div className="inventory-section-label">Consumables</div>
                  {(() => {
                    const inv = selectedPlayer.inventory || {};
                    const consumables = Object.entries(inv).filter(([id]) => ITEM_META[id]);
                    if (consumables.length === 0) {
                      return <div className="inventory-empty">No consumables</div>;
                    }
                    return consumables.map(([id, qty]) => {
                      const meta = ITEM_META[id];
                      const noActions    = meta.action && selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions;
                      const classCheck   = id === 'decoy_buoy'       && !selectedPlayer.shipClass?.toLowerCase().includes('submarine');
                      const carrierCheck = id === 'fuel_barrels'     && !selectedPlayer.shipClass?.toLowerCase().includes('carrier');
                      const fireCheck    = id === 'fire_suppression' && !selectedPlayer.onFire;
                      const floodCheck   = id === 'emergency_patch'  && !selectedPlayer.flooding;
                      const charmCheck   = id === 'lucky_charm'      && selectedPlayer.luckyCharm;
                      const disabled = noActions || classCheck || carrierCheck || fireCheck || floodCheck || charmCheck;
                      return (
                        <div key={id} className={`inventory-item${disabled ? ' inventory-item--disabled' : ''}`}>
                          <div className="inventory-item-info">
                            <div className="inventory-item-name">
                              {meta.emoji} {meta.name} <span className="inventory-qty">×{qty}</span>
                            </div>
                            <div className="inventory-item-desc">
                              {meta.desc} · {meta.action ? '1 action' : 'Free'}
                            </div>
                          </div>
                          <button
                            className="inventory-use-btn"
                            disabled={disabled}
                            onClick={() => handleUseItem(id)}
                          >
                            USE
                          </button>
                        </div>
                      );
                    });
                  })()}

                  {(() => {
                    const inv = selectedPlayer.inventory || {};
                    const passives = Object.entries(inv).filter(([id]) => !ITEM_META[id]);
                    if (passives.length === 0) return null;
                    return (
                      <>
                        <div className="inventory-section-label" style={{ marginTop: 10 }}>Equipment (Passive)</div>
                        {passives.map(([id]) => (
                          <div key={id} className="inventory-item">
                            <div className="inventory-item-info">
                              <div className="inventory-item-name" style={{ color: '#94a3b8' }}>
                                ⚙️ {id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </div>
                            </div>
                            <span className="inventory-active-badge">✓ ACTIVE</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}

              <p className="action-help">Click the map to move or attack</p>
            </div>
          )}


          {/* Enemies */}
          <div className="sidebar-section">
            <h3>
              Enemies ({gameState.enemies.filter(e => !e.sunk && (e.visible || isGM)).length})
              {airSupportTargeting && <span style={{ color: '#4caf50', fontSize: '0.8em', marginLeft: 8 }}>— Select a target</span>}
            </h3>
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
                      {airSupportTargeting && (
                        <button
                          className="gm-control-btn take"
                          style={{ background: '#4caf50' }}
                          onClick={() => handleUseAirSupport(enemy.id, enemy.name)}
                        >
                          ✈️ Call Strike
                        </button>
                      )}
                      {!airSupportTargeting && isGM && (
                        isControlled
                          ? <button className="gm-control-btn release" onClick={handleReleaseControl}>Release Control</button>
                          : <button className="gm-control-btn take" onClick={() => handleTakeControl(enemy)}>Take Control</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {airSupportTargeting && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 6, width: '100%' }}
                onClick={() => setAirSupportTargeting(false)}
              >
                Cancel Air Support
              </button>
            )}
          </div>

          {/* GM Controls */}
          {(isGM || gameState?.gmId === user.id) && (
            <div className="sidebar-section gm-controls">
              <h3>⚙️ GM Controls</h3>
              <button
                className={`btn btn-gm-toggle ${isGM ? 'gm-active' : 'gm-inactive'}`}
                onClick={handleGMToggle}
                title={isGM ? 'Click to drop your GM permissions' : 'Click to restore your GM permissions'}
              >
                {isGM ? '🎮 Drop GM Powers' : '🔓 Restore GM Powers'}
              </button>

              {isGM && <>
              {/* Weather */}
              <div className="gm-row">
                <select value={gmWeather} onChange={e => setGmWeather(e.target.value)}>
                  <option value="clear">Clear</option>
                  <option value="rainy">Rainy</option>
                  <option value="foggy">Foggy</option>
                  <option value="thunderstorm">Thunderstorm</option>
                  <option value="hurricane">Hurricane</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={gmWeatherDelay}
                  onChange={e => setGmWeatherDelay(Number(e.target.value))}
                  title="Turns delay (0 = instant)"
                  style={{ width: '48px', textAlign: 'center' }}
                />
                <button onClick={() => handleWeather(gmWeather, gmWeatherDelay)}>
                  {gmWeatherDelay > 0 ? `Schedule (${gmWeatherDelay}t)` : 'Set Weather'}
                </button>
              </div>
              {gameState?.pendingWeather && (
                <div className="gm-row" style={{ opacity: 0.8, fontSize: '0.85em' }}>
                  {{
                    clear: '☀️', rainy: '🌧️', foggy: '🌫️',
                    thunderstorm: '⛈️', hurricane: '🌀'
                  }[gameState.pendingWeather.condition] || '🌦️'}
                  {' '}
                  <em>
                    {gameState.pendingWeather.condition.charAt(0).toUpperCase() +
                     gameState.pendingWeather.condition.slice(1)} in {gameState.pendingWeather.turnsUntil} turn{gameState.pendingWeather.turnsUntil !== 1 ? 's' : ''}
                  </em>
                </div>
              )}

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
              </>}
            </div>
          )}

          {/* GM-only action log */}
          {isGM && (gameState.gmLog?.length > 0) && (
            <div className="sidebar-section gm-log-section">
              <h3>📋 GM Log</h3>
              <div className="gm-log-entries">
                {[...(gameState.gmLog || [])].reverse().map((entry, i) => (
                  <div key={i} className="gm-log-entry">
                    <span className="gm-log-time">
                      {new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="gm-log-action">{entry.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          </>} {/* end battle-only sidebar content */}

        </div>

        <div className="game-main">
          {needsSpawn && (
            <div className="spawn-banner">⚓ Select your spawn location — click a highlighted green cell</div>
          )}
          <div className="map-and-log">
            <ErrorBoundary>
            <GameMap
              gameState={gameState}
              onCellClick={handleMapClick}
              selectedCell={selectedCell}
              spawnZoneCoords={needsSpawn ? (gameState.spawnZoneCoords || []) : []}
              myUserId={user.id}
              isGM={isGM}
              moveHighlights={needsSpawn ? [] : (selectedAircraft ? aircraftMoveHighlights : moveHighlights)}
              attackHighlights={needsSpawn || selectedAircraft ? [] : attackHighlights}
              reconPlayers={(gameState.players || []).filter(p => p.reconActive && p.x != null && p.y != null)}
              aircraft={gameState.aircraft || []}
            />
            </ErrorBoundary>
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
