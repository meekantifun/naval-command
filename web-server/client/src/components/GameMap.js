import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './GameMap.css';

const CELL = 16;   // px per grid cell
const MARGIN = 40; // px for coordinate labels (left + top)

// Cell spans (centered on item.x, item.y)
const INFRA_SPAN = {
  major_city:     { w: 3, h: 3 },
  port_facility:  { w: 3, h: 3 },
  military_base:  { w: 2, h: 2 },
  industrial:     { w: 2, h: 2 },
  airfield:       { w: 3, h: 2 },
  airfield_base:  { w: 3, h: 2 },
  small_airfield: { w: 2, h: 1 },
  town:           { w: 2, h: 2 },
};

function getInfraSpan(type) {
  return INFRA_SPAN[type] || { w: 1, h: 1 };
}

const TERRAIN_COLORS = {
  island:    { fill: '#166534', stroke: '#14532d' },
  reef:      { fill: '#0891b2', stroke: '#0e7490' },
  spawn:     { fill: '#10b981', stroke: '#059669' },
  city:      { fill: '#166534', stroke: '#14532d' },
  town:      { fill: '#166534', stroke: '#14532d' },
  minefield: { fill: '#166534', stroke: '#14532d' },
};

function colLabel(x) {
  if (x < 26) return String.fromCharCode(65 + x);
  const a = x - 26;
  return String.fromCharCode(65 + Math.floor(a / 26)) + String.fromCharCode(65 + (a % 26));
}

// ── Visual effect helpers ──────────────────────────────────────────────────

function drawNameLabel(ctx, name, px, py, pw, ph, state) {
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(name).width;
  const lx = px + pw / 2;
  const ly = py + ph + 1;
  const bgColor  = state === 'destroyed' ? 'rgba(69,10,10,0.88)'
                 : state === 'abandoned'  ? 'rgba(0,0,0,0.75)'
                 : 'rgba(0,0,0,0.82)';
  const txtColor = state === 'destroyed' ? '#fca5a5'
                 : state === 'abandoned'  ? '#6b7280'
                 : '#fff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(lx - tw / 2 - 2, ly, tw + 4, 9);
  ctx.fillStyle = txtColor;
  ctx.fillText(name, lx, ly + 1);
}

function drawFirePlume(ctx, fx, fy, size) {
  ctx.fillStyle = 'rgba(234,88,12,0.30)';
  ctx.beginPath(); ctx.arc(fx, fy, size * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(fx - size * 0.5, fy + size * 0.6);
  ctx.bezierCurveTo(fx - size * 0.55, fy - size * 0.3, fx - size * 0.1, fy - size * 1.3, fx, fy - size * 1.7);
  ctx.bezierCurveTo(fx + size * 0.1, fy - size * 1.3, fx + size * 0.55, fy - size * 0.3, fx + size * 0.5, fy + size * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(fx - size * 0.25, fy + size * 0.4);
  ctx.bezierCurveTo(fx - size * 0.28, fy - size * 0.5, fx - size * 0.05, fy - size, fx, fy - size * 1.25);
  ctx.bezierCurveTo(fx + size * 0.05, fy - size, fx + size * 0.28, fy - size * 0.5, fx + size * 0.25, fy + size * 0.4);
  ctx.closePath(); ctx.fill();
}

function drawSmokePuff(ctx, fx, fy, radius) {
  ctx.fillStyle = 'rgba(51,65,85,0.60)';
  ctx.beginPath(); ctx.arc(fx, fy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(71,85,105,0.40)';
  ctx.beginPath(); ctx.arc(fx - radius * 0.5, fy - radius * 0.7, radius * 0.75, 0, Math.PI * 2); ctx.fill();
}

function drawVegPatch(ctx, fx, fy, size) {
  ctx.fillStyle = 'rgba(20,83,45,0.75)';
  ctx.beginPath(); ctx.arc(fx, fy, size, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(22,101,52,0.55)';
  ctx.beginPath(); ctx.arc(fx - size * 0.55, fy + size * 0.4, size * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx + size * 0.5, fy - size * 0.35, size * 0.65, 0, Math.PI * 2); ctx.fill();
}

// ── Destroyed variants ─────────────────────────────────────────────────────

function drawDestroyedIcon(ctx, px, py, pw, ph, type, name) {
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  ctx.fillStyle = '#0f0a0a';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

  switch (type) {
    case 'major_city': {
      // Broken building silhouettes
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px + 3,  py + 20, 8,  ph - 24);
      ctx.fillRect(px + 35, py + 16, 9,  ph - 20);
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 16, py + 8,  16, ph - 12);
      // Jagged broken tops
      ctx.fillStyle = '#0f0a0a';
      ctx.fillRect(px + 3,  py + 14, 3, 7);
      ctx.fillRect(px + 7,  py + 16, 3, 5);
      ctx.fillRect(px + 35, py + 10, 3, 8);
      ctx.fillRect(px + 40, py + 12, 4, 6);
      ctx.fillRect(px + 16, py + 4,  5, 5);
      ctx.fillRect(px + 27, py + 5,  5, 5);
      // Burn scar on center tower
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(px + 18, py + 14, 8, 5);
      // Ground rubble
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px, py + ph - 4, pw, 4);
      for (let i = 0; i < 6; i++) ctx.fillRect(px + 3 + i * 7, py + ph - 5, 4, 3);
      // Fire + smoke
      drawFirePlume(ctx, px + 12, py + 18, 4);
      drawFirePlume(ctx, px + 28, py + 10, 5);
      drawFirePlume(ctx, px + 39, py + 16, 3);
      drawSmokePuff(ctx, px + 14, py + 9,  7);
      drawSmokePuff(ctx, cx,      py + 5,  8);
      drawSmokePuff(ctx, px + 38, py + 8,  6);
      break;
    }
    case 'port_facility': {
      // Collapsed warehouse
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px + 3, py + 18, 12, ph - 22);
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 18); ctx.lineTo(px + 15, py + 22);
      ctx.lineTo(px + 15, py + 26); ctx.lineTo(px + 3, py + 18);
      ctx.fill();
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 30, py + 22, 12, ph - 26);
      // Broken crane (tilted)
      ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 36, py + ph - 14);
      ctx.lineTo(px + 33, py + 10);
      ctx.lineTo(px + 17, py + 16);
      ctx.stroke();
      ctx.lineWidth = 0.75; ctx.strokeStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(px + 24, py + 13); ctx.lineTo(px + 22, py + ph - 16);
      ctx.stroke();
      // Oil-dark water
      ctx.fillStyle = '#030712';
      ctx.fillRect(px, py + ph - 12, pw, 12);
      ctx.fillStyle = '#0a0a24';
      ctx.fillRect(px + 2, py + ph - 9, pw - 4, 6);
      // Debris
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 4,  py + ph - 10, 6, 3);
      ctx.fillRect(px + 22, py + ph - 11, 8, 4);
      // Fire + smoke
      drawFirePlume(ctx, px + 9,  py + 14, 4);
      drawFirePlume(ctx, px + 32, py + 18, 4);
      drawSmokePuff(ctx, px + 12, py + 7,  6);
      drawSmokePuff(ctx, px + 34, py + 10, 6);
      break;
    }
    case 'military_base': {
      ctx.fillStyle = '#1a1a0a';
      ctx.fillRect(px, py, pw, ph);
      // Broken wall fragments
      ctx.strokeStyle = '#2d4a0e'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 2); ctx.lineTo(px + 2, py + ph * 0.55); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + pw - 2, py + 2); ctx.lineTo(px + pw - 2, py + ph * 0.38); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + 2, py + ph - 2); ctx.lineTo(px + pw * 0.42, py + ph - 2); ctx.stroke();
      // Crater
      ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      // Rubble chunks
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 4,  py + 3,  4, 3);
      ctx.fillRect(px + 20, py + 5,  3, 4);
      ctx.fillRect(px + 7,  py + 22, 4, 3);
      ctx.fillRect(px + 19, py + 20, 3, 4);
      drawFirePlume(ctx, cx + 5, cy - 5, 3);
      drawSmokePuff(ctx, cx, cy - 9, 5);
      break;
    }
    case 'military_outpost':
    case 'outpost': {
      ctx.fillStyle = '#1a1a0a';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 2, py + 8, 5, 4);
      ctx.fillRect(px + 8, py + 7, 4, 5);
      drawFirePlume(ctx, cx, cy - 2, 2.5);
      break;
    }
    case 'industrial': {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px + 2, py + 18, pw - 4, ph - 20);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + 2, py + 15, pw - 4, 5);
      // Broken top
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(px + 8,  py + 13, 5, 4);
      ctx.fillRect(px + 17, py + 14, 6, 3);
      // One chimney standing (damaged)
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + 4, py + 4, 4, 13);
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(px + 4, py + 2, 2, 4);
      // Chimney rubble
      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 10, py + 14, 5, 2);
      ctx.fillRect(px + 20, py + 15, 4, 2);
      drawFirePlume(ctx, px + 6,  py + 3,  4);
      drawFirePlume(ctx, px + 22, py + 16, 3);
      drawSmokePuff(ctx, px + 8,  py + 2,  6);
      drawSmokePuff(ctx, cx,      py + 4,  7);
      break;
    }
    case 'airfield':
    case 'airfield_base': {
      ctx.fillStyle = '#1a1a0a';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(px + 1, py + 1, pw * 0.22, ph - 2);
      ctx.fillRect(px + pw * 0.78, py + 1, pw * 0.21, ph - 2);
      // Damaged runway
      ctx.fillStyle = '#292524';
      const rwX = px + pw * 0.25; const rwW = pw * 0.5;
      ctx.fillRect(rwX, py + 2, rwW, ph - 4);
      // Craters on runway
      for (const [cx2, cy2] of [[rwX + rwW * 0.25, cy - 2], [rwX + rwW * 0.72, cy + 3]]) {
        ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx2, cy2, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, Math.PI * 2); ctx.fill();
      }
      // Burning wreckage silhouette
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 6, py + ph - 8, 8, 3);
      ctx.fillRect(px + 7, py + ph - 10, 10, 2);
      drawFirePlume(ctx, px + 10, py + ph - 10, 3);
      drawSmokePuff(ctx, px + 12, py + ph - 14, 4);
      break;
    }
    case 'small_airfield': {
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'town': {
      ctx.fillStyle = '#0f0a0a';
      ctx.fillRect(px, py, pw, ph);
      // Charred house frame (no roof)
      ctx.strokeStyle = '#292524'; ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 3, py + 11, 14, 13);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 5, py + 14, 10, 7);
      ctx.fillRect(px + 4, py + 22, 13, 2);
      // Chimney stub
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 10, py + 7, 2, 5);
      // Secondary house collapsed
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px + 20, py + 8, 9, 5);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 19, py + 11, 11, 3);
      // Rubble
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 14, py + 20, 4, 3);
      ctx.fillRect(px + 22, py + 16, 5, 2);
      drawFirePlume(ctx, px + 24, py + 14, 3);
      drawFirePlume(ctx, px + 8,  py + 10, 2.5);
      drawSmokePuff(ctx, px + 10, py + 5,  5);
      drawSmokePuff(ctx, px + 26, py + 8,  4);
      break;
    }
    case 'lighthouse': {
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 4, py + ph - 4, 8, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 3, py + 7, 6, ph - 11);
      // Broken top
      ctx.fillStyle = '#0f0a0a';
      ctx.fillRect(cx - 3, py + 5, 3, 3);
      ctx.fillRect(cx,     py + 4, 3, 4);
      drawFirePlume(ctx, cx, py + 5, 2.5);
      break;
    }
    case 'port_gun': {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 3, py + 8, 10, 5);
      ctx.strokeStyle = '#292524'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + 2); ctx.lineTo(px + 2, py + ph - 2);
      ctx.stroke();
      drawSmokePuff(ctx, cx + 2, cy - 2, 3);
      break;
    }
    default: {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px + 2, py + ph - 6, pw - 4, 4);
      drawFirePlume(ctx, cx, cy, Math.min(pw, ph) / 4);
      break;
    }
  }

  if (name) drawNameLabel(ctx, name, px, py, pw, ph, 'destroyed');
}

// ── Abandoned variants ─────────────────────────────────────────────────────

function drawAbandonedIcon(ctx, px, py, pw, ph, type, name) {
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  ctx.fillStyle = '#0d1a0d';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#1a3a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

  switch (type) {
    case 'major_city': {
      // Crumbled, nature reclaimed
      ctx.fillStyle = '#1c2a1c';
      ctx.fillRect(px + 3,  py + 28, 8,  ph - 32);
      ctx.fillRect(px + 35, py + 24, 8,  ph - 28);
      ctx.fillStyle = '#182818';
      ctx.fillRect(px + 14, py + 20, 16, ph - 24);
      // Rounded (collapsed) tops
      ctx.fillStyle = '#1c2a1c';
      ctx.beginPath(); ctx.arc(px + 7,  py + 28, 4, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 22, py + 20, 8, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 39, py + 24, 4, Math.PI, 0); ctx.fill();
      // Cracks
      ctx.strokeStyle = '#0d1a0d'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px + 19, py + 22); ctx.lineTo(px + 23, py + 32);
      ctx.moveTo(px + 36, py + 26); ctx.lineTo(px + 40, py + 34);
      ctx.stroke();
      // Ground / dirt
      ctx.fillStyle = '#1a2e1a';
      ctx.fillRect(px, py + ph - 4, pw, 4);
      // Vegetation everywhere
      drawVegPatch(ctx, px + 9,  py + 28, 4);
      drawVegPatch(ctx, px + 30, py + 26, 3);
      drawVegPatch(ctx, cx,      py + ph - 6, 5);
      drawVegPatch(ctx, px + 5,  py + ph - 5, 3);
      drawVegPatch(ctx, px + 42, py + ph - 4, 3);
      break;
    }
    case 'port_facility': {
      ctx.fillStyle = '#0d1a2e';
      ctx.fillRect(px, py, pw, ph);
      // Stagnant dark water
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(px, py + ph - 12, pw, 12);
      // Rotted dock
      ctx.fillStyle = '#1c1a14';
      ctx.fillRect(cx - 14, py + ph - 14, 28, 3);
      ctx.fillRect(cx - 2,  py + ph - 22, 4, 9);
      // Algae on dock
      ctx.fillStyle = 'rgba(20,83,45,0.55)';
      ctx.fillRect(cx - 12, py + ph - 14, 20, 2);
      // Collapsed warehouses (lower profile)
      ctx.fillStyle = '#0d1a2e';
      ctx.fillRect(px + 3, py + 16, 12, ph - 28);
      ctx.fillStyle = '#111f2e';
      ctx.beginPath(); ctx.arc(px + 9, py + 16, 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#0d1a2e';
      ctx.fillRect(px + 32, py + 20, 12, ph - 32);
      ctx.fillStyle = '#111f2e';
      ctx.beginPath(); ctx.arc(px + 38, py + 20, 6, Math.PI, 0); ctx.fill();
      // Vegetation
      drawVegPatch(ctx, px + 6,  py + 22, 4);
      drawVegPatch(ctx, px + 38, py + 26, 3);
      drawVegPatch(ctx, cx,      py + ph - 16, 3);
      break;
    }
    case 'military_base': {
      ctx.fillStyle = '#0a140a';
      ctx.fillRect(px, py, pw, ph);
      // Crumbled wall outline (dashed = cracked)
      ctx.strokeStyle = '#1a3a0a'; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
      ctx.setLineDash([]);
      // Collapsed corner stubs
      ctx.fillStyle = '#1c2a0e';
      ctx.fillRect(px,      py,      5, 5);
      ctx.fillRect(px+pw-5, py,      5, 5);
      ctx.fillRect(px,      py+ph-5, 5, 5);
      ctx.fillRect(px+pw-5, py+ph-5, 5, 5);
      // Faded cross (barely visible)
      ctx.strokeStyle = '#1a4a0a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, py + 6); ctx.lineTo(cx, py + ph - 6);
      ctx.moveTo(px + 6, cy); ctx.lineTo(px + pw - 6, cy);
      ctx.stroke();
      // Vegetation (nature takes over)
      drawVegPatch(ctx, cx,     cy,     6);
      drawVegPatch(ctx, cx - 6, cy + 5, 3);
      drawVegPatch(ctx, cx + 7, cy - 4, 3);
      break;
    }
    case 'military_outpost':
    case 'outpost': {
      ctx.fillStyle = '#0a140a';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.strokeStyle = '#1a4a0a'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, py + 3); ctx.lineTo(cx, py + ph - 3);
      ctx.moveTo(px + 3, cy); ctx.lineTo(px + pw - 3, cy);
      ctx.stroke();
      drawVegPatch(ctx, cx, cy, pw / 3.5);
      break;
    }
    case 'industrial': {
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px + 2, py + 18, pw - 4, ph - 20);
      // Collapsed roof
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(px + 2, py + 15, pw - 4, 5);
      ctx.fillRect(px + 8,  py + 13, 5, 4);
      ctx.fillRect(px + 17, py + 14, 6, 3);
      // Lone chimney, overgrown
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + 4, py + 6, 4, 12);
      drawVegPatch(ctx, px + 6,  py + 5,  3);
      drawVegPatch(ctx, px + 14, py + 18, 4);
      drawVegPatch(ctx, px + 24, py + 16, 4);
      drawVegPatch(ctx, px + 10, py + ph - 6, 3);
      break;
    }
    case 'airfield':
    case 'airfield_base': {
      ctx.fillStyle = '#0d1a0d';
      ctx.fillRect(px, py, pw, ph);
      // Fully grassed over
      ctx.fillStyle = '#14532d';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      // Barely visible runway ghost
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px + pw * 0.28, py + 3, pw * 0.44, ph - 6);
      // Vegetation breaking through
      ctx.fillStyle = '#14532d';
      ctx.fillRect(px + pw * 0.31, py + 5, 3, ph - 10);
      ctx.fillRect(px + pw * 0.58, py + 3, 3, ph - 6);
      drawVegPatch(ctx, px + 8,     py + 6,     4);
      drawVegPatch(ctx, px + pw-10, py + ph-8,  4);
      drawVegPatch(ctx, cx,         cy - 4,     3);
      break;
    }
    case 'small_airfield': {
      ctx.fillStyle = '#0d1a0d';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + pw * 0.25, py + 2, pw * 0.5, ph - 4);
      drawVegPatch(ctx, cx - 4, cy, 3);
      drawVegPatch(ctx, cx + 5, cy - 2, 2.5);
      break;
    }
    case 'town': {
      ctx.fillStyle = '#0d1a0d';
      ctx.fillRect(px, py, pw, ph);
      // Crumbled house outline
      ctx.strokeStyle = '#292524'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 11, 14, 13);
      // Collapsed interior
      ctx.fillStyle = '#1c2a1c';
      ctx.fillRect(px + 4, py + 16, 12, 8);
      // Chimney overgrown
      ctx.fillStyle = '#292524';
      ctx.fillRect(px + 10, py + 7, 2, 5);
      drawVegPatch(ctx, px + 11, py + 6, 2.5);
      // Second house mostly gone
      ctx.fillStyle = '#1c2a1c';
      ctx.fillRect(px + 20, py + 8, 8, 5);
      drawVegPatch(ctx, px + 23, py + 10, 3);
      // Nature reclaims
      drawVegPatch(ctx, px + 9,  py + 20, 4);
      drawVegPatch(ctx, px + 24, py + 22, 5);
      drawVegPatch(ctx, px + 4,  py + ph - 5, 4);
      drawVegPatch(ctx, px + 16, py + ph - 6, 3);
      break;
    }
    case 'lighthouse': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px + 4, py + ph - 4, 8, 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 3, py + 4, 6, ph - 8);
      // Vines on tower
      ctx.fillStyle = '#166534';
      ctx.fillRect(cx - 3, py + 10, 6, 3);
      ctx.fillRect(cx - 3, py + 18, 6, 2);
      drawVegPatch(ctx, cx - 1, py + 4, 2.5);
      // Dark beacon (extinguished)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(cx, py + 3, 3.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'port_gun': {
      ctx.fillStyle = '#1c2a1c';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#2a3a1a';
      ctx.beginPath(); ctx.arc(cx, cy + 2, pw / 2 - 2, 0, Math.PI * 2); ctx.fill();
      // Barrel, rusted/pointing down
      ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px + pw - 2, py + ph - 2);
      ctx.stroke();
      drawVegPatch(ctx, cx - 3, cy + 2, 3);
      break;
    }
    default: {
      ctx.fillStyle = '#1c2a1c';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      drawVegPatch(ctx, cx, cy, pw / 3.5);
      break;
    }
  }

  if (name) drawNameLabel(ctx, name, px, py, pw, ph, 'abandoned');
}

// ── Intact infrastructure icons ────────────────────────────────────────────

function drawInfraIcon(ctx, px, py, pw, ph, type, name, state, mineImg) {
  if (state === 'destroyed') { drawDestroyedIcon(ctx, px, py, pw, ph, type, name); return; }
  if (state === 'abandoned')  { drawAbandonedIcon(ctx, px, py, pw, ph, type, name); return; }

  const cx = px + pw / 2;
  const cy = py + ph / 2;

  switch (type) {
    case 'major_city': {
      ctx.fillStyle = '#0c1a2e';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      // Street
      ctx.fillStyle = '#374151';
      ctx.fillRect(px, py + ph - 4, pw, 4);
      // Back buildings
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(px + 2,  py + 26, 5,  ph - 30);
      ctx.fillRect(px + 41, py + 24, 5,  ph - 28);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(px + 3,  py + 18, 9,  ph - 22);
      ctx.fillRect(px + 36, py + 14, 9,  ph - 18);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(px + 8,  py + 10, 8,  ph - 14);
      ctx.fillRect(px + 32, py + 12, 8,  ph - 16);
      // Center skyscraper
      ctx.fillStyle = '#92400e';
      ctx.fillRect(px + 16, py + 3, 16, ph - 7);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px + 17, py + 4, 14, ph - 8);
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(px + 22, py + 2, 4, 3);
      // Windows — center tower (amber)
      ctx.fillStyle = '#fef3c7';
      for (let row = 0; row < 9; row++) {
        ctx.fillRect(px + 19, py + 6 + row * 4, 2, 2);
        ctx.fillRect(px + 25, py + 6 + row * 4, 2, 2);
        if (row > 0) ctx.fillRect(px + 22, py + 6 + row * 4, 2, 2);
      }
      // Windows — side buildings (blue)
      ctx.fillStyle = '#bfdbfe';
      for (let row = 0; row < 5; row++) {
        ctx.fillRect(px + 9,  py + 12 + row * 4, 2, 2);
        ctx.fillRect(px + 13, py + 12 + row * 4, 2, 2);
        ctx.fillRect(px + 33, py + 14 + row * 4, 2, 2);
        ctx.fillRect(px + 37, py + 14 + row * 4, 2, 2);
      }
      if (name) drawNameLabel(ctx, name, px, py, pw, ph, null);
      break;
    }

    case 'port_facility': {
      ctx.fillStyle = '#0c1a3e';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      // Water strip
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(px, py + ph - 11, pw, 11);
      // Ripples
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 2, py + ph - 9 + i * 4);
        ctx.bezierCurveTo(px + pw*0.3, py + ph - 11 + i*4, px + pw*0.7, py + ph - 7 + i*4, px + pw - 2, py + ph - 9 + i*4);
        ctx.stroke();
      }
      // Dock
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(cx - 14, py + ph - 13, 28, 3);
      ctx.fillRect(cx - 3,  py + ph - 20, 6, 9);
      // Warehouses
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(px + 3,  py + 10, 14, ph - 21);
      ctx.fillRect(px + 31, py + 14, 14, ph - 25);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(px + 3,  py + 10, 14, 3);
      ctx.fillRect(px + 31, py + 14, 14, 3);
      // Windows
      ctx.fillStyle = '#93c5fd';
      for (let row = 0; row < 4; row++) {
        ctx.fillRect(px + 5,  py + 15 + row * 5, 3, 3);
        ctx.fillRect(px + 11, py + 15 + row * 5, 3, 3);
        ctx.fillRect(px + 33, py + 18 + row * 5, 3, 3);
        ctx.fillRect(px + 39, py + 18 + row * 5, 3, 3);
      }
      // Crane
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 37, py + ph - 13);
      ctx.lineTo(px + 37, py + 7);
      ctx.lineTo(px + 20, py + 7);
      ctx.stroke();
      ctx.lineWidth = 0.75; ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(px + 27, py + 7); ctx.lineTo(px + 27, py + ph - 13);
      ctx.stroke();
      // Anchor
      const ax = px + 17; const ay = py + 12;
      ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax+5, ay+2); ctx.lineTo(ax+5, ay+14);
      ctx.moveTo(ax+2, ay+5); ctx.lineTo(ax+8, ay+5);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(ax+5, ay+3, 2, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax+5, ay+14); ctx.lineTo(ax+2, ay+11);
      ctx.moveTo(ax+5, ay+14); ctx.lineTo(ax+8, ay+11);
      ctx.stroke();
      if (name) drawNameLabel(ctx, name, px, py, pw, ph, null);
      break;
    }

    case 'military_base': {
      ctx.fillStyle = '#1a2e05';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#4d7c0f'; ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      // Corner towers
      ctx.fillStyle = '#365314';
      ctx.fillRect(px,      py,      7, 7);
      ctx.fillRect(px+pw-7, py,      7, 7);
      ctx.fillRect(px,      py+ph-7, 7, 7);
      ctx.fillRect(px+pw-7, py+ph-7, 7, 7);
      // Inner compound
      ctx.fillStyle = '#2d4a0e';
      ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
      // NATO cross
      ctx.strokeStyle = '#84cc16'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, py+5); ctx.lineTo(cx, py+ph-5);
      ctx.moveTo(px+5, cy); ctx.lineTo(px+pw-5, cy);
      ctx.stroke();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
      break;
    }

    case 'military_outpost':
    case 'outpost': {
      ctx.fillStyle = '#365314';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.strokeStyle = '#84cc16'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, py+2); ctx.lineTo(cx, py+ph-2);
      ctx.moveTo(px+2, cy); ctx.lineTo(px+pw-2, cy);
      ctx.stroke();
      ctx.fillStyle = '#84cc16';
      [[2,2],[pw-4,2],[2,ph-4],[pw-4,ph-4]].forEach(([ox,oy]) => ctx.fillRect(px+ox, py+oy, 2, 2));
      break;
    }

    case 'airfield':
    case 'airfield_base': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      const rwX2 = px + pw * 0.25; const rwW2 = pw * 0.5;
      ctx.fillStyle = '#374151';
      ctx.fillRect(rwX2, py + 2, rwW2, ph - 4);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(rwX2, py+2, 2, ph-4);
      ctx.fillRect(rwX2+rwW2-2, py+2, 2, ph-4);
      ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, py+3); ctx.lineTo(cx, py+ph-3); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(rwX2+3+i*5, py+3, 3, 4);
        ctx.fillRect(rwX2+3+i*5, py+ph-7, 3, 4);
      }
      ctx.fillStyle = '#fef3c7';
      for (let i = 0; i < 4; i++) {
        const ly = py + 4 + i * (ph - 8) / 3;
        ctx.fillRect(rwX2-3, ly, 2, 2);
        ctx.fillRect(rwX2+rwW2+1, ly, 2, 2);
      }
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rwX2+rwW2, cy); ctx.lineTo(px+pw-2, cy);
      ctx.stroke();
      break;
    }

    case 'small_airfield': {
      ctx.fillStyle = '#374151';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px+4, py+2); ctx.lineTo(px+4, py+ph-2);
      ctx.moveTo(px+pw-4, py+2); ctx.lineTo(px+pw-4, py+ph-2);
      ctx.moveTo(px+4, cy); ctx.lineTo(px+pw-4, cy);
      ctx.stroke();
      break;
    }

    case 'industrial': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + 2, py + 16, pw - 4, ph - 18);
      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 2, py + 16, pw - 4, 3);
      const chimneys = [{ ox: 4, ht: 12 }, { ox: 10, ht: 18 }, { ox: 17, ht: 12 }, { ox: 23, ht: 16 }];
      for (const ch of chimneys) {
        if (ch.ox + 4 > pw - 2) continue;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px + ch.ox, py + 16 - ch.ht, 4, ch.ht);
        ctx.fillStyle = 'rgba(203,213,225,0.55)';
        ctx.beginPath(); ctx.arc(px + ch.ox + 2, py + 16 - ch.ht - 4, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + ch.ox + 4, py + 16 - ch.ht - 7, 2, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    case 'town': {
      ctx.fillStyle = '#2a1200';
      ctx.fillRect(px, py, pw, ph);
      // Dirt roads
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px + pw/2 - 2, py, 4, ph);
      ctx.fillRect(px, py + ph/2 - 2, pw, 4);
      // Main house
      ctx.fillStyle = '#d97706';
      ctx.fillRect(px + 3, py + 11, 14, 13);
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(px+1, py+12); ctx.lineTo(px+10, py+4); ctx.lineTo(px+19, py+12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px + 8, py + 18, 4, 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(px+4,  py+13, 3, 3);
      ctx.fillRect(px+14, py+13, 3, 3);
      // Secondary house
      ctx.fillStyle = '#b45309';
      ctx.fillRect(px + 20, py + 5, 9, 8);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(px+18, py+6); ctx.lineTo(px+24, py+1); ctx.lineTo(px+30, py+6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(px+22, py+6, 2, 2);
      ctx.fillRect(px+26, py+6, 2, 2);
      // Tree
      ctx.fillStyle = '#166534';
      ctx.beginPath(); ctx.arc(px+24, py+22, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.fillRect(px+23, py+27, 2, 3);
      if (name) drawNameLabel(ctx, name, px, py, pw, ph, null);
      break;
    }

    case 'lighthouse': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px+4, py+ph-4, 8, 4);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(cx-3, py+4, 6, ph-8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx-3, py+8, 6, 3);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(cx, py+3, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }

    case 'port_gun': {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px+1, py+1, pw-2, ph-2);
      ctx.fillStyle = '#44403c';
      ctx.beginPath(); ctx.arc(cx, cy+2, pw/2-2, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px+pw-1, py+2); ctx.stroke();
      break;
    }

    case 'mine': {
      if (mineImg) {
        ctx.drawImage(mineImg, px, py, pw, ph);
      } else {
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath(); ctx.arc(cx, cy, pw/2-2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(pw*0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', cx, cy+1);
      }
      break;
    }

    default:
      break;
  }
}

// ── Map component ──────────────────────────────────────────────────────────

function getShipType(shipClass) {
  if (!shipClass) return 'auxiliary';
  const s = shipClass.toLowerCase();
  if (s.includes('submarine')) return 'submarine';
  if (s.includes('carrier')) return 'carrier';
  if (s.includes('battleship')) return 'battleship';
  if (s.includes('cruiser')) return 'cruiser';
  if (s.includes('destroyer')) return 'destroyer';
  return 'auxiliary';
}

// ── Weather audio hook ────────────────────────────────────────────────────────
function useWeatherAudio(weather, muted) {
  const ctxRef     = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    if (muted || !weather || weather === 'clear') return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    let ctx;
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = new AudioCtx();
      ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { return; }

    const srcs = [];

    // Pink-noise buffer (4 s, looping)
    const bufLen = ctx.sampleRate * 4;
    const pinkBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const pd = pinkBuf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      pd[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
      b6 = w*0.115926;
    }

    const master = ctx.createGain();
    master.connect(ctx.destination);

    const layer = (fType, freq, q, gain) => {
      const src = ctx.createBufferSource();
      src.buffer = pinkBuf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = fType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(); srcs.push(src);
    };

    if (weather === 'rainy') {
      master.gain.value = 0.09;
      layer('highpass', 6000, 0.5, 1.2);
      layer('lowpass',  300,  0.5, 0.4);
    } else if (weather === 'foggy') {
      master.gain.value = 0.07;
      layer('lowpass',   350, 0.8, 0.8);
      layer('bandpass',  700, 1.5, 0.3);
    } else if (weather === 'thunderstorm') {
      master.gain.value = 0.12;
      layer('highpass', 5500, 0.4, 1.5);
      layer('lowpass',   250, 0.5, 0.5);
      let stopped = false;
      const boom = () => {
        if (stopped || ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 45 + Math.random() * 30;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, ctx.currentTime);
        env.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 160;
        osc.connect(lp); lp.connect(env); env.connect(master);
        osc.start(); osc.stop(ctx.currentTime + 2.2);
        setTimeout(boom, 5000 + Math.random() * 12000);
      };
      setTimeout(boom, 1500 + Math.random() * 3000);
      srcs.push({ stop: () => { stopped = true; }, disconnect: () => {} });
    } else if (weather === 'hurricane') {
      master.gain.value = 0.14;
      layer('bandpass', 900, 0.4, 1.2);
      layer('bandpass', 300, 0.5, 0.8);
      layer('highpass', 7000, 0.3, 1.0);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.2;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.04;
      lfo.connect(lfoG); lfoG.connect(master.gain);
      lfo.start(); srcs.push(lfo);
    }

    cleanupRef.current = () => {
      srcs.forEach(s => { try { s.stop(); } catch(e) {} try { s.disconnect?.(); } catch(e) {} });
      try { master.disconnect(); } catch(e) {}
    };
  }, [weather, muted]);

  useEffect(() => () => {
    cleanupRef.current?.();
    try { ctxRef.current?.close(); } catch(e) {}
  }, []);
}

function GameMap({ gameState, onCellClick, selectedCell, spawnZoneCoords = [], myUserId = null, isGM = false, moveHighlights = [], attackHighlights = [] }) {
  const canvasRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [soundMuted, setSoundMuted] = useState(false);
  useWeatherAudio(gameState?.weather, soundMuted);
  // mineImg is loaded via iconsRef below; keep this null so the fallback never draws
  const mineImg = null;

  const mapSize = (gameState && gameState.mapSize) || 75;
  const canvasW = MARGIN + mapSize * CELL;
  const canvasH = MARGIN + mapSize * CELL;

  // Ref to always hold the latest drawMap so the animation loop can call it without stale closures
  const drawMapFnRef = useRef(null);
  const animFrameRef = useRef(null);

  const iconsRef = useRef({});
  const [iconsLoaded, setIconsLoaded] = useState(false);

  // Per-unit rotation angle (radians) and last-known position for delta tracking
  const rotationsRef    = useRef({});  // key → angle
  const prevPositionsRef = useRef({}); // key → { x, y }

  useEffect(() => {
    const toLoad = [];
    for (const set of ['class', 'enemy', 'sunk_player', 'sunk_enemy']) {
      for (const type of ['destroyer', 'battleship', 'carrier', 'cruiser', 'submarine', 'auxiliary']) {
        toLoad.push([`${set}/${type}`, `/icons/${set}/${type}.png`]);
      }
    }
    toLoad.push(['fire',  '/icons/Fire.png']);
    toLoad.push(['flood', '/icons/Flood.png']);
    toLoad.push(['mine',  '/icons/mine.png']);
    let remaining = toLoad.length;
    for (const [key, src] of toLoad) {
      const img = new Image();
      img.onload = () => { iconsRef.current[key] = img; if (--remaining === 0) setIconsLoaded(true); };
      img.onerror = () => {                              if (--remaining === 0) setIconsLoaded(true); };
      img.src = src;
    }
  }, []);

  const spawnSet = useMemo(() => {
    const s = new Set();
    for (const c of spawnZoneCoords) s.add(`${c.x},${c.y}`);
    return s;
  }, [spawnZoneCoords]);

  const moveSet = useMemo(() => {
    const s = new Set();
    for (const c of moveHighlights) s.add(`${c.x},${c.y}`);
    return s;
  }, [moveHighlights]);

  const attackSet = useMemo(() => {
    const s = new Set();
    for (const c of attackHighlights) s.add(`${c.x},${c.y}`);
    return s;
  }, [attackHighlights]);

  const allPlayers = useMemo(() =>
    (gameState?.players || []).filter(p => p.x != null),
  [gameState]);

  const allEnemies = useMemo(() =>
    (gameState?.enemies || []).filter(e => e.x != null && (e.visible || e.sunk || isGM)),
  [gameState, isGM]);

  const terrainMap = useMemo(() => {
    const tm = new Map();
    if (gameState && gameState.terrain) {
      for (const cell of gameState.terrain) tm.set(`${cell.x},${cell.y}`, cell);
    }
    return tm;
  }, [gameState]);

  // Sort largest-span-first so big icons are "behind" smaller satellites
  const infrastructure = useMemo(() => {
    const raw = (gameState && gameState.infrastructure) || [];
    return [...raw].sort((a, b) => {
      const sa = getInfraSpan(a.type);
      const sb = getInfraSpan(b.type);
      return (sb.w * sb.h) - (sa.w * sa.h);
    });
  }, [gameState]);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ocean background
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(MARGIN, MARGIN, mapSize * CELL, mapSize * CELL);

    // Terrain
    for (const cell of terrainMap.values()) {
      const { x, y, type } = cell;
      // Mines are rendered via the infrastructure icon system (GM-only).
      // Skip the minefield terrain color so the green square never shows.
      if (type === 'minefield') continue;
      const colors = TERRAIN_COLORS[type] || TERRAIN_COLORS.island;
      const px = MARGIN + x * CELL;
      const py = MARGIN + y * CELL;
      ctx.fillStyle = colors.fill;
      ctx.fillRect(px, py, CELL, CELL);
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 0.25, py + 0.25, CELL - 0.5, CELL - 0.5);
    }

    // Spawn zone highlight — pulsing fill + glowing perimeter outline
    if (spawnSet.size > 0) {
      const t = Date.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.4)); // 0→1, 1.4s cycle

      // 1. Fill all cells
      const fillAlpha = 0.15 + 0.25 * pulse; // 0.15 → 0.40
      ctx.fillStyle = `rgba(0, 230, 120, ${fillAlpha})`;
      for (const key of spawnSet) {
        const [sx, sy] = key.split(',').map(Number);
        if (sx < 0 || sx >= mapSize || sy < 0 || sy >= mapSize) continue;
        ctx.fillRect(MARGIN + sx * CELL, MARGIN + sy * CELL, CELL, CELL);
      }

      // 2. Build perimeter path — only edges where the neighbour is NOT in the spawn zone
      ctx.beginPath();
      for (const key of spawnSet) {
        const [sx, sy] = key.split(',').map(Number);
        if (sx < 0 || sx >= mapSize || sy < 0 || sy >= mapSize) continue;
        const px = MARGIN + sx * CELL;
        const py = MARGIN + sy * CELL;
        if (!spawnSet.has(`${sx},${sy - 1}`)) { ctx.moveTo(px, py);        ctx.lineTo(px + CELL, py);        } // top
        if (!spawnSet.has(`${sx},${sy + 1}`)) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); } // bottom
        if (!spawnSet.has(`${sx - 1},${sy}`)) { ctx.moveTo(px, py);        ctx.lineTo(px, py + CELL);        } // left
        if (!spawnSet.has(`${sx + 1},${sy}`)) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); } // right
      }

      // 3. Stroke with multi-layer glow (shadow + bright core line)
      const glowAlpha = 0.5 + 0.5 * pulse; // 0.50 → 1.00
      ctx.lineCap = 'square';
      ctx.shadowColor = `rgba(80, 255, 160, ${glowAlpha})`;
      ctx.shadowBlur = 8 + 6 * pulse; // 8 → 14 px glow radius
      ctx.strokeStyle = `rgba(80, 255, 160, ${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow so it doesn't bleed into other draws
    }

    // Movement range highlight — yellow pulsing fill + perimeter glow
    if (moveSet.size > 0) {
      ctx.save();
      const t = Date.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.4));

      ctx.fillStyle = `rgba(255, 210, 0, ${0.12 + 0.18 * pulse})`;
      for (const key of moveSet) {
        const [mx, my] = key.split(',').map(Number);
        if (mx < 0 || mx >= mapSize || my < 0 || my >= mapSize) continue;
        ctx.fillRect(MARGIN + mx * CELL, MARGIN + my * CELL, CELL, CELL);
      }

      ctx.beginPath();
      for (const key of moveSet) {
        const [mx, my] = key.split(',').map(Number);
        if (mx < 0 || mx >= mapSize || my < 0 || my >= mapSize) continue;
        const px = MARGIN + mx * CELL;
        const py = MARGIN + my * CELL;
        if (!moveSet.has(`${mx},${my - 1}`)) { ctx.moveTo(px, py);        ctx.lineTo(px + CELL, py);        }
        if (!moveSet.has(`${mx},${my + 1}`)) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); }
        if (!moveSet.has(`${mx - 1},${my}`)) { ctx.moveTo(px, py);        ctx.lineTo(px, py + CELL);        }
        if (!moveSet.has(`${mx + 1},${my}`)) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); }
      }
      const glowAlpha = 0.5 + 0.5 * pulse;
      ctx.lineCap = 'square';
      ctx.shadowColor = `rgba(255, 220, 0, ${glowAlpha})`;
      ctx.shadowBlur = 8 + 6 * pulse;
      ctx.strokeStyle = `rgba(255, 220, 0, ${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Attack range highlight — red pulsing fill on enemies in range
    if (attackSet.size > 0) {
      ctx.save();
      const t = Date.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 1.2));

      ctx.fillStyle = `rgba(255, 50, 50, ${0.15 + 0.20 * pulse})`;
      for (const key of attackSet) {
        const [ax, ay] = key.split(',').map(Number);
        if (ax < 0 || ax >= mapSize || ay < 0 || ay >= mapSize) continue;
        ctx.fillRect(MARGIN + ax * CELL, MARGIN + ay * CELL, CELL, CELL);
      }

      ctx.beginPath();
      for (const key of attackSet) {
        const [ax, ay] = key.split(',').map(Number);
        if (ax < 0 || ax >= mapSize || ay < 0 || ay >= mapSize) continue;
        const px = MARGIN + ax * CELL;
        const py = MARGIN + ay * CELL;
        ctx.moveTo(px, py); ctx.lineTo(px + CELL, py);
        ctx.lineTo(px + CELL, py + CELL); ctx.lineTo(px, py + CELL);
        ctx.closePath();
      }
      const glowAlpha = 0.6 + 0.4 * pulse;
      ctx.lineCap = 'square';
      ctx.shadowColor = `rgba(255, 80, 80, ${glowAlpha})`;
      ctx.shadowBlur = 8 + 6 * pulse;
      ctx.strokeStyle = `rgba(255, 80, 80, ${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(226,232,240,0.30)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= mapSize; i++) {
      const vx = MARGIN + i * CELL; const hy = MARGIN + i * CELL;
      ctx.beginPath(); ctx.moveTo(vx, MARGIN); ctx.lineTo(vx, MARGIN + mapSize * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(MARGIN, hy); ctx.lineTo(MARGIN + mapSize * CELL, hy); ctx.stroke();
    }

    // Mines are only visible to the GM
    const visibleMines = new Set();
    if (isGM) {
      for (const item of infrastructure) {
        if (item.type === 'mine') visibleMines.add(`${item.x},${item.y}`);
      }
    }

    // Infrastructure — overlap prevention via occupied cell set
    const occupiedCells = new Set();
    const mineIconImg = iconsRef.current['mine'] || null;
    for (const item of infrastructure) {
      // Mines: skip if no player is close enough to reveal them
      if (item.type === 'mine') {
        if (!visibleMines.has(`${item.x},${item.y}`)) continue;
        // Draw mine icon centered in its cell
        const px = MARGIN + item.x * CELL;
        const py = MARGIN + item.y * CELL;
        if (mineIconImg) {
          ctx.drawImage(mineIconImg, px, py, CELL, CELL);
        } else {
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }

      const span = getInfraSpan(item.type);
      const startCX = item.x - Math.floor(span.w / 2);
      const startCY = item.y - Math.floor(span.h / 2);

      // Skip if any cell in this span is already occupied
      let blocked = false;
      for (let dx = 0; dx < span.w && !blocked; dx++) {
        for (let dy = 0; dy < span.h && !blocked; dy++) {
          if (occupiedCells.has(`${startCX + dx},${startCY + dy}`)) blocked = true;
        }
      }
      if (blocked) continue;

      // Mark all cells in span as occupied
      for (let dx = 0; dx < span.w; dx++) {
        for (let dy = 0; dy < span.h; dy++) {
          occupiedCells.add(`${startCX + dx},${startCY + dy}`);
        }
      }

      const px = MARGIN + startCX * CELL;
      const py = MARGIN + startCY * CELL;
      const pw = span.w * CELL;
      const ph = span.h * CELL;
      ctx.save();
      drawInfraIcon(ctx, px, py, pw, ph, item.type, item.name || null, item.state || null, null);
      ctx.restore();
    }

    // Coordinate labels
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 0; x < mapSize; x += 5) {
      ctx.fillText(colLabel(x), MARGIN + x * CELL + CELL / 2, MARGIN / 2);
    }
    ctx.textAlign = 'right';
    for (let y = 0; y < mapSize; y += 5) {
      ctx.fillText(String(y + 1), MARGIN - 5, MARGIN + y * CELL + CELL / 2);
    }

    // ── Update unit rotations ──────────────────────────────────────────────
    // Right side of icon = bow (forward).  angle is standard canvas atan2:
    //   0 = east, +π/2 = south, −π/2 = north, ±π = west
    {
      const CENTER = (mapSize - 1) / 2;   // 37 for a 75-cell map
      const rotations     = rotationsRef.current;
      const prevPositions = prevPositionsRef.current;

      const track = (key, unit, isEnemy) => {
        if (unit.x == null || unit.y == null) return;
        const prev = prevPositions[key];
        if (prev === undefined) {
          if (isEnemy) {
            // Enemies spawn with a random heading
            rotations[key] = Math.random() * Math.PI * 2;
          } else {
            // Players face toward map centre on spawn
            const dx = CENTER - unit.x;
            const dy = CENTER - unit.y;
            rotations[key] = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);
          }
        } else if (prev.x !== unit.x || prev.y !== unit.y) {
          // Moved — face direction of travel (same for both)
          rotations[key] = Math.atan2(unit.y - prev.y, unit.x - prev.x);
        }
        prevPositions[key] = { x: unit.x, y: unit.y };
      };

      for (const p of allPlayers) track(`p_${p.userId}`, p, false);
      for (const e of allEnemies) track(`e_${e.id}`,     e, true);
    }

    // ── Draw units ──────────────────────────────────────────────────────────
    const icons = iconsRef.current;
    const OVR = Math.round(CELL * 0.40); // overlay icon size (~6px at CELL=16)

    function drawUnit(unit, isEnemy) {
      const px = MARGIN + unit.x * CELL;
      const py = MARGIN + unit.y * CELL;
      const cx = px + CELL / 2;
      const cy = py + CELL / 2;
      const sunk  = unit.sunk || false;
      const type  = getShipType(unit.shipClass);
      const iconSet = sunk
        ? (isEnemy ? 'sunk_enemy' : 'sunk_player')
        : (isEnemy ? 'enemy' : 'class');
      const img   = icons[`${iconSet}/${type}`];
      const angle = (rotationsRef.current[isEnemy ? `e_${unit.id}` : `p_${unit.userId}`]) ?? 0;

      ctx.save();
      if (sunk) ctx.globalAlpha = 0.42;

      if (img) {
        // Maintain aspect ratio, rotate around cell centre
        const iw = img.naturalWidth  || CELL;
        const ih = img.naturalHeight || CELL;
        const scale = Math.min(CELL / iw, CELL / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      } else {
        // Fallback: filled circle (no rotation needed)
        ctx.fillStyle = isEnemy ? 'rgba(220,38,38,0.88)' : (unit.userId === myUserId ? 'rgba(79,172,254,0.92)' : 'rgba(72,187,120,0.88)');
        ctx.beginPath(); ctx.arc(cx, cy, CELL / 2 - 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (!sunk) {
        // Fire overlay — top-right corner
        if (unit.onFire && icons['fire']) {
          ctx.drawImage(icons['fire'], px + CELL - OVR, py, OVR, OVR);
        }
        // Flood overlay — top-left corner
        if ((unit.flooding || unit.bleeding) && icons['flood']) {
          ctx.drawImage(icons['flood'], px, py, OVR, OVR);
        }
        // Own-player white border highlight
        if (!isEnemy && unit.userId === myUserId) {
          ctx.strokeStyle = 'rgba(255,255,255,0.90)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 0.75, py + 0.75, CELL - 1.5, CELL - 1.5);
        }
      }
    }

    // Sunk units first (behind active)
    for (const e of allEnemies.filter(e =>  e.sunk)) drawUnit(e, true);
    for (const p of allPlayers.filter(p =>  p.sunk)) drawUnit(p, false);
    // Active enemies
    for (const e of allEnemies.filter(e => !e.sunk)) drawUnit(e, true);
    // Allied players, own ship always on top
    for (const p of allPlayers.filter(p => !p.sunk && p.userId !== myUserId)) drawUnit(p, false);
    for (const p of allPlayers.filter(p => !p.sunk && p.userId === myUserId)) drawUnit(p, false);

    // Hover highlight
    if (hoveredCell) {
      const { x, y } = hoveredCell;
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(MARGIN + x * CELL, MARGIN + y * CELL, CELL, CELL);
    }

    // Selected cell outline
    if (selectedCell) {
      const { x, y } = selectedCell;
      const px = MARGIN + x * CELL; const py = MARGIN + y * CELL;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(px, py, CELL, CELL);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
  }, [terrainMap, infrastructure, hoveredCell, selectedCell, mapSize, spawnSet, moveSet, attackSet, allPlayers, allEnemies, myUserId, iconsLoaded]);

  // Always keep ref current so the animation loop never has a stale drawMap
  drawMapFnRef.current = drawMap;

  // Normal redraw when state changes (no spawn animation)
  useEffect(() => {
    if (canvasRef.current && gameState) drawMap();
  }, [drawMap, gameState]);

  // Animation loop — runs whenever there are pulsing highlights (spawn zones, move range, or attack range)
  const hasAnimatedHighlights = spawnZoneCoords.length > 0 || moveHighlights.length > 0 || attackHighlights.length > 0;
  useEffect(() => {
    if (!hasAnimatedHighlights) {
      cancelAnimationFrame(animFrameRef.current);
      // Still draw once so the map renders cleanly with no highlights
      if (canvasRef.current && drawMapFnRef.current) drawMapFnRef.current();
      return;
    }
    const loop = () => {
      if (canvasRef.current && drawMapFnRef.current) drawMapFnRef.current();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [hasAnimatedHighlights]);

  const getGridCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor(((e.clientX - rect.left) * scaleX - MARGIN) / CELL),
      y: Math.floor(((e.clientY - rect.top)  * scaleY - MARGIN) / CELL),
    };
  };

  const handleClick = (e) => {
    const coords = getGridCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) onCellClick(x, y, e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    const coords = getGridCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
      setHoveredCell(prev => (prev && prev.x === x && prev.y === y) ? prev : { x, y });
    } else {
      setHoveredCell(null);
    }
  };

  const hoverLabel = hoveredCell ? `${colLabel(hoveredCell.x)}${hoveredCell.y + 1}` : null;

  return (
    <div className="game-map-container">
      <div className="map-toolbar">
        <div className="map-terrain-legend">
          <span className="terrain-chip ocean">Ocean</span>
          <span className="terrain-chip island">Island</span>
          <span className="terrain-chip reef">Reef</span>
          <span className="terrain-chip spawn">Spawn Zone</span>
          <span className="terrain-chip city">City</span>
          <span className="terrain-chip town">Town</span>
          <span className="terrain-chip military">Military</span>
          <span className="terrain-chip airfield">Airfield</span>
          <span className="terrain-chip port">Port</span>
          <span className="terrain-chip mine">Mine</span>
        </div>
        {gameState?.gmUsername && (
          <div className="map-gm-display">
            <span className="map-gm-label">GM:</span>
            <span className="map-gm-name">{gameState.gmUsername}</span>
          </div>
        )}
        <div className="map-coord-display">
          {hoverLabel
            ? <><strong>{hoverLabel}</strong> — click to inspect</>
            : 'Hover over the map'}
        </div>
        {gameState?.weather && gameState.weather !== 'clear' && (
          <button
            className={`btn-sound-toggle ${soundMuted ? 'muted' : 'active'}`}
            onClick={() => setSoundMuted(m => !m)}
            title={soundMuted ? 'Unmute weather sounds' : 'Mute weather sounds'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
        )}
      </div>

      <div className="map-scroll-wrapper">
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredCell(null)}
          className="game-map-canvas"
        />
        {gameState?.weather && gameState.weather !== 'clear' && (
          <div className={`weather-overlay wx-${gameState.weather}`}>
            <div className="wx-rain" />
            <div className="wx-fog" />
            <div className="wx-lightning" />
            <div className="wx-tint" />
            <div className="wx-vignette" />
          </div>
        )}
      </div>
    </div>
  );
}

export default GameMap;
