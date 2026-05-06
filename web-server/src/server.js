require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');

// Multer storage for shop item icons
const shopIconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/shop-icons');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.itemId}${ext}`);
  }
});
const uploadIcon = multer({ storage: shopIconStorage, limits: { fileSize: 2 * 1024 * 1024 } });

const currencyIconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/currency-icons');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.guildId}${ext}`);
  }
});
const uploadCurrencyIcon = multer({ storage: currencyIconStorage, limits: { fileSize: 1 * 1024 * 1024 } });

// Path to bot's guild data (same server, different directory)
const BOT_DATA_ROOT = path.join(__dirname, '../../servers');

// Find the folder for a guild by scanning guild_id.txt files.
// Prefers folders that have playerData.json over empty fallback folders.
function findGuildFolder(guildId) {
    try {
        if (!fs.existsSync(BOT_DATA_ROOT)) return null;
        const entries = fs.readdirSync(BOT_DATA_ROOT);
        let fallback = null;
        for (const entry of entries) {
            const idFile = path.join(BOT_DATA_ROOT, entry, 'guild_id.txt');
            if (fs.existsSync(idFile)) {
                const storedId = fs.readFileSync(idFile, 'utf8').trim();
                if (storedId === guildId) {
                    const dataFile = path.join(BOT_DATA_ROOT, entry, 'playerData.json');
                    if (fs.existsSync(dataFile)) return entry;
                    fallback = entry;
                }
            }
        }
        return fallback;
    } catch (e) {
        return null;
    }
}

// Read characters directly from the bot's JSON data files (fallback when bot API is down)
function readCharactersFromFiles(guildId) {
    const folder = findGuildFolder(guildId);
    if (!folder) return null;
    const dataFile = path.join(BOT_DATA_ROOT, folder, 'playerData.json');
    if (!fs.existsSync(dataFile)) return null;
    try {
        const playerData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const allCharacters = [];
        for (const [userId, userData] of Object.entries(playerData)) {
            if (userData.characters) {
                for (const [name, data] of Object.entries(userData.characters)) {
                    allCharacters.push({ name, ...data, userId, isActive: userData.activeCharacter === name });
                }
            }
        }
        return allCharacters;
    } catch (e) {
        return null;
    }
}

const app = express();
const server = http.createServer(app);

// Trust proxy - important for Cloudflare/Nginx
app.set('trust proxy', 1);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'naval-command-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Trust the reverse proxy
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' required for cross-site cookies with secure
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  // Store user profile
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Bot API client
const botAPI = axios.create({
  baseURL: process.env.BOT_API_URL || `http://localhost:${process.env.BOT_API_PORT || 3002}`,
  headers: {
    'Authorization': `Bearer ${process.env.BOT_API_KEY}`
  }
});

// Store active game connections
const gameConnections = new Map();

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Routes

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  });
});

app.get('/auth/user', ensureAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds
  });
});

// Game API routes
app.get('/api/games', ensureAuthenticated, async (req, res) => {
  try {
    const { guildId } = req.query;
    const params = { userId: req.user.id };

    // If guildId is provided, add it to params to get all games in that guild
    if (guildId) {
      params.guildId = guildId;
    }

    const response = await botAPI.get('/api/games', { params });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching games:', error.message);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

app.get('/api/game/:channelId/state', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get(`/api/game/${req.params.channelId}/state`, { params: { userId: req.user.id } });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching game state:', error.message);
    res.status(500).json({ error: 'Failed to fetch game state' });
  }
});

app.get('/api/game/:channelId/map-image', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get(`/api/game/${req.params.channelId}/map-image`, {
      responseType: 'stream'
    });
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching map image:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch map image' });
  }
});

app.post('/api/game/:channelId/move', ensureAuthenticated, async (req, res) => {
  try {
    const { x, y, characterAlias } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/move`, {
      userId: req.user.id,
      x,
      y,
      characterAlias
    });

    // Broadcast update to all connected clients
    io.to(req.params.channelId).emit('gameUpdate', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error moving:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to move'
    });
  }
});

app.post('/api/game/:channelId/attack', ensureAuthenticated, async (req, res) => {
  try {
    const { targetId, weaponType, shellType, characterAlias } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/attack`, {
      userId: req.user.id,
      targetId,
      weaponType,
      shellType,
      characterAlias
    });

    // Broadcast update to all connected clients
    io.to(req.params.channelId).emit('gameUpdate', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error attacking:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to attack'
    });
  }
});

app.post('/api/game/:channelId/join', ensureAuthenticated, async (req, res) => {
  try {
    const { characterName, guildId } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/join`, {
      userId: req.user.id,
      characterName,
      guildId,
      username: req.user.username,
      displayName: req.user.username
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error joining game:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to join game'
    });
  }
});

app.post('/api/game/:channelId/opfor-choice', ensureAuthenticated, async (req, res) => {
  try {
    const { characterName, guildId, choice } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/opfor-choice`, {
      userId: req.user.id,
      characterName,
      guildId,
      choice
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error processing OPFOR choice:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to process OPFOR choice'
    });
  }
});

app.post('/api/game/:channelId/moveair', ensureAuthenticated, async (req, res) => {
  try {
    const { x, y, squadronIndex, characterAlias } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/moveair`, {
      userId: req.user.id,
      x,
      y,
      squadronIndex,
      characterAlias
    });

    // Broadcast update to all connected clients
    io.to(req.params.channelId).emit('gameUpdate', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error moving aircraft:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to move aircraft'
    });
  }
});

app.post('/api/game/:channelId/spawn', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/spawn`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to set spawn' });
  }
});

app.post('/api/game/:channelId/damage-control', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/damage-control`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to perform damage control' });
  }
});

app.post('/api/game/:channelId/launch-recon', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/launch-recon`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to launch aircraft' });
  }
});

app.post('/api/game/:channelId/launch-aircraft', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/launch-aircraft`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to launch aircraft' });
  }
});

app.post('/api/game/:channelId/move-aircraft', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/move-aircraft`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to move aircraft' });
  }
});

app.post('/api/game/:channelId/attack-aircraft', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/attack-aircraft`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to attack with aircraft' });
  }
});

app.post('/api/game/:channelId/recall-aircraft', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/recall-aircraft`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to recall aircraft' });
  }
});

app.post('/api/game/:channelId/land-aircraft', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/land-aircraft`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to land aircraft' });
  }
});

app.post('/api/game/:channelId/use-air-support', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/use-air-support`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to call air support' });
  }
});

app.post('/api/game/:channelId/end-turn', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/end-turn`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to end turn' });
  }
});

app.post('/api/game/:channelId/gm-toggle', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/gm-toggle`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to toggle GM status' });
  }
});

app.post('/api/game/:channelId/weather', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/weather`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to set weather' });
  }
});

app.post('/api/game/:channelId/spawn-enemy', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/spawn-enemy`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to spawn enemy' });
  }
});

app.post('/api/game/:channelId/end', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/end`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to end battle' });
  }
});

app.post('/api/game/:channelId/apply-status', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/apply-status`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to apply status' });
  }
});

// GM AI control routes
const gmAIProxy = (path) => async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/${path}`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || `Failed: ${path}` });
  }
};
app.post('/api/game/:channelId/gm/take-control',   ensureAuthenticated, gmAIProxy('gm/take-control'));
app.post('/api/game/:channelId/gm/release-control', ensureAuthenticated, gmAIProxy('gm/release-control'));
app.post('/api/game/:channelId/gm/ai-move',         ensureAuthenticated, gmAIProxy('gm/ai-move'));
app.post('/api/game/:channelId/gm/ai-attack',       ensureAuthenticated, gmAIProxy('gm/ai-attack'));
app.post('/api/game/:channelId/gm/ai-end-turn',     ensureAuthenticated, gmAIProxy('gm/ai-end-turn'));

app.post('/api/game/:channelId/start-battle', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/start-battle`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    console.error('[start-battle proxy]', error.message, 'status:', error.response?.status, 'data:', JSON.stringify(error.response?.data));
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message || 'Failed to start battle' });
  }
});

app.post('/api/game/:channelId/use-item', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/game/${req.params.channelId}/use-item`,
      { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    console.error('[use-item proxy]', error.message, 'status:', error.response?.status, 'data:', JSON.stringify(error.response?.data));
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message || 'Failed to use item' });
  }
});

app.get('/api/player/battle-status', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.get('/api/player/battle-status', { params: { guildId: req.query.guildId, userId: req.query.userId } });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message || 'Failed to get battle status' });
  }
});

app.patch('/api/player/active-upgrades', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.patch('/api/player/active-upgrades', { ...req.body, userId: req.user.id });
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message || 'Failed to update upgrade' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinGame', (channelId) => {
    socket.join(channelId);
    gameConnections.set(socket.id, channelId);
    console.log(`Socket ${socket.id} joined game ${channelId}`);
  });

  socket.on('leaveGame', (channelId) => {
    socket.leave(channelId);
    gameConnections.delete(socket.id);
    console.log(`Socket ${socket.id} left game ${channelId}`);
  });

  socket.on('disconnect', () => {
    const channelId = gameConnections.get(socket.id);
    if (channelId) {
      gameConnections.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Endpoint for bot to push updates to web clients
app.post('/api/broadcast/:channelId', async (req, res) => {
  try {
    // Verify request is from bot (check API key)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.BOT_API_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;
    const update = req.body;

    if (update.type === 'battleLogEntry') {
      io.to(channelId).emit('battleLogEntry', { message: update.message, logType: update.logType || 'ai' });
    } else {
      io.to(channelId).emit('gameUpdate', update);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting update:', error.message);
    res.status(500).json({ error: 'Failed to broadcast update' });
  }
});

// ==================== ADMIN PANEL ROUTES ====================

// Check if user has staff permission
app.get('/api/admin/check-permission', ensureAuthenticated, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const response = await botAPI.get('/api/admin/check-permission', {
      params: { userId: req.user.id, guildId }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error checking admin permission:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to check permission'
    });
  }
});

// Get characters (all or for specific user)
app.get('/api/admin/characters', ensureAuthenticated, async (req, res) => {
  try {
    const { guildId, userId } = req.query;

    const response = await botAPI.get('/api/admin/characters', {
      params: { guildId, userId }
    });

    res.json(response.data);
  } catch (error) {
    // Bot API unavailable - fall back to reading files directly
    console.warn('Bot API unavailable for characters, reading from files:', error.message);
    const characters = readCharactersFromFiles(guildId);
    if (characters !== null) {
      let result = characters;
      if (userId) result = characters.filter(c => c.userId === userId);
      return res.json({ characters: result, source: 'filesystem' });
    }
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch characters'
    });
  }
});

// Create/update character
app.post('/api/admin/characters', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/characters', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error saving character:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to save character'
    });
  }
});

// Delete character
app.delete('/api/admin/characters', ensureAuthenticated, async (req, res) => {
  try {
    const { guildId, userId, characterName } = req.query;

    const response = await botAPI.delete('/api/admin/characters', {
      params: { guildId, userId, characterName }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error deleting character:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to delete character'
    });
  }
});

app.patch('/api/admin/player-stats', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.patch('/api/admin/player-stats', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error updating player stats:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to update player stats'
    });
  }
});

// Remove inventory item (with optional refund)
app.delete('/api/admin/inventory-item', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.delete('/api/admin/inventory-item', { data: req.body });
    res.json(response.data);
  } catch (error) {
    console.error('Error removing inventory item:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to remove item'
    });
  }
});

// Get maps
app.get('/api/admin/maps', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get('/api/admin/maps');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching maps:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch maps'
    });
  }
});

// Create new custom map
app.post('/api/admin/maps', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/maps', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating map:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to create map'
    });
  }
});

// Update existing custom map
app.put('/api/admin/maps/:id', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.put(`/api/admin/maps/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error updating map:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to update map'
    });
  }
});

// Delete custom map
app.delete('/api/admin/maps/:id', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.delete(`/api/admin/maps/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error deleting map:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to delete map'
    });
  }
});

// Shop — list items
app.get('/api/shop/items', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get('/api/shop/items', { params: { guildId: req.query.guildId } });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching shop items:', error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed to fetch items' });
  }
});

// Shop — buy item
app.post('/api/shop/buy', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/shop/buy', { ...req.body, userId: req.user.id });
    res.json(response.data);
  } catch (error) {
    console.error('Error buying item:', error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Purchase failed' });
  }
});

// Start a game
app.post('/api/admin/start-game', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/start-game', req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error starting game:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to start game'
    });
  }
});

// Get user's guilds (from Discord profile)
app.get('/api/admin/guilds', ensureAuthenticated, (req, res) => {
  try {
    // User guilds are stored in the session from Discord OAuth
    const guilds = req.user.guilds || [];
    res.json({ guilds });
  } catch (error) {
    console.error('Error fetching guilds:', error.message);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get bot's guilds (for filtering mutual servers)
app.get('/api/admin/bot-guilds', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get('/api/admin/bot-guilds');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bot guilds:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch bot guilds'
    });
  }
});

// Public invite URL (no auth needed)
app.get('/api/bot-invite', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Client ID not configured' });
  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2270365078781008&scope=bot%20applications.commands`;
  res.json({ url });
});

// Serve shop icons static files (under /api/ so nginx proxies them to Express)
app.use('/api/shop-icons', express.static(path.join(__dirname, '../../public/shop-icons')));
app.use('/api/currency-icons', express.static(path.join(__dirname, '../../public/currency-icons')));

// ── Admin Shop Item Proxy Routes ─────────────────────────────────────────────

app.get('/api/admin/shop/items/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.get(`/api/admin/shop/items/${req.params.guildId}`);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.post('/api/admin/shop/items/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/admin/shop/items/${req.params.guildId}`, req.body);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.put('/api/admin/shop/items/:guildId/:itemId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.put(`/api/admin/shop/items/${req.params.guildId}/${req.params.itemId}`, req.body);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.delete('/api/admin/shop/items/:guildId/:itemId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.delete(`/api/admin/shop/items/${req.params.guildId}/${req.params.itemId}`);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.post('/api/admin/shop/icon/:itemId', ensureAuthenticated, uploadIcon.single('icon'), async (req, res) => {
  try {
    const ext = path.extname(req.file.originalname);
    const iconUrl = `/api/shop-icons/${req.params.itemId}${ext}`;
    await botAPI.post(`/api/admin/shop/icon/${req.params.itemId}`, { iconUrl, guildId: req.body.guildId });
    res.json({ iconUrl });
  } catch (error) {
    console.error('Error uploading shop icon:', error.message);
    res.status(500).json({ error: 'Icon upload failed' });
  }
});

// ── Guild Config Proxy Routes ─────────────────────────────────────────────────

app.get('/api/admin/guild-config/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.get(`/api/admin/guild-config/${req.params.guildId}`);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.post('/api/admin/guild-config/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const r = await botAPI.post(`/api/admin/guild-config/${req.params.guildId}`, req.body);
    res.json(r.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Failed' });
  }
});

app.post('/api/admin/guild-config/:guildId/currency-icon', ensureAuthenticated, uploadCurrencyIcon.single('icon'), async (req, res) => {
  try {
    const ext = path.extname(req.file.originalname);
    const iconUrl = `/api/currency-icons/${req.params.guildId}${ext}`;
    await botAPI.post(`/api/admin/guild-config/${req.params.guildId}/currency-icon`, { iconUrl });
    res.json({ iconUrl });
  } catch (error) {
    console.error('Error uploading currency icon:', error.message);
    res.status(500).json({ error: 'Icon upload failed' });
  }
});

// ── Configurations Panel Proxy Routes ──────────────────────────────────────────

// Configurations panel — fetch current config state
app.get('/api/admin/config/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get(`/api/admin/config/${req.params.guildId}`);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

// Guild channels and roles for dropdowns
app.get('/api/admin/guild/:guildId/metadata', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.get(`/api/admin/guild/${req.params.guildId}/metadata`);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/aicanspeak', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/aicanspeak', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/roleplay', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/roleplay', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/setgm', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/setgm', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.delete('/api/admin/config/setgm', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.delete('/api/admin/config/setgm', { data: req.body });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/setlogchannel', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/setlogchannel', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/setmsglogchannel', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/setmsglogchannel', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/welcome', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/welcome', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/welcome/preset', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/welcome/preset', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.post('/api/admin/config/welcome/custom', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.post('/api/admin/config/welcome/custom', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

app.delete('/api/admin/config/welcome/custom', ensureAuthenticated, async (req, res) => {
  try {
    const response = await botAPI.delete('/api/admin/config/welcome/custom', { data: req.body });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
  }
});

// ── Reviews ───────────────────────────────────────────────────────────────────

const REVIEWS_FILE = path.join(__dirname, '../data/reviews.json');

function loadReviews() {
  try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); } catch { return []; }
}

function saveReviews(reviews) {
  fs.mkdirSync(path.dirname(REVIEWS_FILE), { recursive: true });
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
}

app.get('/api/reviews', (req, res) => {
  const reviews = loadReviews();
  const isAdmin = req.user?.id === process.env.ADMIN_DISCORD_ID;
  res.json({ reviews: reviews.slice(-50).reverse(), isAdmin });
});

app.delete('/api/reviews/:id', ensureAuthenticated, (req, res) => {
  if (req.user.id !== process.env.ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const reviews = loadReviews().filter(r => r.id !== req.params.id);
  saveReviews(reviews);
  res.json({ success: true });
});

app.post('/api/reviews', ensureAuthenticated, (req, res) => {
  const { stars, name, review, server } = req.body;
  if (!stars || !review?.trim()) return res.status(400).json({ error: 'Stars and review are required.' });
  const starsNum = parseInt(stars);
  if (starsNum < 1 || starsNum > 5) return res.status(400).json({ error: 'Stars must be 1–5.' });

  const reviews = loadReviews();
  reviews.push({
    id: Date.now().toString(),
    stars: starsNum,
    name: name?.trim() || req.user.username,
    review: review.trim(),
    server: server?.trim() || 'Unknown Server',
    userId: req.user.id,
    timestamp: new Date().toISOString()
  });
  saveReviews(reviews);
  res.json({ success: true });
});

// ── Bug Report ────────────────────────────────────────────────────────────────

const bugAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

app.post('/api/support/bug-report', ensureAuthenticated, bugAttachmentUpload.array('attachments', 5), async (req, res) => {
  try {
    const { contactName, contactInfo, description, steps } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Bug description is required.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const discordUser = req.user ? `${req.user.username} (${req.user.id})` : 'Unknown';
    const attachments = (req.files || []).map(f => ({
      filename: f.originalname,
      content: f.buffer
    }));

    await transporter.sendMail({
      from: `"Naval Command Bug Reports" <${process.env.GMAIL_USER}>`,
      to: 'meekantifun@gmail.com',
      subject: `[Bug Report] ${contactName || discordUser}`,
      html: `
        <h2 style="color:#5865f2">Naval Command — Bug Report</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;font-weight:bold;width:160px">Discord Account</td><td style="padding:8px">${discordUser}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold">Contact Name</td><td style="padding:8px">${contactName || '—'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Contact Info</td><td style="padding:8px">${contactInfo || '—'}</td></tr>
        </table>
        <h3 style="margin-top:24px">Bug Description</h3>
        <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:4px">${description.trim()}</p>
        <h3>Steps to Replicate</h3>
        <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:4px">${steps ? steps.trim() : '—'}</p>
        ${req.files?.length ? `<p><strong>Attachments:</strong> ${req.files.length} file(s) attached</p>` : ''}
      `,
      attachments
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Bug report email error:', error.message);
    res.status(500).json({ error: 'Failed to send bug report. Please try again.' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Naval Command web server running on port ${PORT}`);
});

module.exports = { io };
