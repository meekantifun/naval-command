import React, { useRef, useEffect, useState } from 'react';
import './GameMap.css';

const CELL_SIZE = 30;
const GRID_COLOR = 'rgba(255, 255, 255, 0.2)';
const OCEAN_COLOR = '#C8E6FA';
const LAND_COLOR = '#8B7355';
const COORDINATE_COLOR = '#fff';

function GameMap({ gameState, selectedPlayer, onCellClick, actionMode, userId }) {
  const canvasRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });

  useEffect(() => {
    if (gameState) {
      const size = gameState.mapSize * CELL_SIZE + 60; // +60 for coordinates
      setCanvasSize({ width: size, height: size });
    }
  }, [gameState]);

  useEffect(() => {
    if (canvasRef.current && gameState) {
      drawMap();
    }
  }, [gameState, selectedPlayer, hoveredCell, actionMode]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const mapSize = gameState.mapSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = OCEAN_COLOR;
    ctx.fillRect(30, 30, mapSize * CELL_SIZE, mapSize * CELL_SIZE);

    // Draw grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i <= mapSize; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(30 + i * CELL_SIZE, 30);
      ctx.lineTo(30 + i * CELL_SIZE, 30 + mapSize * CELL_SIZE);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(30, 30 + i * CELL_SIZE);
      ctx.lineTo(30 + mapSize * CELL_SIZE, 30 + i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw coordinate labels
    ctx.fillStyle = COORDINATE_COLOR;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Column labels (A, B, C, ...)
    for (let x = 0; x < mapSize; x++) {
      if (x % 5 === 0 || x === mapSize - 1) {
        const label = String.fromCharCode(65 + x);
        ctx.fillText(label, 30 + x * CELL_SIZE + CELL_SIZE / 2, 15);
      }
    }

    // Row labels (1, 2, 3, ...)
    ctx.textAlign = 'right';
    for (let y = 0; y < mapSize; y++) {
      if (y % 5 === 0 || y === mapSize - 1) {
        ctx.fillText((y + 1).toString(), 25, 30 + y * CELL_SIZE + CELL_SIZE / 2);
      }
    }

    // Draw islands
    if (gameState.islands) {
      ctx.fillStyle = LAND_COLOR;
      gameState.islands.forEach(island => {
        if (island.cells) {
          island.cells.forEach(cell => {
            ctx.fillRect(
              30 + cell.x * CELL_SIZE + 1,
              30 + cell.y * CELL_SIZE + 1,
              CELL_SIZE - 2,
              CELL_SIZE - 2
            );
          });

          // Draw island name
          if (island.name && island.cells.length > 0) {
            const centerCell = island.cells[Math.floor(island.cells.length / 2)];
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              island.name,
              30 + centerCell.x * CELL_SIZE + CELL_SIZE / 2,
              30 + centerCell.y * CELL_SIZE + CELL_SIZE / 2
            );
          }
        }
      });
    }

    // Draw hovered cell highlight
    if (hoveredCell && actionMode === 'move') {
      const isLand = isPositionOnLand(hoveredCell.x, hoveredCell.y);
      ctx.fillStyle = isLand ? 'rgba(255, 0, 0, 0.2)' : 'rgba(79, 172, 254, 0.3)';
      ctx.fillRect(
        30 + hoveredCell.x * CELL_SIZE + 1,
        30 + hoveredCell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    }

    // Draw selected player's range
    if (selectedPlayer && actionMode === 'attack') {
      drawAttackRange(ctx, selectedPlayer);
    }

    // Draw enemy ships
    if (gameState.enemies) {
      gameState.enemies.forEach(enemy => {
        if (!enemy.sunk) {
          drawShip(ctx, enemy.x, enemy.y, '#ff6b6b', '⚓', enemy.name);
        }
      });
    }

    // Draw player ships
    if (gameState.players) {
      gameState.players.forEach(player => {
        if (!player.sunk) {
          const isUserShip = player.userId === userId;
          const isSelected = selectedPlayer && player.userId === selectedPlayer.userId &&
                           player.characterAlias === selectedPlayer.characterAlias;
          const color = isSelected ? '#4facfe' : (isUserShip ? '#48bb78' : '#a0aec0');
          drawShip(ctx, player.x, player.y, color, '🚢', player.characterAlias || player.shipClass, isSelected);
        }
      });
    }

    // Draw aircraft squadrons
    if (gameState.players) {
      gameState.players.forEach(player => {
        if (player.aircraftSquadrons) {
          player.aircraftSquadrons.forEach((squadron, idx) => {
            if (squadron.deployed && squadron.aircraftCount > 0) {
              drawAircraft(ctx, squadron.x, squadron.y, '#ffd700');
            }
          });
        }
      });
    }
  };

  const drawShip = (ctx, x, y, color, icon, label, isSelected = false) => {
    const centerX = 30 + x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = 30 + y * CELL_SIZE + CELL_SIZE / 2;

    // Draw selection ring
    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw ship circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CELL_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, centerX, centerY + CELL_SIZE / 3 + 3);
    }
  };

  const drawAircraft = (ctx, x, y, color) => {
    const centerX = 30 + x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = 30 + y * CELL_SIZE + CELL_SIZE / 2;

    // Draw aircraft marker
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - CELL_SIZE / 4);
    ctx.lineTo(centerX + CELL_SIZE / 5, centerY + CELL_SIZE / 4);
    ctx.lineTo(centerX - CELL_SIZE / 5, centerY + CELL_SIZE / 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawAttackRange = (ctx, player) => {
    if (!player.weapons || player.weapons.length === 0) return;

    const weapon = player.weapons[0];
    const range = weapon.range || 10;

    // Draw range circle
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(
      30 + player.x * CELL_SIZE + CELL_SIZE / 2,
      30 + player.y * CELL_SIZE + CELL_SIZE / 2,
      range * CELL_SIZE,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const isPositionOnLand = (x, y) => {
    if (!gameState.islands) return false;
    return gameState.islands.some(island =>
      island.cells && island.cells.some(cell => cell.x === x && cell.y === y)
    );
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor((clickX - 30) / CELL_SIZE);
    const gridY = Math.floor((clickY - 30) / CELL_SIZE);

    // Validate coordinates
    if (gridX >= 0 && gridX < gameState.mapSize && gridY >= 0 && gridY < gameState.mapSize) {
      onCellClick(gridX, gridY);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to grid coordinates
    const gridX = Math.floor((mouseX - 30) / CELL_SIZE);
    const gridY = Math.floor((mouseY - 30) / CELL_SIZE);

    // Validate coordinates
    if (gridX >= 0 && gridX < gameState.mapSize && gridY >= 0 && gridY < gameState.mapSize) {
      setHoveredCell({ x: gridX, y: gridY });
    } else {
      setHoveredCell(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="game-map-container">
      <div className="map-info">
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#48bb78' }}></div>
            <span>Your Ships</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6b6b' }}></div>
            <span>Enemy Ships</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffd700' }}></div>
            <span>Aircraft</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: LAND_COLOR }}></div>
            <span>Land</span>
          </div>
        </div>
        {hoveredCell && (
          <div className="map-coordinates">
            Hovering: {String.fromCharCode(65 + hoveredCell.x)}{hoveredCell.y + 1}
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        className="game-map-canvas"
      />
    </div>
  );
}

export default GameMap;
