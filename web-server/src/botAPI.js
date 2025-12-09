/**
 * Bot API Integration
 *
 * This file should be integrated into your main bot.js file.
 * It provides HTTP endpoints for the web server to communicate with the Discord bot.
 *
 * Add this code to bot.js after your NavalWarfareBot class definition:
 *
 * 1. Add at top of bot.js:
 *    const express = require('express');
 *    const cors = require('cors');
 *    const axios = require('axios');
 *
 * 2. Add to package.json dependencies if not present:
 *    "express": "^4.18.2",
 *    "cors": "^2.8.5",
 *    "axios": "^1.6.0"
 *
 * 3. Add these methods to your NavalWarfareBot class
 */

// Add this method to NavalWarfareBot class
setupHTTPServer() {
  const app = express();
  const PORT = process.env.BOT_API_PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API key authentication middleware
  const authenticateAPIKey = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const expectedKey = process.env.BOT_API_KEY || 'default_api_key';

    if (authHeader === `Bearer ${expectedKey}`) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Get all active games for a user
  app.get('/api/games', authenticateAPIKey, (req, res) => {
    try {
      const userId = req.query.userId;
      const userGames = [];

      for (const [channelId, game] of this.games.entries()) {
        // Check if user is in this game
        const playerInGame = game.players.some(p => p.userId === userId);

        if (playerInGame) {
          userGames.push({
            channelId,
            guildId: game.guildId,
            mapSize: game.mapSize,
            currentTurn: game.currentTurn,
            phase: game.phase,
            playerCount: game.players.length,
            enemyCount: game.enemies.length,
            missionType: game.missionType
          });
        }
      }

      res.json({ games: userGames });
    } catch (error) {
      console.error('Error fetching games:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get complete game state
  app.get('/api/game/:channelId/state', authenticateAPIKey, (req, res) => {
    try {
      const { channelId } = req.params;
      const game = this.games.get(channelId);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Return game state
      res.json({
        channelId,
        guildId: game.guildId,
        mapSize: game.mapSize,
        currentTurn: game.currentTurn,
        phase: game.phase,
        weather: game.weather,
        missionType: game.missionType,
        missionObjective: game.missionObjective,
        players: game.players.map(p => ({
          userId: p.userId,
          username: p.username,
          characterAlias: p.characterAlias,
          shipClass: p.shipClass,
          x: p.x,
          y: p.y,
          health: p.health,
          maxHealth: p.maxHealth,
          onFire: p.onFire,
          flooding: p.flooding,
          sunk: p.sunk,
          weapons: p.weapons,
          aircraftSquadrons: p.aircraftSquadrons,
          actionsThisTurn: p.actionsThisTurn,
          maxActions: p.maxActions
        })),
        enemies: game.enemies.map(e => ({
          id: e.id,
          name: e.name,
          shipClass: e.shipClass,
          x: e.x,
          y: e.y,
          health: e.health,
          maxHealth: e.maxHealth,
          onFire: e.onFire,
          flooding: e.flooding,
          sunk: e.sunk,
          isBoss: e.isBoss
        })),
        islands: game.islands,
        turnOrder: game.turnOrder
      });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Move player ship
  app.post('/api/game/:channelId/move', authenticateAPIKey, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { userId, x, y, characterAlias } = req.body;
      const game = this.games.get(channelId);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Find player
      let player = game.players.find(p => p.userId === userId);
      if (characterAlias) {
        player = game.players.find(p => p.userId === userId && p.characterAlias === characterAlias);
      }

      if (!player) {
        return res.status(404).json({ error: 'Player not found in game' });
      }

      if (player.sunk) {
        return res.status(400).json({ error: 'Ship is sunk' });
      }

      if (player.actionsThisTurn >= player.maxActions) {
        return res.status(400).json({ error: 'No actions remaining this turn' });
      }

      // Validate coordinates
      if (x < 0 || x >= game.mapSize || y < 0 || y >= game.mapSize) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Check if position is on land
      const isLand = game.islands.some(island => {
        return island.cells.some(cell => cell.x === x && cell.y === y);
      });

      if (isLand) {
        return res.status(400).json({ error: 'Cannot move onto land' });
      }

      // Update player position
      player.x = x;
      player.y = y;
      player.actionsThisTurn++;

      // Broadcast update to web clients
      await this.broadcastGameUpdate(channelId);

      res.json({
        success: true,
        player: {
          userId: player.userId,
          characterAlias: player.characterAlias,
          x: player.x,
          y: player.y,
          actionsThisTurn: player.actionsThisTurn
        }
      });
    } catch (error) {
      console.error('Error moving player:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Attack target
  app.post('/api/game/:channelId/attack', authenticateAPIKey, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { userId, targetId, weaponType, characterAlias } = req.body;
      const game = this.games.get(channelId);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Find player
      let player = game.players.find(p => p.userId === userId);
      if (characterAlias) {
        player = game.players.find(p => p.userId === userId && p.characterAlias === characterAlias);
      }

      if (!player) {
        return res.status(404).json({ error: 'Player not found in game' });
      }

      if (player.sunk) {
        return res.status(400).json({ error: 'Ship is sunk' });
      }

      if (player.actionsThisTurn >= player.maxActions) {
        return res.status(400).json({ error: 'No actions remaining this turn' });
      }

      // Find target
      const target = game.enemies.find(e => e.id === targetId) ||
                     game.players.find(p => p.userId === targetId);

      if (!target) {
        return res.status(404).json({ error: 'Target not found' });
      }

      if (target.sunk) {
        return res.status(400).json({ error: 'Target is already sunk' });
      }

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(player.x - target.x, 2) +
        Math.pow(player.y - target.y, 2)
      );

      // Get weapon
      const weapon = player.weapons.find(w => w.type === weaponType);
      if (!weapon) {
        return res.status(400).json({ error: 'Weapon not found' });
      }

      if (distance > weapon.range) {
        return res.status(400).json({ error: 'Target out of range' });
      }

      // Perform attack using existing combat system
      const attackResult = await this.performAttack(player, target, weapon, game);

      player.actionsThisTurn++;

      // Broadcast update to web clients
      await this.broadcastGameUpdate(channelId);

      res.json({
        success: true,
        result: attackResult
      });
    } catch (error) {
      console.error('Error attacking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Move aircraft
  app.post('/api/game/:channelId/moveair', authenticateAPIKey, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { userId, x, y, squadronIndex, characterAlias } = req.body;
      const game = this.games.get(channelId);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      // Find player
      let player = game.players.find(p => p.userId === userId);
      if (characterAlias) {
        player = game.players.find(p => p.userId === userId && p.characterAlias === characterAlias);
      }

      if (!player) {
        return res.status(404).json({ error: 'Player not found in game' });
      }

      if (player.shipClass !== 'Carrier') {
        return res.status(400).json({ error: 'Only carriers can launch aircraft' });
      }

      if (player.actionsThisTurn >= player.maxActions) {
        return res.status(400).json({ error: 'No actions remaining this turn' });
      }

      const squadron = player.aircraftSquadrons[squadronIndex];
      if (!squadron) {
        return res.status(404).json({ error: 'Squadron not found' });
      }

      // Validate coordinates
      if (x < 0 || x >= game.mapSize || y < 0 || y >= game.mapSize) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Update squadron position
      squadron.x = x;
      squadron.y = y;
      squadron.deployed = true;
      player.actionsThisTurn++;

      // Broadcast update to web clients
      await this.broadcastGameUpdate(channelId);

      res.json({
        success: true,
        squadron: {
          index: squadronIndex,
          x: squadron.x,
          y: squadron.y,
          deployed: squadron.deployed
        }
      });
    } catch (error) {
      console.error('Error moving aircraft:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Bot HTTP API listening on port ${PORT}`);
  });

  this.httpServer = app;
}

// Add this method to broadcast updates to web server
async broadcastGameUpdate(channelId) {
  try {
    const WEB_SERVER_URL = process.env.WEB_SERVER_URL || 'http://localhost:3001';
    const BOT_API_KEY = process.env.BOT_API_KEY || 'default_api_key';

    const game = this.games.get(channelId);
    if (!game) return;

    await axios.post(
      `${WEB_SERVER_URL}/api/broadcast/${channelId}`,
      {
        type: 'gameUpdate',
        channelId,
        timestamp: Date.now()
      },
      {
        headers: {
          'Authorization': `Bearer ${BOT_API_KEY}`
        }
      }
    );
  } catch (error) {
    console.error('Error broadcasting to web server:', error.message);
  }
}

/**
 * Integration Instructions:
 *
 * 1. In bot.js, find where you initialize the NavalWarfareBot:
 *    const bot = new NavalWarfareBot();
 *
 * 2. After initialization, add:
 *    bot.setupHTTPServer();
 *
 * 3. Add to your .env file:
 *    BOT_API_PORT=3000
 *    BOT_API_KEY=your_secure_random_key_here
 *    WEB_SERVER_URL=http://localhost:3001
 *
 * 4. Install dependencies:
 *    npm install express cors axios
 */
