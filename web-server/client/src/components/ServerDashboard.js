import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminPanel from './AdminPanel';
import PlayerPanel from './PlayerPanel';
import './ServerDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ServerDashboard({ user, guild, onSelectGame, onChangeServer }) {
  const [games, setGames] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState('characters');
  const [joiningGame, setJoiningGame] = useState(null); // channelId of game being joined
  const [joinCharacter, setJoinCharacter] = useState('');
  const [joinError, setJoinError] = useState(null);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);

  useEffect(() => {
    if (guild) {
      loadDashboardData();
    }
  }, [guild]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load games, characters, and permissions in parallel
      const [gamesRes, charsRes, permRes] = await Promise.all([
        axios.get(`${API_URL}/api/games`, {
          params: { guildId: guild.id },
          withCredentials: true
        }),
        axios.get(`${API_URL}/api/admin/characters`, {
          params: { guildId: guild.id, userId: user.id },
          withCredentials: true
        }),
        axios.get(`${API_URL}/api/admin/check-permission`, {
          params: { guildId: guild.id },
          withCredentials: true
        })
      ]);

      // Games are already filtered by guild from the API
      setGames(gamesRes.data.games || []);
      setCharacters(charsRes.data.characters || []);
      setHasPermission(permRes.data.hasPermission);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMissionTypeDisplay = (missionType) => {
    const missions = {
      'destroy_all': '🎯 Destroy All',
      'resource': '💎 Resources',
      'convoy': '🚢 Convoy',
      'outpost': '🏴 Outpost',
      'boss': '👑 Boss'
    };
    return missions[missionType] || missionType;
  };

  const getPhaseDisplay = (phase) => {
    const phases = {
      'joining': '🟢 Joining Open',
      'starting': '⏳ Starting...',
      'setup': '⚙️ Setup',
      'player_turn': '👤 Player Turn',
      'enemy_turn': '💀 Enemy Turn',
      'completed': '✅ Completed'
    };
    return phases[phase] || phase;
  };

  const handleJoinClick = (channelId) => {
    setJoiningGame(channelId);
    setJoinError(null);
    if (characters.length === 1) {
      setJoinCharacter(characters[0].name);
    } else {
      setJoinCharacter('');
    }
  };

  const handleJoinConfirm = async (channelId) => {
    if (characters.length > 1 && !joinCharacter) {
      setJoinError('Please select a character');
      return;
    }
    const selected = characters.length === 1 ? characters[0].name : joinCharacter;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/join`, {
        characterName: selected,
        guildId: guild.id
      }, { withCredentials: true });
      setJoiningGame(null);
      setJoinCharacter('');
      setJoinError(null);
      loadDashboardData();
    } catch (error) {
      setJoinError(error.response?.data?.error || 'Failed to join game');
    }
  };

  if (showAdmin) {
    return <AdminPanel user={user} selectedGuild={guild} onBack={() => { setShowAdmin(false); loadDashboardData(); }} initialTab={adminInitialTab} />;
  }

  return (
    <div className="server-dashboard">
      {showPlayerPanel && (
        <PlayerPanel user={user} guild={guild} onClose={() => setShowPlayerPanel(false)} />
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="server-info">
          <button onClick={onChangeServer} className="btn-back">
            ← Change Server
          </button>
          <div className="server-details">
            {guild.icon && (
              <img
                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                alt={guild.name}
                className="server-icon-small"
              />
            )}
            <h2>{guild.name}</h2>
          </div>
        </div>
        <div className="header-actions">
          {hasPermission && (
            <button onClick={() => { setAdminInitialTab('characters'); setShowAdmin(true); }} className="btn-admin">
              ⚙️ Admin Panel
            </button>
          )}
          <button onClick={() => setShowPlayerPanel(true)} className="btn-player">
            ☰ Menu
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Left Sidebar - Characters */}
        <aside className="characters-sidebar">
          <h3>Your Characters</h3>
          {loading ? (
            <div className="sidebar-loading">Loading...</div>
          ) : characters.length === 0 ? (
            <div className="no-characters">
              <p>No characters yet</p>
              {hasPermission && (
                <button onClick={() => { setAdminInitialTab('characters'); setShowAdmin(true); }} className="btn-create-char">
                  + Create Character
                </button>
              )}
            </div>
          ) : (
            <div className="character-list-sidebar">
              {characters.map((char, idx) => (
                <div key={idx} className="character-card-mini">
                  <div className="char-header">
                    <h4>{char.name}</h4>
                    {char.isActive && <span className="badge-active-mini">Active</span>}
                  </div>
                  <div className="char-class">{char.shipClass}</div>
                  {char.tonnage && (
                    <div className="char-tonnage">{char.tonnage.toLocaleString()} tons</div>
                  )}
                  {char.stats && (
                    <div className="char-stats-mini">
                      <div className="stat-mini">
                        <span className="stat-label">HP:</span>
                        <span className="stat-val">{char.stats.health}</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-label">Armor:</span>
                        <span className="stat-val">{char.stats.armor}</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-label">Speed:</span>
                        <span className="stat-val">{char.stats.speed}</span>
                      </div>
                    </div>
                  )}
                  {char.weapons && Object.keys(char.weapons).length > 0 && (
                    <div className="char-weapons-count">
                      🔫 {Object.keys(char.weapons).length} weapon{Object.keys(char.weapons).length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {char.level && (
                    <div className="char-level">Level {char.level}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content - Games */}
        <main className="games-main">
          <h3>Active Games</h3>
          {loading ? (
            <div className="loading-games">
              <div className="spinner"></div>
              <p>Loading games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="no-games">
              <h4>🎮 No Active Games</h4>
              <p>There are no active games in this server.</p>
              <p className="help-text">
                {hasPermission
                  ? 'Use the Admin Panel to start a new game!'
                  : 'Ask a server admin to start a game using the bot commands.'}
              </p>
              {hasPermission && (
                <button onClick={() => { setAdminInitialTab('game'); setShowAdmin(true); }} className="btn-start-game">
                  Start a Game
                </button>
              )}
            </div>
          ) : (
            <div className="games-grid">
              {games.map((game) => (
                <div key={game.channelId} className="game-card">
                  <div className="game-card-header">
                    <h4>Game #{game.channelId.slice(-6)}</h4>
                    <div className="game-badges">
                      <span className="game-turn">Turn {game.currentTurn}</span>
                      {game.isPlayer && <span className="badge-in-game">You're in this game</span>}
                    </div>
                  </div>
                  <div className="game-card-body">
                    <div className="game-stat">
                      <span className="stat-label">Mission:</span>
                      <span className="stat-value">{getMissionTypeDisplay(game.missionType)}</span>
                    </div>
                    <div className="game-stat">
                      <span className="stat-label">Phase:</span>
                      <span className="stat-value">{getPhaseDisplay(game.phase)}</span>
                    </div>
                    <div className="game-stat">
                      <span className="stat-label">Map:</span>
                      <span className="stat-value">{game.mapSize}x{game.mapSize}</span>
                    </div>
                    <div className="game-stat">
                      <span className="stat-label">Players:</span>
                      <span className="stat-value">{game.playerCount}</span>
                    </div>
                  </div>
                  <div className="game-card-footer">
                    {game.phase === 'joining' && !game.isPlayer && characters.length > 0 && (
                      <div className="join-battle-container">
                        {joiningGame === game.channelId ? (
                          <div className="join-battle-selector">
                            {characters.length > 1 && (
                              <select
                                className="join-character-select"
                                value={joinCharacter}
                                onChange={e => { setJoinCharacter(e.target.value); setJoinError(null); }}
                              >
                                <option value="">Select character...</option>
                                {characters.map(c => (
                                  <option key={c.name} value={c.name}>{c.name} ({c.shipClass})</option>
                                ))}
                              </select>
                            )}
                            {characters.length === 1 && (
                              <span className="join-char-name">{characters[0].name}</span>
                            )}
                            {joinError && <div className="join-error">{joinError}</div>}
                            <div className="join-confirm-buttons">
                              <button onClick={() => handleJoinConfirm(game.channelId)} className="btn-join-confirm">Confirm</button>
                              <button onClick={() => { setJoiningGame(null); setJoinError(null); }} className="btn-join-cancel">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => handleJoinClick(game.channelId)} className="btn-join-battle">
                            Join Battle
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => onSelectGame(game.channelId)}
                      className="btn-enter-game"
                    >
                      {game.isPlayer ? 'Enter Game' : 'View Game'}
                    </button>
                  </div>
                </div>
              ))}
              <div className="game-card new-battle-card" onClick={() => { setAdminInitialTab('game'); setShowAdmin(true); }}>
                <div className="new-battle-content">
                  <div className="new-battle-plus">+</div>
                  <div className="new-battle-label">New Battle</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ServerDashboard;
