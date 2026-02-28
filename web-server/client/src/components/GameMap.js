import React, { useRef, useEffect, useState } from 'react';
import './GameMap.css';

const CELL_SIZE = 30;
const GRID_COLOR = 'rgba(255, 255, 255, 0.2)';
const OCEAN_COLOR = '#C8E6FA';
const LAND_COLOR = '#8B7355';
const COORDINATE_COLOR = '#fff';

// Bot-generated map constants (must match bot.js map generation)
const GEN_CELL_SIZE = 40;
const GEN_GRID_START = 60;  // leftMargin / topMargin in bot

function GameMap({ gameState, selectedPlayer, onCellClick, actionMode, userId, mapImageUrl, selectedCell }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const wrapperRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 800, height: 800 });
  const [naturalSize, setNaturalSize] = useState({ width: 800, height: 800 });

  // When image loads, calculate natural size and scale to fit container
  const handleImageLoad = () => {
    const img = imageRef.current;
    const wrapper = wrapperRef.current;
    if (!img || !wrapper) return;

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    setNaturalSize({ width: naturalW, height: naturalH });

    // Scale to fit the container width (max 900px)
    const maxW = Math.min(wrapper.parentElement?.clientWidth || 900, 900);
    const scale = Math.min(1, maxW / naturalW);
    setDisplaySize({ width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) });
    setMapImageLoaded(true);
  };

  // Get drawing config for current mode
  const getMapConfig = () => {
    if (mapImageUrl && mapImageLoaded) {
      const scale = displaySize.width / naturalSize.width;
      return {
        cellSize: GEN_CELL_SIZE * scale,
        gridStart: GEN_GRID_START * scale,
        scale
      };
    }
    return { cellSize: CELL_SIZE, gridStart: 30, scale: 1 };
  };

  useEffect(() => {
    if (canvasRef.current && gameState) {
      drawMap();
    }
  }, [gameState, selectedPlayer, hoveredCell, actionMode, mapImageLoaded, selectedCell, displaySize]);

  const getCellOccupants = (x, y) => {
    const players = (gameState.players || []).filter(p => !p.sunk && p.x === x && p.y === y);
    const enemies = (gameState.enemies || []).filter(e => !e.sunk && e.x === x && e.y === y);
    return { players, enemies };
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const mapSize = gameState.mapSize;
    const { cellSize, gridStart } = getMapConfig();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapImageUrl && mapImageLoaded) {
      // Draw semi-transparent grid overlay so users can see the cell boundaries
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= mapSize; i++) {
        ctx.beginPath();
        ctx.moveTo(gridStart + i * cellSize, gridStart);
        ctx.lineTo(gridStart + i * cellSize, gridStart + mapSize * cellSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gridStart, gridStart + i * cellSize);
        ctx.lineTo(gridStart + mapSize * cellSize, gridStart + i * cellSize);
        ctx.stroke();
      }
    } else {
      // Full canvas map (no image)
      ctx.fillStyle = OCEAN_COLOR;
      ctx.fillRect(30, 30, mapSize * CELL_SIZE, mapSize * CELL_SIZE);

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let i = 0; i <= mapSize; i++) {
        ctx.beginPath(); ctx.moveTo(30 + i * CELL_SIZE, 30); ctx.lineTo(30 + i * CELL_SIZE, 30 + mapSize * CELL_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 30 + i * CELL_SIZE); ctx.lineTo(30 + mapSize * CELL_SIZE, 30 + i * CELL_SIZE); ctx.stroke();
      }

      ctx.fillStyle = COORDINATE_COLOR;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let x = 0; x < mapSize; x++) {
        if (x % 5 === 0 || x === mapSize - 1)
          ctx.fillText(String.fromCharCode(65 + x), 30 + x * CELL_SIZE + CELL_SIZE / 2, 15);
      }
      ctx.textAlign = 'right';
      for (let y = 0; y < mapSize; y++) {
        if (y % 5 === 0 || y === mapSize - 1)
          ctx.fillText((y + 1).toString(), 25, 30 + y * CELL_SIZE + CELL_SIZE / 2);
      }

      if (gameState.islands) {
        ctx.fillStyle = LAND_COLOR;
        gameState.islands.forEach(island => {
          if (island.cells) {
            island.cells.forEach(cell => {
              ctx.fillRect(30 + cell.x * CELL_SIZE + 1, 30 + cell.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            });
            if (island.name && island.cells.length > 0) {
              const c = island.cells[Math.floor(island.cells.length / 2)];
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(island.name, 30 + c.x * CELL_SIZE + CELL_SIZE / 2, 30 + c.y * CELL_SIZE + CELL_SIZE / 2);
            }
          }
        });
      }
    }

    // Hover highlight
    if (hoveredCell) {
      const isLand = isPositionOnLand(hoveredCell.x, hoveredCell.y);
      const { players, enemies } = getCellOccupants(hoveredCell.x, hoveredCell.y);
      let color = isLand ? 'rgba(255,255,255,0.15)' : 'rgba(79,172,254,0.35)';
      if (enemies.length > 0) color = 'rgba(255,107,107,0.4)';
      else if (players.length > 0) color = 'rgba(72,187,120,0.4)';
      ctx.fillStyle = color;
      ctx.fillRect(gridStart + hoveredCell.x * cellSize, gridStart + hoveredCell.y * cellSize, cellSize, cellSize);
    }

    // Selected cell highlight
    if (selectedCell) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(gridStart + selectedCell.x * cellSize + 1, gridStart + selectedCell.y * cellSize + 1, cellSize - 2, cellSize - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(gridStart + selectedCell.x * cellSize + 1, gridStart + selectedCell.y * cellSize + 1, cellSize - 2, cellSize - 2);
    }

    // Move destination preview
    if (hoveredCell && actionMode === 'move' && selectedPlayer) {
      const isLand = isPositionOnLand(hoveredCell.x, hoveredCell.y);
      ctx.fillStyle = isLand ? 'rgba(255,0,0,0.25)' : 'rgba(79,172,254,0.4)';
      ctx.fillRect(gridStart + hoveredCell.x * cellSize + 1, gridStart + hoveredCell.y * cellSize + 1, cellSize - 2, cellSize - 2);
    }

    // Attack range circle
    if (selectedPlayer && actionMode === 'attack') {
      drawAttackRange(ctx, selectedPlayer, cellSize, gridStart);
    }

    // Draw enemies
    if (gameState.enemies) {
      gameState.enemies.forEach(e => {
        if (!e.sunk && e.x != null) drawShip(ctx, e.x, e.y, '#ff6b6b', e.name, false, cellSize, gridStart);
      });
    }

    // Draw players
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (!p.sunk && p.x != null) {
          const isUser = p.userId === userId;
          const isSel = selectedPlayer && p.userId === selectedPlayer.userId && p.characterAlias === selectedPlayer.characterAlias;
          const color = isSel ? '#4facfe' : (isUser ? '#48bb78' : '#a0aec0');
          drawShip(ctx, p.x, p.y, color, p.characterAlias || p.shipClass, isSel, cellSize, gridStart);
        }
      });
    }

    // Draw aircraft
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (p.aircraftSquadrons) {
          p.aircraftSquadrons.forEach(sq => {
            if (sq.deployed && sq.aircraftCount > 0) drawAircraft(ctx, sq.x, sq.y, '#ffd700', cellSize, gridStart);
          });
        }
      });
    }
  };

  const drawShip = (ctx, x, y, color, label, isSelected, cellSize, gridStart) => {
    const cx = gridStart + x * cellSize + cellSize / 2;
    const cy = gridStart + y * cellSize + cellSize / 2;
    const r = cellSize / 3;

    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (label && cellSize > 15) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, Math.round(cellSize * 0.22))}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label.substring(0, 8), cx, cy + r + 2);
    }
  };

  const drawAircraft = (ctx, x, y, color, cellSize, gridStart) => {
    const cx = gridStart + x * cellSize + cellSize / 2;
    const cy = gridStart + y * cellSize + cellSize / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - cellSize / 4);
    ctx.lineTo(cx + cellSize / 5, cy + cellSize / 4);
    ctx.lineTo(cx - cellSize / 5, cy + cellSize / 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawAttackRange = (ctx, player, cellSize, gridStart) => {
    if (!player.weapons || player.weapons.length === 0) return;
    const range = player.weapons[0].range || 10;
    ctx.strokeStyle = 'rgba(255,107,107,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(
      gridStart + player.x * cellSize + cellSize / 2,
      gridStart + player.y * cellSize + cellSize / 2,
      range * cellSize, 0, Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const isPositionOnLand = (x, y) => {
    if (!gameState.islands) return false;
    return gameState.islands.some(island =>
      island.cells && island.cells.some(c => c.x === x && c.y === y)
    );
  };

  const toGridCoords = (canvasX, canvasY) => {
    const { cellSize, gridStart } = getMapConfig();
    const x = Math.floor((canvasX - gridStart) / cellSize);
    const y = Math.floor((canvasY - gridStart) / cellSize);
    return { x, y };
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS display pixels to canvas drawing pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const { x, y } = toGridCoords(canvasX, canvasY);
    if (x >= 0 && x < gameState.mapSize && y >= 0 && y < gameState.mapSize) {
      onCellClick(x, y);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const { x, y } = toGridCoords(canvasX, canvasY);
    if (x >= 0 && x < gameState.mapSize && y >= 0 && y < gameState.mapSize) {
      setHoveredCell({ x, y });
    } else {
      setHoveredCell(null);
    }
  };

  const canvasW = mapImageUrl && mapImageLoaded ? displaySize.width : (gameState ? gameState.mapSize * CELL_SIZE + 60 : 800);
  const canvasH = mapImageUrl && mapImageLoaded ? displaySize.height : (gameState ? gameState.mapSize * CELL_SIZE + 60 : 800);

  return (
    <div className="game-map-container">
      <div className="map-info">
        <div className="map-legend">
          <div className="legend-item"><div className="legend-color" style={{ background: '#48bb78' }}></div><span>You</span></div>
          <div className="legend-item"><div className="legend-color" style={{ background: '#a0aec0' }}></div><span>Allies</span></div>
          <div className="legend-item"><div className="legend-color" style={{ background: '#ff6b6b' }}></div><span>Enemies</span></div>
          <div className="legend-item"><div className="legend-color" style={{ background: '#ffd700' }}></div><span>Aircraft</span></div>
        </div>
        <div className="map-coordinates">
          {hoveredCell
            ? <>Hovering: <strong>{String.fromCharCode(65 + hoveredCell.x)}{hoveredCell.y + 1}</strong> — Click to inspect</>
            : 'Click any cell to inspect'}
        </div>
      </div>

      <div ref={wrapperRef} className="map-canvas-wrapper" style={{ position: 'relative', width: canvasW, height: canvasH }}>
        {mapImageUrl && (
          <img
            ref={imageRef}
            src={mapImageUrl}
            alt="Game Map"
            className="map-background-image"
            onLoad={handleImageLoad}
            style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 1 }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
          className="game-map-canvas"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
}

export default GameMap;
