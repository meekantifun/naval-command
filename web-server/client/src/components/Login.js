import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BG_VOLUME = 15; // 0-100, kept low so it's audible but not overpowering

function Login() {
  const [muted, setMuted] = useState(true);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/discord`;
  };

  const onPlayerReady = useCallback((event) => {
    playerRef.current = event.target;
    // Start muted (browsers require muted autoplay), set low volume for when user unmutes
    event.target.setVolume(BG_VOLUME);
    event.target.mute();
    event.target.playVideo();
  }, []);

  useEffect(() => {
    // Load the YouTube IFrame API script if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const createPlayer = () => {
      new window.YT.Player(containerRef.current, {
        videoId: 'ZXF1sHkHAZc',
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: 'ZXF1sHkHAZc',
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          iv_load_policy: 3,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: onPlayerReady
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [onPlayerReady]);

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;

    if (muted) {
      player.unMute();
      player.setVolume(BG_VOLUME);
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  return (
    <div className="login-container">
      <div className="video-background">
        <div ref={containerRef}></div>
      </div>
      <div className="video-overlay"></div>

      <button className="mute-btn" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
        {muted ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>

      <div className="login-card">
        <h1 className="login-title">Naval Command</h1>
        <p className="login-subtitle">Interactive Naval Warfare</p>
        <div className="login-content">
          <div className="feature-list">
            <div className="feature">
              <span className="feature-icon">🚢</span>
              <span>Command powerful warships</span>
            </div>
            <div className="feature">
              <span className="feature-icon">✈️</span>
              <span>Launch aircraft squadrons</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <span>Engage in tactical combat</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🗺️</span>
              <span>Interactive map controls</span>
            </div>
          </div>
          <button onClick={handleLogin} className="btn btn-primary btn-large">
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
              <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Login with Discord
          </button>
        </div>
      </div>

      <div className="video-credit">
        Background footage: <a href="https://www.youtube.com/watch?v=ZXF1sHkHAZc" target="_blank" rel="noopener noreferrer">"WW2 - The Battle of the Atlantic [Real Footage in Colour]"</a> by <a href="https://www.youtube.com/@KickFlip" target="_blank" rel="noopener noreferrer">KickFlip</a>
      </div>
    </div>
  );
}

export default Login;
