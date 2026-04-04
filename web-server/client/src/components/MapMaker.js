import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MapMaker.css';

const GRID_SIZE = 75;
const CELL_SIZE = 10;

const TERRAIN_COLORS = {
  ocean: '#1a4a6b',
  island: '#a89060',
  reef: '#2d8b6a',
  shoal: '#5b9ea0',
};

const INFRA_TYPES = [
  'major_city', 'port_city', 'port_facility', 'military_base', 'military_outpost',
  'outpost', 'industrial', 'airfield', 'airfield_base', 'small_airfield',
  'town', 'lighthouse', 'port_gun', 'mine',
];

const INFRA_ABBREV = {
  major_city: 'CT', port_city: 'PC', port_facility: 'PF', military_base: 'MB',
  military_outpost: 'MO', outpost: 'OP', industrial: 'IN', airfield: 'AF',
  airfield_base: 'AB', small_airfield: 'SA', town: 'TN', lighthouse: 'LH',
  port_gun: 'PG', mine: 'MN',
};

const ENEMY_TYPES = ['destroyer', 'light_cruiser', 'cruiser', 'battleship', 'carrier', 'submarine'];

const OBJECTIVE_TYPES = ['destroy_all', 'capture_outpost', 'defend', 'escort_convoy', 'defeat_boss'];

function createEmptyMap() {
  return {
    id: '',
    name: 'New Map',
    description: '',
    size: { width: GRID_SIZE, height: GRID_SIZE },
    terrain: {},
    infrastructure: [],
    spawnAreas: { friendly: [], enemy: [] },
    enemies: [],
    objectives: [],
  };
}

// Grow island via random walk then smooth with cellular automata
function generateIslandBlob(centerX, centerY, targetSize) {
  const cells = new Set([`${centerX},${centerY}`]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let iters = 0;

  while (cells.size < targetSize && iters < targetSize * 30) {
    iters++;
    const arr = [...cells];
    const [sx, sy] = arr[Math.floor(Math.random() * arr.length)].split(',').map(Number);
    const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = sx + dx, ny = sy + dy;
    if (nx >= 1 && nx < GRID_SIZE - 1 && ny >= 1 && ny < GRID_SIZE - 1) {
      cells.add(`${nx},${ny}`);
    }
  }

  // 3 smoothing passes — remove isolated cells (< 2 island neighbours)
  for (let pass = 0; pass < 3; pass++) {
    const toRemove = [];
    for (const key of cells) {
      const [x, y] = key.split(',').map(Number);
      let n = 0;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          if ((dx || dy) && cells.has(`${x + dx},${y + dy}`)) n++;
      if (n < 2) toRemove.push(key);
    }
    toRemove.forEach(k => cells.delete(k));
  }

  return cells;
}

function MapMaker({ guildId }) {
  // ── View state ─────────────────────────────────────────────────────────
  const [view, setView] = useState('list');  // 'list' | 'editor'
  const [maps, setMaps] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Editor state ───────────────────────────────────────────────────────
  const [mapData, setMapData] = useState(createEmptyMap());
  const [activeTool, setActiveTool] = useState('terrain');
  const [terrainSubtype, setTerrainSubtype] = useState('island');
  const [infraType, setInfraType] = useState('military_base');
  const [infraName, setInfraName] = useState('');
  const [enemyType, setEnemyType] = useState('destroyer');
  const [enemyName, setEnemyName] = useState('');
  const [objectiveType, setObjectiveType] = useState('destroy_all');
  const [objectiveDesc, setObjectiveDesc] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [isPainting, setIsPainting] = useState(false);
  const [islandMode, setIslandMode] = useState(false);
  const [islandSize, setIslandSize] = useState('medium');
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef(null);

  // ── Load maps list ─────────────────────────────────────────────────────
  useEffect(() => {
    loadMaps();
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas draw ────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'editor') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellPx = CELL_SIZE * zoom;
    const size = GRID_SIZE * cellPx;
    canvas.width = size;
    canvas.height = size;

    // Ocean background
    ctx.fillStyle = TERRAIN_COLORS.ocean;
    ctx.fillRect(0, 0, size, size);

    // Terrain cells
    for (const [key, cell] of Object.entries(mapData.terrain)) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = TERRAIN_COLORS[cell.type] || TERRAIN_COLORS.island;
      ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellPx, 0); ctx.lineTo(i * cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cellPx); ctx.lineTo(size, i * cellPx); ctx.stroke();
    }

    const fontSize = Math.max(6, Math.floor(cellPx * 0.55));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Infrastructure (yellow squares with abbreviation)
    for (const infra of mapData.infrastructure) {
      ctx.fillStyle = '#ffdd00';
      ctx.fillRect(infra.x * cellPx + 1, infra.y * cellPx + 1, cellPx - 2, cellPx - 2);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(INFRA_ABBREV[infra.type] || '?', infra.x * cellPx + cellPx / 2, infra.y * cellPx + cellPx / 2);
    }

    // Friendly spawns (green circles with +)
    for (const spawn of mapData.spawnAreas.friendly) {
      const px = spawn.x * cellPx + cellPx / 2;
      const py = spawn.y * cellPx + cellPx / 2;
      ctx.fillStyle = 'rgba(0,200,80,0.9)';
      ctx.beginPath();
      ctx.arc(px, py, cellPx * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, fontSize)}px monospace`;
      ctx.fillText('+', px, py);
    }

    // Enemy spawns (red circles with ×)
    for (const spawn of mapData.spawnAreas.enemy) {
      const px = spawn.x * cellPx + cellPx / 2;
      const py = spawn.y * cellPx + cellPx / 2;
      ctx.fillStyle = 'rgba(220,0,0,0.9)';
      ctx.beginPath();
      ctx.arc(px, py, cellPx * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, fontSize)}px monospace`;
      ctx.fillText('x', px, py);
    }

    // Placed enemies (dark red squares with E)
    for (const enemy of mapData.enemies) {
      ctx.fillStyle = 'rgba(160,0,0,0.85)';
      ctx.fillRect(enemy.x * cellPx + 1, enemy.y * cellPx + 1, cellPx - 2, cellPx - 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText('E', enemy.x * cellPx + cellPx / 2, enemy.y * cellPx + cellPx / 2);
    }

    // Objectives (gold star)
    for (const obj of mapData.objectives) {
      if (obj.x !== undefined && obj.y !== undefined) {
        ctx.fillStyle = 'rgba(255,200,0,0.9)';
        ctx.font = `${Math.max(8, fontSize)}px sans-serif`;
        ctx.fillText('★', obj.x * cellPx + cellPx / 2, obj.y * cellPx + cellPx / 2);
      }
    }

    // Hover highlight
    if (hoveredCell) {
      ctx.fillStyle = islandMode ? 'rgba(0,255,150,0.3)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(hoveredCell.x * cellPx, hoveredCell.y * cellPx, cellPx, cellPx);
    }
  }, [view, mapData, hoveredCell, zoom, islandMode]);

  // ── Ctrl+Z undo ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && view === 'editor') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoStack, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────
  const loadMaps = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/maps', { params: { guildId }, withCredentials: true });
      setMaps(res.data.maps || []);
      setTemplates(res.data.templates || []);
    } catch (err) {
      console.error('Error loading maps:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCellFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cellPx = CELL_SIZE * zoom;
    const x = Math.floor((e.clientX - rect.left) / cellPx);
    const y = Math.floor((e.clientY - rect.top) / cellPx);
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) return { x, y };
    return null;
  };

  const pushUndo = (terrain) => {
    setUndoStack(prev => {
      const next = [...prev, { ...terrain }];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const restored = undoStack[undoStack.length - 1];
    setMapData(m => ({ ...m, terrain: restored }));
    setUndoStack(prev => prev.slice(0, -1));
  };

  const paintCell = (x, y) => {
    const key = `${x},${y}`;
    setMapData(prev => {
      const newTerrain = { ...prev.terrain };
      if (activeTool === 'terrain') {
        newTerrain[key] = { type: terrainSubtype };
      } else if (activeTool === 'erase') {
        delete newTerrain[key];
      }
      return { ...prev, terrain: newTerrain };
    });
    setIsDirty(true);
  };

  const placeAtCell = (x, y) => {
    setMapData(prev => {
      const u = { ...prev };
      if (activeTool === 'infrastructure') {
        u.infrastructure = [
          ...prev.infrastructure.filter(i => !(i.x === x && i.y === y)),
          { x, y, type: infraType, name: infraName || infraType, state: 'intact' },
        ];
      } else if (activeTool === 'spawn_friendly') {
        u.spawnAreas = {
          ...prev.spawnAreas,
          friendly: [...prev.spawnAreas.friendly.filter(s => !(s.x === x && s.y === y)), { x, y, name: 'Friendly Spawn' }],
        };
      } else if (activeTool === 'spawn_enemy') {
        u.spawnAreas = {
          ...prev.spawnAreas,
          enemy: [...prev.spawnAreas.enemy.filter(s => !(s.x === x && s.y === y)), { x, y, name: 'Enemy Spawn' }],
        };
      } else if (activeTool === 'enemy') {
        u.enemies = [
          ...prev.enemies.filter(en => !(en.x === x && en.y === y)),
          { x, y, type: enemyType, name: enemyName || enemyType },
        ];
      } else if (activeTool === 'objective') {
        u.objectives = [
          ...prev.objectives.filter(o => !(o.x === x && o.y === y)),
          { x, y, type: objectiveType, description: objectiveDesc },
        ];
      }
      return u;
    });
    setIsDirty(true);
  };

  // ── Mouse events ───────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    if (e.button === 2) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const { x, y } = cell;

    if (islandMode) {
      doGenerateIsland(x, y);
      return;
    }

    if (activeTool === 'terrain' || activeTool === 'erase') {
      pushUndo({ ...mapData.terrain });
      setIsPainting(true);
      paintCell(x, y);
    } else {
      placeAtCell(x, y);
    }
  };

  const handleMouseMove = (e) => {
    const cell = getCellFromEvent(e);
    setHoveredCell(cell);
    if (isPainting && cell && (activeTool === 'terrain' || activeTool === 'erase')) {
      paintCell(cell.x, cell.y);
    }
  };

  const handleMouseUp = () => setIsPainting(false);

  const handleRightClick = (e) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const { x, y } = cell;
    const key = `${x},${y}`;
    setMapData(prev => ({
      ...prev,
      terrain: (() => { const t = { ...prev.terrain }; delete t[key]; return t; })(),
      infrastructure: prev.infrastructure.filter(i => !(i.x === x && i.y === y)),
      spawnAreas: {
        friendly: prev.spawnAreas.friendly.filter(s => !(s.x === x && s.y === y)),
        enemy: prev.spawnAreas.enemy.filter(s => !(s.x === x && s.y === y)),
      },
      enemies: prev.enemies.filter(en => !(en.x === x && en.y === y)),
      objectives: prev.objectives.filter(o => !(o.x === x && o.y === y)),
    }));
    setIsDirty(true);
  };

  // ── Island generation ──────────────────────────────────────────────────
  const doGenerateIsland = (x, y) => {
    const sizes = { small: [5, 15], medium: [15, 40], large: [40, 80] };
    const [min, max] = sizes[islandSize];
    const target = Math.floor(Math.random() * (max - min) + min);
    const islandCells = generateIslandBlob(x, y, target);

    pushUndo({ ...mapData.terrain });
    setMapData(prev => {
      const newTerrain = { ...prev.terrain };
      for (const key of islandCells) newTerrain[key] = { type: 'island' };

      // Reef fringe (1-cell border around the island)
      for (const key of islandCells) {
        const [cx, cy] = key.split(',').map(Number);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nk = `${cx + dx},${cy + dy}`;
            const nx = cx + dx, ny = cy + dy;
            if (!islandCells.has(nk) && !newTerrain[nk] &&
                nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              newTerrain[nk] = { type: 'reef' };
            }
          }
        }
      }
      return { ...prev, terrain: newTerrain };
    });
    setIsDirty(true);
    setIslandMode(false);
  };

  // ── Save / Load ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!mapData.name.trim()) { alert('Please enter a map name.'); return; }
    setSaving(true);
    try {
      const dataToSave = {
        ...mapData,
        guildId,
        terrain: Object.entries(mapData.terrain).map(([key, val]) => {
          const [x, y] = key.split(',').map(Number);
          return { x, y, ...val };
        }),
      };
      if (!dataToSave.id) delete dataToSave.id;

      let res;
      if (mapData.id) {
        res = await axios.put(`/api/admin/maps/${mapData.id}`, dataToSave, { withCredentials: true });
      } else {
        res = await axios.post('/api/admin/maps', dataToSave, { withCredentials: true });
        if (res.data.id) setMapData(m => ({ ...m, id: res.data.id }));
      }
      setIsDirty(false);
      await loadMaps();
      alert('Map saved!');
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const openEditorForMap = (map) => {
    const terrainObj = {};
    if (Array.isArray(map.terrain)) {
      for (const cell of map.terrain) {
        terrainObj[`${cell.x},${cell.y}`] = { type: cell.type, name: cell.name };
      }
    }
    setMapData({
      ...map,
      terrain: terrainObj,
      infrastructure: map.infrastructure || [],
      spawnAreas: map.spawnAreas || { friendly: [], enemy: [] },
      enemies: map.enemies || [],
      objectives: map.objectives || [],
    });
    setUndoStack([]);
    setIsDirty(false);
    setView('editor');
  };

  const handleNewMap = () => {
    setMapData(createEmptyMap());
    setUndoStack([]);
    setIsDirty(false);
    setView('editor');
  };

  const handleEdit = (map) => openEditorForMap(map);

  const handleDuplicate = (map) => openEditorForMap({ ...map, id: '', name: `${map.name} (Copy)` });

  const handleDelete = async (map) => {
    if (!window.confirm(`Delete "${map.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/maps/${map.id}`, { withCredentials: true });
      await loadMaps();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBackToList = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    setView('list');
  };

  // ══════════════════════════════════════════════════════════════════════
  // Editor view
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'editor') {
    return (
      <div className="map-maker-editor">
        {/* Top bar */}
        <div className="editor-topbar">
          <button className="btn-back" onClick={handleBackToList}>← Maps</button>
          <input
            className="map-name-input"
            value={mapData.name}
            onChange={e => { setMapData(m => ({ ...m, name: e.target.value })); setIsDirty(true); }}
            placeholder="Map Name"
          />
          <input
            className="map-desc-input"
            value={mapData.description}
            onChange={e => { setMapData(m => ({ ...m, description: e.target.value })); setIsDirty(true); }}
            placeholder="Description (optional)"
          />
          <div className="zoom-controls">
            <label>Zoom:</label>
            {[0.5, 1, 1.5, 2].map(z => (
              <button key={z} className={zoom === z ? 'active' : ''} onClick={() => setZoom(z)}>{z}x</button>
            ))}
          </div>
          <button
            className={`btn-save${isDirty ? ' dirty' : ''}${saving ? ' loading' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : isDirty ? 'Save *' : 'Saved ✓'}
          </button>
        </div>

        {/* Body */}
        <div className="editor-body">
          {/* Toolbar */}
          <div className="editor-toolbar">
            <div className="tool-section">
              <h4>Tools</h4>
              {[
                { id: 'terrain',       label: '🖌 Terrain' },
                { id: 'infrastructure', label: '🏗 Infra' },
                { id: 'spawn_friendly', label: '⚓ F.Spawn' },
                { id: 'spawn_enemy',   label: '☠ E.Spawn' },
                { id: 'enemy',         label: '🚢 Enemy' },
                { id: 'objective',     label: '🎯 Objective' },
                { id: 'erase',         label: '🧹 Erase' },
              ].map(t => (
                <button
                  key={t.id}
                  className={`tool-btn${activeTool === t.id ? ' active' : ''}`}
                  onClick={() => { setActiveTool(t.id); setIslandMode(false); }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Terrain sub-options */}
            {activeTool === 'terrain' && (
              <div className="tool-section">
                <h4>Brush Type</h4>
                {['island', 'reef', 'shoal'].map(t => (
                  <button
                    key={t}
                    className={`sub-btn${terrainSubtype === t ? ' active' : ''}`}
                    style={{ borderLeft: `4px solid ${TERRAIN_COLORS[t]}` }}
                    onClick={() => setTerrainSubtype(t)}
                  >
                    {t}
                  </button>
                ))}
                <h4 style={{ marginTop: 10 }}>Generate Island</h4>
                <select value={islandSize} onChange={e => setIslandSize(e.target.value)} className="tool-select">
                  <option value="small">Small (5–15)</option>
                  <option value="medium">Medium (15–40)</option>
                  <option value="large">Large (40–80)</option>
                </select>
                <button
                  className={`sub-btn${islandMode ? ' active' : ''}`}
                  onClick={() => setIslandMode(m => !m)}
                >
                  {islandMode ? '📍 Click canvas…' : '🏝 Place Island'}
                </button>
              </div>
            )}

            {/* Infrastructure sub-options */}
            {activeTool === 'infrastructure' && (
              <div className="tool-section">
                <h4>Type</h4>
                <select value={infraType} onChange={e => setInfraType(e.target.value)} className="tool-select">
                  {INFRA_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <h4 style={{ marginTop: 6 }}>Name</h4>
                <input
                  className="tool-input"
                  value={infraName}
                  onChange={e => setInfraName(e.target.value)}
                  placeholder={infraType.replace(/_/g, ' ')}
                />
              </div>
            )}

            {/* Enemy sub-options */}
            {activeTool === 'enemy' && (
              <div className="tool-section">
                <h4>Ship Type</h4>
                <select value={enemyType} onChange={e => setEnemyType(e.target.value)} className="tool-select">
                  {ENEMY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <h4 style={{ marginTop: 6 }}>Name</h4>
                <input
                  className="tool-input"
                  value={enemyName}
                  onChange={e => setEnemyName(e.target.value)}
                  placeholder="Enemy name (opt.)"
                />
              </div>
            )}

            {/* Objective sub-options */}
            {activeTool === 'objective' && (
              <div className="tool-section">
                <h4>Type</h4>
                <select value={objectiveType} onChange={e => setObjectiveType(e.target.value)} className="tool-select">
                  {OBJECTIVE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <h4 style={{ marginTop: 6 }}>Description</h4>
                <input
                  className="tool-input"
                  value={objectiveDesc}
                  onChange={e => setObjectiveDesc(e.target.value)}
                  placeholder="Objective note (opt.)"
                />
              </div>
            )}

            {/* Tips */}
            <div className="tool-section tips" style={{ marginTop: 'auto' }}>
              <h4>Controls</h4>
              <p>Drag: paint terrain</p>
              <p>Right-click: delete</p>
              <p>Ctrl+Z: undo terrain</p>
            </div>

            {/* Stats */}
            <div className="tool-section stats">
              <h4>Stats</h4>
              <p>Terrain: {Object.keys(mapData.terrain).length}</p>
              <p>Infra: {mapData.infrastructure.length}</p>
              <p>Enemies: {mapData.enemies.length}</p>
              <p>Spawns: F{mapData.spawnAreas.friendly.length} / E{mapData.spawnAreas.enemy.length}</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              style={{ cursor: islandMode ? 'crosshair' : activeTool === 'erase' ? 'cell' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setHoveredCell(null); setIsPainting(false); }}
              onContextMenu={handleRightClick}
            />
            {hoveredCell && (
              <div className="coord-display">
                ({hoveredCell.x}, {hoveredCell.y})
                {mapData.terrain[`${hoveredCell.x},${hoveredCell.y}`] && (
                  <span> — {mapData.terrain[`${hoveredCell.x},${hoveredCell.y}`].type}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // List view
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="map-maker">
      <div className="map-maker-header">
        <h3>Custom Maps ({maps.length})</h3>
        <button className="btn-new-map" onClick={handleNewMap}>+ New Map</button>
      </div>

      {loading ? (
        <div className="loading">Loading maps…</div>
      ) : (
        <>
          {maps.length === 0 ? (
            <p className="no-maps">No custom maps yet. Click "+ New Map" to create one!</p>
          ) : (
            <div className="map-list-grid">
              {maps.map(map => (
                <div key={map.id} className="map-card">
                  <div className="map-card-icon">🗺️</div>
                  <div className="map-card-info">
                    <h4>{map.name || map.id}</h4>
                    <p>{map.description || 'No description'}</p>
                    <p className="map-meta">
                      {Array.isArray(map.terrain) ? map.terrain.length : 0} terrain cells ·{' '}
                      {(map.infrastructure || []).length} infra ·{' '}
                      {(map.enemies || []).length} enemies
                    </p>
                  </div>
                  <div className="map-card-actions">
                    <button onClick={() => handleEdit(map)}>Edit</button>
                    <button onClick={() => handleDuplicate(map)}>Copy</button>
                    <button className="btn-danger" onClick={() => handleDelete(map)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {templates.length > 0 && (
            <div className="template-section">
              <h4>Templates</h4>
              <div className="map-list-grid">
                {templates.map(t => (
                  <div key={t.id} className="map-card template">
                    <div className="map-card-icon">📋</div>
                    <div className="map-card-info">
                      <h4>{t.name}</h4>
                      <p>{t.description}</p>
                    </div>
                    <div className="map-card-actions">
                      <button onClick={() => handleDuplicate(t)}>Use as Base</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MapMaker;
