require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const axios = require('axios');

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
  baseURL: process.env.BOT_API_URL || 'http://localhost:3000',
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
    const response = await botAPI.get(`/api/game/${req.params.channelId}/state`);
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
    const { targetId, weaponType, characterAlias } = req.body;
    const response = await botAPI.post(`/api/game/${req.params.channelId}/attack`, {
      userId: req.user.id,
      targetId,
      weaponType,
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

    io.to(channelId).emit('gameUpdate', update);
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
    console.error('Error fetching characters:', error.message);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Naval Command web server running on port ${PORT}`);
});

module.exports = { io };
