import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ServerSelector from './components/ServerSelector';
import ServerDashboard from './components/ServerDashboard';
import GameView from './components/GameView';
import Login from './components/Login';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BG_VIDEO_ID = 'ys6NzFWK4oU';
const DEFAULT_BG_VOL = 0.3;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const ytPlayer = useRef(null);
  const fadeTimer = useRef(null);
  const pendingPlay = useRef(false);
  const bgVolumeRef = useRef(Math.max(parseFloat(localStorage.getItem('bgMusicVolume')) || DEFAULT_BG_VOL, 0.05));
  const bgMutedRef = useRef(localStorage.getItem('bgMusicMuted') === 'true');

  const getTargetVol = () => bgMutedRef.current ? 0 : Math.round(bgVolumeRef.current * 100);

  const fadeTo = (targetVol, durationMs) => {
    const player = ytPlayer.current;
    if (!player?.setVolume) return;
    if (fadeTimer.current) clearInterval(fadeTimer.current);
    let current = player.getVolume?.() ?? 0;
    const steps = 20;
    const delta = (targetVol - current) / steps;
    let step = 0;
    fadeTimer.current = setInterval(() => {
      step++;
      current = Math.max(0, Math.min(100, current + delta));
      player.setVolume?.(Math.round(current));
      if (step >= steps) clearInterval(fadeTimer.current);
    }, durationMs / steps);
  };

  const initYTPlayer = () => {
    ytPlayer.current = new window.YT.Player('yt-bg-player', {
      videoId: BG_VIDEO_ID,
      playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: BG_VIDEO_ID, mute: 1 },
      events: {
        onReady: (e) => {
          e.target.setVolume(0);
          e.target.unMute();
          if (pendingPlay.current) fadeTo(getTargetVol(), 2000);
        },
        onStateChange: (e) => {
          if (e.data === 0) e.target.playVideo(); // ended → replay
        }
      }
    });
  };

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT?.Player) { initYTPlayer(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = initYTPlayer;
  }, []); // eslint-disable-line

  // Fade in when guild selected, fade out when deselected
  useEffect(() => {
    if (selectedGuild && !selectedGame) {
      pendingPlay.current = true;
      fadeTo(getTargetVol(), 2000);
    } else if (!selectedGuild) {
      pendingPlay.current = false;
      fadeTo(0, 1500);
    }
  }, [selectedGuild]); // eslint-disable-line

  // Fade out on game entry, fade back in on game exit
  useEffect(() => {
    if (selectedGame) {
      fadeTo(0, 1500);
    } else if (selectedGuild) {
      fadeTo(getTargetVol(), 2000);
    }
  }, [selectedGame]); // eslint-disable-line

  // Listen for volume/mute changes from Settings
  useEffect(() => {
    const volHandler = (e) => {
      bgVolumeRef.current = e.detail;
      if (!bgMutedRef.current) fadeTo(Math.round(e.detail * 100), 300);
    };
    const muteHandler = (e) => {
      bgMutedRef.current = e.detail;
      fadeTo(e.detail ? 0 : Math.round(bgVolumeRef.current * 100), 500);
    };
    window.addEventListener('bgMusicVolumeChange', volHandler);
    window.addEventListener('bgMusicMuteChange', muteHandler);
    return () => {
      window.removeEventListener('bgMusicVolumeChange', volHandler);
      window.removeEventListener('bgMusicMuteChange', muteHandler);
    };
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  // Browser back button support
  useEffect(() => {
    window.history.replaceState({ view: 'selector' }, '');
    const handlePopState = (e) => {
      const state = e.state || { view: 'selector' };
      if (state.view === 'selector') {
        setSelectedGuild(null);
        setSelectedGame(null);
      } else if (state.view === 'dashboard') {
        setSelectedGuild(state.guild);
        setSelectedGame(null);
      } else if (state.view === 'game') {
        setSelectedGuild(state.guild);
        setSelectedGame(state.channelId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectGuild = (guild) => {
    window.history.pushState({ view: 'dashboard', guild }, '');
    setSelectedGuild(guild);
  };

  const handleSelectGame = (channelId) => {
    window.history.pushState({ view: 'game', guild: selectedGuild, channelId }, '');
    setSelectedGame(channelId);
  };

  const handleGoBack = () => window.history.back();

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
      setUser(response.data);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true });
    } catch {}
    setUser(null);
    setSelectedGuild(null);
    setSelectedGame(null);
    window.history.replaceState({ view: 'selector' }, '');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading"><div className="spinner"></div><p>Loading...</p></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (selectedGame) {
    return <GameView channelId={selectedGame} user={user} onBack={handleGoBack} onLogout={handleLogout} />;
  }

  if (!selectedGuild) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Naval Command</h1>
          <div className="user-info">
            <span>Welcome, {user.username}</span>
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          </div>
        </header>
        <ServerSelector user={user} onSelectServer={handleSelectGuild} />
      </div>
    );
  }

  return <ServerDashboard user={user} guild={selectedGuild} onSelectGame={handleSelectGame} onChangeServer={handleGoBack} />;
}

export default App;
