# Naval Command Web Interface

Interactive web interface for the Naval Command Discord bot. Allows players to interact with the game through a visual map interface instead of text commands.

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Development

1. Install dependencies:
```bash
npm install
cd client && npm install
```

2. Configure environment (copy `.env.example` to `.env` and fill in values)

3. Run development servers:
```bash
# Web server
npm run dev

# React client (in another terminal)
npm run client

# Or run both together
npm run dev:all
```

## Project Structure

```
web-server/
├── src/
│   ├── server.js           # Express server with WebSocket
│   └── botAPI.js          # Bot integration code (to be added to bot.js)
├── client/                # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js           # Discord OAuth login
│   │   │   ├── GameSelector.js   # Game list
│   │   │   ├── GameView.js       # Main game view
│   │   │   └── GameMap.js        # Interactive Canvas map
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── commands/
│   └── weblinkCommand.js  # /weblink Discord command
├── package.json
├── .env.example
├── SETUP.md              # Detailed setup guide
└── README.md             # This file
```

## Features

- 🎮 **Interactive Map**: Click-to-move ships on a visual grid
- 🔄 **Real-time Updates**: WebSocket integration for instant updates
- 🔐 **Discord OAuth**: Secure authentication with Discord accounts
- 📱 **Mobile Responsive**: Works on desktop, tablet, and mobile
- ⚔️ **Visual Combat**: See attack ranges and ship positions
- 🤝 **Dual Interface**: Works alongside Discord commands

## API Endpoints

### Authentication
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `GET /auth/logout` - Logout user
- `GET /auth/user` - Get current user

### Game API
- `GET /api/games` - List user's active games
- `GET /api/game/:channelId/state` - Get game state
- `POST /api/game/:channelId/move` - Move ship
- `POST /api/game/:channelId/attack` - Attack target
- `POST /api/game/:channelId/moveair` - Move aircraft

### WebSocket Events
- `joinGame` - Join game room
- `leaveGame` - Leave game room
- `gameUpdate` - Real-time game state updates

## Environment Variables

Required variables:

```env
PORT=3001
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
SESSION_SECRET=random_secret
BOT_API_URL=http://localhost:3000
BOT_API_KEY=shared_api_key
FRONTEND_URL=http://localhost:3000
```

## Technology Stack

### Backend
- Express.js - Web server
- Socket.io - WebSocket for real-time updates
- Passport.js - Discord OAuth authentication
- Axios - HTTP client

### Frontend
- React - UI framework
- HTML5 Canvas - Map rendering
- Socket.io-client - WebSocket client
- Axios - API calls

## Development Tips

- The web server communicates with the Discord bot via HTTP API
- Game state is managed by the bot, web interface is just a view
- WebSocket ensures real-time synchronization
- Canvas rendering provides smooth, interactive maps
- Discord OAuth ensures only authorized players can access games

## License

Same as Naval Command Discord bot
